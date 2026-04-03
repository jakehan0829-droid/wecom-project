# 企微真实 webhook 运行方式 v1

## 1. 当前结论

P0-1「固化真实 webhook 运行方式」已完成第一轮收口，当前服务器上的真实运行方式已明确并可复用。

当前真实链路：

1. 企业微信回调地址指向外网 HTTPS 域名
2. Nginx 接收 80/443 请求
3. Nginx 将 `/api/v1/wecom/webhook` 反代到 `127.0.0.1:3000`
4. PM2 托管 backend 正式进程
5. backend 以 `dist/main.js` 形式运行，而非 `tsx src/main.ts` 临时开发态
6. backend 内部完成企微 URL 校验、签名校验、AES 解密、消息标准化、入库与自动化联动

---

## 2. 当前正式入口

### 外网入口
- `https://www.moshengyuan.com/api/v1/wecom/webhook`

### 本机后端入口
- `http://127.0.0.1:3000/api/v1/wecom/webhook`

### 兼容入口
代码中还保留：
- `GET /api/wecom/callback`
- `POST /api/wecom/callback`

但当前推荐统一使用：
- `GET /api/v1/wecom/webhook`
- `POST /api/v1/wecom/webhook`

---

## 3. 当前实际运行拓扑

### Nginx
监听：
- `0.0.0.0:80`
- `0.0.0.0:443`

当前站点配置文件：
- `/etc/nginx/sites-available/moshengyuan.com`

其中已存在：
```nginx
location /api/v1/wecom/webhook {
    proxy_pass http://127.0.0.1:3000/api/v1/wecom/webhook;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Backend
工作目录：
- `/root/.openclaw/workspace/project/backend`

PM2 进程名：
- `chronic-disease-backend`

当前正式运行脚本：
- `/root/.openclaw/workspace/project/backend/dist/main.js`

PM2 配置文件：
- `/root/.openclaw/workspace/project/backend/ecosystem.config.cjs`

### 环境文件
真实运行配置唯一来源：
- `/root/.openclaw/workspace/project/backend/.env`

当前企微相关配置项：
- `WECOM_CORP_ID`
- `WECOM_AGENT_ID`
- `WECOM_SECRET`
- `WECOM_TOKEN`
- `WECOM_AES_KEY`

---

## 4. 当前代码内 webhook 处理方式

### 4.1 URL 校验
路由：
- `GET /api/v1/wecom/webhook`

处理逻辑：
1. 读取 `msg_signature / timestamp / nonce / echostr`
2. 使用 `WECOM_TOKEN` 做签名校验
3. 使用 `WECOM_AES_KEY + WECOM_CORP_ID` 解密 `echostr`
4. 返回解密后的明文

对应代码：
- `src/modules/wecom-intelligence/controller/wecom-webhook.controller.ts`
- `src/modules/wecom-intelligence/service/wecom-webhook.service.ts`
- `src/modules/wecom-intelligence/service/wecom-crypto.service.ts`

### 4.2 消息接收
路由：
- `POST /api/v1/wecom/webhook`

处理逻辑：
1. 接收企微加密 XML 或兼容 payload
2. 校验 `msg_signature`
3. 解密消息体
4. 标准化为系统内部 message intake 结构
5. 接入 `createRealWecomMessageIntake`
6. 进入自动化去重、事件状态更新、会话状态更新、审计日志链路
7. 返回纯文本 `success`

---

## 5. 当前正式运行命令

### build
```bash
cd /root/.openclaw/workspace/project/backend
npm run build
```

### PM2 启动/重建正式进程
```bash
cd /root/.openclaw/workspace/project/backend
pm2 start ecosystem.config.cjs
pm2 save
```

### PM2 重启
```bash
pm2 restart chronic-disease-backend
```

### 查看状态
```bash
pm2 status chronic-disease-backend
pm2 show chronic-disease-backend
```

### 查看日志
```bash
pm2 logs chronic-disease-backend --lines 100 --nostream
```

---

## 6. 一键修复/收敛脚本

已新增脚本：
- `/root/.openclaw/workspace/project/ops/fix-pm2-runtime.sh`

用途：
1. build backend
2. 删除旧的 PM2 进程定义
3. 使用 `ecosystem.config.cjs` 重新启动正式进程
4. `pm2 save`

执行方式：
```bash
bash /root/.openclaw/workspace/project/ops/fix-pm2-runtime.sh
```

适用场景：
- 之前 PM2 是用 `npm run dev` 起的
- 想切回标准生产式运行
- 需要重建 PM2 进程定义

---

## 7. 当前已验证事实

### 7.0 本机加密 webhook smoke test 已打通
已新增本机联调脚本：
- `/root/.openclaw/workspace/project/ops/wecom-webhook-smoke-test.js`

执行方式：
```bash
cd /root/.openclaw/workspace/project/backend
node ../ops/wecom-webhook-smoke-test.js
```

该脚本会：
1. 复用 backend 当前 `.env`
2. 本地构造一条企微加密 XML
3. 使用真实 `WECOM_TOKEN` 生成签名
4. 调用 `POST /api/v1/wecom/webhook`
5. 验证是否返回 `success`

当前已实测通过，返回：
- HTTP 200
- body = `success`

同时 PM2 日志中已出现：
- `receive_request`
- `receive_normalized`
- `receive_success`

说明本机“加密回调 -> 验签 -> 解密 -> 标准化 -> 入库主链/自动化链”已跑通。


以下已实际验证：

### 7.1 backend 在线
```bash
curl http://127.0.0.1:3000/health
```
返回正常。

### 7.2 外网 webhook 入口已通
```bash
curl https://www.moshengyuan.com/api/v1/wecom/webhook
```
返回的是 backend 的业务错误：
- `INVALID_WECOM_VERIFY_QUERY`

这说明：
- 请求已到达 Nginx
- Nginx 已转发至 backend
- backend webhook 路由已命中
- 当前不是 404、不是站点未接通、不是反代未生效

### 7.3 PM2 已切换为正式运行方式
已从：
- `npm run dev`
- `tsx src/main.ts`

切为：
- `node dist/main.js`

这意味着 webhook 已不再依赖开发态热运行。

---

## 8. 当前标准验收方式

### 验收 1：本机健康检查
```bash
curl -sS http://127.0.0.1:3000/health
```

预期：
- 返回 `status: ok`

### 验收 2：PM2 运行方式检查
```bash
pm2 show chronic-disease-backend
```

预期关注：
- `status = online`
- `script path = .../dist/main.js`
- 不是 `tsx src/main.ts`

### 验收 3：外网 webhook 路由检查
```bash
curl -i -sS https://www.moshengyuan.com/api/v1/wecom/webhook
```

预期：
- 命中 backend
- 返回企微参数错误或签名错误
- 不能是 Nginx 404 / 静态页内容 / 域名无响应

### 验收 4：真实企微后台 URL 校验
在企微后台填写：
- URL：`https://www.moshengyuan.com/api/v1/wecom/webhook`
- Token：与 `.env` 中 `WECOM_TOKEN` 一致
- EncodingAESKey：与 `.env` 中 `WECOM_AES_KEY` 一致

