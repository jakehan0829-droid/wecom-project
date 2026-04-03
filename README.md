# 企业微信糖尿病慢病管理系统 - 产品级实现

## 项目概述
基于企业微信接入模型能力，围绕"群管理机器人/群客服"与"个人医生助手"两条核心业务主线，在持续互动中获取信息、完成分析总结，并沉淀完善成员/患者档案。

## 功能特性

### ✅ 已实现功能
- **企业微信集成**: 完整的Webhook处理、消息解密、会话管理
- **AI模型集成**: 支持OpenAI/Anthropic/Mock多模式，消息分析和档案完善
- **业务模块**: 患者管理、健康记录、档案管理、业务路由
- **前端界面**: 医生工作台、档案管理、会话详情展示
- **基础架构**: 认证授权、错误处理、日志记录、配置管理

### 🚀 核心能力
1. **群管理机器人/群客服**: 自动识别成员需求，提炼信息沉淀档案
2. **个人医生助手**: 与患者日常互动，理解状态提炼信息，持续完善档案
3. **档案沉淀机制**: 成员档案、患者档案管理，支持手动补充校正

## 技术架构

### 后端 (Node.js + Express + TypeScript)
- 模块化设计，支持依赖注入 (tsyringe)
- PostgreSQL 15 数据库，完整的关系型数据模型
- Redis 缓存支持
- 完整的测试覆盖率 (Jest + Supertest)
- ESLint + Prettier + Husky 代码质量工具

### 前端 (React 18 + TypeScript + Vite)
- 响应式设计，现代化UI组件
- 医生工作台、档案管理、会话详情界面
- 统一的加载状态、错误处理和空状态组件
- API层统一封装，类型安全

### 部署与运维
- Docker多阶段构建优化镜像大小
- Docker Compose生产环境配置
- GitHub Actions CI/CD完整流水线
- 健康检查、监控和日志支持

## 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 15
- Redis 7
- Docker & Docker Compose (可选)

### 本地开发
```bash
# 1. 克隆项目
git clone https://github.com/your-org/wecom-chronic-disease.git
cd wecom-chronic-disease

# 2. 一键初始化（复制 .env 文件 + 安装依赖）
make setup

# 3. 编辑配置文件，填写真实凭证
# backend/.env — 数据库、JWT、企业微信、AI配置
# frontend/.env.local — 前端API地址

# 4. 启动依赖服务
make dev

# 5. 启动后端服务
cd backend && npm run dev

# 6. 启动前端服务 (新终端)
cd frontend && npm run dev
```

### 生产部署
```bash
# 配置生产环境变量（必须设置所有变量，不能使用默认值）
export DB_PASSWORD=your_strong_db_password
export JWT_SECRET=$(openssl rand -base64 32)
export WECOM_CORP_ID=your_corp_id
# ... 其他变量参考 backend/.env.example

# 使用Docker Compose部署
docker-compose -f docker-compose.prod.yml up -d
```

## 项目结构

```
wecom-project/
├── backend/                 # Node.js后端服务
│   ├── src/
│   │   ├── modules/        # 业务模块
│   │   │   ├── patient/    # 患者管理
│   │   │   ├── wecom-intelligence/ # 企业微信智能处理
│   │   │   ├── archive/    # 档案管理
│   │   │   └── ...
│   │   ├── shared/         # 共享组件
│   │   │   ├── di/         # 依赖注入容器
│   │   │   ├── repositories/ # Repository模式
│   │   │   └── ...
│   │   └── infra/          # 基础设施
│   └── tests/              # 测试文件
├── frontend/               # React前端应用
│   ├── src/
│   │   ├── components/     # 可复用组件
│   │   ├── api/           # API客户端
│   │   └── ...
│   └── public/
└── docs/                   # 项目文档
```

## API文档

主要API端点：
- `GET /api/v1/patients` - 获取患者列表
- `POST /api/v1/patients` - 创建患者
- `GET /api/v1/patients/:id` - 获取患者详情
- `POST /api/v1/wecom/webhook` - 企业微信Webhook处理
- `POST /api/v1/business-routing/messages/process` - 业务路由处理

详细的API文档请运行后端服务后访问 `http://localhost:3000/api-docs` (待实现)

## 测试

### 后端测试
```bash
cd backend
npm test              # 运行所有测试
npm run test:coverage # 生成测试覆盖率报告
npm run test:e2e      # 端到端测试
```

### 前端测试
```bash
cd frontend
npm test              # 运行单元测试
npm run test:e2e      # 运行E2E测试 (Playwright)
```

## CI/CD

项目配置了完整的GitHub Actions流水线：

1. **代码检查**: ESLint + Prettier + TypeScript编译
2. **测试执行**: 单元测试 → 集成测试 → E2E测试
3. **容器构建**: Docker多阶段构建，推送镜像到Docker Hub
4. **自动部署**: 推送到main分支自动部署到生产环境

## 监控与维护

- 健康检查端点: `GET /api/health`
- 结构化日志: Winston/Pino配置
- 错误追踪: 统一错误处理中间件
- 性能监控: 基础监控仪表板 (待完善)

## 许可证

[待添加]

## 贡献指南

[待添加]
