# backend 运行配置边界说明

## 当前规则
- `project/backend/.env`：唯一运行时环境文件
- `project/.env.example`：仅保留示例，不作为实际运行配置
- `project/.env`：不再作为 backend 实际运行配置来源，后续应移除或仅作历史过渡

## 原因
此前同时存在：
- `project/.env`
- `project/backend/.env`

且数据库账号不同，容易导致：
- 实际运行配置不清
- 排障时误判
- 隔离边界变弱

## 后续要求
1. backend 运行与排障只认 `project/backend/.env`
2. 示例配置只维护 `project/.env.example`
3. 若后续需要项目级运行说明，可在 `project/ops/` 维护，不再新增第二份真实 env