预期：
- URL 校验通过

### 验收 5：本机加密回调模拟
```bash
cd /root/.openclaw/workspace/project/backend
node ../ops/wecom-webhook-smoke-test.js
```

预期：
- 返回 HTTP 200
- body 为 `success`
- PM2 日志中出现 `receive_request / receive_normalized / receive_success`

### 验收 6：真实事件回调
企微实际推送后，预期：
- POST 回调返回 `success`
- backend 日志无签名/解密错误
- 消息可进入既有入库与自动化主链

---

## 9. 当前运行边界

### 9.1 企微配置以 backend/.env 为准
不要再把企微真实配置写到多个地方。

唯一真实来源：
- `project/backend/.env`

### 9.2 外网暴露只经 Nginx
backend 仅监听：
- `127.0.0.1:3000`

不直接暴露公网端口。

### 9.3 webhook 正式口径已固定
后续默认正式 webhook 地址统一按：
- `https://www.moshengyuan.com/api/v1/wecom/webhook`

除非未来明确切域名或切路由，否则不再反复变更。

---

## 10. 后续建议

P0-1 完成后，下一步可直接推进：

1. 补真实企微回调日志字段与错误分级
2. 增加 webhook 去重命中观察面
3. 增加一条真实企微联调记录样例
4. 补一份“企微后台配置截图位 + 验收记录”文档
5. 再推进 customerId -> patientId 映射稳定化

---

## 11. 一句话结论

当前企微真实 webhook 运行方式已经固定为：

**企微回调 -> `https://www.moshengyuan.com/api/v1/wecom/webhook` -> Nginx -> `127.0.0.1:3000` -> PM2 托管的 `dist/main.js` backend -> 企微验签/解密/标准化/入库主链。**
