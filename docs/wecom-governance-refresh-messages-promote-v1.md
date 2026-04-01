# 详情页自动刷新、消息区与 promote-binding v1

更新时间：2026-03-30

## 1. 本轮新增

治理台详情页已继续推进三项：
- 提交治理动作后自动刷新
- 最近消息区接入
- promote-binding 表单补齐

---

## 2. 当前效果

### 自动刷新
治理动作提交成功后，详情页会自动刷新：
- conversation detail
- message list
- dashboard 聚合数据

### 消息区
real 模式下会调用：
- `/api/v1/wecom/conversations/:conversationId/messages?limit=10`

### promote-binding
治理表单已支持：
- `promote_binding`
- `bindingType=external_user|wecom_user`

---

## 3. 一句话结论

详情页已经从“可查看、可提交”进一步推进到“提交后自动刷新 + 有消息上下文 + 支持 promote-binding”的更完整工作流形态。
