#!/bin/bash

# 项目演示脚本
# 用于快速启动和演示现代化聊天应用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 显示欢迎信息
show_welcome() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║           🎉 现代化 Go WebSocket 聊天应用演示 🎉              ║"
    echo "║                                                              ║"
    echo "║  一个具有现代化界面和丰富功能的实时聊天系统                    ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 显示功能特性
show_features() {
    echo -e "${BLUE}✨ 主要功能特性:${NC}"
    echo ""
    echo -e "${GREEN}🎨 现代化用户界面${NC}"
    echo "   • 响应式设计，完美适配所有设备"
    echo "   • 优雅的动画和过渡效果"
    echo "   • 深色/浅色主题支持"
    echo ""
    echo -e "${GREEN}👤 智能用户管理${NC}"
    echo "   • 个性化头像系统（首字母/表情/预设）"
    echo "   • 实时在线状态显示"
    echo "   • 用户设置和个性化"
    echo ""
    echo -e "${GREEN}💬 增强消息功能${NC}"
    echo "   • 实时消息发送和接收"
    echo "   • 消息状态指示"
    echo "   • 智能消息分组"
    echo ""
    echo -e "${GREEN}🔌 可靠连接管理${NC}"
    echo "   • 自动重连机制"
    echo "   • 连接质量监控"
    echo "   • 优雅的错误处理"
    echo ""
    echo -e "${GREEN}📱 移动端优化${NC}"
    echo "   • 触摸友好界面"
    echo "   • 移动菜单系统"
    echo "   • 性能优化"
    echo ""
    echo -e "${GREEN}🧪 完整测试套件${NC}"
    echo "   • 单元测试 + 集成测试 + E2E测试"
    echo "   • 可视化测试运行器"
    echo "   • 性能监控"
    echo ""
}

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}🔍 检查系统依赖...${NC}"
    
    local deps_ok=true
    
    # 检查 Docker
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker 已安装"
    else
        echo -e "${RED}✗${NC} Docker 未安装"
        deps_ok=false
    fi
    
    # 检查 Docker Compose
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker Compose 已安装"
    else
        echo -e "${RED}✗${NC} Docker Compose 未安装"
        deps_ok=false
    fi
    
    # 检查 Go（可选）
    if command -v go &> /dev/null; then
        echo -e "${GREEN}✓${NC} Go 已安装 ($(go version | awk '{print $3}'))"
    else
        echo -e "${YELLOW}⚠${NC} Go 未安装（使用 Docker 运行不需要）"
    fi
    
    if [ "$deps_ok" = false ]; then
        echo ""
        echo -e "${RED}❌ 缺少必要依赖，请先安装 Docker 和 Docker Compose${NC}"
        echo ""
        echo -e "${YELLOW}安装指南:${NC}"
        echo "• Docker: https://docs.docker.com/get-docker/"
        echo "• Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 所有依赖检查通过${NC}"
    echo ""
}

# 启动应用
start_application() {
    echo -e "${BLUE}🚀 启动应用...${NC}"
    echo ""
    
    # 检查是否已经在运行
    if docker-compose ps | grep -q "Up"; then
        echo -e "${YELLOW}⚠${NC} 应用似乎已经在运行"
        echo -e "${YELLOW}是否要重启应用？ (y/N)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo "停止现有服务..."
            docker-compose down
        else
            echo "继续使用现有服务..."
            return
        fi
    fi
    
    echo "构建并启动服务..."
    if docker-compose up -d --build; then
        echo ""
        echo -e "${GREEN}✅ 应用启动成功！${NC}"
        
        # 等待服务就绪
        echo "等待服务就绪..."
        sleep 5
        
        # 检查服务状态
        if curl -s http://localhost:8080 > /dev/null; then
            echo -e "${GREEN}✓${NC} Web 服务已就绪"
        else
            echo -e "${YELLOW}⚠${NC} Web 服务可能还在启动中..."
        fi
        
        if docker-compose exec redis redis-cli ping | grep -q PONG; then
            echo -e "${GREEN}✓${NC} Redis 服务已就绪"
        else
            echo -e "${YELLOW}⚠${NC} Redis 服务可能还在启动中..."
        fi
        
    else
        echo -e "${RED}❌ 应用启动失败${NC}"
        echo "请检查 Docker 日志："
        echo "docker-compose logs"
        exit 1
    fi
}

