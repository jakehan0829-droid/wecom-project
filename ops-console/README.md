# 企微运营台 v4

这是当前项目的最小结构化运营台，用于把已完成的企微能力接成“可看 + 可操作 + 可联动 + 更像工作台”的前端入口。

## 当前能力

- 顶部盘面卡片（`/api/v1/wecom/ops-summary`）
- 左侧会话列表（`/api/v1/wecom/conversations`）
- 状态筛选 / 关键词搜索
- 最近消息展示（`/api/v1/wecom/conversations/:conversationId/messages`）
- Pending actions 列表联动（`/api/v1/wecom/conversations/:conversationId/pending-actions`）
- Actions 历史（`/api/v1/wecom/conversations/:conversationId/action-history`）
- 一键处理 pending actions（`PATCH /api/v1/patient-outreach-actions/:id/status`）
- 动作处理备注 / failureReason 输入
- 事件状态时间线（timeline UI）
- 自动化审计时间线（timeline UI）
- 触发业务动作（`/api/v1/wecom/conversations/:conversationId/business-actions`）

## 使用方式

1. 启动 backend
2. 准备一个可用 JWT Token
3. 本地打开 `index.html`
4. 填写：
   - Base URL（默认 `http://127.0.0.1:3313`）
   - Bearer Token
5. 点击“刷新”加载盘面与会话列表
6. 点击左侧会话查看详情
7. 在右侧直接：
   - 查看 pending actions
   - 输入处理备注后点击 done / failed / closed
   - 查看 actions 历史
   - 查看事件状态时间线
   - 查看自动化审计时间线
   - 触发业务动作

## 当前定位

这仍不是正式前端框架版，而是一版“最小工作台运营台 v4”。

目的：
- 快速形成前后端联通的最小业务工作台
- 支撑运营/产品演示与内部评审
- 为后续 React/Vue 正式后台提供页面原型、接口与交互流程基础
