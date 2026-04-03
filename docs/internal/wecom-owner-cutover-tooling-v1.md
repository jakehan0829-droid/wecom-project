# owner cutover 工具化说明 v1

更新时间：2026-03-30

## 1. 目标

把 owner cutover 从“文档驱动”进一步压缩成“命令驱动”。

---

## 2. 当前可直接运行的命令

在目录：
```bash
cd /root/.openclaw/workspace/project/backend
```

### 2.1 执行前预检
```bash
npm run wecom:cutover:preflight
```

作用：
- 检查 `/health`
- 登录获取 token
- 检查 `mapping-audit` / `summary` / `dashboard` 三个治理接口
- 检查 PM2 状态
- 若提供 `OWNER_DB_USER` + `PGPASSWORD`，会额外做字段/索引 SQL 预检

### 2.2 执行后 smoke
```bash
npm run wecom:cutover:smoke
```

作用：
- 检查 audit 明细
- 检查 summary
- 检查 governance dashboard
- 检查 conversation list 筛选

### 2.3 生成验收摘要
```bash
npm run wecom:cutover:acceptance
```

作用：
- 生成 `acceptance-summary.md`
- 可直接复制到验收记录模板里

---

## 3. 推荐现场顺序

### 窗口前
```bash
npm run wecom:cutover:preflight
```

### owner 执行 SQL 后
```bash
pm2 restart chronic-disease-backend
npm run wecom:cutover:smoke
npm run wecom:cutover:acceptance
```

---

## 4. 一句话结论

当前 owner cutover 已经具备三段式工具链：

**preflight → smoke → acceptance summary**
