# 企微 webhook 联调指南 v1

## 当前已具备能力

后端已支持：
- GET `/api/v1/wecom/webhook`：企微 URL 校验，返回纯文本 `echostr`
- POST `/api/v1/wecom/webhook`：企微加密回调验签 + 解密 + 入库，返回纯文本 `success`
- GET `/api/wecom/callback`：兼容旧版回调地址
- POST `/api/wecom/callback`：兼容旧版回调地址
- 支持原生 XML 加密 envelope
- 支持解密后消息映射到现有 intake 链路

## 必备环境变量

```env
WECOM_CORP_ID=你的企业ID
WECOM_AGENT_ID=你的应用AgentId
WECOM_SECRET=你的应用Secret
WECOM_TOKEN=你在企微后台配置的回调Token
WECOM_AES_KEY=你在企微后台配置的EncodingAESKey
```

注意：
- `WECOM_AES_KEY` 通常是 43 位明文 key，代码会自动补 `=` 后做 base64 decode
- `WECOM_TOKEN` / `WECOM_AES_KEY` / 企微后台配置必须严格一致

## 本地自检

先 build：

```bash
cd project/backend
npm run build
```

如果正式 `WECOM_TOKEN / WECOM_AES_KEY` 还没拿到，可先用开发态样本模式：

```bash
WECOM_LOCAL_DEMO_MODE=1 node scripts/wecom-local-check.mjs verify-url
WECOM_LOCAL_DEMO_MODE=1 node scripts/wecom-local-check.mjs encrypted-body
```

### 1. 生成 URL 校验样本

```bash
node scripts/wecom-local-check.mjs verify-url
```

输出内容里会有：
- `query.msg_signature`
- `query.timestamp`
- `query.nonce`
- `query.echostr`
- `expectedPlainTextResponse`

把这些参数拼到：

```text
GET /api/v1/wecom/webhook?msg_signature=...&timestamp=...&nonce=...&echostr=...
```

期望返回：

```text
openclaw-wecom-url-check-ok
```

### 2. 生成加密消息回调样本

```bash
node scripts/wecom-local-check.mjs encrypted-body
```

或者直接用 curl 脚本：

```bash
WECOM_LOCAL_DEMO_MODE=1 bash scripts/wecom-webhook-local-curl.sh verify-url
WECOM_LOCAL_DEMO_MODE=1 bash scripts/wecom-webhook-local-curl.sh encrypted-body
```

输出内容里会有：
- `query.msg_signature`
- `query.timestamp`
- `query.nonce`
- `body`（完整 XML）

请求方式：

```bash
curl -X POST 'http://127.0.0.1:3000/api/v1/wecom/webhook?msg_signature=...&timestamp=...&nonce=...' \
  -H 'Content-Type: application/xml' \
  --data-binary '@payload.xml'
```

期望返回：

```text
success
```

同时数据库应产生：
- conversation upsert
- wecom_messages 新记录

## 正式联调建议顺序

1. 先确认服务公网可达（HTTPS）
2. 先做企微后台 URL 校验
3. 再用本地样本跑加密 POST 验证
4. 再接企微真实事件
5. 最后检查数据库入库与下游分析链路

## 成功判定标准

### URL 校验通过
- 企微后台保存回调地址成功
- 服务端返回纯文本解密后的 `echostr`

### 加密 POST 回调通过
- 企微回调返回 HTTP 200
- body 为纯文本 `success`
- 服务端日志无签名失败/解密失败
- 数据库生成消息记录

## 当前仍建议后续补强项

1. 不同 Event / ChangeType 的精细业务分流
2. 关键回调日志脱敏打印
3. 重复消息幂等与重放防护加强
4. 联调阶段的 debug endpoint（仅内网或仅开发环境）
