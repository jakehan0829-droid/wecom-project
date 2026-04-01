# Backend 下一步落地清单 v1

## 已完成
- package.json
- tsconfig
- env 配置加载
- PostgreSQL 连接初始化
- init.sql 初稿
- Express HTTP server
- 最小 API 路由注册
- patient create/list/detail 真实 SQL service 初稿
- wecom binding 真实写库/查询初稿
- glucose record 真实写库初稿
- dashboard overview 真实查询初稿

## 下一步
1. 补 blood pressure / weight 的数据库表与真实写库逻辑
2. 执行 init.sql 完成数据库初始化
3. 增加统一错误处理
4. 增加 auth/login 路由与鉴权中间件
5. 本地启动服务并验证 patient / binding / dashboard API
6. 增加 patient tag 与待医生介入最小表结构
