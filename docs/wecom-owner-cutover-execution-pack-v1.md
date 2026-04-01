# owner cutover 现场执行包 v1

更新时间：2026-03-30

## 1. 目标

把 owner cutover 收敛成更接近现场执行包的形态，而不是分散脚本集合。

---

## 2. 当前执行入口

目录：
```bash
cd /root/.openclaw/workspace/project/backend
```

### 单步执行
```bash
npm run wecom:cutover:preflight
npm run wecom:cutover:smoke
npm run wecom:cutover:acceptance
```

### 一键执行现场包
```bash
npm run wecom:cutover:pack
```

说明：
- `pack` 会顺序执行：
  - preflight
  - smoke
  - acceptance summary

---

## 3. 仍需 owner 人工执行的动作

现场包不能替代 owner 权限动作。

owner 仍需人工执行：
```bash
export PGPASSWORD='<OWNER_PASSWORD>'
psql -h 127.0.0.1 -p 5432 -U <OWNER_USER> -d chronic_disease \
  -f /root/.openclaw/workspace/project/ops/sql/2026-03-30-add-wecom-conversation-mapping-columns.sql
```

建议顺序：
1. `npm run wecom:cutover:preflight`
2. owner 执行 SQL
3. `pm2 restart chronic-disease-backend`
4. `npm run wecom:cutover:smoke`
5. `npm run wecom:cutover:acceptance`

---

## 4. 一句话结论

当前 owner cutover 已基本具备“现场执行包”形态：

**预检、验证、验收摘要都已有统一命令入口；现场只剩 owner SQL 和 backend 重启两个必须人工介入点。**
