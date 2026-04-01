# 部署切换包 v1

## 目标
当开始切到 122.51.79.175 时，使用本包快速完成接管与首轮验证。

## 包含文件
- `project/docs/server-122.51.79.175-info-template-v1.md`
- `project/docs/server-122.51.79.175-deploy-checklist-v1.md`
- `project/docs/server-122.51.79.175-deploy-runbook-v1.md`
- `project/docs/server-122.51.79.175-command-runbook-v1.md`
- `project/docs/server-122.51.79.175-handover-checklist-v1.md`
- `project/docs/server-first-execution-card-v1.md`
- `project/backend/README.md`
- `project/backend/docs/api-usage-with-auth-v1.md`

## 切换前先做
1. 让用户按 info-template 回传服务器信息
2. 确认 Docker / 端口 / 域名 / 企业微信参数
3. 确认代码目录与运行方式

## 切换时执行
1. 按 command-runbook 安装环境
2. 按 backend README 启动 backend
3. 按 API usage 文档验证接口

## 首轮必须验证
- `/health`
- `/api/v1/auth/login`
- `/api/v1/patients`
- `/api/v1/patients/:id/wecom-binding`
- `/api/v1/dashboard/overview`
