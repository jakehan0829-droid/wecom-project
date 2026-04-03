# owner cutover 角色分工 runbook v1

更新时间：2026-03-30

## 1. 目标

把 owner cutover 的现场执行明确拆成三种角色视角，避免所有人都看同一份大文档却不知道自己该做什么。

角色分为：
1. owner / DBA
2. backend 执行人
3. 验收确认人

---

## 2. owner / DBA 视角

### 你的职责
- 对 `wecom_conversations` 执行稳定字段迁移 SQL
- 确保 SQL 执行成功，无 owner 权限报错

### 你需要做的动作
```bash
export PGPASSWORD='<OWNER_PASSWORD>'
psql -h 127.0.0.1 -p 5432 -U <OWNER_USER> -d chronic_disease \
  -f /root/.openclaw/workspace/project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql
```

### 你交付给下一角色的结果
- 明确告知：SQL 已执行成功 / 失败
- 如失败，提供报错摘要

### 你最关心的成功标准
- 没有 `must be owner of table` 之类权限错误
- 字段和索引已真正创建

---

## 3. backend 执行人视角

### 你的职责
- 负责执行前预检
- 在 owner SQL 成功后重启 backend
- 跑 smoke 和 acceptance summary

### 你需要做的动作
执行前：
```bash
cd /root/.openclaw/workspace/project/backend
npm run wecom:cutover:preflight
```

owner SQL 成功后：
```bash
pm2 restart chronic-disease-backend
npm run wecom:cutover:smoke
npm run wecom:cutover:acceptance
```

### 你交付给下一角色的结果
- `acceptance-summary.md`
- backend 已重启且 online
- smoke 已通过

### 你最关心的成功标准
- `/health` 正常
- `mapping-audit` / `summary` / `dashboard` 正常
- `wecom/conversations?mappingStatus=matched&matchedBy=manual_confirmation` 正常

---

## 4. 验收确认人视角

### 你的职责
- 确认这次切换是否可以判定为通过
- 不是执行命令的人，而是最终确认结果的人

### 你需要看的材料
- `project/docs/wecom-owner-cutover-acceptance-record-template-v1.md`
- `project/ops/rehearsal/wecom-stable-mapping-cutover/acceptance-summary.md`

### 你需要确认的核心点
1. owner SQL 是否成功
2. backend 是否重启成功
3. 字段 / 索引是否存在
4. 列表筛选是否通过
5. audit / governance dashboard 是否通过
6. 是否还需要回退或继续观察

### 你的最终动作
- 在验收记录单中给出“通过 / 不通过”结论

---

## 5. 最短现场协作链

1. owner / DBA 执行 SQL
2. backend 执行人重启并跑工具链
3. 验收确认人基于摘要与模板给最终结论

---

## 6. 一句话结论

owner cutover 现场不该再是“大家一起看一堆材料”，而应该是：

**owner 负责 SQL，backend 执行人负责命令链，验收确认人负责最终通过判定。**
