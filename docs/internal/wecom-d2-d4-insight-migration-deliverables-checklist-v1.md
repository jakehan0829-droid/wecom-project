# D2-D4 insight 迁移本阶段完成项 / 可交付清单 v1

更新时间：2026-03-30

## 1. 本阶段完成项

### 主链能力
- [x] analyze 接口可运行
- [x] latest insight 接口可运行
- [x] detail 页 insight 展示可运行
- [x] “生成 insight”触发与刷新体验可运行

### 新表主运行
- [x] `wecom_conversation_insights_v1` 建表并接入
- [x] analyze 新表写入落地
- [x] latest insight 新表主读落地
- [x] `customer_ref / patient_ref` 模型补齐并接入

### D4 摘要
- [x] D4 摘要后端结构化返回落地
- [x] detail 页展示 proposal / action suggestion 摘要
- [x] business-feedback 切到新表口径

### 旧表兼容收口
- [x] dashboard insight 统计迁到新表
- [x] patient detail latestInsight 迁到新表/新 ref 模型
- [x] insight list/detail 迁到新表
- [x] action-feedback 新表同步写落地
- [x] analyze 停旧写灰度通过
- [x] latest insight 去旧表回退读灰度通过
- [x] action-feedback 去旧表兼容写灰度通过

### 阶段治理文档
- [x] 灰度执行卡与灰度结果记录已沉淀
- [x] 观察期 watchlist 已沉淀
- [x] 下一阶段进入条件已沉淀
- [x] 稳定观察期边界已沉淀
- [x] 旧表最终清场已被定义为下一阶段独立议题

---

## 2. 本阶段可交付物

本阶段可明确交付的成果包括：
- 新表主运行的 insight 主链
- 已迁移的新表读取链（latest / patient / list / detail / business-feedback）
- 已可展示 D4 摘要的 detail 页
- 已完成关键灰度验证的 analyze / latest / action-feedback 收口结果
- 一组完整的阶段决策、灰度、观察期、阶段收口文档

---

## 3. 当前阶段一句话状态

> **D2-D4 insight 迁移线，本阶段可视为收口完成。**

---

## 4. 一句话结论

本阶段已经不仅是“做完一批改动”，而是已经形成：

**可运行主链 + 已迁移主要消费链 + 已验证关键灰度结果 + 已沉淀阶段治理文档 的完整可交付状态。**
