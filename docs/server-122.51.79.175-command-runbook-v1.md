# 122.51.79.175 命令级部署手册 v1

## 1. 安装基础依赖（Ubuntu 示例）
```bash
sudo apt update
sudo apt install -y git curl ca-certificates
```

## 2. 安装 Docker（如未安装）
```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker
sudo systemctl start docker
```

## 3. 部署项目目录
```bash
sudo mkdir -p /srv/chronic-disease-mvp
sudo chown -R $USER:$USER /srv/chronic-disease-mvp
cd /srv/chronic-disease-mvp
```

## 4. 放置项目代码并配置环境
```bash
cp .env.example .env
# 编辑 .env，填入数据库/JWT/企业微信参数
```

## 5. 启动基础服务
```bash
docker compose up -d
```

## 6. 初始化数据库
```bash
# 进入 postgres 容器后执行 init.sql 与 seed.sql
```

## 7. 安装 backend 依赖并启动
```bash
cd backend
npm install
npm run build
npm run dev
```

## 8. 验证接口
```bash
curl http://127.0.0.1:3000/health
```
