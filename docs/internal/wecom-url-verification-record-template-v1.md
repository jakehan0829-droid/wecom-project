# 企业微信后台 URL 校验记录模板 v1

更新时间：2026-03-30

## 1. 目的

本模板用于把“企微后台 URL 校验”从口头确认变成可留档、可回看、可复验的交付记录。

适用场景：
- 新接入企业微信消息服务器
- 更换域名 / 路由 / Token / AES Key
- 重建环境后复验
- 需要向内部确认“真实 webhook 已可用”

---

## 2. 当前标准口径

### 标准回调地址
- `https://www.moshengyuan.com/api/v1/wecom/webhook`

### 当前应用标识
- CorpId：`wwfa91cc69d04c070a`
- AgentId：`1000002`

### 配置真实来源
- `/root/.openclaw/workspace/project/backend/.env`

关键字段：
- `WECOM_TOKEN`
- `WECOM_AES_KEY`
- `WECOM_CORP_ID`

---

## 3. 校验前检查清单

### 3.1 backend 在线
```bash
curl -sS http://127.0.0.1:3000/health
```

预期：
- 返回 `status: ok`

### 3.2 PM2 进程正常
```bash
pm2 show chronic-disease-backend
```

预期：
- `status = online`
- `script path = /root/.openclaw/workspace/project/backend/dist/main.js`

### 3.3 外网入口可达
```bash
curl -i -sS https://www.moshengyuan.com/api/v1/wecom/webhook
```

预期：
- 返回 backend 的 JSON 错误
- 常见为 `INVALID_WECOM_VERIFY_QUERY`
- 不能是 404 / 静态页面 / 域名无响应

### 3.4 本机加密回调 smoke test 正常
```bash
cd /root/.openclaw/workspace/project/backend
node ../ops/wecom-webhook-smoke-test.js
```

预期：
- HTTP 200
- body = `success`

---

## 4. 企业微信后台填写项

在企业微信自建应用的“接收消息”或对应回调配置页填写：

- URL：`https://www.moshengyuan.com/api/v1/wecom/webhook`
- Token：填写 `.env` 中当前 `WECOM_TOKEN`
- EncodingAESKey：填写 `.env` 中当前 `WECOM_AES_KEY`

注意：
- Token 与 AES Key 必须与 backend 实际运行环境一致
- 不允许填历史值、测试值、别的环境值
- 若 `.env` 已改但 PM2 未重启，先重启 backend 再验

重启命令：
```bash
cd /root/.openclaw/workspace/project/backend
npm run build
pm2 restart chronic-disease-backend
```

---

## 5. 校验成功判定

企微后台点击“保存/校验”后，满足以下任一可判定通过：

1. 后台页面直接提示 URL 校验成功
2. backend 日志中出现：
   - `verify_request`
   - `verify_success`
3. 无 `INVALID_WECOM_SIGNATURE` / `INVALID_WECOM_AES_KEY` / `INVALID_WECOM_CORP_ID` 错误

日志查看方式：
```bash
pm2 logs chronic-disease-backend --lines 100 --nostream
```

---

## 6. 失败时的优先排查顺序

### 6.1 参数不完整
现象：
- `INVALID_WECOM_VERIFY_QUERY`

判断：
- 多为手工 curl 访问，不代表企微校验失败
- 只说明 webhook 路由存在，但当前请求不是合法企微校验请求

### 6.2 签名失败
现象：
- `INVALID_WECOM_SIGNATURE`

优先排查：
1. 后台填写的 Token 是否与 `.env` 一致
2. PM2 是否已重启到最新配置
3. 是否误用了别的环境参数

### 6.3 AES Key 非法 / 解密失败
现象：
- `INVALID_WECOM_AES_KEY`
- padding 非法
- corpId 校验失败

优先排查：
1. `WECOM_AES_KEY` 长度/内容是否正确
2. `WECOM_CORP_ID` 是否与当前应用一致
3. 企微后台填的 EncodingAESKey 是否与 `.env` 一致

### 6.4 外网入口未通
现象：
- 404
- Nginx 默认页
- 域名无响应

优先排查：
1. `/etc/nginx/sites-available/moshengyuan.com`
2. `location /api/v1/wecom/webhook` 是否仍存在
3. `proxy_pass` 是否仍指向 `127.0.0.1:3000`
4. `nginx -t` 与 `systemctl reload nginx`

---

## 7. 记录模板

### 校验任务信息
- 校验时间：
- 执行人：
- 环境：当前 OpenClaw 同机独立业务栈
- 域名：`www.moshengyuan.com`
- 回调地址：`https://www.moshengyuan.com/api/v1/wecom/webhook`

### 校验前状态
- backend health：通过 / 不通过
- PM2 online：是 / 否
- 外网入口可达：是 / 否
- 本机 smoke test：通过 / 不通过

### 后台填写值核对
- URL：正确 / 错误
- Token：已核对 / 未核对
- AES Key：已核对 / 未核对
- CorpId：已核对 / 未核对

### 校验结果
- 后台保存结果：成功 / 失败
- 日志是否出现 `verify_request`：是 / 否
- 日志是否出现 `verify_success`：是 / 否
- 是否出现签名/解密错误：是 / 否

### 结论
- 是否通过：是 / 否
- 若失败，失败原因：
- 下一步动作：

---

## 8. 当前阶段建议

每次出现以下变动，都应重新留一条记录：
- 域名调整
- webhook 路由调整
- Token 变更
- AES Key 变更
- PM2 重建
- Nginx 规则变更

这样后续就不会再出现“好像之前配通过，但不确定现在是不是还对”的情况。
