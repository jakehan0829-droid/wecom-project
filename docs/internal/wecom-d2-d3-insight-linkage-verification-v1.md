# D2+D3 insight 链路联调验证记录 v1

更新时间：2026-03-30

## 本轮验证目标

验证以下链路是否已闭环：
- `POST /api/v1/wecom/conversations/:conversationId/analyze`
- `GET /api/v1/wecom/conversations/:conversationId/insight`
- 前端详情页 insight 区已具备展示位

---

## 验证动作

### 1. 后端切到最新代码
- 对 `project/backend` 执行 `npm run build`
- 停掉当前占用 3000 端口旧进程
- 重新以 `dist/main.js` 启动最新后端

### 2. 真实接口联调
测试会话：
- `wecom:private:mapping-chat-demo-001`

先调用：
- `POST /api/v1/wecom/conversations/:conversationId/analyze`

再调用：
- `GET /api/v1/wecom/conversations/:conversationId/insight`

---

## 验证结果

### analyze 已成功
返回中已包含：
- `conversationId`
- `analysisVersion = v1`
- `summaryText`
- `stage = consulting`
- `needs`
- `nextActions`
- `confidence = medium`
- `evidenceMessageIds = ["mapping-msg-demo-001"]`

### latest insight 已成功
返回中已包含：
- `insightId`
- `conversationId`
- `summaryText`
- `stage = consulting`
- `needs`
- `nextActions`
- `confidence`

说明：
- 新增的 `GET /conversation/:id/insight` 路由已在运行态生效
- D3 最新 insight 查询链已经形成

---

## 当前结论

D2+D3 当前已经完成一条最小可用链路：

> 会话消息存在 -> 手工 analyze -> insight 落库 -> latest insight 可查询

前端方面：
- detail 页 insight 展示区已补代码与样式
- 前端 build 已通过

因此当前阶段可以认为：
- D2+D3 第一版最小联调闭环已成立

---

## 当前仍存在的限制

### 1. latest insight 返回结构仍有兼容性痕迹
- `confidence` 在 latest 接口中当前是基于旧表分数回推
- `evidenceMessageIds` 当前在 latest 接口中还未完整回填

### 2. insight 存储仍基于旧表兼容扩展
- 尚未正式切到新设计的 `wecom_conversation_insights_v1` 结构

### 3. 前端 insight 区虽已具备展示位，但尚未完成真实页面截图验证

---

## 一句话结论

D2+D3 当前已经不是“设计可行”，而是：

**后端 analyze / latest insight 两条接口已在最新运行态完成真实联调，最小 insight 链路已闭环。**
