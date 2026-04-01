# 首轮演示流 v1

## Step 1 登录
使用演示账号登录：
- mobile: `13800000000`
- password: `demo123456`

## Step 2 创建患者
调用 `POST /api/v1/patients`

## Step 3 绑定企微身份
调用 `POST /api/v1/patients/:id/wecom-binding`

## Step 4 写入健康记录
依次调用：
- glucose
- blood pressure
- weight

## Step 5 创建医生处理任务
调用 `POST /api/v1/doctor-review-tasks`

## Step 6 完成医生处理任务
调用 `PATCH /api/v1/doctor-review-tasks/:id`

## Step 7 查看 dashboard
调用 `GET /api/v1/dashboard/overview`

## 结果
这条流可作为 MVP 后端首轮演示链路。