# 显示访问信息
show_access_info() {
    echo ""
    echo -e "${PURPLE}🌐 访问信息:${NC}"
    echo ""
    echo -e "${CYAN}主应用:${NC}"
    echo "  🔗 http://localhost:8080"
    echo "  📱 在手机浏览器中也可以访问（使用电脑IP地址）"
    echo ""
    echo -e "${CYAN}测试运行器:${NC}"
    echo "  🧪 http://localhost:8080/test-runner.html"
    echo "  📊 查看完整的测试套件和结果"
    echo ""
    echo -e "${CYAN}开发工具:${NC}"
    echo "  📋 docker-compose logs -f    # 查看实时日志"
    echo "  🔧 docker-compose exec app sh # 进入应用容器"
    echo "  💾 docker-compose exec redis redis-cli # Redis 命令行"
    echo ""
}

# 演示指南
show_demo_guide() {
    echo -e "${BLUE}📖 演示指南:${NC}"
    echo ""
    echo -e "${YELLOW}1. 基础功能演示:${NC}"
    echo "   • 打开主应用 (http://localhost:8080)"
    echo "   • 点击设置按钮设置用户名和头像"
    echo "   • 发送几条消息测试实时通信"
    echo "   • 尝试不同的头像类型（首字母/表情/预设）"
    echo ""
    echo -e "${YELLOW}2. 响应式设计演示:${NC}"
    echo "   • 调整浏览器窗口大小观察布局变化"
    echo "   • 在手机上访问应用体验移动端界面"
    echo "   • 测试移动菜单和触摸交互"
    echo ""
    echo -e "${YELLOW}3. 多用户演示:${NC}"
    echo "   • 在不同浏览器标签页或设备上打开应用"
    echo "   • 使用不同用户名登录"
    echo "   • 观察实时消息同步和用户列表更新"
    echo ""
    echo -e "${YELLOW}4. 测试功能演示:${NC}"
    echo "   • 访问测试运行器 (http://localhost:8080/test-runner.html)"
    echo "   • 运行单元测试、集成测试和E2E测试"
    echo "   • 查看测试覆盖率和性能指标"
    echo ""
    echo -e "${YELLOW}5. 错误恢复演示:${NC}"
    echo "   • 停止 Redis 服务: docker-compose stop redis"
    echo "   • 观察应用的错误处理和重连机制"
    echo "   • 重启 Redis: docker-compose start redis"
    echo "   • 观察自动恢复过程"
    echo ""
}

# 显示技术信息
show_tech_info() {
    echo -e "${BLUE}🔧 技术架构:${NC}"
    echo ""
    echo -e "${CYAN}后端技术:${NC}"
    echo "  • Go 1.12+ (WebSocket 服务器)"
    echo "  • Gorilla WebSocket (WebSocket 库)"
    echo "  • Redis (消息发布/订阅)"
    echo "  • Docker (容器化)"
    echo ""
    echo -e "${CYAN}前端技术:${NC}"
    echo "  • 原生 JavaScript (ES6+)"
    echo "  • CSS Grid & Flexbox (布局)"
    echo "  • CSS 自定义属性 (主题)"
    echo "  • Web APIs (现代浏览器功能)"
    echo ""
    echo -e "${CYAN}特色功能:${NC}"
    echo "  • 组件化架构"
    echo "  • 状态管理系统"
    echo "  • 性能优化 (虚拟滚动、懒加载)"
    echo "  • 完整的测试覆盖"
    echo "  • 无障碍支持 (ARIA、键盘导航)"
    echo ""
}

