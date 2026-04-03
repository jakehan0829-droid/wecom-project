# 企微映射治理台接口 v1

更新时间：2026-03-30

## 1. 新增接口

新增治理台专用接口：
```http
GET /api/v1/wecom/mapping-governance/dashboard
```

定位：
- 面向页面固定 section 输出
- 不是简单 summary 明细拼接
- 前端可直接消费

---

## 2. 返回结构

返回固定包含：
- `meta`
- `cards`
- `charts`
- `tables`

### meta
包含：
- `timePreset`
- `startTime`
- `endTime`
- `limit`

### cards
固定卡片字段：
- `totalActions`
- `manualConfirmTotal`
- `manualUnconfirmTotal`
- `reassignTotal`
- `promoteBindingTotal`
- `conversationTouchedTotal`

### charts
当前包含：
- `byAction`
- `byMatchedBy`

### tables
当前包含：
- `byConversation`
- `recentActions`
- `latestUnmappedCustomers`
- `latestConflictCustomers`

---

## 3. 当前支持的时间预设

明细接口、summary 接口、governance dashboard 接口统一支持：
- `24h`
- `7d`
- `today`
- `yesterday`
- `this_week`

这意味着前端不需要自己拼时间区间。

---

## 4. 当前价值

到当前为止，前端若要做第一版治理台，已经不需要自己拼多个接口返回结构。

直接调用：
- `/api/v1/wecom/mapping-governance/dashboard`

即可拿到：
- 顶部卡片
- 图表数据
- 最近治理动作
- 最新未映射对象
- 最新冲突对象

---

## 5. 一句话结论

当前企微映射治理台接口已经具备第一版页面直连能力：

**前端只需请求一个 dashboard 接口，就能同时拿到 cards / charts / tables 三层固定结构。**
