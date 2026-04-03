# insight list/detail 切到新表后，停 analyze 旧表双写硬阻塞重评估 v1

更新时间：2026-03-30

## 1. 本轮进展

本轮已完成：
- `GET /api/v1/wecom/insights` 切到 v1 新表
- `GET /api/v1/wecom/insights/:insightId` 切到 v1 新表

并完成联调验证：
- list 可正常返回
- detail 可正常返回
- detail 已返回 `customerRef / patientRef / d4Summary` 等新结构字段

---

## 2. 当前已完成的新表读取链

截至本轮，已切到新表或新模型上的读取链包括：
- latest conversation insight
- dashboard insight 统计
- patient detail latestInsight
- insight list
- insight detail

这说明：
- 旧表读取面已经显著缩小
- 新表已不再只是单点试运行，而是开始承接多条正式读取链

---

## 3. 当前离“停 analyze 旧表双写”还剩的真正硬阻塞

### 硬阻塞 1：business-feedback 仍深度依赖旧表结构
文件：
- `backend/src/modules/wecom-intelligence/service/business-feedback.service.ts`

当前问题：
- 仍直接读取旧表
- 依赖旧 json 结构字段：
  - `intent_assessment_json`
  - `next_action_suggestions_json`
  - `plan_update_suggestions_json`

判断：
- 这是当前最主要的读取侧硬阻塞

### 硬阻塞 2：action-feedback 仍直接写旧表
文件：
- `backend/src/modules/wecom-intelligence/service/action-feedback.service.ts`

当前问题：
- 这条链仍直接插入旧表
- 即使 analyze 停旧写，旧表也仍会继续新增数据

判断：
- 这是当前最主要的写入侧硬阻塞

---

## 4. 当前已不再是主要阻塞的项

以下项本轮之后已明显下降为“已处理或部分处理”：
- patient/customer 维度关联能力：已通过 `customer_ref / patient_ref` 开始落地
- insight list/detail 旧接口未迁：本轮已处理
- dashboard 统计旧口径：前轮已处理
- patient detail latestInsight：前轮+本轮模型修正后已处理

---

## 5. 当前阶段判断

现在阶段判断已经比之前更清楚：

> **如果只看主链和轻量读取链，已经很接近可以停止 analyze 的旧表双写；但从全局系统角度，还不能，因为 business-feedback 和 action-feedback 这两条旧表深依赖链还没处理。**

也就是说：
- 停 analyze 旧写的真正剩余阻塞，已经从“很多读取链没迁”收缩成了“两条关键旁路链没处理”

---

## 6. 一句话结论

在 insight list/detail 切到新表后，当前离“停 analyze 旧表双写”还剩的真正硬阻塞，已经主要只剩两条：

1. business-feedback 仍深度依赖旧表结构
2. action-feedback 仍直接写旧表
