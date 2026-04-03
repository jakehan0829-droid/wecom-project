# 运行巡检清单

## 目标
以最低成本确认：backend 服务、数据库连接、关键接口是否仍正常，避免系统停止但无人感知。

---

## 一、服务状态巡检

### 1. PM2 状态
```bash
pm2 status chronic-disease-backend
```

### 2. PM2 日志
```bash
pm2 logs chronic-disease-backend --lines 100 --nostream
```

---

## 二、接口健康巡检

### 1. 健康检查
```bash
curl http://127.0.0.1:3000/health
```

预期：
```json
{"success":true,"data":{"status":"ok"},"error":null}
```

### 2. 登录检查
```bash
curl -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"13800000000","password":"demo123456"}'
```

预期：
- success=true
- 返回 accessToken

---

## 三、数据库巡检

### 1. PostgreSQL 连接
```bash
PGPASSWORD='<实际密码>' psql -h 127.0.0.1 -U wecom_mvp_user -d chronic_disease -c "select 1;"
```

### 2. 核心表可访问性
```bash
PGPASSWORD='<实际密码>' psql -h 127.0.0.1 -U wecom_mvp_user -d chronic_disease -c "select count(*) from patient;"
```

---

## 四、异常时优先判断方向

### 情况 1：PM2 online，但接口异常
优先看：
- 应用日志
- 数据库权限
- 最近代码改动

### 情况 2：登录异常
优先看：
- user_account 表权限
- .env 数据库账号配置
- JWT 配置

### 情况 3：接口空响应 / 断连
优先看：
- PM2 error log
- 进程是否崩溃重启
- 未捕获异常

---

## 五、巡检频率建议
- 关键改动后：立即巡检
- 日常推进中：每次落地一个阶段任务后巡检
- 若后续接入自动提醒：可按固定周期运行
