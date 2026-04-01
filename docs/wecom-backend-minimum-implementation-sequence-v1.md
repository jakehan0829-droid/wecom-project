# 企微项目后端最小实现顺序 V1

## 1. 文档目的

本文件用于把企微项目当前已完成的设计骨架，收口成后端可执行的最小实现顺序，避免实现阶段发散或顺序错误。

目标是：
- 先打通最小消息入库闭环
- 再打通最小聊天分析闭环
- 最后把分析结果接入方案反哺与业务动作

---

## 2. 实现顺序总原则

1. **先数据层，再接口层，再分析层，再业务反哺层**
2. **先消息进入系统，再分析消息，再利用分析结果**
3. **先私聊文本主链，再兼容群聊扩展**
4. **先最小可用，再逐步补厚**

---

## 3. 建议实现顺序

### 第 1 步：接入数据层基础表
内容：
- conversations 表
- participants 表
- messages 表
- insights 表

目标：
- 先把数据承载结构接好

完成判定：
- 数据表可用于后续 intake / analyze 接口接入

---

### 第 2 步：接入消息 intake 主链
内容：
- intake 路由
- intake controller
- 消息标准化 service
- message 写入 service

目标：
- 让一条私聊文本消息可以进系统

完成判定：
- 一条消息可成功入库

---

### 第 3 步：接入 conversation 归档与 customer 关联
内容：
- conversation upsert 逻辑
- customer 关联逻辑
- participant 预留逻辑

目标：
- 消息不再是孤立记录
- 可以挂到会话和客户

完成判定：
- 可按 customer / conversation 找到消息

---

### 第 4 步：实现最小消息查询接口
内容：
- 按 customer 查询消息
- 按 conversation 查询消息
- 按时间窗口查询消息

目标：
- 支撑回看与后续分析读取

完成判定：
- 至少能回看某客户最近消息

---

### 第 5 步：接入 analyze 主链
内容：
- analyze 路由
- analyze controller
- 消息读取与输入组装 service
- 最小分析处理 service

目标：
- 能从消息生成 insight

完成判定：
- 至少一组消息可生成结构化 insight

---

### 第 6 步：接入 insight 入库与查询
内容：
- insight 写入逻辑
- insight 查询接口
- insight 详情接口

目标：
- 分析结果能保存并回看

完成判定：
- 可按 customer / conversation 查到 insight

---

### 第 7 步：接入 next action / plan update 输出
内容：
- nextActionSuggestion 输出
- planUpdateSuggestion 输出

目标：
- 分析结果开始具备业务动作意义

完成判定：
- 至少输出一条下一步建议和一条方案更新建议

---

### 第 8 步：接入最小业务反哺落点
内容：
- 客户视图预留
- 方案更新建议预留
- 高风险/新增需求提醒预留

目标：
- 不让 insight 停留在数据库里

完成判定：
- insight 已可进入后续业务动作层

---

## 4. 当前阶段最关键的前三步

当前阶段优先只盯三步：
1. 数据表接入
2. intake 主链接入
3. conversation/customer 关联接入

原因：
- 没有消息入库，就没有后续分析
- 没有 conversation/customer，就没有业务意义

---

## 5. 文档结论

企微项目后端最小实现顺序应固定为：

> 数据层 → intake 主链 → 会话/客户归档 → 查询 → analyze 主链 → insight 入库 → 业务建议输出 → 反哺落点

后续开发与任务拆解应按此顺序推进，不再发散并行乱做。
