# owner cutover 最短命令闭环 v1

更新时间：2026-03-30

## 1. 目标

把 owner 执行窗口所需动作压缩成最短闭环，避免现场再拼命令。

---

## 2. 最短闭环

### 步骤 1：owner 执行 SQL
```bash
export PGPASSWORD='<OWNER_PASSWORD>'
psql -h 127.0.0.1 -p 5432 -U <OWNER_USER> -d chronic_disease \
  -f /root/.openclaw/workspace/project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql
```

### 步骤 2：重启 backend
```bash
pm2 restart chronic-disease-backend
```

### 步骤 3：跑统一 smoke
```bash
cd /root/.openclaw/workspace/project/backend
npm run wecom:cutover:smoke
```

---

## 3. smoke 默认验证内容

脚本位置：
- `project/ops/rehearsal/wecom-stable-mapping-cutover/cutover-smoke.sh`

默认验证：
1. 登录拿 token
2. `mapping-audit` 明细查询
3. `mapping-audit/summary` 聚合查询
4. `mapping-governance/dashboard` 查询
5. `wecom/conversations` 稳定字段筛选查询

默认样本：
- `wecom:private:HanCong`

默认预期：
- `mappingStatus=matched`
- `matchedBy=manual_confirmation`

---

## 4. 可覆盖环境变量

可选：
- `BASE_URL`
- `LOGIN_MOBILE`
- `LOGIN_PASSWORD`
- `CONVERSATION_ID`
- `EXPECTED_MAPPING_STATUS`
- `EXPECTED_MATCHED_BY`
- `LIMIT`

示例：
```bash
CONVERSATION_ID='wecom:private:HanCong' \
EXPECTED_MAPPING_STATUS='matched' \
EXPECTED_MATCHED_BY='manual_confirmation' \
npm run wecom:cutover:smoke
```

---

## 5. 一句话结论

owner cutover 现场现在已经可以收敛成三步：

**执行 SQL → 重启 backend → 跑统一 smoke。**
