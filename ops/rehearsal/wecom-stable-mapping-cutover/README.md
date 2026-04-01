# 企微稳定映射字段切换预演包

本目录用于 owner 正式执行前预演。

包含：
- `runbook.md`：执行顺序与职责分工
- `expected-results.md`：预期结果样例
- `commands.sh`：预填命令模板
- `../sql/2026-03-30-add-wecom-conversation-mapping-columns.sql`：owner 执行 SQL

建议执行顺序：
1. 阅读 `runbook.md`
2. 按 `commands.sh` 准备命令
3. owner 执行 SQL
4. 后端执行人按 checklist 验证
5. 对照 `expected-results.md` 核验结果
