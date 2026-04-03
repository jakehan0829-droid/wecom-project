# 旧 insight 表旁路依赖迁移清单 v1

更新时间：2026-03-30

## 1. 目标

把当前仍依赖旧表 `wecom_conversation_insights` 的旁路能力按迁移优先级分类，明确：
- 哪些先迁
- 哪些后迁
- 哪些只是统计口径

---

## 2. 优先级分类

## P1：优先迁移（轻量、收益高、风险低）

### A. dashboard insight 统计
文件：
- `backend/src/modules/dashboard/service/dashboard.service.ts`

当前依赖：
- `wecomInsightTotal`
- `highPriorityInsightTotal`

判断：
- 这是统计口径
- 不直接承载复杂业务结构
- 迁移成本低
- 很适合作为第一条旧表旁路迁移样本

### B. patient 详情的 latestInsight
文件：
- `backend/src/modules/patient/service/patient.service.ts`

当前依赖：
- 患者详情页的最新 insight

判断：
- 读取目标单一
- 查询语义明确
- 迁移难度中低
- 适合作为第二批切换目标

---

## P2：中优先级迁移（有业务价值，但结构耦合更深）

### C. insight list / detail 旧接口
文件：
- `backend/src/modules/wecom-intelligence/service/insight.service.ts`
- `backend/src/modules/wecom-intelligence/controller/insight.controller.ts`

当前依赖：
- `listWecomInsights`
- `getWecomInsightDetail`

判断：
- 业务相关性高
- 但需要重新定义列表/详情在新表口径下的字段与兼容策略
- 不适合作为第一条轻量迁移样本

---

## P3：后迁移（结构耦合深，不宜先动）

### D. business-feedback 链
文件：
- `backend/src/modules/wecom-intelligence/service/business-feedback.service.ts`

当前依赖：
- `next_action_suggestions_json`
- `plan_update_suggestions_json`
- `intent_assessment_json`

判断：
- 依赖旧结构最深
- 迁移时不只是换表，还要重组语义映射
- 应放在主链和轻量侧链都稳定后再处理

### E. action-feedback 写入链
文件：
- `backend/src/modules/wecom-intelligence/service/action-feedback.service.ts`

当前依赖：
- 直接向旧表写入反馈结果

判断：
- 这是写入链，不只是读取链
- 需要先决定 feedback 在新表中是否继续作为 insight 的一种、还是单独建模
- 现阶段不适合先动

---

## 3. 统计口径类说明

当前可视为“统计口径优先迁移”的项：
- dashboard 的 `wecomInsightTotal`
- dashboard 的 `highPriorityInsightTotal`

这类项特点是：
- 不强依赖旧结构 json 字段
- 容易切到新表
- 适合先做，快速减少旧表读取面

---

## 4. 推荐迁移顺序

建议顺序：
1. dashboard insight 统计
2. patient 详情 latestInsight
3. insight list / detail 旧接口
4. business-feedback 链
5. action-feedback 写入链

---

## 5. 一句话结论

当前最合理的迁移起点不是动最复杂的业务链，而是：

**先从 dashboard 这类统计口径开始切，快速减少旧表读取面，再逐步推进 patient / insight / business-feedback。**
