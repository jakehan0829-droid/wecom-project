# GitHub Secrets 配置指南

本文档详细说明如何为CI/CD流水线配置GitHub Secrets，实现自动化部署。

## 必需配置的Secrets

| Secret名称 | 描述 | 获取方式 | 注意事项 |
|------------|------|----------|----------|
| **DOCKER_USERNAME** | Docker Hub用户名 | 您的Docker Hub账户用户名 | 建议使用服务账户 |
| **DOCKER_PASSWORD** | Docker Hub密码或访问令牌 | Docker Hub设置 → Security → Access Tokens | 使用访问令牌更安全 |
| **DEPLOY_HOST** | 部署服务器IP地址或域名 | 您的服务器公网IP | 确保防火墙开放SSH端口(22) |
| **DEPLOY_USER** | 部署服务器SSH用户名 | 通常为 `ubuntu`, `root`, `ec2-user` | 需要sudo权限的用户 |
| **DEPLOY_SSH_KEY** | 部署服务器SSH私钥 | 本地生成的SSH密钥对的私钥 | 必须包含完整的BEGIN/END标记 |

## 配置步骤详解

### 步骤1: 生成Docker Hub访问令牌

1. 登录 [Docker Hub](https://hub.docker.com)
2. 点击右上角头像 → Account Settings
3. 左侧菜单选择 Security
4. 点击 "New Access Token"
5. 输入描述: "wecom-project-ci-cd"
6. 设置权限: Read, Write (需要推送镜像)
7. 点击 "Generate"
8. 复制生成的令牌（只显示一次）

### 步骤2: 生成部署服务器SSH密钥

```bash
# 在本地机器上执行
# 生成新的SSH密钥对（如果还没有）
ssh-keygen -t rsa -b 4096 -C "deploy@wecom-project" -f ~/.ssh/wecom-deploy-key

# 查看公钥内容
cat ~/.ssh/wecom-deploy-key.pub

# 将公钥添加到服务器的 ~/.ssh/authorized_keys
# 在服务器上执行:
# echo "公钥内容" >> ~/.ssh/authorized_keys
# chmod 600 ~/.ssh/authorized_keys

# 查看私钥内容（用于GitHub Secret）
cat ~/.ssh/wecom-deploy-key
```

**私钥格式要求**:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEAz7zM...（完整私钥内容）...
-----END RSA PRIVATE KEY-----
```

### 步骤3: 在GitHub仓库中配置Secrets

1. 访问您的GitHub仓库: `https://github.com/<username>/<repository>`
2. 点击 "Settings" 标签页
3. 左侧菜单选择 "Secrets and variables" → "Actions"
4. 点击 "New repository secret"

依次添加以下Secrets:

#### DOCKER_USERNAME
- **Name**: `DOCKER_USERNAME`
- **Secret**: 您的Docker Hub用户名（如: `johndoe`）

#### DOCKER_PASSWORD
- **Name**: `DOCKER_PASSWORD`
- **Secret**: 步骤1生成的Docker Hub访问令牌

#### DEPLOY_HOST
- **Name**: `DEPLOY_HOST`
- **Secret**: 服务器IP地址（如: `192.168.1.100`）或域名

#### DEPLOY_USER
- **Name**: `DEPLOY_USER`
- **Secret**: SSH用户名（如: `ubuntu`）

#### DEPLOY_SSH_KEY
- **Name**: `DEPLOY_SSH_KEY`
- **Secret**: 步骤2生成的完整私钥内容（包括BEGIN/END标记）

### 步骤4: 验证SSH连接

在配置Secrets之前，建议先验证SSH连接:

```bash
# 使用私钥测试连接
ssh -i ~/.ssh/wecom-deploy-key ubuntu@<server-ip>

# 测试sudo权限（如果需要）
sudo echo "SSH连接正常"
```

## 环境特定配置

### 开发/测试环境
如果需要区分环境，可以配置额外的Secrets:

- `STAGING_DEPLOY_HOST`: 测试环境服务器
- `STAGING_DEPLOY_SSH_KEY`: 测试环境SSH私钥

### 多服务器部署
如果需要部署到多个服务器，可以配置:

- `LOAD_BALANCER_HOST`: 负载均衡器服务器
- `DATABASE_HOST`: 数据库服务器（如果分离部署）

## 安全最佳实践

### 1. 最小权限原则
- Docker Hub令牌: 只授予必要的仓库推送权限
- SSH密钥: 使用非root用户，限制sudo权限
- 服务器访问: 配置防火墙，只允许特定IP访问

### 2. 定期轮换
- 每3个月轮换SSH密钥
- 每6个月轮换Docker Hub访问令牌
- 监控GitHub Actions日志，检测异常访问

### 3. 监控和告警
- 启用GitHub Actions失败通知
- 监控服务器登录尝试
- 设置Docker Hub API调用限制

### 4. 备份策略
- 备份SSH密钥对到安全位置
- 记录所有Secrets的创建日期和用途
- 准备应急恢复计划

## 故障排除

### 常见问题1: SSH连接失败

**错误信息**: `Permission denied (publickey)`

**解决方案**:
```bash
# 1. 验证私钥格式
cat ~/.ssh/wecom-deploy-key | head -1
# 应该显示: -----BEGIN RSA PRIVATE KEY-----

# 2. 验证公钥已添加到服务器
ssh -i ~/.ssh/wecom-deploy-key -v ubuntu@<server-ip>

# 3. 检查服务器SSH配置
# 在服务器上执行:
# sudo vi /etc/ssh/sshd_config
# 确保: PubkeyAuthentication yes
# sudo systemctl restart sshd
```

### 常见问题2: Docker推送失败

**错误信息**: `denied: requested access to the resource is denied`

**解决方案**:
1. 验证DOCKER_USERNAME和DOCKER_PASSWORD是否正确
2. 检查Docker Hub令牌是否过期
3. 验证令牌是否具有仓库推送权限

### 常见问题3: 部署脚本权限不足

**错误信息**: `sudo: no tty present and no askpass program specified`

**解决方案**:
1. 在服务器上配置sudo无需密码:
```bash
# 在服务器上执行
sudo visudo
# 添加: ubuntu ALL=(ALL) NOPASSWD: ALL
# 或更细粒度: ubuntu ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/local/bin/docker-compose
```

## 测试配置

配置完成后，可以通过以下方式测试:

### 1. 手动触发工作流
1. 在GitHub仓库点击 "Actions" 标签页
2. 选择 "CI/CD Pipeline" 工作流
3. 点击 "Run workflow"
4. 选择分支并运行

### 2. 查看工作流日志
1. 点击运行中的工作流
2. 查看每个步骤的日志输出
3. 特别注意 "Deploy to server" 步骤

### 3. 验证部署结果
```bash
# 在服务器上验证容器状态
docker ps
docker logs wecom-backend
docker logs wecom-frontend

# 验证服务可达性
curl http://localhost:3000/api/health
curl http://localhost:80
```

## 应急响应

如果发现Secrets泄露:

### 立即行动
1. 在GitHub中删除泄露的Secret
2. 在Docker Hub中撤销访问令牌
3. 在服务器上删除对应的SSH公钥
4. 生成新的密钥对并更新所有配置

### 后续措施
1. 审查GitHub Actions日志
2. 检查服务器安全日志
3. 更新所有相关凭证
4. 加强监控和告警

---

## 附录

### A. 自动生成配置脚本

创建 `setup-deployment.sh` 脚本自动化部分配置:

```bash
#!/bin/bash
# 自动生成部署配置

echo "生成SSH密钥对..."
ssh-keygen -t rsa -b 4096 -C "deploy@wecom-project-$(date +%Y%m%d)" -f wecom-deploy-key -N ""

echo ""
echo "=== 配置完成 ==="
echo "1. 将以下公钥添加到服务器的 ~/.ssh/authorized_keys:"
cat wecom-deploy-key.pub

echo ""
echo "2. 在GitHub仓库中配置以下Secrets:"
echo "   DEPLOY_SSH_KEY: $(cat wecom-deploy-key)"

echo ""
echo "3. 保存私钥到安全位置:"
echo "   Private key saved to: wecom-deploy-key"
```

### B. 参考链接
- [GitHub Secrets文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Docker Hub访问令牌](https://docs.docker.com/docker-hub/access-tokens/)
- [SSH密钥管理最佳实践](https://www.ssh.com/academy/ssh/key-management)
```

*最后更新: 2026-04-02*