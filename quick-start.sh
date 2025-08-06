#!/bin/bash

# 快速开始脚本 - 一键启动现代化聊天应用

echo "🚀 启动现代化 Go WebSocket 聊天应用..."
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    echo "安装指南: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    echo "安装指南: https://docs.docker.com/compose/install/"
    exit 1
fi

# 启动应用
echo "📦 构建并启动服务..."
docker-compose up -d --build

# 等待服务就绪
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ 应用启动成功！"
    echo ""
    echo "🌐 访问地址:"
    echo "   主应用: http://localhost:8080"
    echo "   测试页面: http://localhost:8080/test-runner.html"
    echo ""
    echo "🎉 开始体验现代化聊天应用吧！"
    echo ""
    echo "💡 提示:"
    echo "   • 点击设置按钮配置用户名和头像"
    echo "   • 在多个浏览器标签页中测试多用户聊天"
    echo "   • 调整窗口大小体验响应式设计"
    echo "   • 访问测试页面查看完整测试套件"
    echo ""
    echo "🛑 停止应用: docker-compose down"
else
    echo "❌ 应用启动失败，请检查日志:"
    echo "   docker-compose logs"
fi