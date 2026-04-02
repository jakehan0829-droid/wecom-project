# 部署指南

## 部署选项

### 1. Docker Compose (推荐)
最简单的部署方式，适合单服务器部署。

### 2. Kubernetes
适合生产环境，支持高可用和自动扩展。

### 3. 手动部署
适合开发和测试环境。

## 环境要求

### 硬件要求
- **CPU**: 2核以上
- **内存**: 4GB以上
- **存储**: 20GB以上

### 软件要求
- **操作系统**: Ubuntu 20.04+/CentOS 8+/Alpine Linux
- **容器运行时**: Docker 20.10+ 或 containerd
- **编排工具**: Docker Compose 2.0+ (可选Kubernetes 1.24+)
- **数据库**: PostgreSQL 15+
- **缓存**: Redis 7+

## Docker Compose 部署

### 1. 准备环境
```bash
# 安装Docker和Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 获取代码
```bash
git clone <repository-url>
cd wecom-project
```

### 3. 配置环境变量
```bash
# 复制环境变量模板
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production

# 编辑配置文件
vim backend/.env.production
vim frontend/.env.production
```

关键配置项:
```env
# 后端配置
NODE_ENV=production
APP_HOST=0.0.0.0
APP_PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=chronic_disease
DB_USER=postgres
DB_PASSWORD=secure_password_here
REDIS_HOST=redis
REDIS_PORT=6379

# 企业微信配置
WECOM_CORP_ID=your_corp_id
WECOM_SECRET=your_secret
WECOM_TOKEN=your_token
WECOM_ENCODING_AES_KEY=your_encoding_aes_key

# AI模型配置
AI_PROVIDER=openai  # 或 anthropic, mock
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### 4. 启动服务
```bash
# 启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. 初始化数据库
```bash
# 如果需要运行数据库迁移
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate
```

### 6. 验证部署
```bash
# 检查后端健康状态
curl http://localhost:3000/api/health

# 检查前端服务
curl http://localhost:80

# 查看容器日志
docker-compose -f docker-compose.prod.yml logs backend
```

## Kubernetes 部署

### 1. 创建命名空间
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: wecom-system
```

### 2. 配置Secrets
```bash
# 创建数据库密码Secret
kubectl create secret generic db-secret \
  --namespace=wecom-system \
  --from-literal=password=secure_password_here

# 创建AI API密钥Secret
kubectl create secret generic ai-secret \
  --namespace=wecom-system \
  --from-literal=openai-api-key=your_openai_key \
  --from-literal=anthropic-api-key=your_anthropic_key
```

### 3. 部署PostgreSQL
```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: wecom-system
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: "chronic_disease"
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

### 4. 部署后端服务
```yaml
# k8s/backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: wecom-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/wecom-backend:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          value: "postgres"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-secret
              key: openai-api-key
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 手动部署

### 1. 安装依赖
```bash
# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PostgreSQL 15
sudo apt-get install -y postgresql-15

# 安装Redis
sudo apt-get install -y redis-server
```

### 2. 配置数据库
```bash
# 创建数据库和用户
sudo -u postgres psql -c "CREATE DATABASE chronic_disease;"
sudo -u postgres psql -c "CREATE USER wecom_user WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE chronic_disease TO wecom_user;"
```

### 3. 部署后端
```bash
cd backend

# 安装依赖
npm ci --only=production

# 构建应用
npm run build

# 配置环境变量
cp .env.example .env
# 编辑.env文件

# 启动服务
npm start
```

### 4. 部署前端
```bash
cd frontend

# 安装依赖
npm ci

# 构建应用
npm run build

# 配置Nginx
sudo cp nginx.conf /etc/nginx/sites-available/wecom
sudo ln -s /etc/nginx/sites-available/wecom /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## 监控和维护

### 健康检查
```bash
# 手动健康检查
curl http://your-domain.com/api/health

# 期望响应:
# {"status":"ok","timestamp":"2026-04-02T10:30:00Z"}
```

### 日志管理
```bash
# Docker Compose日志
docker-compose -f docker-compose.prod.yml logs --tail=100

# 容器日志文件
docker logs wecom-backend

# 应用日志文件
tail -f backend/logs/app.log
```

### 备份和恢复
```bash
# 数据库备份
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres chronic_disease > backup_$(date +%Y%m%d).sql

# 数据库恢复
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres chronic_disease
```

### 性能监控
```bash
# 查看容器资源使用
docker stats

# 查看应用性能
curl http://localhost:3000/api/metrics
```

## 故障排除

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查数据库状态
docker-compose -f docker-compose.prod.yml ps postgres

# 检查数据库日志
docker-compose -f docker-compose.prod.yml logs postgres

# 测试数据库连接
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d chronic_disease -c "SELECT 1;"
```

#### 2. 服务无法启动
```bash
# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看详细日志
docker-compose -f docker-compose.prod.yml logs --tail=50

# 重启服务
docker-compose -f docker-compose.prod.yml restart backend
```

