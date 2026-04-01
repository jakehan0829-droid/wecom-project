# Runbook

## 角色
- Owner 执行人：执行 SQL
- 后端执行人：重启 backend + 跑接口验证
- 验收人：确认结果

## 固定样本
- conversationId: `wecom:private:HanCong`

## 顺序
1. Owner 执行 SQL 脚本
2. 后端执行人重启 `chronic-disease-backend`
3. 运行字段/索引检查
4. 运行一条真实 mapping 动作（建议 reassign 或 confirm）
5. 检查 conversation list 筛选
6. 检查 mapping audit / summary / governance dashboard
7. 记录结论
