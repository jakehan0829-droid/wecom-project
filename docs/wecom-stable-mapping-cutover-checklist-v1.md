# 稳定映射字段落库后的切换清单 v1

更新时间：2026-03-30

## 1. 目标

本清单用于指导 owner 执行完稳定字段迁移后，如何验证系统已从“兼容降级模式”切换到“稳定字段 SQL 过滤模式”。

涉及字段：
- `wecom_conversations.mapping_status`
- `wecom_conversations.mapping_matched_by`

---

## 2. 前提条件

owner 或具备足够权限的账号已执行：
- `project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql`

执行模板：
```bash
export PGPASSWORD='<OWNER_PASSWORD>'
psql -h 127.0.0.1 -p 5432 -U <OWNER_USER> -d chronic_disease \
  -f /root/.openclaw/workspace/project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql
```

---

## 3. 切换验证步骤

### 3.1 验证字段已存在
```sql
select column_name
from information_schema.columns
where table_name = 'wecom_conversations'
  and column_name in ('mapping_status', 'mapping_matched_by');
```

预期：
- 返回 2 行

### 3.2 验证索引已存在
```sql
select indexname
from pg_indexes
where tablename = 'wecom_conversations'
  and indexname in (
    'idx_wecom_conversations_mapping_status',
    'idx_wecom_conversations_mapping_matched_by'
  );
```

预期：
- 返回 2 行

### 3.3 重启 backend
```bash
pm2 restart chronic-disease-backend
```

目的：
- 清理运行态缓存
- 让 schema capability 重新探测字段存在性

### 3.4 验证列表筛选接口仍正常
```http
GET /api/v1/wecom/conversations?mappingStatus=matched&matchedBy=manual_confirmation&limit=5
```

预期：
- 正常返回数据
- 不报 `column does not exist`

### 3.5 验证 mapping state 回写生效
任选一条会话执行一次：
- confirm / unconfirm / reassign / promote-binding

之后检查：
```sql
select conversation_id, primary_customer_id, mapping_status, mapping_matched_by
from wecom_conversations
where conversation_id = 'wecom:private:HanCong';
```

预期：
- `mapping_status` 有值
- `mapping_matched_by` 有值

例如：
- `matched / manual_confirmation`
- 或 `conflict / wecom_user_id`

### 3.6 验证 mapping audit 仍正常
```http
GET /api/v1/wecom/mapping-audit?conversationId=wecom:private:HanCong&limit=5
```

预期：
- 返回正常
- 新老审计记录都可查询

---

## 4. 切换成功判定

满足以下条件即可判定切换成功：

1. 稳定字段和索引已存在
2. backend 重启后接口无报错
3. `wecom_conversations` 中 `mapping_status / mapping_matched_by` 已出现真实值
4. conversation list 筛选正常
5. mapping audit 接口正常

---

## 5. 切换后的收益

一旦切换成功：
- conversation list 的 mapping 筛选可直接走 SQL
- 不再完全依赖运行时动态 lookup
- 更适合后续前端治理台与更大数据量场景

---

## 6. 若切换后仍异常，优先排查

### 6.1 字段已加但接口仍像走回退模式
先重启 backend：
```bash
pm2 restart chronic-disease-backend
```

原因：
- 运行态有 schema capability 缓存

### 6.2 字段已存在但没有值
原因通常不是字段没加，而是：
- 还没有发生新的 mapping 操作
- 尚未触发 refreshConversationMappingState

可通过再次执行一次：
- confirm / reassign / unconfirm

强制刷新一条样本。

### 6.3 索引缺失
如果字段在但索引不在，补跑迁移脚本或单独建索引。

---

## 7. 一句话结论

owner 执行迁移后，只要完成“字段存在 + 索引存在 + backend 重启 + 一条真实 mapping 操作回写验证”，就可以确认系统已经从兼容降级模式切换到稳定字段 SQL 过滤模式。
