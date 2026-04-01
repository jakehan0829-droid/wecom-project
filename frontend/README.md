# 治理台最小前端骨架

当前已初始化一个最小 Vite + React + TypeScript 前端骨架。

## 启动
```bash
cd /root/.openclaw/workspace/project/frontend
npm install
npm run dev
```

默认访问：
- http://127.0.0.1:5173

## 当前状态
- 已有治理台首页骨架
- 默认使用 `governance-dashboard/mock-data.json`
- 已接入：
  - `schema.ts`
  - `display-dictionary.ts`
  - `mock-data.json`

## 下一步建议
1. 把 mock 数据切换为真实 `/api/v1/wecom/mapping-governance/dashboard`
2. 增加时间筛选器
3. 增加问题对象区操作入口
4. 增加 conversation 详情跳转
