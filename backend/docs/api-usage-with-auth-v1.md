# API 使用示例（含鉴权）v1

## 1. 登录
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"13800000000","password":"demo123456"}'
```

## 2. 使用 token 获取患者列表
```bash
curl http://localhost:3000/api/v1/patients \
  -H 'Authorization: Bearer <TOKEN>'
```

## 3. 创建患者
```bash
curl -X POST http://localhost:3000/api/v1/patients \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"name":"王大爷","mobile":"13900000000","diabetesType":"type2","riskLevel":"medium"}'
```

## 4. 创建医生处理任务
```bash
curl -X POST http://localhost:3000/api/v1/doctor-review-tasks \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"patientId":"<PATIENT_ID>","summary":"近期血糖波动较大，请医生查看"}'
```

## 5. 更新医生处理任务状态
```bash
curl -X PATCH http://localhost:3000/api/v1/doctor-review-tasks/<TASK_ID> \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"status":"done"}'
```
