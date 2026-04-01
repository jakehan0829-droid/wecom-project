# 当前治理台已具备能力清单 v1

更新时间：2026-03-30

## 一、已完成

### 1. 总览与模式
- mock / real 双模式
- dashboard 首页展示
- conversation detail 详情页
- message / audit / detail / dashboard 联动刷新

### 2. 详情页会话信息
- 展示 conversationId
- 展示 conversation name / platformChatId
- 展示 primaryCustomerId / matchedBy / mappingStatus
- 展示消息数、状态、最近动作时间

### 3. 治理表单
- 支持动作：
  - confirm
  - reassign
  - unconfirm
  - promote_binding
- 支持字段校验
- 支持 operatorName / operatorNote
- 提交后自动刷新 detail / messages / audits / dashboard

### 4. patient 候选区
- 接入 `/api/v1/patients`
- 支持按 patientId / 姓名 / 手机筛选
- 支持候选点击回填
- 支持 top1 / top2 显式层级
- 支持匹配强度 `matchScore`
- 支持推荐摘要
- 支持分组匹配理由：
  - 身份一致
  - 会话相关
  - 命中线索
- 支持 top 候选与当前会话上下文并排对照

### 5. message 区
- 支持排序切换
- 支持类型切换
- 支持条数切换
- 支持只看可判断消息
- 支持异常信号摘要：
  - 高噪音
  - 高重复
  - 缺少可判断文本
- 支持建议动作
- 支持一键切换：
  - 只看可判断 + 文本 + 最近5条
  - 非重复文本判断视图
- 支持展开被去重过滤消息
- 支持隐藏重复消息数量提示

### 6. audit 区
- 支持最新 audit 高亮
- 支持 audit 总结条
- 支持治理前 / 治理后对照块
- 支持 patientId / mappingStatus / matchedBy / bindingType 前后变化
- 支持 audit 时间线卡片
- 支持责任链展示：
  - 操作人
  - 操作时间
  - 操作备注
- 支持历史 audit 列表部分按责任链格式统一

### 7. 已验证闭环
- 前端多轮 `npm run build` 已通过
- 后端 `npm run build` 已通过
- 已定位并重启旧后端服务到最新代码
- audit 已打通 `operatorName` 写入和返回
- 已对 `wecom:private:mapping-chat-demo-001` 发起真实治理动作请求
- 已确认新生成的 audit 记录中出现：
  - `detail.operatorName = HanCong`
  - 顶层 `operatorName = HanCong`

---

## 二、待补

### 1. patient 候选
- 进一步把 `matchScore` 发展成更正式的排序规则/配置化规则
- 候选对照区可继续补更多会话特征字段

### 2. message 区
- 可继续把异常信号摘要推进成更明确的“建议动作面板”
- 可继续增强被过滤消息的可视化差异说明

### 3. audit 区
- 可继续把历史记录列表完全统一到时间线/责任链格式
- 可继续补更多前后变化字段的结构化展示

### 4. 阶段性整理
- 可继续补一版“已完成 / 待补 / 暂不做”的阶段切换说明页，用于交接和阶段收口

---

## 三、暂不做

### 1. 非当前阶段范围
- 完整登录流
- 完整权限体系
- 复杂图表体系
- 全量详情接口一次性补齐
- 大规模重构路由体系

### 2. 原则
当前仍坚持：
- 轻量切入
- 低风险推进
- 先最小可用
- 先真实工作流闭环，再扩展非核心能力

---

## 四、当前阶段结论

当前治理台已经不只是“原型页”，而是具备：
- 真实治理动作提交
- 审计责任链回显
- 候选对象优先级表达
- 消息判断辅助
- 前后端真实联调闭环

已经可以视为一个“具备最小可用治理作业能力”的后台雏形。