# 停止应用
stop_application() {
    echo -e "${BLUE}🛑 停止应用...${NC}"
    
    if docker-compose ps | grep -q "Up"; then
        docker-compose down
        echo -e "${GREEN}✅ 应用已停止${NC}"
    else
        echo -e "${YELLOW}⚠${NC} 应用未在运行"
    fi
}

# 清理资源
cleanup_resources() {
    echo -e "${BLUE}🧹 清理资源...${NC}"
    
    echo "停止并删除容器..."
    docker-compose down --volumes --remove-orphans
    
    echo "清理 Docker 系统..."
    docker system prune -f
    
    echo -e "${GREEN}✅ 资源清理完成${NC}"
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}📚 可用命令:${NC}"
    echo ""
    echo "  start     启动演示应用"
    echo "  stop      停止应用"
    echo "  restart   重启应用"
    echo "  status    查看应用状态"
    echo "  logs      查看应用日志"
    echo "  test      运行测试"
    echo "  cleanup   清理所有资源"
    echo "  help      显示此帮助信息"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo "  ./scripts/demo.sh start"
    echo "  ./scripts/demo.sh logs"
    echo "  ./scripts/demo.sh cleanup"
    echo ""
}

# 查看状态
show_status() {
    echo -e "${BLUE}📊 应用状态:${NC}"
    echo ""
    
    if command -v docker-compose &> /dev/null; then
        docker-compose ps
        echo ""
        
        # 检查端口
        if netstat -tuln 2>/dev/null | grep -q ":8080"; then
            echo -e "${GREEN}✓${NC} 端口 8080 已监听"
        else
            echo -e "${RED}✗${NC} 端口 8080 未监听"
        fi
        
        if netstat -tuln 2>/dev/null | grep -q ":6379"; then
            echo -e "${GREEN}✓${NC} 端口 6379 (Redis) 已监听"
        else
            echo -e "${RED}✗${NC} 端口 6379 (Redis) 未监听"
        fi
    else
        echo -e "${RED}❌ Docker Compose 未安装${NC}"
    fi
}

# 查看日志
show_logs() {
    echo -e "${BLUE}📋 应用日志:${NC}"
    echo ""
    echo "按 Ctrl+C 退出日志查看"
    echo ""
    docker-compose logs -f
}

# 运行测试
run_tests() {
    echo -e "${BLUE}🧪 运行测试:${NC}"
    echo ""
    
    # 检查应用是否运行
    if ! docker-compose ps | grep -q "Up"; then
        echo "应用未运行，正在启动..."
        start_application
        sleep 5
    fi
    
    echo "测试可以通过以下方式运行："
    echo ""
    echo -e "${CYAN}1. 浏览器测试 (推荐):${NC}"
    echo "   访问: http://localhost:8080/test-runner.html"
    echo ""
    echo -e "${CYAN}2. Go 后端测试:${NC}"
    if command -v go &> /dev/null; then
        echo "   正在运行 Go 测试..."
        go test -v ./...
    else
        echo "   Go 未安装，跳过后端测试"
    fi
    echo ""
    echo -e "${GREEN}✅ 测试信息已显示${NC}"
}

# 主函数
main() {
    case "${1:-}" in
        "start")
            show_welcome
            show_features
            check_dependencies
            start_application
            show_access_info
            show_demo_guide
            ;;
        "stop")
            stop_application
            ;;
        "restart")
            stop_application
            sleep 2
            start_application
            show_access_info
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "test")
            run_tests
            ;;
        "cleanup")
            cleanup_resources
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        "")
            show_welcome
            show_features
            show_tech_info
            echo ""
            echo -e "${YELLOW}使用 './scripts/demo.sh start' 开始演示${NC}"
            echo -e "${YELLOW}使用 './scripts/demo.sh help' 查看所有命令${NC}"
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"