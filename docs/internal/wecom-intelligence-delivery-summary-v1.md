# 企微智能接入强化｜交付总结 v1

更新时间：2026-03-29

## 1. 当前交付范围

本轮已完成企业微信（企微）消息接入从“骨架态”到“可本地闭环验证、可业务语义驱动、可审计可运营”的强化落地。

当前已具备：

- 企微 webhook URL 校验
- 企微加密 POST 回调验签与解密
- XML 原生接收与标准化
- 消息 / 会话 / 患者映射入库
- 事件分类与生命周期状态机
- 自动分析 / 自动反馈 / 自动业务动作
- 生命周期收口（联系人删除 / 群关闭自动关单）
- 会话主状态回写
- 自动化审计落库
- 幂等去重（自动化层 + 动作层）
- 运营查询接口与汇总视图

---

## 2. 核心能力清单

### 2.1 企微接入层

已支持：

- `GET /api/v1/wecom/webhook`
- `POST /api/v1/wecom/webhook`
- `GET /api/wecom/callback`（兼容旧路径）
- `POST /api/wecom/callback`（兼容旧路径）

能力包括：

- msg_signature 校验
- echostr 解密
- AES-256-CBC 解密
- PKCS7 padding 处理
- corpId 校验
- 原生 XML envelope 接收
- 解密 XML 标准化

### 2.2 业务入库层

已打通：

- `wecom_conversations`
- `wecom_messages`
- `patient_wecom_binding` → patient mapping

行为特点：

- 未命中 patient 映射时，可先以 external_user_id 级别落库
- 命中映射后，`primary_customer_id` / `linked_customer_id` 会提升为 `patientId`

### 2.3 事件语义层

当前标准字段：

- `eventCategory`
- `eventAction`
- `lifecycleStatus`
- `stateTransition`
- `eventPayload`

已覆盖事件：

- `enter_agent`
- `change_external_contact`
  - `add_external_contact`
  - `edit_external_contact`
  - `del_external_contact`
- `change_external_chat`
  - `dismiss_chat`
  - 其他群聊变更
- `batch_job_result`
- 普通消息事件

### 2.4 自动化层

当前已接入 webhook 主链：

- `analyzeConversationMessages`
- `generateBusinessFeedback`
- `generateBusinessActions`
- 生命周期关单逻辑

自动动作规则已支持：

- `enter_agent` → `welcome_followup`
- `edit_external_contact` → `profile_completion`
- 普通消息 / 自动化 → `manual_followup`
- `dismiss_chat` / `del_external_contact` → 自动关闭 pending 动作

### 2.5 治理与可观测层

已具备：

- `wecom_event_state`：事件状态流落库
- `wecom_automation_audit`：自动化审计落库
- `wecom_conversations.status`：会话主状态回写

已支持状态：

- `active`
- `welcome_pending`
- `profile_update_pending`
- `followup_pending`
- `group_closed`
- `contact_lost`

已支持状态优先级保护：

- `group_closed` / `contact_lost` 不会被低优先级状态覆盖

### 2.6 幂等去重层

已支持：

- 按 `message_id` 去重自动化执行
- 按 `conversation + trigger_event + trigger_action + state_transition + 当天` 去重自动化执行
- 按 `patient + actionType + triggerSource + pending + 当天` 去重业务动作

### 2.7 查询与运营视图

已提供接口：

- `GET /api/v1/wecom/event-states`
- `GET /api/v1/wecom/automation-audit`
- `GET /api/v1/wecom/conversations/:conversationId/ops-view`
- `GET /api/v1/wecom/ops-summary`

`ops-summary` 已输出 dashboard-friendly 指标：

- current.activeConversations
- current.groupClosedConversations
- current.contactLostConversations
- current.welcomePendingConversations
- current.profileUpdatePendingConversations
- current.followupPendingConversations
- today.createdWelcomeFollowup
- today.createdProfileCompletion
- today.createdManualFollowup
- today.closedByGroupClosed
- today.closedByContactLost
- today.duplicateSkipped
- today.automationTriggered
- today.automationSkipped

---

## 3. 当前数据流（简化）

企微回调
→ 验签 / 解密 / XML 标准化
→ intake 入库（conversation / message / patient mapping）
→ 事件自动化（insight / feedback / action / closure）
→ event_state 落库
→ conversation.status 回写
→ automation_audit 落库
→ 查询接口 / 汇总视图输出

---

## 4. 已完成的关键验证

已实际跑通：

### 4.1 协议层验证
- GET URL 校验返回纯文本 `echostr`
- POST 加密回调返回纯文本 `success`

### 4.2 本地闭环验证
- demo server + demo sample 已跑通
- 本地 webhook 闭环通过

### 4.3 业务入库验证
- `wecom_conversations` 已落库
- `wecom_messages` 已落库
- `patient mapping` 已命中并落为 patientId

### 4.4 事件语义与动作验证
- `enter_agent` → `welcome_followup + wecom_event`
- `edit_external_contact` → `profile_completion + wecom_event`
- `dismiss_chat` → `group_closed + 自动关单`
- `del_external_contact` → `contact_lost + 自动关单`

### 4.5 治理与运营验证
- `stateTransition` 已落库
- `conversation.status` 已回写
- `automation_audit` 已落库
- 幂等去重已命中 `duplicate_message_id`
- `/api/v1/wecom/ops-summary` 已返回可用盘面数据

---

## 5. 仍未完成 / 待下一阶段推进

### 5.1 真实企微后台联调
当前仍缺：

- 真实 `WECOM_TOKEN`
- 真实 `WECOM_AES_KEY`
- 真实 HTTPS 域名与回调地址在企微后台配置

### 5.2 更深的业务规则
待后续可继续补：

- 欢迎语专属状态机细化
- 群成员变更 / 群名变更等更多群聊规则
- 动作优先级进一步细化
- 自动化审计的跳过原因细化

### 5.3 工程化增强
待后续可继续补：

- 自动化 / 运营接口权限细分
- 单元测试 / 集成测试收口
- 前端 dashboard 接入
- 正式部署与反代配置固化

---

## 6. 当前结论

当前这条企微能力链已经不再是“接进来能收消息”的级别，而是：

- 可接入
- 可入库
- 可解释
- 可驱动动作
- 可自动收口
- 可审计
- 可运营观察

可以定义为：

**“企微智能接入强化：本地业务语义闭环版已完成”**
