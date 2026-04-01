# D2-D4 insight 迁移阶段收口总结 / 阶段结论 v1

更新时间：2026-03-30

## 1. 本阶段目标回顾

本阶段围绕 D2-D4 insight 迁移，核心目标是：
- 打通 analyze / latest insight / detail 展示最小闭环
- 将 insight 主存储从旧表逐步切到新表 v1
- 清理主要读取侧与关键旁路对旧表的依赖
- 验证主链是否已可脱离旧表兜底

---

## 2. 本阶段已完成的核心事项

### D2-D3 主链闭环
已完成：
- analyze 接口打通
- latest insight 接口打通
- 前端 detail 页 insight 展示打通
- “生成 insight”触发与刷新体验打通

### D3 新表接入
已完成：
- 建立 `wecom_conversation_insights_v1`
- analyze 新表写入落地
- latest insight 新表主读落地
- patient/customer ref 模型（`customer_ref` / `patient_ref`）补齐

### D4 摘要接入
已完成：
- D4 摘要从前端拼接提示推进到后端结构化返回
- detail 页已展示 proposal / action suggestion 摘要
- business-feedback 已切到新表口径

### 旧表依赖收口
已完成：
- dashboard insight 统计迁到新表
- patient detail latestInsight 迁到新表/新 ref 模型
- insight list/detail 迁到新表
- business-feedback 迁到新表
- action-feedback 新表同步写落地
- analyze 停旧写灰度通过
- latest insight 去旧表回退读灰度通过
- action-feedback 去旧表兼容写灰度通过

---

## 3. 当前阶段结论

当前已经可以明确表述为：

> **D2-D4 insight 迁移阶段目标已阶段性完成。**

更具体地说：
- `wecom_conversation_insights_v1` 已成为现行主运行表
- `wecom_conversation_insights` 已退化为历史兼容层
- 主链与主要消费链当前已可在不依赖旧表兜底/新增写的情况下运行

---

## 4. 本阶段最大的结构性成果

如果只提最核心的一句话，本阶段最大的成果是：

> **insight 能力已经从“旧表兼容 + 原型拼接”推进到“新表主运行 + 主链脱旧 + 主要消费链迁移完成”的状态。**

---

## 5. 仍未做的事（但已不属于本阶段主阻塞）

- 旧表物理清场路线图尚未正式启动
- 旧表 schema / 边角兼容代码尚未做最终清扫
- 是否彻底删除旧表、何时删除，仍需下一阶段单独规划

这类事项当前更适合归到“下一阶段清场与治理”而不是当前迁移主线。

---

## 6. 一句话结论

本阶段可以正式收口为：

**D2-D4 insight 迁移阶段已阶段性完成，系统已从“旧表兼容运行”切换到“新表主运行、旧表历史兼容”的新状态。**
