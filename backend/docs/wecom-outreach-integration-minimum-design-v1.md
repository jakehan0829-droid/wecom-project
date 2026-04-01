# 真实企微触达接入最小设计 v1

## 目标
在当前已具备 `patient_outreach_action` 内部待触达动作模型的基础上，明确下一阶段接入真实企业微信触达能力时，最小可落地的模块边界、状态表达、失败处理与人工介入边界。

这份文档只关注“最小真实接入设计”，不做大而全方案。

---

## 一、当前基础
当前 backend 已具备：
- `patient_wecom_binding`：患者与企微身份的最小绑定层
- `patient_outreach_action`：系统内部待触达动作层
- 异常记录可自动生成待触达动作
- 医生任务完成后可自动关闭关联待触达动作

当前缺口在于：
- 触达动作还没有真正映射成企业微信消息发送动作

---

## 二、最小设计目标
下一阶段最小目标不是“做完整消息平台”，而是：

1. 从 `patient_outreach_action` 中挑出可发送动作
2. 找到对应患者的企微绑定信息
3. 组装最小发送内容
4. 调用企业微信发送接口
5. 把发送结果回写到系统状态

---

## 三、推荐模块落点

### 1. 继续沿用 enrollment 模块承接触达发送
推荐新增：
- `src/modules/enrollment/service/wecom-outreach.service.ts`

原因：
- 当前绑定关系在 enrollment 模块
- 当前触达动作也在 enrollment 模块
- 把“根据绑定信息发企微消息”放这里最顺

### 2. 暂不新建独立 message 模块
原因：
- 当前目标是最小真实接入
- 还不到需要抽象通用消息平台的阶段

---

## 四、推荐的最小发送链路

### Step 1：选择可发送的触达动作
候选条件：
- `patient_outreach_action.status = 'pending'`
- 仅处理允许自动发送的动作类型（例如先只做 `manual_followup` 或 `profile_completion`）

### Step 2：查询患者企微绑定
从：
- `patient_wecom_binding`
查询：
- 当前是否存在可用绑定
- `binding_status = 'bound'`
- 优先取可用于真实发送的绑定类型

### Step 3：组装最小消息内容
建议先做简单文本：
- 标题可省略
- 直接根据 `summary` 生成最小消息体

例如：
- `系统提醒：请尽快跟进患者当前状态。`
- 或直接使用 `patient_outreach_action.summary`

### Step 4：发送企微消息
由 `wecom-outreach.service.ts` 调企业微信真实发送接口。

### Step 5：回写动作状态
最小建议：
- 发送成功 → `status = 'done'`
- 发送失败 → 保留 `pending` 或进入 `failed`

---

## 五、当前最小状态设计建议
当前 `patient_outreach_action.status` 已有：
- `pending`
- `done`

为了真实发送，建议最小扩展为：
- `pending`：待处理
- `sending`：发送中（可选，v1 可不做）
- `done`：发送成功或已收口
- `failed`：发送失败

### v1 最保守建议
如果要快速落地，可先只用：
- `pending`
- `done`
- `failed`

避免一开始就做复杂状态机。

---

## 六、失败 / 重试最小建议

### 1. 失败先记录，不自动无限重试
v1 建议：
- 第一次发送失败时，状态写 `failed`
- 记录失败原因
- 不做无限自动重试

### 2. 后续再补手动重试或定时重试
因为：
- 真实企微接入阶段，先保证链路清晰比“自动重试很炫”更重要

---

## 七、建议补的最小字段
如果要进入真实发送阶段，`patient_outreach_action` 最值得追加的字段是：

1. `channel`：例如 `wecom`
2. `send_status` 或直接复用 `status`
3. `sent_at`
4. `failure_reason`

如果控范围更严，也可以先只补：
- `failure_reason`
- `sent_at`

---

## 八、哪些点必须人工或外部条件介入
以下环节无法纯靠当前 backend 自己闭门完成：

### 1. 企业微信真实应用配置
需要：
- 企业微信应用可用
- 对应发送接口权限已开通
- CorpID / Secret / AgentId 等配置可用

### 2. 真实发送账号 / 接收对象确认
需要确认：
- 是给企业成员发，还是给外部联系人发
- 当前绑定字段是否与真实发送目标匹配

### 3. API key / 企业微信密钥类配置
这类配置属于外部敏感信息，需要人工提供。

---

## 九、推荐的下一步最小落地顺序

### 第一步
先补设计确认文档（本文件）。

### 第二步
补发送 service 骨架：
- `wecom-outreach.service.ts`
- 先不接真实外部请求，也可先留 mock / placeholder 接口

### 第三步
补 `patient_outreach_action` 发送结果回写能力。

### 第四步
在拿到真实企业微信配置后，再接真实发送调用。

---

## 十、当前结论
当前最合理的推进方向不是重新发明一套消息系统，而是：

**沿用现有 enrollment 模块，在 `patient_outreach_action` 基础上补一条最小真实企微发送链。**

也就是说，下一阶段不是“推翻重来”，而是：
- 复用绑定层
- 复用待触达动作层
- 补发送层
- 补状态回写
- 再逐步增强失败处理与重试
