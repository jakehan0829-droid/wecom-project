# 灰度观察期抽检记录 v1

更新时间：2026-03-30

## 1. 本轮抽检目标

根据《灰度观察期关注项 / 异常信号清单 v1》，对当前灰度状态做一轮真实抽检，并额外验证 action-feedback 新表同步写是否已经落地。

---

## 2. 主链抽检结果

本轮已抽检：
- analyze
- latest insight
- patient detail latestInsight
- insight list
- insight detail
- business-feedback

### 实测结果
- `analyzeSuccess = true`
- `latestSuccess = true`
- `patientLatestInsightOk = true`
- `listCount = 5`
- `detailOk = true`
- `businessFeedbackStatus = ready`

判断：
- 当前未发现“analyze 停旧写后主链异常”的信号

---

## 3. action-feedback 新表同步写验证

本轮选取样本：
- `patient_outreach_action.id = a8bfd73f-c331-4fc7-8811-d08a0e1055d7`

实际执行：
- 调用 `POST /api/v1/patient-outreach-actions/:id/feedback`
- payload: `status=done`, `feedbackType=completed`, `notes=灰度观察期抽检`

### 验证结果
反馈 API 成功。

随后直接查库确认：

#### 新表 v1
已存在记录：
- `conversation_id = action-feedback:a8bfd73f-c331-4fc7-8811-d08a0e1055d7`
- `patient_ref = pt_wecom_demo_001`
- `analysis_version = v1-feedback`
- `summary = 动作反馈：completed｜灰度观察期抽检`

#### 旧表
也存在对应兼容记录。

判断：
- action-feedback 新表同步写已实际生效
- 当前未发现“feedback 只落旧表、不落新表”的异常

---

## 4. 本轮观察结论

本轮抽检未发现关键异常信号：
- analyze 停旧写后主链仍正常
- 主要消费链仍正常
- action-feedback 新表同步写已验证成功

---

## 5. 一句话结论

本轮观察期抽检结果为正：

**当前尚未发现系统仍隐性依赖 analyze 旧写的明显信号，同时 action-feedback 新表同步写也已验证成立。**
