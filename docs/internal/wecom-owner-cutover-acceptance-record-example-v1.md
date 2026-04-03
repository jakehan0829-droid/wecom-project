# owner 切换验收记录样例 v1

更新时间：2026-03-30

> 说明：本文件是示范样例，用于告诉执行人“验收记录单填完应该长什么样”。

## 1. 基本信息
- 执行日期：2026-03-30
- 执行时间窗口：11:30-11:45
- 数据库 owner 执行人：待填写
- backend 执行人：主Agent / 后端执行人
- 验收确认人：韩聪
- 环境：当前 OpenClaw 同机独立业务栈
- 样本会话：`wecom:private:HanCong`

---

## 2. 执行动作记录
### 2.1 owner SQL
- 执行脚本：`project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql`
- 是否执行成功：是
- 控制台输出摘要：字段添加成功，索引创建成功，无 owner 权限错误

### 2.2 backend 重启
- 命令：`pm2 restart chronic-disease-backend`
- 是否执行成功：是
- 重启后状态：online

---

## 3. 结构验证
### 3.1 字段验证
- `mapping_status`：存在
- `mapping_matched_by`：存在

### 3.2 索引验证
- `idx_wecom_conversations_mapping_status`：存在
- `idx_wecom_conversations_mapping_matched_by`：存在

---

## 4. 功能验证
### 4.1 样本动作验证
- 动作类型：reassign
- 是否执行成功：是
- 返回摘要：样本会话改绑成功，返回 `reassigned=true`

### 4.2 稳定字段回写验证
- conversationId：`wecom:private:HanCong`
- `mapping_status` 值：`matched`
- `mapping_matched_by` 值：`manual_confirmation`
- 是否符合预期：是

### 4.3 列表筛选验证
- 接口：`/api/v1/wecom/conversations?mappingStatus=matched&matchedBy=manual_confirmation&limit=5`
- 是否成功：是
- 是否返回样本会话：是

### 4.4 audit 验证
- `/api/v1/wecom/mapping-audit`：成功
- `/api/v1/wecom/mapping-audit/summary`：成功
- `/api/v1/wecom/mapping-governance/dashboard`：成功

---

## 5. 结果结论
- 本次 owner 切换是否通过：是
- 若未通过，失败点：无
- 是否已回退：无需回退
- 下一步动作：切换后继续观察 1 个工作日，并确认列表筛选始终正常

---

## 6. 验收备注
- 日志摘要：backend 重启后无 `column does not exist` 错误
- 额外观察：治理台接口结构正常，空状态渲染规则可沿用
- 风险提示：后续若继续新增稳定字段，仍需 owner 或 migration role 配合执行
