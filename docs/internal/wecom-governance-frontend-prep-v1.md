# 治理台前端落地准备 v1

更新时间：2026-03-30

## 1. 当前判断

当前项目仓库里还没有独立前端工程，因此 B 线这一步不适合直接硬写页面实现。

更合理的做法是：
- 先把前端会立即复用的准备层沉淀到代码里
- 等前端工程初始化后，再无缝接入

---

## 2. 已落地到代码的准备层

目录：
- `project/frontend/governance-dashboard/`

当前包含：

### `schema.ts`
定义治理台页面 section：
- cards
- byAction
- byMatchedBy
- byConversation
- recentActions
- latestUnmappedCustomers
- latestConflictCustomers

### `display-dictionary.ts`
定义前端展示字典：
- `matchedByLabelMap`
- `actionLabelMap`
- `mappingStatusLabelMap`
- `bindingTypeLabelMap`

### `mock-data.json`
基于当前真实接口返回整理的 mock 数据，可直接用于页面骨架调试。

### `README.md`
说明后续如何把这层接入真实前端。

---

## 3. 当前价值

这一步虽然不是完整前端页面，但已经把 B 线最容易散掉的内容先固化了：
- 页面结构
- 字段展示口径
- mock 数据

后续前端一接入，就不是从零猜接口。

---

## 4. 一句话结论

B 线已开始落地到代码，当前先把治理台前端的“结构层 + 字典层 + mock 层”沉淀下来，为后续真实页面实现做准备。
