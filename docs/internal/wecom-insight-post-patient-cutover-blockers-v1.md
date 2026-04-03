# patient latestInsight 切换后，停旧写灰度硬阻塞重评估 v1

更新时间：2026-03-30

## 1. 本轮进展

本轮已完成第二条轻量旧表读取链迁移：
- `backend/src/modules/patient/service/patient.service.ts`
- `latestInsight` 已从旧表 `wecom_conversation_insights` 改为查询新表 `wecom_conversation_insights_v1`

并完成接口验证：
- patient detail 接口可正常返回
- 接口未报错

---

## 2. 本轮验证发现

### 发现 1：patient detail 已切到新表口径
这是积极进展，说明旧表读取面继续缩小。

### 发现 2：当前 `latestInsight` 返回为 null
实际验证时：
- patient detail 接口成功
- 但 `latestInsight = null`

这不是接口报错，而是一个数据映射现象：
- 当前新表里 `customer_id` 维度的数据沉淀还不充分
- 说明 patient 详情虽然已切到新表，但“按 patient/customer 维度稳定取 insight”还没有完全跑实

---

## 3. 这意味着什么

切完 patient 之后，当前离“停旧写灰度”仍有几个硬阻塞，而且其中一个已经更具体了。

---

## 4. 当前剩余硬阻塞

### 硬阻塞 1：patient/customer 维度的新表数据还不稳定
现象：
- patient detail 已改查新表
- 但当前最新 insight 返回为空

说明：
- 新表主链在 conversation 维度已较稳定
- 但在 patient/customer 维度还没有形成稳定消费能力

### 硬阻塞 2：insight list / detail 旧接口仍未迁
当前：
- `listWecomInsights`
- `getWecomInsightDetail`
仍直接查旧表

### 硬阻塞 3：business-feedback 仍深度依赖旧结构
当前：
- 直接读取旧表
- 且依赖旧 json 字段语义

### 硬阻塞 4：action-feedback 仍直接写旧表
当前：
- 即使 analyze 停旧写
- 旧表仍会继续收到 action feedback 新写入

---

## 5. 当前阶段判断

现在可以确认：
- dashboard 统计已切
- patient detail latestInsight 已切

但这并不代表已经接近可以直接灰度停旧写。

更准确的阶段判断是：

> **轻量读取链迁移已启动，但真正阻塞停旧写的关键问题，已经集中到“patient/customer 维度数据沉淀不足”与“旧表深依赖链尚未处理”两块。**

---

## 6. 一句话结论

切完 patient 后，当前离停旧写灰度仍有四个硬阻塞：
1. patient/customer 维度新表数据不稳定
2. insight list/detail 旧接口未迁
3. business-feedback 深依赖旧结构
4. action-feedback 仍直接写旧表
