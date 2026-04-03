# 项目阶段状态（2026-03-26 17:00+）v1

## 当前判断
项目已从方案设计阶段进入“可演示后端初版 + 服务器部署准备阶段”。

## 已完成
- 业务与产品模型收口（AI 主执行 + 真人助理协同 + 医生介入）
- 患者档案字段分层、升级规则、后台架构 v2
- MVP 开发启动包与执行包文档
- project/ 仓库骨架
- backend TypeScript/Express 项目初始化
- PostgreSQL init.sql / seed.sql
- JWT 登录初稿
- 患者 / 绑定 / 健康记录 / 标签 / 医生任务 / dashboard API 初版
- 错误处理、404、鉴权 guard、基础字段校验
- `122.51.79.175` 部署清单、runbook、handover checklist

## 当前限制
- 当前工作环境无 docker，无法在此处直接拉起 PostgreSQL/Redis 容器
- 目标服务器 `122.51.79.175` 尚未进入实际接管执行阶段

## 下一阶段目标
- 切到 `122.51.79.175` 做真实部署验证
- 跑通 `/health`、`/auth/login`、`/patients`、`/wecom-binding`、`/dashboard/overview`
- 开始第一轮真实 API 联调
