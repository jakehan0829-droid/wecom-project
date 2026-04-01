# 项目推进状态板（可接管版）

## 当前阶段
- 阶段名称：业务闭环真实性建设阶段
- 当前主线：在已稳定运行的 backend 基线之上，逐步把“演示骨架”推进为“真实最小业务闭环”
- 当前默认执行原则：主Agent 直接负责总控、低风险 shell 执行、代码落地与结果收口；你只在高风险或外部必要节点介入。

---

## 总体状态
- 部署状态：已完成第一阶段独立落地
- 隔离状态：已完成第二阶段基础收敛
- 后端运行状态：PM2 托管在线
- 当前重点：业务闭环真实性增强 + 自动化推进/监督机制建立
- 当前默认接管参考文档：`project/docs/main-agent-failure-takeover-v1.md`

---

## 当前主线任务
- 当前任务编号：P0-1 / P9 阶段收口完成，准备切下一阶段
- 当前任务名称：真实 webhook 固化 + 企微映射治理链搭建 + owner 迁移收口材料准备
- 当前负责人：主Agent
- 当前状态：阶段完成（待进入 owner 执行窗口 / 前端治理台落地 / 群聊 participant 映射治理 三选一下一阶段）
- 最近一次有效进展：已完成当前阶段总收口：真实 webhook 运行方式已固化，映射治理链已闭环，治理台接口已具备 cards/charts/tables 固定输出，mapping audit 明细/聚合已可查询，owner 迁移执行方案、cutover checklist、预演包、验收模板与样例已齐全。详见 `project/docs/wecom-phase-summary-p0-p1-v1.md`。
- 下一步动作：A 线 owner cutover 当前建议封板等窗口；窗口一到按执行包直接落地。主Agent 可开始轻量准备 B 线前端治理台落地，不影响 A 线待执行状态。
- 是否需要韩聪介入：当前不再需要拍板路线；仅在 owner / DBA 执行窗口确认时需要协调相关人员与时间。

---

## 任务板

### P1 健康记录异常自动生成医生任务
- 负责人：主Agent
- 状态：已完成
- 已完成内容：
  - 血糖异常自动生成医生任务
  - 血压异常自动生成医生任务
  - 同类 pending 任务防重复生成
  - 已完成运行态联调验证
- 下一动作：作为已完成能力纳入演示链路
- 是否需要人工介入：否

### P2 企微绑定链路增强
- 负责人：主Agent
- 状态：已完成
- 已完成内容：
  - patient 存在性校验
  - bindingType 与字段匹配校验
  - 重复绑定控制
  - async 路由统一进入 errorHandler
  - 已完成运行态联调验证
- 下一动作：作为演示链路组成部分保留
- 是否需要人工介入：否

### P3 患者触达动作建模
- 负责人：主Agent
- 状态：已完成
- 已完成内容：
  - 新增 `patient_outreach_action` 表
  - 新增创建/列表接口
  - patient 校验
  - 已完成运行态联调验证
- 下一动作：纳入 dashboard 与闭环联动
- 是否需要人工介入：否

### P4 dashboard / 任务流真实性增强
- 负责人：主Agent
- 状态：已完成
- 已完成内容：
  - `todayRecordTotal` 扩展为血糖 + 血压 + 体重
  - 纳入 `pendingOutreachActionTotal`
  - 已完成运行态联调验证
- 下一动作：作为演示看板收口
- 是否需要人工介入：否

### P5 异常记录 → 医生任务 / 触达动作 / dashboard 联动闭环
- 负责人：主Agent
- 状态：已完成
- 已完成内容：
  - 异常健康记录自动生成医生任务
  - 异常健康记录自动生成待触达动作
  - 待触达动作具备最小防重复
  - dashboard 能反映 pendingOutreachActionTotal
  - 已完成运行态联调验证
- 下一动作：纳入演示主线
- 是否需要人工介入：否

### P6 医生任务状态变化 → 触达动作 / 闭环状态联动
- 负责人：主Agent
- 状态：已完成
- 已完成内容：
  - 医生任务状态改为非 pending 时，自动关闭同患者当天 `manual_followup` pending 触达动作
  - dashboard pending 数同步下降
  - 已完成运行态联调验证
- 下一动作：纳入演示闭环收口
- 是否需要人工介入：否

### P7 业务演示脚本 / 演示顺序 / 一键巡检整理
- 负责人：主Agent
- 状态：进行中
- 当前目标：
  - 整理最新版 MVP 演示顺序
  - 收敛关键接口、预期现象、预期 dashboard 变化
  - 把巡检入口与演示前自检步骤写清楚
- 下一动作：输出新版演示包文档
- 是否需要人工介入：暂不需要

### P8 企微触达动作状态机增强
- 负责人：主Agent
- 状态：已完成第一版
- 已完成内容：
  - 新增 `GET /api/v1/patient-outreach-actions/:id` 单条详情接口
  - 新增 `PATCH /api/v1/patient-outreach-actions/:id/status` 手动状态流转接口
  - `send` 已从纯占位返回推进为真实回写：
    - 配置缺失 / 接收人不可解析 → `failed`
    - 条件满足占位发送成功 → `done`
  - 为真实企微 API 接入前补齐最小状态机层
  - 已完成 build / restart / runtime-check 验证
- 下一动作：把演示包和 curl 模板同步到 P8 能力
- 是否需要人工介入：暂不需要

### S1 主Agent失联 / token耗尽监督与接管机制
- 负责人：主Agent
- 状态：已完成第一版
- 已完成内容：
  - 已输出 `project/docs/main-agent-failure-takeover-v1.md`
  - 已明确失联判定、A1/A2/A3/A6 接管顺序、状态板最低要求、韩聪介入边界
- 下一动作：后续视需要补自动触发与提醒能力
- 是否需要人工介入：暂不需要

---

## 自动化推进与监督机制

### 已建立
- 项目推进状态板（可接管版）：已建立
- 运行巡检清单：已建立
- 最小巡检脚本：已建立
- 主Agent失联接管规则：已建立 v1
- A1 值班巡视清单：已建立 v1
- 多Agent 值班运行卡：已建立 v1
- 多Agent 接力模板：已建立 v1
- 多Agent 自我进化规则：已建立 v1
- 状态板标准模板：已建立 v1
- 自动汇报与巡视机制：已建立 v1
- 进度汇报模板：已建立 v1

### 当前接管规则摘要
- 超过一个推进周期无有效更新，且任务非“已完成 / 已阻塞待人工”时，可判定进入接管流程
- token / quota / model unavailable 类错误，直接进入接管判定
- 巡视口径不能只看 `/health`；必须同时看 PM2 状态、最近错误日志、关键业务接口可用性
- A1 负责值班调度；A2 负责代码续跑；A3 负责运行态恢复；A6 负责范围与质量复核
- 接管详情见：`project/docs/main-agent-failure-takeover-v1.md`
- A1 固定巡视步骤见：`project/docs/agent-duty-checklist-v1.md`
- 多Agent 运行制度见：`docs/multi-agent-duty-operating-card-v1.md`
- A2/A3/A6 接力模板见：`docs/multi-agent-handoff-templates-v1.md`
- 自我进化沉淀规则见：`docs/self-evolution-rules-v1.md`

---

## 当前最值得关注的 3 件事
1. 完成 P7 演示包文档收口，避免成果散落在多个文件里
2. 保持 backend 在线与关键接口稳定，不让已完成闭环回退
3. 把主Agent 单点故障风险降到可接管水平
