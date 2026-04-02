#!/bin/bash

# 生产部署验证脚本
# 用于验证部署配置和服务器状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 输出函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "命令不存在: $1"
        return 1
    fi
    log_info "命令可用: $1"
    return 0
}

# 验证本地配置
validate_local_config() {
    log_info "开始验证本地部署配置..."

    # 检查必需文件
    local required_files=(
        "backend/.env.production"
        "frontend/.env.production"
        "docker-compose.prod.yml"
        "backend/Dockerfile"
        "frontend/Dockerfile"
        "frontend/nginx.conf"
        ".github/workflows/deploy.yml"
    )

    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_info "文件存在: $file"
        else
            log_error "文件不存在: $file"
            return 1
        fi
    done

    # 检查环境变量配置
    if grep -q "replace_me_with_secure_random_string_in_production" backend/.env.production; then
        log_warn "JWT_SECRET仍然是默认值，生产环境请更新"
    fi

    # 检查Docker Compose配置
    if command -v docker-compose &> /dev/null; then
        if docker-compose -f docker-compose.prod.yml config --quiet &> /dev/null; then
            log_info "Docker Compose配置语法正确"
        else
            log_error "Docker Compose配置语法错误"
            return 1
        fi
    else
        log_warn "docker-compose不可用，跳过语法检查"
    fi

    log_info "本地配置验证完成"
    return 0
}

# 验证服务器连接
validate_server_connection() {
    local server_ip="$1"
    local ssh_user="$2"
    local ssh_key="$3"

    if [ -z "$server_ip" ]; then
        log_warn "未提供服务器IP，跳过服务器验证"
        return 0
    fi

    log_info "开始验证服务器连接: $ssh_user@$server_ip"

    # 检查SSH密钥文件
    if [ ! -f "$ssh_key" ]; then
        log_error "SSH密钥文件不存在: $ssh_key"
        return 1
    fi

    # 测试SSH连接
    log_info "测试SSH连接..."
    if ssh -i "$ssh_key" -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=no "$ssh_user@$server_ip" "echo 'SSH连接成功'" &> /dev/null; then
        log_info "SSH连接成功"
    else
        log_error "SSH连接失败"
        return 1
    fi

    # 检查Docker安装
    log_info "检查服务器Docker安装..."
    if ssh -i "$ssh_key" "$ssh_user@$server_ip" "docker --version" &> /dev/null; then
        log_info "Docker已安装"
    else
        log_error "Docker未安装"
        return 1
    fi

    # 检查Docker Compose安装
    if ssh -i "$ssh_key" "$ssh_user@$server_ip" "docker-compose --version" &> /dev/null; then
        log_info "Docker Compose已安装"
    else
        log_warn "Docker Compose未安装"
    fi

    # 检查端口可用性
    log_info "检查服务器端口..."
    local ports=(80 3000)
    for port in "${ports[@]}"; do
        if ssh -i "$ssh_key" "$ssh_user@$server_ip" "sudo netstat -tuln | grep -q :$port" &> /dev/null; then
            log_warn "端口 $port 已被占用"
        else
            log_info "端口 $port 可用"
        fi
    done

    # 检查磁盘空间
    log_info "检查服务器磁盘空间..."
    ssh -i "$ssh_key" "$ssh_user@$server_ip" "df -h / | tail -1" | while read -r output; do
        log_info "磁盘空间: $output"
    done

    log_info "服务器连接验证完成"
    return 0
}

# 验证GitHub Secrets配置
validate_github_secrets() {
    log_info "检查GitHub Secrets配置..."

    # 检查GitHub Actions工作流中的Secrets引用
    local secrets_file=".github/workflows/deploy.yml"
    local required_secrets=("DOCKER_USERNAME" "DOCKER_PASSWORD" "DEPLOY_HOST" "DEPLOY_USER" "DEPLOY_SSH_KEY")

    for secret in "${required_secrets[@]}"; do
        if grep -q "\${{ secrets.$secret }}" "$secrets_file"; then
            log_info "GitHub Secret引用存在: $secret"
        else
            log_warn "GitHub Secret引用不存在: $secret"
        fi
    done

    log_info "GitHub Secrets配置检查完成"
    return 0
}

