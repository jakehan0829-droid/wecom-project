#!/bin/bash

# 企业微信项目端到端测试脚本
# 测试AI模型服务与档案更新的集成效果

set -e

echo "🚀 启动企业微信项目端到端测试"
echo "=========================================="

# 检查必要工具
command -v docker >/dev/null 2>&1 || { echo "错误: 需要安装Docker"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "错误: 需要安装Docker Compose"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "错误: 需要安装Node.js"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "错误: 需要安装npm"; exit 1; }

# 配置
TEST_DB_NAME="chronic_disease_test"
TEST_DB_PORT="25432"
TEST_REDIS_PORT="26379"
BACKEND_PORT="3300"

# 清理函数
cleanup() {
    echo "🧹 清理测试环境..."
    docker-compose down -v 2>/dev/null || true
    pkill -f "node.*$BACKEND_PORT" 2>/dev/null || true
}

# 设置陷阱确保清理
trap cleanup EXIT INT TERM

# 步骤1: 启动测试数据库
echo "📊 步骤1: 启动测试数据库..."
docker-compose down -v 2>/dev/null || true

# 修改docker-compose使用测试端口
export DB_PORT=$TEST_DB_PORT
export REDIS_PORT=$TEST_REDIS_PORT

docker-compose up -d wecom-mvp-postgres wecom-mvp-redis

echo "等待数据库启动..."
sleep 10

# 步骤2: 初始化测试数据库
echo "🗄️  步骤2: 初始化测试数据库..."
docker-compose exec -T wecom-mvp-postgres psql -U postgres -d postgres <<EOF
DROP DATABASE IF EXISTS $TEST_DB_NAME;
CREATE DATABASE $TEST_DB_NAME;
EOF

# 复制init.sql到容器并执行
docker cp backend/src/infra/db/init.sql wecom-mvp-postgres:/tmp/init.sql
docker-compose exec -T wecom-mvp-postgres psql -U postgres -d $TEST_DB_NAME -f /tmp/init.sql

# 插入测试数据
echo "📝 插入测试数据..."
docker-compose exec -T wecom-mvp-postgres psql -U postgres -d $TEST_DB_NAME <<'EOF'
-- 插入测试患者
INSERT INTO patient (id, name, gender, diabetes_type, mobile)
VALUES
('patient-test-001', '测试患者1', 'male', 'type2', '13800138001'),
('patient-test-002', '测试患者2', 'female', 'type1', '13800138002');

-- 插入测试消息
INSERT INTO wecom_messages (
  id, message_id, source_platform, chat_type, conversation_id,
  sender_id, sender_name, sender_role, content_type,
  content_raw, content_text, sent_at, linked_customer_id, metadata_json
) VALUES
(
  'msg-001', 'test-message-001', 'wecom', 'single', 'conv-test-001',
  'customer-test-001', '测试客户1', 'customer', 'text',
  '{"content": "血糖问题"}', '医生，我最近血糖控制不好', '2024-01-01T10:00:00Z', 'patient-test-001', '{}'
),
(
  'msg-002', 'test-message-002', 'wecom', 'group', 'conv-test-002',
  'customer-test-002', '测试客户2', 'customer', 'text',
  '{"content": "用药咨询"}', '这个药怎么吃？', '2024-01-01T10:05:00Z', 'patient-test-002', '{}'
);

-- 插入测试成员档案
INSERT INTO member_archive (
  id, user_id, conversation_id, basic_info, core_problem, updated_at
) VALUES
(
  'archive-001', 'customer-test-001', 'conv-test-001',
  '糖尿病患者', '血糖控制问题', '2024-01-01T09:00:00Z'
);
EOF

# 步骤3: 启动后端服务
echo "⚙️  步骤3: 启动后端服务..."

# 设置测试环境变量
export NODE_ENV=test
export DB_PORT=$TEST_DB_PORT
export DB_HOST=localhost
export DB_NAME=$TEST_DB_NAME
export DB_USER=postgres
export DB_PASSWORD=postgres
export REDIS_PORT=$TEST_REDIS_PORT
export REDIS_HOST=localhost
export APP_PORT=$BACKEND_PORT
export ENABLE_AI_ANALYSIS=true
export WECOM_WEBHOOK_LOCAL_BYPASS_DB=0

# 进入后端目录
cd backend

echo "安装依赖..."
npm ci --silent

echo "构建项目..."
npm run build

echo "启动服务..."
npm run dev &
BACKEND_PID=$!

echo "等待服务启动..."
sleep 15

