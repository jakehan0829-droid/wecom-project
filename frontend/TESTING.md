# 前端测试指南

## 测试类型

### 1. 单元测试 (Jest + React Testing Library)
**用途**：测试React组件和工具函数
**运行命令**：
```bash
npm test                    # 运行所有单元测试
npm run test:watch         # 监听模式运行测试
npm run test:coverage      # 生成测试覆盖率报告
npm test -- --testPathPattern=组件名  # 运行特定组件测试
```

**测试文件位置**：
- `src/components/*.test.tsx` - 组件测试
- `src/__tests__/*.test.tsx` - 页面和集成测试

### 2. 端到端测试 (Playwright)
**用途**：测试完整业务流程，模拟用户操作
**运行命令**：
```bash
npm run test:e2e           # 运行所有E2E测试（无头模式）
npm run test:e2e:ui        # 使用Playwright UI运行测试
npm run test:e2e:headed    # 有头模式运行测试
```

**测试文件位置**：
- `e2e/app.spec.ts` - 基础应用测试
- `e2e/flows/*.spec.ts` - 业务流程测试

## 测试场景

### 核心业务流程测试
1. **企业微信消息处理流程** (`wecom-message-flow.spec.ts`)
   - 医生工作台查看患者对话
   - 发送消息到患者
   - 查看AI分析建议

2. **患者绑定与档案管理流程** (`patient-archive-flow.spec.ts`)
   - 查看患者档案列表
   - 查看患者档案详情
   - 编辑患者档案
   - 绑定新患者

3. **企业微信绑定流程** (`wecom-binding-flow.spec.ts`)
   - 查看患者绑定状态
   - 手动绑定患者到企业微信
   - 将对话映射提升为绑定
   - 查看绑定历史记录

4. **AI分析集成流程** (`ai-analysis-flow.spec.ts`)
   - 消息AI分析并更新档案
   - 查看AI生成的健康建议
   - 查看消息情感分析
   - 业务路由决策显示

### 组件测试
- `Loading`组件：加载状态显示
- `ErrorDisplay`组件：错误信息展示
- `EmptyState`组件：空数据状态显示

## 测试环境配置

### 开发环境运行
1. 启动后端服务：
   ```bash
   cd /root/wecom-project/wecom-project
   docker-compose up -d
   ```

2. 启动前端开发服务器：
   ```bash
   cd frontend
   npm run dev
   ```

3. 运行端到端测试：
   ```bash
   npm run test:e2e:headed
   ```

### CI/CD环境
GitHub Actions已配置完整流水线：
1. 代码检查 (ESLint, TypeScript)
2. 单元测试执行
3. 端到端测试执行
4. 容器构建和推送

## 测试数据

### Mock数据
- `src/mocks/handlers.ts` - API Mock处理器
- `src/mocks/testHandlers.ts` - 测试环境专用处理器

### 测试数据准备
端到端测试需要：
1. 运行中的后端API服务
2. 数据库中有测试患者数据
3. 模拟企业微信Webhook调用

## 测试编写指南

### 组件测试最佳实践
1. 测试组件渲染和基础功能
2. 测试用户交互（点击、输入等）
3. 测试不同props状态下的组件行为
4. 使用`data-testid`属性定位元素

### 端到端测试最佳实践
1. 每个测试描述一个完整的用户流程
2. 使用清晰的定位器策略
3. 添加适当的等待和超时
4. 测试失败时提供有意义的错误信息
5. 保持测试独立，不依赖执行顺序

## 故障排除

### 常见问题
1. **Playwright浏览器未安装**：
   ```bash
   npx playwright install
   ```

2. **测试环境变量问题**：
   - 确保`NODE_ENV=test`在测试环境中设置
   - 检查API Mock服务配置

3. **测试超时**：
   - 增加`timeout`配置
   - 检查应用启动时间

4. **元素定位失败**：
   - 使用更稳定的定位器
   - 添加适当的等待条件
   - 检查元素是否实际渲染

## 覆盖率目标
- 单元测试覆盖率 ≥ 80%
- 端到端测试覆盖所有关键业务流程
- CI测试通过率 100%