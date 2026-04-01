# MVP 后端演示 curl 模板 v1

## 用途
这份文档用于配合 `first-demo-flow-v2.md` 做现场演示，目标是尽量减少临场手打。

默认：
- backend 地址：`http://127.0.0.1:3000`
- 演示账号：`13800000000 / demo123456`

建议在 bash 中逐段执行。

---

## 0. 基础变量
```bash
BASE_URL="http://127.0.0.1:3000"
DEMO_MOBILE="13800000000"
DEMO_PASSWORD="demo123456"
PATIENT_MOBILE="13900000999"
EXTERNAL_USER_ID="wm_demo_patient_001"
```

如需避免手机号重复，可手动改 `PATIENT_MOBILE`。

---

## 1. 演示前自检
```bash
cd /root/.openclaw/workspace/project
node scripts/runtime-check.js
```

---

## 2. 登录并提取 token
```bash
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"mobile\":\"$DEMO_MOBILE\",\"password\":\"$DEMO_PASSWORD\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])')

echo "$TOKEN"
```

---

## 3. 创建患者并提取 patientId
```bash
PATIENT_ID=$(curl -s -X POST "$BASE_URL/api/v1/patients" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"orgId\":\"org_demo\",\"name\":\"MVP演示患者\",\"gender\":\"male\",\"birthDate\":\"1988-01-01\",\"mobile\":\"$PATIENT_MOBILE\",\"diabetesType\":\"type2\",\"riskLevel\":\"high\",\"source\":\"wecom\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')

echo "$PATIENT_ID"
```

---

## 4. 绑定企微身份
```bash
curl -s -X POST "$BASE_URL/api/v1/patients/$PATIENT_ID/wecom-binding" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"bindingType\":\"external_user\",\"externalUserId\":\"$EXTERNAL_USER_ID\"}" | python3 -m json.tool
```

---

## 5. 写入异常血糖记录
```bash
curl -s -X POST "$BASE_URL/api/v1/patients/$PATIENT_ID/glucose-records" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"measureTime":"2026-03-27T14:12:00+08:00","glucoseValue":13.6,"measureScene":"after_meal","source":"manual"}' | python3 -m json.tool
```

---

## 6. 查看医生任务列表
```bash
curl -s -X GET "$BASE_URL/api/v1/doctor-review-tasks" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

如需提取第一条任务 ID：
```bash
TASK_ID=$(curl -s -X GET "$BASE_URL/api/v1/doctor-review-tasks" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["items"][0]["id"])')

echo "$TASK_ID"
```

---

## 7. 查看待触达动作
```bash
curl -s -X GET "$BASE_URL/api/v1/patient-outreach-actions" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

## 8. 查看 dashboard
```bash
curl -s -X GET "$BASE_URL/api/v1/dashboard/overview" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

重点看：
- `todayRecordTotal`
- `pendingDoctorReviewTotal`
- `pendingOutreachActionTotal`

---

## 9. 完成医生任务
```bash
curl -s -X PATCH "$BASE_URL/api/v1/doctor-review-tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"done"}' | python3 -m json.tool
```

---

## 10. 再看待触达动作与 dashboard
```bash
curl -s -X GET "$BASE_URL/api/v1/patient-outreach-actions" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

curl -s -X GET "$BASE_URL/api/v1/dashboard/overview" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

预期：
- 关联 `manual_followup` 状态变为 `done`
- `pendingDoctorReviewTotal` 下降
- `pendingOutreachActionTotal` 下降

---

## 11. 预览待触达动作是否可发送（真实企微接入前）
先提取一条动作 ID：
```bash
ACTION_ID=$(curl -s -X GET "$BASE_URL/api/v1/patient-outreach-actions" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["items"][0]["id"])')

echo "$ACTION_ID"
```

预览发送条件：
```bash
curl -s -X GET "$BASE_URL/api/v1/patient-outreach-actions/$ACTION_ID/send-preview" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

可观察：
- `wecomConfigReady`
- `receiver`
- `messagePreview`
- `sendable`

---

## 12. 查看单条触达动作详情（P8）
```bash
curl -s -X GET "$BASE_URL/api/v1/patient-outreach-actions/$ACTION_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

可观察：
- `status`
- `sentAt`
- `failureReason`
- `summary`

---

## 13. 手动触发发送（真实企微 API 发送 + 状态回写验证）
```bash
curl -s -X POST "$BASE_URL/api/v1/patient-outreach-actions/$ACTION_ID/send" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

如果当前未具备真实企微绑定或企微配置，预期：
- 动作状态变为 `failed`
- 返回中可见 `failureReason`
- 可看到 `sender.requestPreview`

如果当前已配置真实企微参数并发送成功，预期：
- 动作状态变为 `done`
- 返回中可看到 `mode=sent`
- 可看到 `sender.platformResult.msgId`

如果当前真实发送失败，预期：
- 动作状态变为 `failed`
- 可看到 `sender.platformResult.errorCode / errorMessage`
- 可据此继续排查企微权限、接收人类型、应用可见范围

---

## 14. 手动更新触达动作状态（P8）
```bash
curl -s -X PATCH "$BASE_URL/api/v1/patient-outreach-actions/$ACTION_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"closed"}' | python3 -m json.tool
```

如需模拟失败：
```bash
curl -s -X PATCH "$BASE_URL/api/v1/patient-outreach-actions/$ACTION_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"failed","failureReason":"manual retry required"}' | python3 -m json.tool
```

作用：
- 演示触达动作已经具备最小状态机控制面
- 后续真实企微接入时不用回头改模型

---

## 15. 查看发送日志列表 / 按动作过滤 / 单条详情（P9）
查看列表：
```bash
curl -s -X GET "$BASE_URL/api/v1/patient-outreach-delivery-logs" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

按动作过滤：
```bash
curl -s -X GET "$BASE_URL/api/v1/patient-outreach-delivery-logs?actionId=$ACTION_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

查看单条日志详情：
```bash
LOG_ID=$(curl -s -X GET "$BASE_URL/api/v1/patient-outreach-delivery-logs?actionId=$ACTION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["items"][0]["id"])')

echo "$LOG_ID"

curl -s -X GET "$BASE_URL/api/v1/patient-outreach-delivery-logs/$LOG_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

可观察：
- `deliveryStatus`
- `platformMessageId`
- `receiverType`
- `receiverId`
- `failureReason`

---

## 演示建议
1. 先跑自检，再登录
2. 每次演示使用新的 `PATIENT_MOBILE`
3. 重点展示“异常触发 → 自动任务 → 自动触达 → dashboard → 完成任务后自动收口”
4. 如要展示真实企微发送能力，补演 `send` + `delivery log`
5. 如果时间紧，只演示主线，不展开异常分支说明
