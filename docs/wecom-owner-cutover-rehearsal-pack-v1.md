# owner 切换预演包说明 v1

更新时间：2026-03-30

## 1. 预演包目录

位置：
- `project/ops/rehearsal/wecom-stable-mapping-cutover/`

包含：
- `README.md`
- `runbook.md`
- `commands.sh`
- `expected-results.md`
- 关联 SQL：`project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql`

---

## 2. 用途

这不是正式执行记录，而是执行前预演包。

作用：
- 给 owner / 后端执行人 / 验收人统一材料
- 避免正式执行时临场拼命令、拼步骤、拼预期结果

---

## 3. 使用方式

建议顺序：
1. 先读 `runbook.md`
2. 再看 `commands.sh`
3. 执行前对照 `expected-results.md`
4. 正式窗口中照着跑

---

## 4. 当前价值

到当前为止，owner 切换已经不是“有一个 SQL 脚本”这么简单，而是有：
- 执行方案
- 切换清单
- 预演包
- 预期结果样例

这更接近真实交付状态。

---

## 5. 一句话结论

当前 owner 切换前的预演材料已经准备完整，可以直接交给执行人按包走。 
