# MVP 后端闭环演示流 v2

## 目标
把当前 backend 已经落地并验证通过的最小业务闭环，整理成一条可重复演示、可预期观察结果、可快速自检的标准演示流。

适用范围：
- 本机 backend 已由 PM2 托管在线
- PostgreSQL 已可用
- 演示账号可正常登录

---

## 演示前 30 秒自检
先执行：

```bash
cd /root/.openclaw/workspace/project
node scripts/runtime-check.js
```

预期：
- `overallOk=true`
- PM2 显示 `chronic-disease-backend` 为 `online`
- `/health` 返回 `status=ok`

若失败：
- 先看 `pm2 logs chronic-disease-backend --lines 100 --nostream`
- 再参考 `project/docs/ops-watch-checklist.md`

---

## 演示账号
```text
mobile: 13800000000
password: demo123456
```

---

## Step 1 登录
调用：
- `POST /api/v1/auth/login`

目标：
- 获取 `accessToken`

预期：
- `success=true`
- 返回 token

---

## Step 2 创建患者
调用：
- `POST /api/v1/patients`

建议：
- 使用新的手机号，避免与历史演示数据冲突

目标：
- 创建一名新的糖尿病患者

预期：
- `201`
- 返回 `patientId`

---

## Step 3 绑定企微身份（P2）
调用：
- `POST /api/v1/patients/:id/wecom-binding`

建议 payload：
```json
{
  "bindingType": "external_user",
  "externalUserId": "wm_demo_patient_001"
}
```

目标：
- 演示 patient 存在性校验之后的正常绑定路径

预期：
- `201`
- 返回绑定记录
- `bindingStatus=bound`

可补充演示的异常情况（选讲，不一定现场跑）：
- 患者不存在 → `404 patient not found`
- 字段不匹配 → `400`
- 重复绑定 → 返回已有记录，不重复插入

---

## Step 4 写入正常健康记录（可选）
调用：
- `POST /api/v1/patients/:id/weight-records`

目标：
- 证明系统不仅能收异常数据，也能正常收日常记录

预期：
- `201`
- 返回体重记录

---

## Step 5 写入异常血糖记录（P1 + P5）
调用：
- `POST /api/v1/patients/:id/glucose-records`

建议 payload：
```json
{
  "measureTime": "2026-03-27T14:12:00+08:00",
  "glucoseValue": 13.6,
  "measureScene": "after_meal",
  "source": "manual"
}
```

目标：
- 触发异常记录联动闭环

预期：
- 当前接口本身返回血糖记录写入成功
- 后续查询时可看到：
  1. 自动生成医生任务
  2. 自动生成待触达动作
  3. dashboard 数据变化

---

## Step 6 查看医生任务列表（P1）
调用：
- `GET /api/v1/doctor-review-tasks`

目标：
- 证明异常血糖已触发医生处理任务

预期：
- 出现一条新的 pending 任务
- summary 类似：
  - `血糖异常自动触发：glucoseValue=13.6，建议医生复核`

说明：
- 同患者同类异常当天再次触发时，任务具备最小防重复能力

---

## Step 7 查看患者待触达动作（P3 + P5）
调用：
- `GET /api/v1/patient-outreach-actions`

目标：
- 证明异常血糖已触发待触达动作

预期：
- 出现一条新的 pending 动作
- `actionType=manual_followup`
- summary 类似：
  - `血糖异常后建议尽快联系患者：glucoseValue=13.6`

说明：
- 同患者同类动作当天具备最小防重复能力

---

## Step 8 查看 dashboard（P4 + P5）
调用：
- `GET /api/v1/dashboard/overview`

目标：
- 演示 dashboard 已开始反映真实业务动作，而不只是旧版演示数字

重点看：
- `todayRecordTotal`
- `pendingDoctorReviewTotal`
- `pendingOutreachActionTotal`

预期：
- `todayRecordTotal` 统计血糖 + 血压 + 体重
- `pendingDoctorReviewTotal` 因异常记录而增加
- `pendingOutreachActionTotal` 因触达动作而增加

---

## Step 9 完成医生任务（P6）
调用：
- `PATCH /api/v1/doctor-review-tasks/:id`

