# API 文档

## 概述

企业微信糖尿病慢病管理系统提供完整的RESTful API，支持患者管理、档案管理、企业微信集成和AI分析等功能。

## 基础信息

- **Base URL**: `http://localhost:3000/api/v1`
- **认证方式**: Bearer Token (JWT)
- **响应格式**: JSON

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2026-04-02T10:30:00Z"
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "资源不存在",
    "details": "患者ID不存在"
  },
  "timestamp": "2026-04-02T10:30:00Z"
}
```

## 认证

### 登录
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-123",
      "username": "admin",
      "role": "doctor"
    }
  }
}
```

## 患者管理

### 获取患者列表
```http
GET /api/v1/patients
Authorization: Bearer <token>
```

查询参数:
- `limit` (可选): 每页数量，默认50
- `page` (可选): 页码，默认1

响应:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "patient-123",
        "name": "张三",
        "gender": "male",
        "birthDate": "1970-01-01",
        "mobile": "13800138000",
        "diabetesType": "2型",
        "riskLevel": "high",
        "managementStatus": "active"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 50
  }
}
```

### 创建患者
```http
POST /api/v1/patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "李四",
  "gender": "female",
  "birthDate": "1980-05-15",
  "mobile": "13900139000",
  "diabetesType": "1型",
  "riskLevel": "medium",
  "source": "wecom"
}
```

### 获取患者详情
```http
GET /api/v1/patients/:id
Authorization: Bearer <token>
```

响应包含患者基本信息、档案、绑定信息、最近会话等完整数据。

### 更新患者档案
```http
PATCH /api/v1/patients/:id/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "basicInfo": "{\"condition\":\"高血压\",\"medication\":\"降压药\"}",
  "preferences": "喜欢微信沟通",
  "coreProblem": "血糖控制不稳定"
}
```

## 企业微信集成

### Webhook验证 (GET)
企业微信服务器通过GET请求验证Webhook URL有效性。
```http
GET /api/v1/wecom/webhook?msg_signature=xxx&timestamp=xxx&nonce=xxx&echostr=xxx
```

### 接收消息 (POST)
企业微信服务器通过POST请求发送消息事件。
```http
POST /api/v1/wecom/webhook?msg_signature=xxx&timestamp=xxx&nonce=xxx
Content-Type: application/json

{
  "ToUserName": "wx123456",
  "FromUserName": "userid123",
  "CreateTime": 1646215200,
  "MsgType": "text",
  "Content": "你好",
  "MsgId": 1234567890
}
```

### 消息摄入 (测试用途)
```http
POST /api/v1/wecom/messages/intake
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "conv-123",
  "senderId": "user-456",
  "senderRole": "customer",
  "content": "最近血糖有点高",
  "timestamp": "2026-04-02T10:30:00Z"
}
```

## 业务路由与AI分析

### 消息业务路由处理
```http
POST /api/v1/business-routing/messages/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "messageId": "msg-123",
  "conversationId": "conv-456",
  "senderId": "user-789",
  "senderRole": "customer",
  "content": "最近感觉头晕，血糖值有点高",
  "timestamp": "2026-04-02T10:30:00Z",
  "conversationContext": [
    {
      "senderRole": "customer",
      "content": "你好",
      "timestamp": "2026-04-02T10:25:00Z"
    }
  ]
}
```

响应:
```json
{
  "success": true,
  "data": {
    "processingSummary": "消息已由医疗助手处理",
    "archiveType": "patient",
    "archiveUpdated": true,
    "targetId": "patient-123",
    "handlerType": "medical-assistant",
    "analysis": {
      "understanding": {
        "userQuestion": "头晕和血糖控制问题",
        "userState": "担忧健康状况",
        "newNeeds": ["血糖监测指导", "症状咨询"],
        "concerns": ["头晕可能原因", "血糖控制方法"]
      },
      "confidence": 0.85
    }
  }
}
```

### 档案分析建议
```http
POST /api/v1/archives/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "archiveType": "patient",
  "archiveId": "patient-123",
  "currentArchive": {
    "basicInfo": "{\"condition\":\"糖尿病\"}",
    "preferences": "喜欢电话沟通"
  },
  "recentConversations": [
    {
      "conversationId": "conv-456",
      "messages": [
        {
          "senderRole": "customer",
          "content": "最近血糖控制不好",
          "timestamp": "2026-04-02T10:30:00Z"
        }
      ]
    }
  ]
}
```

## 档案管理

### 获取成员档案
```http
GET /api/v1/member-archives/:userId
Authorization: Bearer <token>
```

### 搜索档案
```http
GET /api/v1/member-archives
Authorization: Bearer <token>
```

查询参数:
- `keyword` (可选): 搜索关键词
- `type` (可选): 档案类型 (member/patient)
- `limit` (可选): 每页数量

### 批量更新档案
```http
POST /api/v1/member-archives/batch-update
Authorization: Bearer <token>
Content-Type: application/json

{
  "updates": [
    {
      "archiveType": "member",
      "archiveId": "user-123",
      "field": "basicInfo",
      "value": "{\"condition\":\"糖尿病\"}",
      "reason": "AI分析建议"
    }
  ],
  "operatorId": "doctor-456"
}
```

## 健康记录

### 创建血糖记录
```http
POST /api/v1/patients/:id/glucose-records
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": 7.8,
  "unit": "mmol/L",
  "measurementTime": "2026-04-02T08:30:00Z",
  "measurementType": "fasting",
  "notes": "空腹测量"
}
```

### 创建血压记录
```http
POST /api/v1/patients/:id/blood-pressure-records
Authorization: Bearer <token>
Content-Type: application/json

{
  "systolic": 130,
  "diastolic": 85,
  "measurementTime": "2026-04-02T08:30:00Z",
  "notes": "晨起测量"
}
```

## 错误代码

| 错误代码 | 描述 | HTTP状态码 |
|---------|------|-----------|
| `VALIDATION_ERROR` | 请求参数验证失败 | 400 |
| `AUTH_REQUIRED` | 需要认证 | 401 |
| `FORBIDDEN` | 权限不足 | 403 |
| `NOT_FOUND` | 资源不存在 | 404 |
| `CONFLICT` | 资源冲突 | 409 |
| `INTERNAL_ERROR` | 服务器内部错误 | 500 |
| `SERVICE_UNAVAILABLE` | 服务不可用 | 503 |

## 速率限制

- 认证API: 10次/分钟
- 其他API: 60次/分钟
- Webhook API: 无限制

## 版本控制

当前API版本: v1
所有API端点以 `/api/v1/` 开头。

## 更新日志

- 2026-04-02: 初始版本，包含患者管理、档案管理、企业微信集成和AI分析API