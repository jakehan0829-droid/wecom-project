# 生产环境部署检查清单

本文档提供企业微信项目生产环境部署的完整检查清单和验证步骤。

## 部署前检查

### ✅ 代码质量与测试
- [ ] **单元测试通过率**: 100% (前端42/42，后端45/47)
- [ ] **端到端测试通过率**: 100% (19/19)
- [ ] **代码规范检查**: ESLint + Prettier 配置完成
- [ ] **测试覆盖率报告**: 已生成并可用

### ✅ 基础设施配置
- [ ] **Docker配置**: 前后端Dockerfile完成并验证
- [ ] **Docker Compose配置**: `docker-compose.prod.yml` 完整配置
- [ ] **健康检查**: 所有服务健康检查配置完成
- [ ] **网络配置**: 端口映射正确 (3000:3000, 80:80)
- [ ] **数据持久化**: 数据库和Redis数据卷配置

### ✅ 环境配置
- [ ] **后端环境变量**: `backend/.env.production` 配置完成
- [ ] **前端环境变量**: `frontend/.env.production` 配置完成
- [ ] **安全配置**: JWT_SECRET、数据库密码等安全变量已设置
- [ ] **企业微信配置**: Corp ID、Agent ID、Secret 已配置
- [ ] **AI服务配置**: API密钥和端点已配置

### ✅ CI/CD流水线
- [ ] **GitHub Actions工作流**: `.github/workflows/deploy.yml` 配置完成
- [ ] **测试阶段**: 单元测试、集成测试、E2E测试配置
- [ ] **构建阶段**: Docker镜像构建和推送配置
- [ ] **部署阶段**: SSH服务器部署配置

## GitHub Secrets配置

### ✅ 必需Secrets
- [ ] **DOCKER_USERNAME**: Docker Hub用户名 ✅ 已配置
- [ ] **DOCKER_PASSWORD**: Docker Hub访问令牌 ✅ 已配置  
- [ ] **DEPLOY_HOST**: 部署服务器IP地址 ✅ 已配置
- [ ] **DEPLOY_USER**: 部署服务器SSH用户名 ✅ 已配置
- [ ] **DEPLOY_SSH_KEY**: 部署服务器SSH私钥 ✅ 已配置

### ✅ 可选Secrets
- [ ] **SLACK_WEBHOOK_URL**: 部署通知Webhook（可选）
- [ ] **SENTRY_DSN**: 错误监控DSN（可选）
- [ ] **DATADOG_API_KEY**: 监控服务API密钥（可选）

## 服务器准备

### ✅ 系统要求
- [ ] **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Alpine Linux
- [ ] **Docker**: Docker 20.10+ 已安装
- [ ] **Docker Compose**: Docker Compose 2.0+ 已安装
- [ ] **磁盘空间**: 至少20GB可用空间
- [ ] **内存**: 至少4GB RAM
- [ ] **CPU**: 至少2核

### ✅ 网络配置
- [ ] **防火墙**: 开放端口 80(HTTP), 443(HTTPS), 22(SSH)
- [ ] **域名**: 域名已解析到服务器IP（如需要）
- [ ] **SSL证书**: SSL证书已准备（如需要HTTPS）

### ✅ 安全配置
- [ ] **SSH密钥认证**: 已配置SSH密钥登录
- [ ] **防火墙规则**: 限制不必要的端口访问
- [ ] **用户权限**: 使用非root用户运行容器
- [ ] **日志轮转**: 配置Docker日志轮转

## 部署执行步骤

### 步骤1: 触发CI/CD流水线
1. **推送代码到main分支**: 自动触发部署
   ```bash
   git add .
   git commit -m "chore: 准备生产部署"
   git push origin main
   ```

2. **或手动触发工作流**:
   - 访问GitHub仓库 → Actions → CI/CD Pipeline
   - 点击 "Run workflow"
   - 选择main分支并运行

### 步骤2: 监控部署过程
在GitHub Actions中监控以下阶段:

1. **代码质量检查** (约2-3分钟)
   - ESLint检查
   - Prettier格式化检查

2. **后端测试** (约5-7分钟)
   - 单元测试 (47个测试)
   - 集成测试 (PostgreSQL + Redis)
   - 覆盖率报告生成

3. **前端测试** (约4-6分钟)
   - 单元测试 (42个测试)
   - E2E测试 (19个测试, Firefox浏览器)
   - 覆盖率报告生成

4. **镜像构建和推送** (约3-5分钟)
   - 后端Docker镜像构建和推送
   - 前端Docker镜像构建和推送

5. **生产环境部署** (约2-3分钟)
   - SSH连接到部署服务器
   - 拉取最新Docker镜像
   - 重启服务容器

### 步骤3: 验证部署结果

#### 服务器端验证
```bash
# SSH登录到服务器
ssh ubuntu@<server-ip>

# 检查容器状态
docker ps
# 预期输出: 4个容器运行中 (postgres, redis, backend, frontend)

# 检查容器日志
docker logs wecom-backend --tail 50
docker logs wecom-frontend --tail 20

# 验证服务健康状态
curl http://localhost:3000/api/health
# 预期响应: {"status":"ok","timestamp":"..."}

curl http://localhost:80
# 预期响应: HTML页面 (HTTP 200)
```

#### 应用功能验证
1. **前端应用访问**: 打开浏览器访问 `http://<server-ip>`
2. **API端点测试**: 验证关键API端点可访问
3. **数据库连接**: 验证应用可以连接数据库
4. **企业微信集成**: 验证Webhook回调可接收

## 部署后监控

