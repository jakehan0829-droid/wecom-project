# MVP 演示包总索引 v1

## 目标
把当前 backend MVP 演示所需材料收口为一个单入口导航页，降低现场演示时来回翻文件的成本。

适用场景：
- 演示前快速准备
- 演示中按顺序执行
- 演示翻车时快速跳到对应排查材料

---

## 一、如果你只有 30 秒，先看这 3 个

### 1. 演示前先确认系统活着
看：
- `backend/docs/demo-readiness-checklist-v1.md`

重点：
- 跑 `node scripts/runtime-check.js`
- 确认 PM2 online
- 确认 `/health` 正常

### 2. 演示时按什么顺序走
看：
- `backend/docs/first-demo-flow-v2.md`

重点：
- 讲解顺序
- 每一步想证明什么
- 每一步预期看到什么

### 3. 演示时直接复制什么命令
看：
- `backend/docs/demo-curl-templates-v1.md`

重点：
- 登录
- 创建患者
- 绑定
- 写异常记录
- 查任务
- 查触达动作
- 查 dashboard
- 完成任务
- 可选查看 send-preview / action detail / send / status patch

---

## 二、完整演示材料结构

### A. 演示讲解主线
文件：
- `backend/docs/first-demo-flow-v2.md`

作用：
- 负责讲“为什么这么演示”
- 强调业务闭环，不只是接口清单

适合什么时候看：
- 演示前 5 分钟快速过一遍
- 需要自己讲逻辑时

---

### B. 演示执行模板
文件：
- `backend/docs/demo-curl-templates-v1.md`

作用：
- 负责减少现场手打
- 基本可以边看边执行

适合什么时候看：
- 演示过程中
- 需要复制请求时

---

### C. 演示前检查与翻车排查
文件：
- `backend/docs/demo-readiness-checklist-v1.md`

作用：
- 负责演示前检查
- 负责翻车时优先排查路径

适合什么时候看：
- 演示开始前
- 出现接口无响应、数字不变、联动不生效时

---

### D. 运行层巡检补充
文件：
- `docs/ops-watch-checklist.md`
- `scripts/runtime-check.js`

作用：
- 负责最小运行健康检查
- 补充服务/数据库/接口层巡检

适合什么时候看：
- backend 明显异常时
- 演示前快速确认系统状态时

---

## 三、演示时建议的切换顺序

### 最稳顺序
1. `demo-readiness-checklist-v1.md`
   - 先确认能演
2. `first-demo-flow-v2.md`
   - 明确演示主线
3. `demo-curl-templates-v1.md`
   - 现场执行请求
4. 若翻车，再跳回 `demo-readiness-checklist-v1.md` 或 `ops-watch-checklist.md`

也就是说：
- **先确认系统活着**
- **再确认讲什么**
- **最后执行请求**

---

## 四、如果演示时间很短，最推荐保留哪条主线
如果时间只够演一条链，建议保留：

1. 登录
2. 创建患者
3. 写异常血糖记录
4. 查看医生任务
5. 查看待触达动作
6. 查看 dashboard
7. 完成医生任务
8. 再看 dashboard / 触达动作

原因：
- 这条线最能体现“异常数据进入系统后如何触发动作并闭环”
- 比绑定、普通记录、静态列表更有业务说服力

---

## 五、如果现场翻车，最快跳转路径

### 问题：服务可能挂了
先看：
- `demo-readiness-checklist-v1.md`
- `scripts/runtime-check.js`

### 问题：接口报错 / 空响应
先看：
- `demo-readiness-checklist-v1.md`
- `docs/ops-watch-checklist.md`

### 问题：不知道下一步该演什么
先看：
- `first-demo-flow-v2.md`

### 问题：不知道 curl 怎么写
先看：
- `demo-curl-templates-v1.md`

---

## 六、当前演示包结论
当前 MVP 演示包已经具备：
- 单入口索引
- 主线讲解文档
- curl 执行模板
- 演示前检查清单
- 运行巡检入口

这意味着当前 backend 不只是“做出来了”，而是已经被整理到：
**可讲、可演、可检查、可排障**。
