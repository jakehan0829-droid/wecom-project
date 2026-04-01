# 当前后端 API 范围 v1

## 已有开放接口
- `GET /health`
- `POST /api/v1/auth/login`

## 已有受保护接口
### 患者
- `GET /api/v1/patients`
- `POST /api/v1/patients`
- `GET /api/v1/patients/:id`

### 标签
- `POST /api/v1/tags`
- `POST /api/v1/patients/:id/tags`

### 企业微信绑定
- `POST /api/v1/patients/:id/wecom-binding`
- `GET /api/v1/patients/:id/wecom-binding`

### 健康记录
- `POST /api/v1/patients/:id/glucose-records`
- `POST /api/v1/patients/:id/blood-pressure-records`
- `POST /api/v1/patients/:id/weight-records`

### Dashboard
- `GET /api/v1/dashboard/overview`

### 医生任务
- `GET /api/v1/doctor-review-tasks`
- `POST /api/v1/doctor-review-tasks`
- `PATCH /api/v1/doctor-review-tasks/:id`