### ✅ 健康监控
- [ ] **健康检查端点**: `http://<server-ip>:3000/api/health`
- [ ] **存活探针**: `http://<server-ip>:3000/api/health/liveness`
- [ ] **就绪探针**: `http://<server-ip>:3000/api/health/readiness`
- [ ] **指标端点**: `http://<server-ip>:3000/api/health/metrics`

### ✅ 日志监控
- [ ] **容器日志**: `docker logs -f wecom-backend`
- [ ] **应用日志**: 查看应用内部日志文件
- [ ] **错误日志**: 监控错误级别日志
- [ ] **访问日志**: 监控HTTP请求日志

### ✅ 性能监控
- [ ] **资源使用**: CPU、内存、磁盘、网络
- [ ] **响应时间**: API端点响应时间
- [ ] **错误率**: HTTP错误率监控
- [ ] **数据库性能**: 查询性能监控

## 故障排除指南

### 部署失败常见问题

#### 问题1: Docker镜像构建失败
**症状**: GitHub Actions构建阶段失败
**解决方案**:
1. 检查Dockerfile语法错误
2. 验证网络连接可以拉取基础镜像
3. 检查构建上下文文件完整性

#### 问题2: 测试失败
**症状**: 测试阶段失败
**解决方案**:
1. 查看测试日志确定失败原因
2. 修复失败的测试用例
3. 验证测试环境配置

#### 问题3: SSH部署失败
**症状**: 部署阶段连接失败
**解决方案**:
1. 验证GitHub Secrets配置正确
2. 测试SSH连接: `ssh -i key.pem user@host`
3. 检查服务器防火墙设置

#### 问题4: 容器启动失败
**症状**: 容器启动后立即退出
**解决方案**:
1. 查看容器日志: `docker logs <container-name>`
2. 检查环境变量配置
3. 验证端口映射和卷挂载

### 紧急回滚步骤

如果部署后发现问题，立即执行回滚:

```bash
# 在服务器上执行
cd /opt/wecom-project

# 方案1: 恢复到上一个可用镜像
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# 方案2: 使用特定版本标签
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 方案3: 停止服务，手动恢复
docker-compose -f docker-compose.prod.yml stop
# 手动恢复备份数据
docker-compose -f docker-compose.prod.yml start
```

## 维护计划

### 日常维护
- [ ] **日志检查**: 每日检查错误日志
- [ ] **监控告警**: 配置关键指标告警
- [ ] **备份验证**: 验证数据库备份完整性
- [ ] **安全更新**: 定期更新系统和依赖

### 每周维护
- [ ] **性能分析**: 分析性能趋势
- [ ] **资源优化**: 调整资源分配
- [ ] **安全扫描**: 运行安全漏洞扫描
- [ ] **备份测试**: 测试恢复流程

### 每月维护
- [ ] **证书更新**: 更新SSL证书
- [ ] **密钥轮换**: 轮换安全密钥
- [ ] **版本升级**: 评估依赖版本升级
- [ ] **容量规划**: 评估资源容量需求

## 成功标准

### 技术指标
- ✅ **部署时间**: 完整部署流程 < 30分钟
- ✅ **服务可用性**: 99.9% 正常运行时间
- ✅ **响应时间**: API平均响应时间 < 500ms
- ✅ **错误率**: HTTP错误率 < 0.1%

### 业务指标
- ✅ **企业微信集成**: Webhook消息正常处理
- ✅ **AI分析功能**: 消息分析准确率 > 90%
- ✅ **档案管理**: 数据完整性和一致性
- ✅ **用户体验**: 页面加载时间 < 3秒

## 联系支持

### 技术负责人
- **部署问题**: 检查GitHub Actions日志
- **服务器问题**: 联系服务器管理员
- **应用问题**: 查看应用日志和监控

### 紧急联系方式
- **服务器宕机**: +86-XXX-XXXX-XXXX
- **数据丢失**: 立即执行备份恢复流程
- **安全事件**: 隔离系统并通知安全团队

---

## 附录

### A. 部署验证脚本
创建 `verify-deployment.sh` 脚本自动化验证:

```bash
#!/bin/bash
# 部署验证脚本

SERVER_IP=$1
SSH_USER=${2:-ubuntu}
SSH_KEY=${3:-~/.ssh/wecom-deploy-key}

echo "验证部署到服务器: $SERVER_IP"

# 测试SSH连接
ssh -i $SSH_KEY -o ConnectTimeout=10 $SSH_USER@$SERVER_IP "echo 'SSH连接正常'"

# 检查容器状态
ssh -i $SSH_KEY $SSH_USER@$SERVER_IP "docker ps | grep -E '(postgres|redis|backend|frontend)'"

# 测试健康检查
ssh -i $SSH_KEY $SSH_USER@$SERVER_IP "curl -s http://localhost:3000/api/health | jq ."

# 测试前端访问
ssh -i $SSH_KEY $SSH_USER@$SERVER_IP "curl -s -o /dev/null -w '%{http_code}' http://localhost:80"

echo "验证完成"
```

### B. 监控仪表板配置
建议配置监控仪表板包含以下指标:
1. **容器状态**: 运行/停止/重启次数
2. **资源使用**: CPU、内存、磁盘、网络
3. **应用指标**: 请求数、错误率、响应时间
4. **业务指标**: 用户数、消息数、档案数

### C. 备份策略
1. **数据库备份**: 每日全量备份，每小时增量备份
2. **配置文件备份**: 每次部署前备份配置文件
3. **日志备份**: 日志保留30天，重要日志长期存档
4. **镜像备份**: Docker镜像推送到私有仓库备份

---

*部署检查清单版本: 1.0*  
*最后更新: 2026-04-02*  
*适用于: 企业微信项目 v1.0*