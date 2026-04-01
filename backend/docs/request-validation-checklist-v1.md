# 请求字段校验清单 v1

## 已具备基础校验
### auth/login
- mobile 必填
- password 必填

### patient create
- name 必填
- gender 枚举校验：male / female / unknown
- riskLevel 枚举校验：low / medium / high

### patient tag
- tagName 必填
- tagId 必填（绑定时）

### wecom binding
- bindingType 必填
- bindingType 枚举校验：wecom_user / external_user

### health records
- glucoseValue 必填且为数值
- systolicValue 必填且为数值
- diastolicValue 必填且为数值
- weightValue 必填且为数值
- glucoseValue 范围校验：0 ~ 50
- systolicValue 范围校验：40 ~ 300
- diastolicValue 范围校验：20 ~ 200
- weightValue 范围校验：1 ~ 500

### doctor review task
- patientId 必填
- summary 必填
- status 必填（更新时）

## 下一步可补
- mobile 格式校验
- birthDate 日期格式校验
- diabetesType 枚举校验
- measureScene 枚举校验
