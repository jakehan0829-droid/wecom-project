# 工作台 V1 Bearer Token 获取说明 v1

更新时间：2026-03-31

## 1. 目标

把工作台 V1 real 模式的 Bearer Token 获取方式标准化，避免每次试跑都临时解释。

---

## 2. Bearer Token 是什么

页面中的 Bearer Token：
- 是后端接口访问令牌
- 不是大模型秘钥
- 当前项目使用 JWT 校验

---

## 3. 当前标准获取方式

当前推荐统一通过登录接口获取：

`POST /api/v1/auth/login`

示例：

```bash
curl -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"13800000000","password":"demo123456"}'
```

返回结果中的：
- `data.accessToken`

就是页面 real 模式需要填写的 Bearer Token。

---

## 4. 当前演示账号

当前标准演示账号：
- mobile: `13800000000`
- password: `demo123456`

用途：
- 工作台 V1 标准试跑
- 标准样本回归

---

## 5. 标准试跑顺序

1. 执行标准样本脚本
2. 调登录接口获取 accessToken
3. 打开 `?mode=real`
4. 把 accessToken 填入 Bearer Token 输入框
5. 进入标准会话详情页试跑

---

## 6. 当前阶段结论

当前 Bearer Token 获取方式已经明确：

> **统一走登录接口获取 JWT，不再依赖手工现场生成 token。**
