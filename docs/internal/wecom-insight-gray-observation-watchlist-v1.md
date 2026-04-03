# 灰度观察期关注项 / 异常信号清单 v1

更新时间：2026-03-30

## 1. 观察期目标

当前已进入：
- analyze 停旧写第一轮灰度通过后的继续观察期

观察期的目标不是继续改结构，而是确认：

> **系统是否已经能在 analyze 不写旧表的情况下稳定运行，而没有隐性旧表写依赖。**

---

## 2. 重点关注项

### A. analyze 主链
关注：
- `POST /api/v1/wecom/conversations/:conversationId/analyze` 是否持续成功
- 新生成 insight 是否持续进入新表

### B. latest insight 主链
关注：
- `GET /api/v1/wecom/conversations/:conversationId/insight` 是否持续成功
- 是否能拿到刚生成的新 insight

### C. patient detail
关注：
- `latestInsight` 是否持续正常
- patient/customer ref 维度查询是否稳定

### D. insight list/detail
关注：
- 新生成 insight 是否能出现在 list/detail 中
- detail 返回结构是否稳定完整

### E. business-feedback
关注：
- conversation business-feedback 是否稳定
- customer business-feedback 是否稳定

### F. action-feedback 旁路
关注：
- feedback 写入后，新表是否也有对应记录
- 旧表兼容写存在期间，是否出现新旧数据明显不一致

---

## 3. 重点异常信号

如果出现以下信号，应视为观察期异常：

### 异常信号 1
analyze 成功，但 latest insight 查不到新生成数据

### 异常信号 2
patient detail 的 latestInsight 出现明显回退或空值异常

### 异常信号 3
insight list/detail 无法读到新生成 insight

### 异常信号 4
business-feedback 返回 no_insight 或结构异常明显增多

### 异常信号 5
新表记录新增正常，但消费侧结果和旧逻辑明显不一致

### 异常信号 6
action-feedback 写入后，新表时间线缺失反馈类记录

---

## 4. 一句话结论

观察期最该盯的不是“有没有更多优化空间”，而是：

**有没有出现任何信号表明系统其实还在隐性依赖 analyze 对旧表的写入。**
