# MVP 演示就绪检查清单 v1

## 目标
在正式演示前，用最短时间确认：
- backend 在线
- 关键链路可跑
- 演示顺序清晰
- 出问题时知道先查哪里

配合使用：
- `backend/docs/first-demo-flow-v2.md`
- `backend/docs/demo-curl-templates-v1.md`
- `docs/ops-watch-checklist.md`

---

## 一、演示前 1 分钟检查

### 1. 服务在线
执行：
```bash
cd /root/.openclaw/workspace/project
node scripts/runtime-check.js
```

预期：
- `overallOk=true`
- `pm2.ok=true`
- `health.ok=true`

### 2. 后端进程在线
执行：
```bash
pm2 status chronic-disease-backend
```

预期：
- `online`

### 3. 若临近演示前刚改过代码
执行：
```bash
cd /root/.openclaw/workspace/project/backend
npm run build
```

预期：
- build 通过

---

## 二、演示时建议顺序
建议严格按以下主线演示，不要现场临时分叉太多：

1. 登录
2. 创建患者
3. 绑定企微身份
4. 写入异常血糖记录
5. 查看医生任务
6. 查看待触达动作
7. 查看 dashboard
8. 完成医生任务
9. 再查看待触达动作与 dashboard

说明：
- 这条顺序最能体现“数据进入系统后如何触发后续动作并收口”
- 比单纯展示 CRUD 更有业务感

---

## 三、演示时重点观察什么

### 1. 写异常血糖记录后
应重点说明：
- 当前接口只返回记录写入成功
- 但系统内部已自动触发后续动作

### 2. 查看医生任务时
应重点观察：
- 新增 pending 任务
- summary 能体现异常值

### 3. 查看待触达动作时
应重点观察：
- 新增 `manual_followup`
- 当前状态是 `pending`

### 4. 查看 dashboard 时
应重点观察：
- `todayRecordTotal`
- `pendingDoctorReviewTotal`
- `pendingOutreachActionTotal`

### 5. 完成医生任务后
应重点观察：
- 任务状态改为 `done`
- 待触达动作同步改为 `done`
- dashboard 的 pending 数同步下降

---

## 四、演示时最值得强调的价值点

### 价值点 1：不是只会存数据
异常健康记录进入系统后，会自动触发后续业务动作。

### 价值点 2：不是只会堆对象
医生任务与待触达动作之间存在联动闭环，不是各自孤立。

### 价值点 3：不是假 dashboard
看板会反映真实 pending 状态变化，而不是写死数字。

---

## 五、如果演示翻车，优先怎么查

### 情况 1：接口无响应 / 空响应
先看：
```bash
pm2 logs chronic-disease-backend --lines 100 --nostream
```

重点判断：
- 是否未捕获异常
- 是否数据库查询报错

### 情况 2：登录失败
先看：
- `user_account` 表权限
- 数据库连接配置
- 最近是否改过 `.env`

### 情况 3：创建患者或写记录失败
先看：
- 请求 body 是否缺字段
- 当前 patient / auth token 是否正确
- PM2 error log

### 情况 4：dashboard 数字没变化
先看：
- 前一步异常记录是否真的写成功
- 医生任务是否真的生成
- 待触达动作是否真的生成

### 情况 5：医生任务完成后触达动作没关闭
先看：
- 任务是否确实被更新为非 `pending`
- 关联动作是否为 `manual_followup`
- 是否属于当天创建的数据

---

## 六、演示时的保守策略
1. 使用新的患者手机号
2. 只演示一条主线，不在现场混跑太多病例
3. 先看结果明显的接口，再解释机制细节
4. 若时间紧，异常路径（如 patient not found）用口头说明，不一定现场重跑

---

## 七、当前演示包组成
当前最小演示包已包含：

1. `backend/docs/first-demo-flow-v2.md`
   - 负责讲清楚演示顺序与业务含义
2. `backend/docs/demo-curl-templates-v1.md`
   - 负责减少现场手打
3. `backend/docs/demo-readiness-checklist-v1.md`
   - 负责演示前检查与翻车时快速排查
4. `docs/ops-watch-checklist.md`
   - 负责运行层巡检
5. `scripts/runtime-check.js`
   - 负责最小健康检查

---

## 八、当前结论
如果 backend 在线、数据库正常、演示账号可登录，那么当前这套材料已经足够支撑一次最小 MVP 闭环演示。
