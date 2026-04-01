# 详情页继续增强：operatorName 真联调闭环 / 被过滤重复消息展开区 v14

更新时间：2026-03-30

## 本轮新增

### 1. operatorName 真联调闭环完成
- 已定位并重启当前 3000 端口旧后端服务，切到最新 `dist/main.js`
- 已再次发起真实治理动作请求：
  - conversationId: `wecom:private:mapping-chat-demo-001`
  - action: `reassign`
  - operatorName: `HanCong`
  - operatorNote: `operatorName联调验证-重启后复测`
- 回查 audit 成功看到：
  - `detail.operatorName = HanCong`
  - 顶层 `operatorName = HanCong`

### 2. 被去重过滤消息可展开
- 在高重复场景下可点击“展开被过滤消息”
- 单独展示被去重过滤掉的消息列表
- 让“非重复文本判断视图”不再只是提示，而有完整旁路信息

### 3. 当前结论
- operatorName 责任链已从代码链路 -> 编译通过 -> 真实请求 -> audit 返回，形成完整闭环
- 详情页的消息区也进一步具备“主判断视图 + 被过滤旁路信息”的正式后台形态

## 一句话结论

这轮已经把最关键的一段闭环做实了：责任链真实落库并能回显，消息去重也不再是黑盒过滤。
