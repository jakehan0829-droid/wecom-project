# 工作台 V1 标准测试样本固化 v1

更新时间：2026-03-31

## 1. 目标

把工作台 V1 的真实试跑，从“临时补数”收成“可重复执行的标准样本”。

目标不是做复杂测试框架，而是固定：
- 一条可访问的标准入口
- 一个可进入的标准会话
- 一条可执行的标准 pending action
- 一套最小试跑步骤
- 一个一键补齐脚本

这样后续演示 / 回归时，不再临时排障和补数。

---

## 2. 当前推荐标准入口

统一使用：
- `http://<服务器地址>:3000/?mode=real`

不要再优先使用：
- 5173 dev 端口
- 127.0.0.1 本机地址

原因：
- 3000 已固化为前后端同域入口
- 更适合作为标准试跑入口

---

## 3. 当前推荐标准会话

当前标准样本固定为：

- conversationId: `wecom:private:HanCong`
- platformChatId: `HanCong`
- conversationName: `HanCong`
- patientId: `689ca26c-b8d0-46e4-a6d3-c5b750472eff`

说明：
- 当前脚本会确保该会话存在并绑定到指定 patient
- 后续如切换正式标准样本，应同步更新脚本与本文档

---

## 4. 当前推荐标准 pending action

当前标准测试动作固定为：

- summary: `【测试】工作台 V1 真实试跑用 pending action`
- actionType: `manual_followup`
- triggerSource: `manual`

用途：
- 用于验证“动作与反馈”区最小闭环
- 提交反馈后，可在回流卡片与 action history 中看到变化

---

## 5. 一键补齐脚本

已新增脚本：

- `backend/scripts/ensure-workbench-v1-standard-sample.mjs`

用途：
- 确保标准会话存在
- 确保标准 pending action 存在
- 输出可直接打开的试跑 URL

执行方式：

```bash
cd /root/.openclaw/workspace/project/backend
node scripts/ensure-workbench-v1-standard-sample.mjs
```

执行结果：
- 若样本已存在，则复用当前样本
- 若样本不存在，则自动补齐

---

## 6. 标准试跑动作

每次试跑按固定顺序执行：

1. 执行标准样本脚本
2. 打开 `?mode=real`
3. 填 Bearer Token
4. 进入标准会话详情页
5. 看顶部入口摘要
6. 看右侧深一层判断
7. 在“动作与反馈”区选择标准测试动作
8. 提交一次最小反馈
9. 查看“本次反馈回流”卡片
10. 查看 action history 更新

通过标准：
- 能进入详情页
- 能看到标准测试动作
- 能提交反馈
- 能看到回流结果

---

## 7. 当前已知风险

### 风险 1：标准样本仍依赖当前 patient 数据存在
表现：
- 当前脚本默认使用 `patientId = 689ca26c-b8d0-46e4-a6d3-c5b750472eff`
- 若该 patient 被删除或环境不同，脚本会失效

建议：
- 后续补“标准 patient 样本自动校验/自动创建”能力

### 风险 2：Token 仍是试跑门槛
表现：
- 当前 real 模式仍需手工填写 Bearer Token

建议：
- 后续补 demo 登录或试跑 token 引导

---

## 8. 当前阶段结论

当前已经可以把以下内容视为 V1 标准测试样本基础版：

- 稳定入口：3000 同域
- 标准会话：`wecom:private:HanCong`
- 标准动作：`【测试】工作台 V1 真实试跑用 pending action`
- 标准脚本：`ensure-workbench-v1-standard-sample.mjs`
- 标准闭环：反馈提交 → 回流卡片 → history 更新

一句话收口：

**工作台 V1 已经开始具备可重复执行的标准测试样本，不再完全依赖手工补数。**
