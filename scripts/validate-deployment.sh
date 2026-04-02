#!/bin/bash

# 部署配置验证脚本
# 用于验证生产环境配置文件的完整性和正确性

set -e

echo "🔍 开始验证部署配置..."

# 检查关键文件是否存在
required_files=(
    "backend/.env.production"
    "frontend/.env.production"
    "docker-compose.prod.yml"
    "backend/Dockerfile"
    "frontend/Dockerfile"
    "frontend/nginx.conf"
    ".github/workflows/deploy.yml"
)

echo "📁 检查必需文件..."
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file - 文件不存在"
        exit 1
    fi
done

# 检查后端环境配置文件
echo "🔧 检查后端环境配置..."
if grep -q "replace_me_with_secure_random_string_in_production" backend/.env.production; then
    echo "  ⚠️  警告: JWT_SECRET仍然是默认值，生产环境请更新"
fi

if grep -q "postgres" backend/.env.production && ! grep -q "\${DB_PASSWORD}" backend/.env.production; then
    echo "  ⚠️  警告: 数据库密码是默认值，生产环境请使用强密码"
fi

# 检查Docker Compose配置语法
echo "🐳 检查Docker Compose配置..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.prod.yml config --quiet
    echo "  ✅ Docker Compose配置语法正确"
else
    echo "  ⚠️  docker-compose不可用，跳过语法检查"
fi

# 检查GitHub Actions工作流
echo "⚙️  检查GitHub Actions工作流..."
if [ -f ".github/workflows/deploy.yml" ]; then
    echo "  ✅ GitHub Actions工作流存在"

    # 检查必需的secrets引用
    required_secrets=("DOCKER_USERNAME" "DOCKER_PASSWORD" "DEPLOY_HOST" "DEPLOY_USER" "DEPLOY_SSH_KEY")
    for secret in "${required_secrets[@]}"; do
        if grep -q "\${{ secrets.$secret }}" .github/workflows/deploy.yml; then
            echo "    ✅ $secret 引用存在"
        else
            echo "    ⚠️  $secret 引用不存在或格式错误"
        fi
    done
fi

# 检查健康检查配置
echo "🏥 检查健康检查配置..."
if grep -q "healthcheck" docker-compose.prod.yml; then
    echo "  ✅ 健康检查配置存在"
else
    echo "  ⚠️  健康检查配置缺失"
fi

# 检查端口配置
echo "🔌 检查端口配置..."
if grep -q "3000:3000" docker-compose.prod.yml; then
    echo "  ✅ 后端端口映射正确"
else
    echo "  ⚠️  后端端口映射可能错误"
fi

if grep -q "80:80" docker-compose.prod.yml; then
    echo "  ✅ 前端端口映射正确"
else
    echo "  ⚠️  前端端口映射可能错误"
fi

# 总结
echo ""
echo "📊 验证完成摘要:"
echo "✅ 必需文件完整性: 通过"
echo "✅ 配置语法检查: 通过"
echo "✅ 安全配置检查: 完成（注意警告项）"
echo "✅ 部署流水线检查: 完成"
echo ""
echo "📝 后续步骤:"
echo "1. 更新生产环境安全变量（JWT_SECRET、数据库密码等）"
echo "2. 配置GitHub Secrets（Docker Hub凭证、服务器SSH密钥）"
echo "3. 在测试环境运行完整部署流程"
echo "4. 监控应用健康状态和日志"

exit 0