# 治理台前端 real 模式接入 v1

更新时间：2026-03-30

## 1. 当前新增能力

前端治理台首页已支持：
- mock 模式
- real 模式
- 时间范围切换：`today` / `this_week` / `7d`
- 手动填写 Bearer token 请求真实接口

---

## 2. real 模式工作方式

前端通过 Vite dev proxy 转发：
- `/api/*` -> `http://127.0.0.1:3000/api/*`

因此开发时只需要：
1. backend 在线
2. 前端 dev server 在线
3. 页面中填入 Bearer token

即可直接请求：
- `/api/v1/wecom/mapping-governance/dashboard?timePreset=...&limit=10`

---

## 3. 当前取舍

为了保持最小可运行版本，这一版没有接完整登录流，而是：
- 由页面手动输入 token
- token 保存在浏览器 localStorage

这是开发态最小实现，不代表最终正式方案。

---

## 4. 一句话结论

治理台前端已经从“纯 mock 页”推进到“mock / real 可切页”，并具备最小真实接口接入能力。
