# 企微最小聊天分析闭环 backend 实现任务单 V1

## 1. 任务目标

将企微聊天分析闭环从结构定义和接口草案推进到 backend 实现任务层，重点打通：

**读取消息 → 组织输入 → 生成 insight → 保存 insight → 查询回看 → 输出建议**

---

## 2. 实现范围

### 纳入范围
- 单 customer / 单 conversation 最小分析
- 最小八类输出
- insight 入库
- insight 查询回看
- next action / plan update 建议输出

### 暂不纳入范围
- 复杂多模态分析
- 全量自动调度
- 高级客户画像与复杂运营策略

---

## 3. backend 任务拆解

### A1. analyze 接口任务
- 新增按 conversation 触发分析接口
- 可选新增按 customer 触发分析接口

完成标准：
- 至少支持一类最小 analyze 入口

---

### A2. 消息读取与输入组装任务
- 从 wecom_messages 读取最近 N 条或时间窗口消息
- 组装标准化分析输入

完成标准：
- analyze 流程可获得稳定输入

---

### A3. 最小分析处理任务
- 生成 summary
- 生成 need points
- 生成 concern points
- 生成 objection points
- 生成 risk signals
- 生成 intent assessment

完成标准：
- 可生成结构化 insight 主体

---

### A4. 建议生成任务
- 生成 nextActionSuggestions
- 生成 planUpdateSuggestions

完成标准：
- insight 不止有摘要，还有动作和方案建议

---

### A5. insight 入库任务
- 将分析结果写入 wecom_conversation_insights
- 关联 customer / conversation

完成标准：
- insight 结果可保存

---

### A6. insight 查询接口任务
- 查询 insight 列表
- 查询 insight 详情

完成标准：
- 可按 customer / conversation 回看分析结果

---

### A7. 最小验证任务
- 准备一组客户聊天样例
- 跑通 message → analyze → insight → query 全链路

完成标准：
- 可证明最小聊天分析闭环已打通

---

## 4. 建议模块落点

建议新增或扩展企微相关 backend 模块，至少包括：
- analyze controller
- insight service
- message read service
- analysis processing service
- insight query service

---

## 5. 验收标准

必须满足：
- 至少一组消息可生成 insight
- insight 包含最小八类输出
- 至少有一条 nextActionSuggestion
- 至少有一条 planUpdateSuggestion
- insight 可查询回看

---

## 6. 文档结论

本任务单用于把企微最小聊天分析闭环正式压到 backend 实现层，作为冲刺 2 的核心执行依据。
