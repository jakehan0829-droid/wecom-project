# Governance Dashboard Frontend Prep

这是 B 线“前端治理台落地准备”的前置代码目录，不依赖具体前端框架。

当前包含：
- `schema.ts`：页面 section 结构定义
- `display-dictionary.ts`：前端展示字典
- `mock-data.json`：基于当前真实接口结果整理的 mock 数据

目的：
1. 在前端仓库尚未初始化前，先把治理台页面结构、枚举展示、mock 数据沉淀下来
2. 后续无论接 React / Vue / Next，都可以直接复用这层准备物
3. 减少前端落地时边做边猜字段和页面结构

建议后续接前端时：
1. 先用 `mock-data.json` 起页面骨架
2. 再替换成 `/api/v1/wecom/mapping-governance/dashboard`
3. 使用 `display-dictionary.ts` 统一渲染 action / matchedBy / mappingStatus / bindingType
