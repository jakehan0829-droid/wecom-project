# 服务器首轮执行顺序卡 v1

当开始接管 122.51.79.175 时，按这个顺序做：

1. 确认服务器信息
   - OS / SSH / 端口 / Docker / 域名

2. 准备项目目录
   - `/srv/chronic-disease-mvp`

3. 放置项目代码

4. 配置 `.env`
   - DB / JWT / WECOM

5. 启动基础依赖
   - postgres
   - redis

6. 初始化数据库
   - `init.sql`
   - `seed.sql`

7. 启动 backend
   - `npm install`
   - `npm run build`
   - `npm run dev`

8. 验证 API
   - `/health`
   - `/api/v1/auth/login`
   - `/api/v1/patients`
   - `/api/v1/dashboard/overview`

9. 再看是否进入 Nginx / HTTPS / 域名代理阶段