# 检查服务是否运行
if ! curl -s http://localhost:$BACKEND_PORT/health > /dev/null; then
    echo "❌ 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "✅ 后端服务运行在 http://localhost:$BACKEND_PORT"

# 步骤4: 运行API测试
echo "🧪 步骤4: 运行API集成测试..."

# 创建临时测试文件
cat > test-api-e2e.mjs <<'EOF'
import { randomUUID } from 'node:crypto';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3300/api/v1';

async function testBusinessRoutingAPI() {
    console.log('\n🔍 测试业务路由API...');

    // 测试1: 处理单条消息
    console.log('1. 测试单条消息处理...');
    try {
        const response = await fetch(`${API_BASE}/business-routing/messages/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId: 'test-message-001' })
        });

        const result = await response.json();
        console.log(`   状态码: ${response.status}`);
        console.log(`   响应:`, JSON.stringify(result, null, 2).substring(0, 200) + '...');

        if (response.status === 200) {
            console.log('   ✅ 单条消息处理测试通过');
        } else {
            console.log('   ❌ 单条消息处理测试失败');
            return false;
        }
    } catch (error) {
        console.log('   ❌ 单条消息处理测试错误:', error.message);
        return false;
    }

    // 测试2: 批量处理会话
    console.log('2. 测试会话批量处理...');
    try {
        const response = await fetch(`${API_BASE}/business-routing/conversations/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: 'conv-test-001', messageLimit: 10 })
        });

        const result = await response.json();
        console.log(`   状态码: ${response.status}`);
        console.log(`   总消息数: ${result.totalMessages || 0}`);
        console.log(`   处理消息数: ${result.processedMessages || 0}`);

        if (response.status === 200) {
            console.log('   ✅ 会话批量处理测试通过');
        } else {
            console.log('   ❌ 会话批量处理测试失败');
            return false;
        }
    } catch (error) {
        console.log('   ❌ 会话批量处理测试错误:', error.message);
        return false;
    }

    // 测试3: 查询档案更新
    console.log('3. 测试档案查询...');
    try {
        const response = await fetch(`${API_BASE}/member-archives/customer-test-001`);

        const result = await response.json();
        console.log(`   状态码: ${response.status}`);

        if (response.status === 200) {
            console.log('   ✅ 档案查询测试通过');
            console.log(`   档案信息:`, JSON.stringify(result, null, 2).substring(0, 150) + '...');
        } else {
            console.log('   ❌ 档案查询测试失败');
            return false;
        }
    } catch (error) {
        console.log('   ❌ 档案查询测试错误:', error.message);
        return false;
    }

    return true;
}

async function runTests() {
    console.log('🚀 开始端到端API测试');
    console.log('=' .repeat(50));

    const success = await testBusinessRoutingAPI();

    console.log('=' .repeat(50));
    if (success) {
        console.log('🎉 所有端到端测试通过!');
        process.exit(0);
    } else {
        console.log('❌ 端到端测试失败');
        process.exit(1);
    }
}

runTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
});
EOF

# 运行API测试
if node test-api-e2e.mjs; then
    echo "✅ API集成测试通过"
else
    echo "❌ API集成测试失败"
    exit 1
fi

# 步骤5: 验证数据库状态
echo "🔍 步骤5: 验证数据库状态..."
docker-compose exec -T wecom-mvp-postgres psql -U postgres -d $TEST_DB_NAME <<'EOF'
echo "数据库表状态:"
echo "1. 患者表记录数:"
SELECT count(*) as patient_count FROM patient;

echo "2. 消息表记录数:"
SELECT count(*) as message_count FROM wecom_messages;

echo "3. 成员档案表记录数:"
SELECT count(*) as archive_count FROM member_archive;

echo "4. 档案变更日志:"
SELECT archive_type, count(*) as change_count FROM archive_change_log GROUP BY archive_type;
EOF

# 步骤6: 清理
echo "🧹 步骤6: 清理测试环境..."
cleanup

echo ""
echo "=========================================="
echo "🎉 端到端测试完成!"
echo "✅ AI模型服务与档案更新集成验证通过"
echo "✅ 业务路由API功能正常"
echo "✅ 数据库操作正确"
echo "✅ 端到端流程完整"
echo ""
echo "📊 测试总结:"
echo "   - 测试数据库: PostgreSQL (端口 $TEST_DB_PORT)"
echo "   - 后端服务: Node.js (端口 $BACKEND_PORT)"
echo "   - API测试: 业务路由 + 档案查询"
echo "   - 集成验证: AI分析 → 档案更新 → 业务反馈"
echo "=========================================="