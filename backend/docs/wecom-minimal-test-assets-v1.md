# 企微最小测试资产说明 v1

## 1. 目的

本文件收口当前仓库内可直接复用的企微测试资产，用于：

- 本地闭环验证
- 回归验证
- 真实联调前预演
- 回调异常时快速排查

---

## 2. 已有脚本

### 2.1 `scripts/wecom-local-check.mjs`

用途：
- 生成 URL 校验样本
- 生成加密 POST 样本

示例：

```bash
WECOM_LOCAL_DEMO_MODE=1 node scripts/wecom-local-check.mjs verify-url
WECOM_LOCAL_DEMO_MODE=1 node scripts/wecom-local-check.mjs encrypted-body
```

---

### 2.2 `scripts/wecom-webhook-local-curl.sh`

用途：
- 直接调用本地 webhook 做 URL 校验 / POST 回调验证

示例：

```bash
BASE_URL=http://127.0.0.1:3304 WECOM_LOCAL_DEMO_MODE=1 bash scripts/wecom-webhook-local-curl.sh verify-url
BASE_URL=http://127.0.0.1:3304 WECOM_LOCAL_DEMO_MODE=1 bash scripts/wecom-webhook-local-curl.sh encrypted-body
```

---

### 2.3 `scripts/wecom-crypto-selftest.mjs`

用途：
- 验证 encrypt / decrypt 循环一致性
- 用于排查 AES / padding / corpId 错误

示例：

```bash
node scripts/wecom-crypto-selftest.mjs
```

---

### 2.4 `scripts/build-wecom-envelope.mjs`

用途：
- 输入明文 XML
- 生成加密 envelope XML
- 生成对应 query JSON（`msg_signature/timestamp/nonce`）

示例：

```bash
WECOM_CORP_ID=xxx \
WECOM_AGENT_ID=xxx \
WECOM_TOKEN=xxx \
WECOM_AES_KEY=xxx \
WECOM_TEST_TIMESTAMP=1774774200 \
WECOM_TEST_NONCE=openclaw-local-nonce \
node scripts/build-wecom-envelope.mjs /tmp/input.xml /tmp/envelope.xml /tmp/query.json
```

---

## 3. 最小验证场景

### 场景 A：URL 校验
目标：验证 `echostr` 能正确返回

脚本：
- `wecom-local-check.mjs verify-url`
- `wecom-webhook-local-curl.sh verify-url`

成功标准：
- HTTP 200
- body 为纯文本 `echostr`

---

### 场景 B：普通加密 POST
目标：验证 POST `success`

脚本：
- `wecom-local-check.mjs encrypted-body`
- `wecom-webhook-local-curl.sh encrypted-body`

成功标准：
- HTTP 200
- body 为纯文本 `success`

---

### 场景 C：业务入库
目标：验证 message / conversation / patient mapping

建议检查表：
- `wecom_conversations`
- `wecom_messages`
- `patient_wecom_binding`

成功标准：
- 会话新增 / 更新
- 消息入库
- 命中映射时 `linked_customer_id` 变为 patientId

---

### 场景 D：事件语义与自动动作
目标：验证 event → action 语义闭环

建议样本：
- `enter_agent`
- `change_external_contact + edit_external_contact`
- `change_external_chat + dismiss_chat`
- `change_external_contact + del_external_contact`

建议检查表：
- `wecom_event_state`
- `patient_outreach_action`
- `wecom_automation_audit`

成功标准：
- 正确 stateTransition 落库
- 正确动作开单 / 关单
- 自动化审计可追踪

---

### 场景 E：幂等重放
目标：验证重复消息不会重复跑自动化

做法：
- 重放同一个 `message_id`

建议检查表：
- `wecom_automation_audit`

成功标准：
- 新审计记录 `triggered=false`
- `reason=duplicate_message_id`
- 不新增重复动作

---

## 4. 推荐回归顺序

每次大改后建议顺序：

1. `wecom-crypto-selftest.mjs`
2. `verify-url`
3. `encrypted-body`
4. 普通消息入库检查
5. 事件语义样本检查
6. 幂等重放检查
7. 查询接口 / ops-summary 检查

---

## 5. 当前关键接口

### webhook
- `GET /api/v1/wecom/webhook`
- `POST /api/v1/wecom/webhook`
- `GET /api/wecom/callback`
- `POST /api/wecom/callback`

### 查询 / 运营
- `GET /api/v1/wecom/event-states`
- `GET /api/v1/wecom/automation-audit`
- `GET /api/v1/wecom/conversations/:conversationId/ops-view`
- `GET /api/v1/wecom/ops-summary`

---

## 6. 当前注意事项

- `WECOM_TOKEN / WECOM_AES_KEY` 真实值未就绪前，可先用 demo 模式做本地演练
- 某些老表索引在执行 `init.sql` 时会因 owner 权限报错，但不影响新增表与现有能力验证
- 正式联调前必须补齐：
  - 真实 `WECOM_TOKEN`
  - 真实 `WECOM_AES_KEY`
  - 真实 HTTPS 域名回调地址