#### 3. 内存不足
```bash
# 查看内存使用
free -h

# 重启Docker服务
sudo systemctl restart docker

# 清理无用资源
docker system prune -a
```

#### 4. 端口冲突
```bash
# 查看端口占用
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000

# 修改docker-compose.yml中的端口映射
```

## 安全建议

### 1. 防火墙配置
```bash
# 只开放必要端口
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
```

### 2. 定期更新
```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 更新Docker镜像
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 3. 监控和告警
- 配置日志监控 (ELK Stack)
- 设置性能告警 (Prometheus + Grafana)
- 实施安全扫描 (Trivy, Clair)

## 扩展和优化

### 水平扩展
```bash
# 增加后端实例数量
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# 配置负载均衡器
```

### 性能优化
- 启用Redis缓存查询结果
- 配置数据库连接池
- 启用Gzip压缩
- 优化前端资源加载

### 高可用配置
- 使用多副本数据库
- 配置Redis哨兵模式
- 设置负载均衡器
- 实现服务发现

## CI/CD自动化部署

### GitHub Actions流水线配置

项目已配置完整的CI/CD流水线，包含以下阶段：

1. **代码质量检查**: ESLint + Prettier代码规范检查
2. **自动化测试**: 单元测试、集成测试、端到端测试
3. **容器镜像构建**: 构建前后端Docker镜像
4. **生产环境部署**: 自动部署到服务器

### GitHub Secrets配置

在GitHub仓库中配置以下Secrets以启用自动化部署：

| Secret名称 | 描述 | 示例值 |
|------------|------|--------|
| `DOCKER_USERNAME` | Docker Hub用户名 | `yourdockeruser` |
| `DOCKER_PASSWORD` | Docker Hub密码或访问令牌 | `yourpassword` |
| `DEPLOY_HOST` | 部署服务器IP地址 | `1.2.3.4` |
| `DEPLOY_USER` | 部署服务器SSH用户名 | `ubuntu` |
| `DEPLOY_SSH_KEY` | 部署服务器SSH私钥 | `-----BEGIN RSA PRIVATE KEY-----...` |

### 配置步骤

1. **进入GitHub仓库设置**:
   - 访问 `https://github.com/<username>/<repository>/settings/secrets/actions`
   - 点击 "New repository secret"

2. **配置Docker Hub凭证**:
   ```bash
   # 生成Docker Hub访问令牌（推荐使用令牌而非密码）
   # 访问 https://hub.docker.com/settings/security
   # 创建访问令牌，授予读写权限
   ```

3. **配置服务器SSH访问**:
   ```bash
   # 在本地生成SSH密钥对
   ssh-keygen -t rsa -b 4096 -C "deploy@wecom-project"
   
   # 将公钥添加到服务器的~/.ssh/authorized_keys
   # 将私钥内容复制到DEPLOY_SSH_KEY Secret
   ```

### 手动触发部署

1. **推送代码到main分支**: 自动触发完整部署流程
2. **查看部署状态**: 在GitHub仓库的Actions标签页查看进度
3. **验证部署结果**: 检查服务器上的容器状态

### 环境变量管理

生产环境变量通过以下方式管理：

1. **Docker Compose环境变量**: 在`docker-compose.prod.yml`中定义
2. **.env.production文件**: 包含默认值和环境变量引用
3. **GitHub Actions环境变量**: 在CI/CD流水线中设置测试环境变量

### 安全最佳实践

1. **定期轮换密钥**: 每3-6个月更新JWT_SECRET、数据库密码
2. **最小权限原则**: 为Docker Hub令牌和SSH密钥授予最小必要权限
3. **监控和告警**: 设置部署失败告警和容器健康状态监控
4. **备份策略**: 定期备份数据库和配置文件

### 故障排除

#### 部署失败常见原因

1. **GitHub Secrets配置错误**:
   - 验证Secret名称和值是否正确
   - 检查SSH私钥格式（必须包含完整的BEGIN/END标记）

2. **服务器连接问题**:
   ```bash
   # 测试SSH连接
   ssh -i deploy_key.pem ubuntu@1.2.3.4
   ```

3. **Docker镜像推送失败**:
   - 验证Docker Hub凭证
   - 检查网络连接和防火墙设置

4. **容器启动失败**:
   ```bash
   # 在服务器上查看容器日志
   docker logs wecom-backend
   docker logs wecom-frontend
   ```

#### 回滚策略

如果部署出现问题，可以手动回滚：

```bash
# 在服务器上执行
cd /opt/wecom-project
# 回滚到上一个版本
docker-compose -f docker-compose.prod.yml up -d --force-recreate
# 或使用特定镜像标签
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 扩展功能

1. **多环境部署**: 配置development、staging、production环境
2. **蓝绿部署**: 实现零停机部署
3. **自动回滚**: 配置健康检查失败时自动回滚
4. **监控集成**: 集成Prometheus、Grafana监控栈