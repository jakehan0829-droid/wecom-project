# 企微映射审计查询与 owner 迁移准备 v1

更新时间：2026-03-30

## 1. 本轮目标

继续推进 3 件事：

1. 补 mapping audit 查询接口
2. 修正 `reassign` 返回中的 `fromPatientId`
3. 准备 owner 权限下的正式迁移脚本

当前三项均已完成。

---

## 2. 新增 mapping audit 查询接口

新增：
```http
GET /api/v1/wecom/mapping-audit
```

支持 query：
- `conversationId`
- `action`
- `mappingStatus`
- `matchedBy`
- `limit`

返回字段包括：
- `conversation_id`
- `platform_chat_id`
- `action`
- `fromPatientId`
- `toPatientId`
- `mappingStatus`
- `matchedBy`
- `bindingType`
- `operatorNote`
- `payload_json`
- `createdAt`

作用：
- 前端/运营可以直接看映射治理动作历史
- 不需要再去数据库手查 `wecom_mapping_audit`

---

## 3. reassign 返回值已修正

本轮已修正：
- `reassign` 返回中的 `fromPatientId`

修正方式：
- 在执行改绑前，先缓存 `previousPatientId`
- 后续 event / audit / API 返回统一使用这个旧值
- 避免改写后再读，导致语义偏差

已验证样例：
```json
{
  "reassigned": true,
  "conversationId": "wecom:private:HanCong",
  "fromPatientId": "de14f0da-bbcc-4e64-b368-3d789897edf4",
  "toPatientId": "689ca26c-b8d0-46e4-a6d3-c5b750472eff"
}
```

这次返回已准确。

---

## 4. owner 权限迁移脚本已准备好

新增脚本：
- `project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql`

用途：
- 给现有老表 `wecom_conversations` 增加：
  - `mapping_status`
  - `mapping_matched_by`
- 补对应索引：
  - `idx_wecom_conversations_mapping_status`
  - `idx_wecom_conversations_mapping_matched_by`

脚本内容是 owner 级别操作，因此：
- 必须由该表 owner 或具备足够权限的 DB 账号执行

---

## 5. 运维入口已补说明

已写入：
- `project/ops/backend-runtime-ops.md`

执行模板：
```bash
export PGPASSWORD='<OWNER_PASSWORD>'
psql -h 127.0.0.1 -p 5432 -U <OWNER_USER> -d chronic_disease \
  -f /root/.openclaw/workspace/project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql
```

---

## 6. 当前真实状态

### 6.1 代码层已支持稳定字段
代码已经接入：
- `mapping_status`
- `mapping_matched_by`

### 6.2 当前真实库仍处于兼容模式
因为当前业务 DB 用户不是老表 owner：
- 新表 `wecom_mapping_audit` 已成功创建
- 但老表 `wecom_conversations` 还没真正加上稳定字段

所以当前系统运行口径是：

#### 若稳定字段存在
- conversation list 走 SQL 过滤
- mapping state 回写稳定列

#### 若稳定字段不存在
- 自动回退到动态 `lookupCustomerMapping()`
- 再在应用层做筛选

这保证了：
- 功能可用
- 等 owner 迁移完成后可自然升级到更优实现

---

## 7. 已验证结果

### 7.1 mapping audit API 已通过
已验证：
```http
GET /api/v1/wecom/mapping-audit?conversationId=wecom:private:HanCong&limit=5
```

返回了真实 `reassign` 历史记录。

### 7.2 reassign 精确返回已通过
已验证：
- `fromPatientId` 已准确返回旧 patientId
- 不再出现“返回值被改后状态污染”的问题

### 7.3 owner 迁移脚本已备好
已生成 SQL 文件和运维执行模板。

---

## 8. 当前价值

这一轮完成后，映射治理体系已经补上了关键缺口：

- **治理动作可查**：有 API，不只是有库表
- **改绑返回更准**：对前端和审计都更可靠
- **迁移路径更清楚**：owner 权限到位后可平滑切到稳定字段方案

---

## 9. 后续建议

### P1
补 mapping audit 详情页或聚合视图
比如按 `action`、按 `operatorNote`、按时间范围筛选。

### P2
准备 owner 执行窗口并真正补上稳定字段
一旦字段落库，就把列表查询全面切到 SQL 过滤。

### P3
补一份“线上 DB owner / 权限现状说明”
避免未来再遇到“代码已支持、schema 未落地”的误判。

---

## 10. 一句话结论

当前企微映射治理已经进一步成熟：

**不仅有 `wecom_mapping_audit` 审计表，现在还有可直接查询的 API；`reassign` 的旧值返回也已修正；同时 owner 权限下补 `mapping_status / mapping_matched_by` 的正式迁移脚本也已经准备完成。**
