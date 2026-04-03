# Contributing Guide

感谢你对本项目的关注！以下是参与贡献的指南。

## 开发环境搭建

```bash
# 1. Fork 并克隆项目
git clone https://github.com/your-org/wecom-chronic-disease.git
cd wecom-chronic-disease

# 2. 初始化环境
make setup

# 3. 编辑 backend/.env，填写本地开发配置
# AI_PROVIDER=mock 可以不需要真实 AI API Key

# 4. 启动依赖服务
make dev

# 5. 启动开发服务器
cd backend && npm run dev
cd frontend && npm run dev  # 新终端
```

## 代码规范

- TypeScript strict mode，不允许 `any` 类型（测试文件除外）
- 后端使用 ESM 模块，import 路径必须带 `.js` 扩展名
- 提交前运行 `npm run lint` 和 `npm run typecheck`

## 测试要求

所有 PR 必须保持测试通过：

```bash
make test
```

- 后端：Jest，测试文件放在与源文件同目录，命名 `*.test.ts`
- 前端：Vitest，测试文件放在 `src/` 下，命名 `*.test.tsx`
- 新功能必须附带测试

## PR 流程

1. 从 `main` 分支创建功能分支：`git checkout -b feat/your-feature`
2. 提交代码，commit message 使用中文或英文均可，格式：`feat: 添加xxx功能`
3. 确保 `make test` 全部通过
4. 提交 PR，描述清楚改动内容和原因

## 目录结构

```
backend/src/
├── modules/          # 业务模块（每个模块独立）
│   ├── patient/      # 患者管理
│   ├── archive/      # 档案管理
│   └── wecom-intelligence/  # 企业微信智能处理
├── shared/           # 跨模块共享代码
└── infra/            # 基础设施（DB、Redis、配置）
```

## 报告问题

请在 GitHub Issues 中提交 Bug 报告，包含：
- 复现步骤
- 期望行为
- 实际行为
- 环境信息（Node.js 版本、OS）
