# 企微接入与映射治理阶段总结 v1

更新时间：2026-03-30

## 1. 本阶段目标

本阶段主要完成两条主线：

### 主线 A：真实 webhook 运行方式固化
目标：
- 不再停留在“代码里有 webhook”
- 而是把真实外网入口、PM2 运行方式、联调脚本、日志观察面正式固定下来

### 主线 B：customerId -> patientId 映射治理链搭建
目标：
- 不再只是“临时查映射”
- 而是补齐观察、处理、审计、治理台、owner 迁移收口等能力

---

## 2. 已完成内容概览

### A. webhook 固化已完成
已完成：
- 外网正式入口确认：`https://www.moshengyuan.com/api/v1/wecom/webhook`
- Nginx -> backend 反代确认
- backend 从 `dev/tsx` 切换到 `dist/main.js` 正式运行
- 新增 PM2 配置：`backend/ecosystem.config.cjs`
- 新增重建脚本：`project/ops/fix-pm2-runtime.sh`
- 新增正式运行文档：`project/docs/wecom-webhook-runtime-v1.md`
- 新增本机加密回调 smoke test：`project/ops/wecom-webhook-smoke-test.js`
- 补了 webhook 结构化观察日志

结论：
- 真实 webhook 已从“存在”推进到“可运行、可验、可观察”

---

### B. 映射稳定化已完成第一轮
已完成：
- `patient_id / external_user_id / wecom_user_id / conversation_primary_customer_id` 多级映射
- 会话主客户回写
- `conversation_primary_customer_id` 兜底
- customer mapping 接口支持 `conversationId`

结论：
- 映射已从临时查表推进到 conversation 级稳定复用

---

### C. 映射观察面已补齐
已完成：
- unmapped 观察面
- conflict 观察面
- `matchedBy` 透传到 ops view / dashboard / conversation list
- dashboard 指标补充 unmapped/conflict 计数

结论：
- 映射已从“内部逻辑”变成“外部可观察状态”

---

### D. 映射治理动作已补齐
已完成：
- confirm
- unconfirm
- reassign
- promote-binding

并且：
- 会回写 conversation / message
- 会写 `wecom_event_state`
- 会写 `wecom_mapping_audit`

结论：
- 已形成最小治理生命周期闭环

---

### E. 审计与治理台接口已补齐
已完成：
- `GET /api/v1/wecom/mapping-audit`
- `GET /api/v1/wecom/mapping-audit/summary`
- `GET /api/v1/wecom/mapping-governance/dashboard`

并补了：
- cards
- byAction
- byMatchedBy
- byConversation
- recentActions
- latestUnmappedCustomers
- latestConflictCustomers

结论：
- 前端已具备第一版治理台直连能力

---

### F. owner 迁移收口材料已补齐
已完成：
- DB owner / 权限现状说明
- owner 执行方案
- cutover checklist
- rehearsal pack
- 验收记录模板
- 验收记录样例

结论：
- owner 真正执行稳定字段迁移前，材料已经齐全

---

## 3. 当前阶段关键现实约束

当前最重要的现实约束是：
- 应用 DB 用户 `wecom_mvp_user` 不是历史老表 `wecom_conversations` 的 owner

因此：
- 新表 `wecom_mapping_audit` 可以创建成功
- 但旧表稳定字段 `mapping_status / mapping_matched_by` 还不能由应用账号直接落库

当前系统已做兼容降级：
- 有稳定字段 → 走 SQL 过滤
- 无稳定字段 → 动态 lookup + 应用层过滤

这保证：
- 功能不断
- 等 owner 窗口到来后可平滑切换

---

## 4. 当前阶段产出文档清单（核心） 

### webhook / 运行态
- `project/docs/wecom-webhook-runtime-v1.md`
- `project/docs/wecom-url-verification-record-template-v1.md`
- `project/ops/fix-pm2-runtime.sh`
- `project/ops/wecom-webhook-smoke-test.js`

### 映射治理
- `project/docs/customerid-patientid-mapping-stabilization-v1.md`
- `project/docs/wecom-mapping-observability-v1.md`
- `project/docs/wecom-mapping-management-v1.md`
- `project/docs/wecom-mapping-lifecycle-v1.md`
- `project/docs/wecom-mapping-governance-v1.md`
- `project/docs/wecom-mapping-audit-and-migration-v1.md`
- `project/docs/wecom-mapping-governance-dashboard-v1.md`
- `project/docs/wecom-mapping-governance-sections-v1.md`
- `project/docs/wecom-mapping-governance-empty-and-error-states-v1.md`
- `project/docs/wecom-mapping-field-dictionary-v1.md`

### owner 切换
- `project/docs/db-owner-and-permission-status-v1.md`
- `project/docs/wecom-owner-migration-execution-plan-v1.md`
- `project/docs/wecom-stable-mapping-cutover-checklist-v1.md`
- `project/docs/wecom-owner-cutover-rehearsal-pack-v1.md`
- `project/docs/wecom-owner-cutover-acceptance-record-template-v1.md`
- `project/docs/wecom-owner-cutover-acceptance-record-example-v1.md`
- `project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql`
- `project/ops/rehearsal/wecom-stable-mapping-cutover/`

---

## 5. 当前阶段一句话判断

本阶段已经把企微链路从：

**“能接消息、能临时映射”**

推进到了：

**“真实 webhook 已固化、映射治理链已闭环、治理台接口已就绪、owner 切换材料已齐全”**

---

## 6. 下一阶段建议

下一阶段可选重点：

1. 真正完成 owner 迁移执行与切换验收
2. 接前端治理台页面
3. 增加 mapping audit 更细筛选和聚合报表
4. 补群聊 participant 级映射治理
5. 再继续往 patient 主数据治理推进

---

## 7. 一句话结论

当前这个阶段的核心收口已经完成，后续如果要切任务，不会再丢失 webhook 固化、映射治理、owner 迁移与治理台接口这几条主线的上下文。