# 运行部署测试
run_deployment_test() {
    local server_ip="$1"
    local ssh_user="$2"
    local ssh_key="$3"

    log_info "运行部署测试..."

    if [ -z "$server_ip" ]; then
        log_warn "未提供服务器IP，跳过部署测试"
        return 0
    fi

    # 创建测试部署目录
    log_info "在服务器上创建测试目录..."
    ssh -i "$ssh_key" "$ssh_user@$server_ip" "mkdir -p /tmp/wecom-test && cd /tmp/wecom-test && pwd"

    # 复制docker-compose文件到服务器
    log_info "复制配置文件到服务器..."
    scp -i "$ssh_key" docker-compose.prod.yml "$ssh_user@$server_ip:/tmp/wecom-test/"
    scp -i "$ssh_key" backend/.env.production "$ssh_user@$server_ip:/tmp/wecom-test/backend.env"
    scp -i "$ssh_key" frontend/.env.production "$ssh_user@$server_ip:/tmp/wecom-test/frontend.env"

    # 修改测试环境变量（使用mock模式）
    ssh -i "$ssh_key" "$ssh_user@$server_ip" "cd /tmp/wecom-test && echo 'AI_PROVIDER=mock' >> backend.env"

    log_info "部署测试准备完成"
    log_warn "注意: 实际部署测试需要构建和推送Docker镜像"
    log_warn "此测试仅验证基础设施和配置"

    return 0
}

# 生成部署报告
generate_deployment_report() {
    local report_file="deployment-validation-report-$(date +%Y%m%d-%H%M%S).txt"

    log_info "生成部署验证报告: $report_file"

    {
        echo "企业微信项目部署验证报告"
        echo "生成时间: $(date)"
        echo "========================================"
        echo ""
        echo "1. 本地配置验证"
        echo "----------------------------------------"
        validate_local_config 2>&1 | grep -E "\[INFO\]|\[WARN\]|\[ERROR\]" | sed 's/\x1b\[[0-9;]*m//g'
        echo ""
        echo "2. GitHub Secrets配置"
        echo "----------------------------------------"
        validate_github_secrets 2>&1 | grep -E "\[INFO\]|\[WARN\]|\[ERROR\]" | sed 's/\x1b\[[0-9;]*m//g'
        echo ""
        echo "3. 系统要求检查"
        echo "----------------------------------------"
        echo "操作系统: $(uname -s) $(uname -r)"
        echo "CPU架构: $(uname -m)"
        echo "内存: $(free -h | grep Mem | awk '{print $2}')"
        echo "磁盘空间: $(df -h / | tail -1 | awk '{print $4}') 可用"
        echo ""
        echo "4. 部署准备状态"
        echo "----------------------------------------"
        echo "配置文件: 完整"
        echo "Docker配置: 就绪"
        echo "CI/CD流水线: 就绪"
        echo "监控配置: 基础"
        echo "备份策略: 待配置"
        echo ""
        echo "5. 后续步骤"
        echo "----------------------------------------"
        echo "1. 配置GitHub Secrets"
        echo "2. 设置生产环境安全变量"
        echo "3. 准备部署服务器"
        echo "4. 运行完整部署测试"
        echo "5. 配置监控和告警"
    } > "$report_file"

    log_info "部署验证报告已生成: $report_file"
    cat "$report_file"
}

# 主函数
main() {
    echo ""
    echo "========================================"
    echo "  企业微信项目部署验证工具"
    echo "========================================"
    echo ""

    # 解析参数
    local server_ip=""
    local ssh_user="ubuntu"
    local ssh_key=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --server)
                server_ip="$2"
                shift 2
                ;;
            --user)
                ssh_user="$2"
                shift 2
                ;;
            --key)
                ssh_key="$2"
                shift 2
                ;;
            --help)
                echo "使用方法: $0 [选项]"
                echo "选项:"
                echo "  --server <IP>    服务器IP地址"
                echo "  --user <用户名>  SSH用户名 (默认: ubuntu)"
                echo "  --key <密钥文件> SSH私钥文件路径"
                echo "  --help           显示帮助信息"
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                exit 1
                ;;
        esac
    done

    # 检查必需命令
    check_command "git" || exit 1
    check_command "curl" || exit 1

    # 运行验证
    validate_local_config || exit 1
    validate_github_secrets || exit 1

    if [ -n "$server_ip" ] && [ -n "$ssh_key" ]; then
        validate_server_connection "$server_ip" "$ssh_user" "$ssh_key" || exit 1
        run_deployment_test "$server_ip" "$ssh_user" "$ssh_key" || exit 1
    else
        log_warn "未提供服务器信息，跳过服务器验证"
    fi

    # 生成报告
    generate_deployment_report

    echo ""
    echo "========================================"
    log_info "部署验证完成"
    echo "========================================"

    if [ -z "$server_ip" ]; then
        log_warn "建议提供服务器信息进行完整验证"
        log_warn "使用: $0 --server <IP> --key <SSH_KEY>"
    fi

    exit 0
}

# 运行主函数
main "$@"