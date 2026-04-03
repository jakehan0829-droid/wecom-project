.PHONY: setup dev test build docker-up docker-down clean help

help: ## 显示帮助信息
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## 初始化项目（复制 .env 文件，安装依赖）
	@echo "Setting up backend..."
	@[ -f backend/.env ] || cp backend/.env.example backend/.env
	@[ -f frontend/.env.local ] || cp frontend/.env.example frontend/.env.local
	cd backend && npm install
	cd frontend && npm install
	@echo "Done. Edit backend/.env and frontend/.env.local with your credentials."

dev: ## 启动开发依赖服务（postgres + redis）
	docker-compose up -d postgres redis
	@echo "Postgres and Redis are running."
	@echo "Start backend: cd backend && npm run dev"
	@echo "Start frontend: cd frontend && npm run dev"

test: ## 运行所有测试
	cd backend && npm test -- --run
	cd frontend && npm test -- --run

test-backend: ## 仅运行后端测试
	cd backend && npm test -- --run

test-frontend: ## 仅运行前端测试
	cd frontend && npm test -- --run

build: ## 构建生产镜像
	docker-compose -f docker-compose.prod.yml build

docker-up: ## 启动生产环境（需要先配置 .env 变量）
	docker-compose -f docker-compose.prod.yml up -d

docker-down: ## 停止所有容器
	docker-compose -f docker-compose.prod.yml down

clean: ## 清理构建产物和依赖
	rm -rf backend/dist frontend/dist
	rm -rf backend/node_modules frontend/node_modules
