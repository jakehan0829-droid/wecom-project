# owner 执行窗口前最终待办清单 v1

更新时间：2026-03-30

## 1. 目的

本清单不是 cutover checklist，也不是执行方案，而是正式 owner 执行窗口到来前最后一轮核对清单。

目标是回答 3 个问题：
1. 谁执行
2. 需要什么权限
3. 执行前最后核对什么

---

## 2. 人员确认

### 必须明确的人
- 数据库 owner / DBA 执行人：
- backend 执行人：
- 验收确认人：

### 当前建议分工
- owner / DBA：执行 SQL 迁移脚本
- backend 执行人：重启 `chronic-disease-backend` + 跑接口验证
- 验收确认人：确认 cutover 是否通过

若这三项人选还没定，不建议正式进入窗口。

---

## 3. 权限确认

### owner / DBA 侧
必须具备：
- 对 `wecom_conversations` 执行 `ALTER TABLE` 的权限
- 对目标库执行 `CREATE INDEX` 的权限

### backend 执行人侧
必须具备：
- 执行 `pm2 restart chronic-disease-backend`
- 查看 backend 日志
- 调用 API 验证接口

如果 owner 能执行 SQL，但 backend 执行人无权重启或验收，同样不建议进入窗口。

---

## 4. 文件确认

执行前必须确认以下文件都存在：
- `project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql`
- `project/docs/wecom-owner-migration-execution-plan-v1.md`
- `project/docs/wecom-stable-mapping-cutover-checklist-v1.md`
- `project/docs/wecom-owner-cutover-acceptance-record-template-v1.md`
- `project/docs/wecom-owner-cutover-acceptance-record-example-v1.md`
- `project/ops/rehearsal/wecom-stable-mapping-cutover/`

---

## 5. 样本确认

建议固定样本：
- `wecom:private:HanCong`

执行前确认：
- 样本会话仍存在
- 相关治理接口仍可正常返回
- audit / summary / governance dashboard 仍可用

---

## 6. 运行态确认

执行前最后确认：
- `pm2 status chronic-disease-backend` 为 online
- `/health` 正常
- `GET /api/v1/wecom/mapping-audit` 正常
- `GET /api/v1/wecom/mapping-audit/summary` 正常
- `GET /api/v1/wecom/mapping-governance/dashboard` 正常

作用：
- 确保进入窗口前系统本身稳定
- 避免把旧问题误判成迁移引入的问题

---

## 7. 最后一道决策问题

在正式进入 owner 执行窗口前，必须明确回答：

### Q1：本次窗口目标是什么？
- 只是补稳定字段
- 还是要顺带完成首轮切换验收

### Q2：窗口内是否允许 backend 重启？
- 是 / 否

### Q3：如果执行后发现异常，谁来拍板继续还是暂停？
- 责任人：

如果这三个问题没有答案，就不建议正式开始。

---

## 8. 一句话结论

owner 执行窗口前，最重要的不是再写代码，而是把“人、权限、文件、样本、运行态、决策人”六件事一次核对清楚。
