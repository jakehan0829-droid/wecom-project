# 详情页继续增强：候选真排序 / 消息一键筛选 / audit operator 真链路 v10

更新时间：2026-03-30

## 本轮新增

### 1. patient 候选按 matchScore 真排序
- 候选区不再只展示分值，已按匹配强度实际排序
- 当前权重：
  - 当前主客户一致 / 当前映射 patient 一致 > 会话相关 > 洞察/线索

### 2. 消息建议动作联动当前筛选
- 异常信号摘要区新增一键动作：
  - `只看可判断 + 文本 + 最近5条`
- 让“建议动作”从文字提示变成可执行交互

### 3. audit operator 真链路
- 后端 `createWecomMappingAuditService` 已支持 `operatorName`
- operatorName 写入 audit payload_json/detail 并在 list 接口中返回
- 前端治理表单新增 `operatorName`
- audit 时间线中的“责任链”不再只是纯占位，可展示真实 operatorName

## 一句话结论

详情页已经进一步从“会提示怎么判断”推进到“能直接帮你切到合适视图、并把责任链真实带出来”。
