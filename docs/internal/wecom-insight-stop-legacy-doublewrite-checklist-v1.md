# 停旧表双写前检查清单 v1

更新时间：2026-03-30

## 目标

本清单用于判断：

> 在什么条件下，可以把 analyze 的旧 insight 表双写正式停掉，只保留新表写入。

---

## 一、接口验证

### 1. analyze 接口
- [ ] 连续多次调用 `POST /api/v1/wecom/conversations/:conversationId/analyze` 均成功
- [ ] analyze 返回结构稳定包含：
  - [ ] `summaryText`
  - [ ] `stage`
  - [ ] `needs`
  - [ ] `nextActions`
  - [ ] `confidence`
  - [ ] `evidenceMessageIds`

### 2. latest insight 接口
- [ ] `GET /api/v1/wecom/conversations/:conversationId/insight` 稳定成功
- [ ] latest insight 返回结构稳定包含：
  - [ ] `summaryText`
  - [ ] `stage`
  - [ ] `needs`
  - [ ] `nextActions`
  - [ ] `confidence`
  - [ ] `evidenceMessageIds`
- [ ] latest insight 已确认优先命中新表结果

---

## 二、前端消费验证

### 3. detail 页 insight 区
- [ ] summary / stage / confidence / generatedAt 展示正常
- [ ] evidenceMessageIds 展示正常
- [ ] 点击“生成 insight”后可自动刷新
- [ ] D4 摘要展示正常

### 4. 页面稳定性
- [ ] 前端 build 通过
- [ ] analyze 后页面未出现明显空态/错态异常

---

## 三、新表验证

### 5. 新表写入验证
- [ ] `wecom_conversation_insights_v1` 已建表成功
- [ ] analyze 后新表有新增记录
- [ ] 新表记录包含：
  - [ ] `summary`
  - [ ] `stage`
  - [ ] `needs_json`
  - [ ] `next_actions_json`
  - [ ] `confidence`
  - [ ] `evidence_message_ids_json`

### 6. 新表主读验证
- [ ] latest insight 返回结果已与新表一致
- [ ] 不依赖旧表特有字段完成当前页面展示

---

## 四、旧表依赖排查

### 7. 旧表读取点排查
- [ ] 已确认当前主要读取链已转向新表优先
- [ ] 已确认没有关键页面/接口仍强依赖旧表独有结构

### 8. 旧表写入必要性排查
- [ ] 已明确旧表当前仅用于兼容，而非主结构
- [ ] 已明确停止旧写后的回滚方式

---

## 五、执行策略

### 满足以下情况后，可考虑进入“停旧写灰度”
- [ ] 上述检查项大部分已完成
- [ ] 新表链路已稳定运行一段时间
- [ ] 已准备回滚方案

### 灰度阶段建议
- [ ] 先在小范围/测试窗口停旧写
- [ ] 保留 latest insight 的旧表回退读
- [ ] 验证无明显回归后，再正式停旧写

---

## 一句话结论

停旧表双写不应靠感觉，而应按清单确认：

**只有当接口、新表、前端消费、旧依赖排查都基本稳定后，才适合进入停旧写灰度。**