建议 payload：
```json
{
  "status": "done"
}
```

目标：
- 演示医生处理完成后的闭环联动

预期：
- 当前医生任务状态变为 `done`
- 关联 `manual_followup` 触达动作自动变为 `done`

---

## Step 10 再次查看触达动作与 dashboard（P6）
调用：
- `GET /api/v1/patient-outreach-actions`
- `GET /api/v1/dashboard/overview`

目标：
- 演示闭环已完成，不只是新增对象

预期：
- 相关触达动作 `status` 从 `pending` 变为 `done`
- `pendingDoctorReviewTotal` 下降
- `pendingOutreachActionTotal` 下降

---

## Step 11 可选：预览待触达动作是否可发送（真实企微接入前）
调用：
- `GET /api/v1/patient-outreach-actions/:id/send-preview`

目标：
- 演示系统已经开始具备“真实企微发送前的发送条件预检查”能力

预期：
- 可看到：
  - `wecomConfigReady`
  - `receiver`
  - `messagePreview`
  - `sendable`

说明：
- 这一步不是证明已经真实发出企微消息
- 而是证明发送前判断逻辑已经被收敛到接口层

---

## Step 12 可选：查看单条触达动作详情（P8）
调用：
- `GET /api/v1/patient-outreach-actions/:id`

目标：
- 演示待触达动作已经不是只有列表，而是开始具备单条详情读取能力

预期：
- 可直接看到：
  - `status`
  - `sentAt`
  - `failureReason`
  - `summary`

---

## Step 13 可选：手动触发发送（真实企微 API 发送 + 状态回写验证）
调用：
- `POST /api/v1/patient-outreach-actions/:id/send`

目标：
- 演示系统已具备真实企微发送入口、发送适配层和状态回写能力

预期：
- 若当前缺少真实企微配置或有效绑定，动作会进入 `failed`
- 可看到 `failureReason`
- 返回中可看到 `sender.requestPreview`
- 若真实发送成功，动作会进入 `done`，并返回 `sender.platformResult.msgId`
- 若真实发送失败，可看到 `sender.platformResult.errorCode / errorMessage`

说明：
- 现在这一步已经不只是发送前最后基础层
- 而是已经接入真实企微 API 发送链
- 剩余差异主要在于真实配置、应用可见范围、接收人类型和权限校验

---

## Step 14 可选：手动更新触达动作状态（P8）
调用：
- `PATCH /api/v1/patient-outreach-actions/:id/status`

目标：
- 演示待触达动作已经具备最小状态机控制面

预期：
- 可手动流转到 `closed / failed / done / pending`
- 后续真实企微发送、重试、人工兜底时不用再回头改模型

---

## 这条演示流最终证明了什么
当前 MVP backend 已经具备：

1. 患者创建
2. 企微身份绑定基础校验
3. 健康记录写入
4. 异常记录自动生成医生任务
5. 异常记录自动生成待触达动作
6. dashboard 实时反映关键业务状态
7. 医生任务完成后自动关闭关联待触达动作
8. 真实企微发送前的预检查与手动触发入口
9. 发送失败结果可回写到系统动作状态
10. 待触达动作具备单条详情读取能力
11. 待触达动作具备最小状态机控制面
12. 发送适配层已被单独拆出，并已接入真实企微 API 链
13. 当前剩余差异主要集中在真实配置、应用权限、可见范围和接收人口径

也就是说，系统已经从“接口演示骨架”推进到：
**具备最小业务联动闭环，并开始逼近真实企微发送接入前最后基础层的可演示后端**。

---

## 演示时最推荐强调的 3 个点
1. **不是只会存数据**：异常数据会触发后续动作
2. **不是只会堆对象**：医生任务和待触达动作会联动闭环
3. **不是假 dashboard**：看板会反映真实 pending 状态变化

---

## 如需进一步稳定演示
演示前建议：
1. 先跑 `node scripts/runtime-check.js`
2. 使用新的手机号创建新患者
3. 演示只选一条异常记录主线，不要现场分叉太多
4. 若要解释异常路径，可口头说明 P2 的错误返回能力，不一定全现场重跑
