# owner 迁移实际执行方案 v1

更新时间：2026-03-30

## 1. 目标

本方案用于把 `wecom_conversations` 的稳定映射字段正式落库：
- `mapping_status`
- `mapping_matched_by`

并确保系统从“兼容降级模式”平滑切到“SQL 过滤模式”。

---

## 2. 执行角色建议

### 主执行人
- 数据库 owner 或具备等效 DDL 权限的人

### 协同人
- 后端执行人：负责 backend 重启、接口验证、日志确认
- 业务验收人：负责确认治理台/列表筛选行为符合预期

### 推荐分工
- owner：执行 SQL 脚本
- 后端执行人：执行 cutover checklist
- 韩聪：最终确认“真实功能已切换到稳定字段模式”

---

## 3. 推荐执行窗口

建议在以下窗口执行：
- 低业务流量时段
- backend 可重启窗口
- 能同步看 API 与日志的时段

推荐节奏：
1. 先执行 owner SQL
2. 立即重启 backend
3. 立即跑 checklist
4. 当场确认结果

避免：
- SQL 执行与 backend 重启隔太久
- 执行人和验收人不同步

---

## 4. 执行前准备

### 4.1 准备脚本
确认脚本存在：
- `project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql`

### 4.2 准备 checklist
确认清单存在：
- `project/docs/wecom-stable-mapping-cutover-checklist-v1.md`

### 4.3 确认样本会话
建议固定用一条真实样本作为切换验证样本：
- `wecom:private:HanCong`

原因：
- 已有完整 mapping 历史
- 已验证过 confirm / reassign / audit 链路

---

## 5. 实际执行步骤

### 步骤 1：owner 执行迁移 SQL
```bash
export PGPASSWORD='<OWNER_PASSWORD>'
psql -h 127.0.0.1 -p 5432 -U <OWNER_USER> -d chronic_disease \
  -f /root/.openclaw/workspace/project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql
```

### 步骤 2：backend 执行人重启服务
```bash
pm2 restart chronic-disease-backend
```

### 步骤 3：按 checklist 验证
重点看：
- 字段是否存在
- 索引是否存在
- 列表筛选是否正常
- 样本会话执行一次真实 mapping 动作后，字段是否回写

### 步骤 4：验收口径统一记录
记录内容建议包含：
- 执行时间
- 执行人
- owner SQL 是否成功
- backend 是否已重启
- 字段/索引验证结果
- 样本会话验证结果
- 是否切换成功

---

## 6. 成功标准

以下全部满足，才算本次迁移真正完成：

1. `wecom_conversations.mapping_status` 存在
2. `wecom_conversations.mapping_matched_by` 存在
3. 两个索引存在
4. backend 已重启
5. 样本会话执行一次真实 mapping 操作后，两字段出现真实值
6. `GET /api/v1/wecom/conversations?mappingStatus=matched&matchedBy=manual_confirmation&limit=5` 正常
7. `GET /api/v1/wecom/mapping-audit` 与 `/summary` 正常

---

## 7. 失败时回退思路

这次迁移风险相对低，因为本质是：
- 老表加两个 nullable 字段
- 加两个索引
- 不涉及删字段/删表/删数据

如果执行后发现异常：
1. 先看 backend 日志
2. 先判断是 SQL 未成功、还是缓存未刷新
3. 优先重启 backend 再复验
4. 若字段已在但暂未回写，执行一次 confirm / reassign 强制刷新样本

一般不需要做结构性回滚。

---

## 8. 一句话结论

owner 迁移的实际方案已经明确：

**owner 执行 SQL，后端执行人重启 backend，并立即按固定 checklist 用 `HanCong` 样本验收。只要字段、索引、列表筛选、样本回写四项同时通过，就可确认系统已切到稳定字段 SQL 过滤模式。**
