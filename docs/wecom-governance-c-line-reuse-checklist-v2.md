# C 线复用迁移清单（三栏版）v2

更新时间：2026-03-30

## 一、可直接复用

- detail 页面骨架
- 基本信息区 / 状态区 / 治理入口区
- message 判断区结构
- audit 时间线 / 责任链 / 前后对照块
- 治理动作提交后的自动刷新联动
- 候选区的 top1/top2 / 推荐摘要 / 理由分组表达

---

## 二、需要替换

- 候选对象类型：patient -> participant / 群成员 / 映射对象
- 匹配理由来源：patient/conversation -> participant/group/member mapping 线索
- 治理动作语义：patient mapping -> participant 映射治理动作
- 详情页字段：primaryCustomerId / patientId 等替换为 C 线字段

---

## 三、暂时不复用

- patient 专属展示字段（糖尿病类型、风险等级、管理状态等）
- patient 详情补拉逻辑
- 与 patient 绑定强耦合的文案表达

---

## 一句话结论

C 线应优先复用 B 线治理台骨架与交互模式，只替换业务对象、字段和动作语义，不建议从零重做。
