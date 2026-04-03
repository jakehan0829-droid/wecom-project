# owner 切换验收记录模板 v1

更新时间：2026-03-30

## 1. 基本信息
- 执行日期：
- 执行时间窗口：
- 数据库 owner 执行人：
- backend 执行人：
- 验收确认人：
- 环境：
- 样本会话：`wecom:private:HanCong`

---

## 2. 执行动作记录
### 2.1 owner SQL
- 执行脚本：`project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql`
- 是否执行成功：是 / 否
- 控制台输出摘要：

### 2.2 backend 重启
- 命令：`pm2 restart chronic-disease-backend`
- 是否执行成功：是 / 否
- 重启后状态：online / 异常

---

## 3. 结构验证
### 3.1 字段验证
- `mapping_status`：存在 / 不存在
- `mapping_matched_by`：存在 / 不存在

### 3.2 索引验证
- `idx_wecom_conversations_mapping_status`：存在 / 不存在
- `idx_wecom_conversations_mapping_matched_by`：存在 / 不存在

---

## 4. 功能验证
### 4.1 样本动作验证
- 动作类型：confirm / reassign / unconfirm / promote-binding
- 是否执行成功：是 / 否
- 返回摘要：

### 4.2 稳定字段回写验证
- conversationId：`wecom:private:HanCong`
- `mapping_status` 值：
- `mapping_matched_by` 值：
- 是否符合预期：是 / 否

### 4.3 列表筛选验证
- 接口：`/api/v1/wecom/conversations?mappingStatus=matched&matchedBy=manual_confirmation&limit=5`
- 是否成功：是 / 否
- 是否返回样本会话：是 / 否

### 4.4 audit 验证
- `/api/v1/wecom/mapping-audit`：成功 / 失败
- `/api/v1/wecom/mapping-audit/summary`：成功 / 失败
- `/api/v1/wecom/mapping-governance/dashboard`：成功 / 失败

---

## 5. 结果结论
- 本次 owner 切换是否通过：是 / 否
- 若未通过，失败点：
- 是否已回退：是 / 否 / 无需回退
- 下一步动作：

---

## 6. 验收备注
- 日志摘要：
- 额外观察：
- 风险提示：
