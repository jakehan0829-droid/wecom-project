# Git Bundle 恢复指南

由于当前网络环境无法连接到GitHub，我们已经创建了Git仓库的离线备份包（bundle）。本指南说明如何恢复和使用这些代码。

## 当前状态

### ✅ 已完成的工作
1. **所有生产部署准备工作已本地提交**
   - 提交哈希: `cff481e`
   - 提交消息: "feat: 完成生产部署准备工作"
   - 包含9个文件更改，1194行新增

2. **Git Bundle已创建**
   - 文件: `wecom-project.bundle` (1.2MB)
   - 包含完整的Git历史和所有分支
   - 可以在任何有Git的环境中恢复

3. **完整的部署配置就绪**
   - 生产环境变量模板
   - CI/CD流水线配置
   - 部署验证脚本和文档

### ⚠️ 网络问题
- GitHub HTTPS连接超时 (443端口)
- 无法通过 `git push` 推送代码
- 不影响本地代码完整性

## 恢复方法

### 方法A: 在有网络的环境恢复并推送

#### 步骤1: 传输Bundle文件
将 `wecom-project.bundle` 文件传输到可以访问GitHub的机器：
```bash
# 使用SCP、SFTP或任何文件传输工具
scp wecom-project.bundle user@remote-server:/path/to/
```

#### 步骤2: 从Bundle创建新仓库
在目标机器上：
```bash
# 创建新目录
mkdir wecom-project-recovered
cd wecom-project-recovered

# 从bundle克隆仓库
git clone ../wecom-project.bundle .

# 验证代码完整性
git log --oneline
# 应该看到8个提交，包括最新的部署准备提交

# 检查文件完整性
ls -la
```

#### 步骤3: 配置GitHub远程仓库
```bash
# 设置远程仓库（使用您的GitHub令牌）
git remote add origin https://<YOUR_GITHUB_TOKEN>@github.com/jakehan0829-droid/wecom-project.git

# 或使用SSH（如果您已配置SSH密钥）
git remote set-url origin git@github.com:jakehan0829-droid/wecom-project.git
```

#### 步骤4: 推送到GitHub
```bash
# 推送所有分支和标签
git push origin --all
git push origin --tags

# 或只推送main分支
git push origin main
```

### 方法B: 使用Bundle直接部署

#### 步骤1: 在部署服务器恢复代码
```bash
# 在部署服务器上
cd /opt

# 从bundle克隆代码
git clone /path/to/wecom-project.bundle wecom-project

# 进入项目目录
cd wecom-project
```

#### 步骤2: 直接部署（无需GitHub）
```bash
# 配置生产环境变量
cp backend/.env.production.example backend/.env.production
# 编辑 .env.production 文件，设置实际值

# 使用Docker Compose部署
docker-compose -f docker-compose.prod.yml up -d

# 验证部署
./scripts/verify-deployment.sh
```

### 方法C: 通过GitHub网页界面上传

#### 步骤1: 创建代码归档
```bash
# 创建ZIP归档（包含所有文件，不包括.git）
zip -r wecom-project-deploy-prep.zip . -x "*.git*" -x "*.bundle"

# 或创建tar.gz
tar -czf wecom-project-deploy-prep.tar.gz . --exclude=".git" --exclude="*.bundle"
```

#### 步骤2: 通过GitHub网页上传
1. 访问 https://github.com/jakehan0829-droid/wecom-project
2. 点击 "Add file" → "Upload files"
3. 拖放或选择 `wecom-project-deploy-prep.zip` 文件
4. 提交更改

#### 步骤3: 在服务器上拉取更新
```bash
# 在部署服务器上
cd /opt/wecom-project
git pull origin main
```

## Bundle文件详细信息

### 包含内容
- 完整的Git历史（8个提交）
- 所有分支（main分支）
- 所有代码和配置文件
- 部署脚本和文档

### 验证Bundle完整性
```bash
# 查看bundle内容
git bundle verify wecom-project.bundle

# 列出bundle中的引用
git bundle list-heads wecom-project.bundle
```

## 部署准备工作总结

即使没有GitHub推送，所有部署准备工作已完成：

### 1. 生产环境配置
- `backend/.env.production` - 环境变量模板
- `frontend/.env.production` - 前端配置
- `docker-compose.prod.yml` - Docker Compose配置

### 2. CI/CD流水线
- `.github/workflows/deploy.yml` - 完整的GitHub Actions工作流
- 包含5个阶段：检查 → 测试 → 构建 → 推送 → 部署

### 3. 部署工具
- `scripts/validate-deployment.sh` - 配置验证脚本
- `scripts/verify-deployment.sh` - 完整部署验证脚本

### 4. 文档
- `DEPLOYMENT_GUIDE.md` - 详细部署指南
- `GITHUB_SECRETS_CONFIGURATION.md` - Secrets配置指南
- `PRODUCTION_DEPLOYMENT_CHECKLIST.md` - 部署检查清单

## 紧急部署流程

如果急需部署，可以跳过GitHub直接部署：

### 简化部署步骤
```bash
# 1. 在服务器上恢复代码（使用bundle或直接复制文件）
git clone /path/to/wecom-project.bundle /opt/wecom-project

# 2. 配置环境变量
cd /opt/wecom-project
cp backend/.env.production.example backend/.env.production
# 编辑文件，设置实际值

# 3. 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 4. 验证部署
curl http://localhost:3000/api/health
curl http://localhost:80
```

### 后续Git同步
一旦网络恢复，可以将服务器上的更改推回GitHub：
```bash
# 在服务器上
cd /opt/wecom-project
git add .
git commit -m "chore: 生产环境配置更新"
git push origin main
```

## 故障排除

### 问题1: Bundle验证失败
```bash
# 重新创建bundle
git bundle create wecom-project-new.bundle --all
```

### 问题2: 克隆bundle时缺少提交
```bash
# 检查bundle内容
git bundle list-heads wecom-project.bundle

# 如果缺少提交，可能是bundle创建不完整
# 确保使用 --all 参数创建
```

### 问题3: 环境变量配置问题
```bash
# 使用验证脚本检查
./scripts/validate-deployment.sh

# 手动检查关键配置
grep -E "JWT_SECRET|DB_PASSWORD|AI_API_KEY" backend/.env.production
```

## 下一步建议

### 优先级1: 网络恢复后立即执行
```bash
git push origin main
```

### 优先级2: 配置GitHub Secrets
按照 `GITHUB_SECRETS_CONFIGURATION.md` 配置：
- Docker Hub凭证
- 服务器SSH密钥

### 优先级3: 测试部署流程
```bash
# 使用验证脚本
./scripts/verify-deployment.sh --server <IP> --key <SSH_KEY>
```

## 联系支持

如果遇到问题：
1. **代码恢复问题**: 重新创建bundle文件
2. **部署配置问题**: 检查验证脚本输出
3. **网络连接问题**: 尝试不同的网络环境

---

**最后更新**: 2026-04-02  
**Bundle版本**: wecom-project.bundle (1.2MB)  
**包含提交**: cff481e 及之前所有提交