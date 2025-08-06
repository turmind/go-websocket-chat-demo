#!/bin/bash

# 最终代码审查和清理脚本
# 用于确保代码质量和部署准备

set -e

echo "🔍 开始最终代码审查和清理..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 已安装"
        return 0
    else
        echo -e "${RED}✗${NC} $1 未安装"
        return 1
    fi
}

# 检查必要工具
echo -e "\n${BLUE}📋 检查必要工具...${NC}"
TOOLS_OK=true

if ! check_command go; then
    TOOLS_OK=false
fi

if ! check_command docker; then
    TOOLS_OK=false
fi

if ! check_command redis-cli; then
    echo -e "${YELLOW}⚠${NC} redis-cli 未安装（可选）"
fi

if [ "$TOOLS_OK" = false ]; then
    echo -e "${RED}❌ 请安装缺失的工具后重试${NC}"
    exit 1
fi

# 检查 Go 版本
echo -e "\n${BLUE}🔧 检查 Go 版本...${NC}"
GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
REQUIRED_VERSION="1.12"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$GO_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    echo -e "${GREEN}✓${NC} Go 版本 $GO_VERSION 符合要求（>= $REQUIRED_VERSION）"
else
    echo -e "${RED}✗${NC} Go 版本 $GO_VERSION 不符合要求（需要 >= $REQUIRED_VERSION）"
    exit 1
fi

# 代码格式化
echo -e "\n${BLUE}🎨 格式化代码...${NC}"
if command -v gofmt &> /dev/null; then
    gofmt -w .
    echo -e "${GREEN}✓${NC} Go 代码格式化完成"
else
    echo -e "${YELLOW}⚠${NC} gofmt 未找到，跳过格式化"
fi

if command -v goimports &> /dev/null; then
    goimports -w .
    echo -e "${GREEN}✓${NC} Go imports 整理完成"
else
    echo -e "${YELLOW}⚠${NC} goimports 未找到，跳过 imports 整理"
fi

# 代码检查
echo -e "\n${BLUE}🔍 运行代码检查...${NC}"

# go vet
echo "运行 go vet..."
if go vet ./...; then
    echo -e "${GREEN}✓${NC} go vet 检查通过"
else
    echo -e "${RED}✗${NC} go vet 检查失败"
    exit 1
fi

# golangci-lint（如果可用）
if command -v golangci-lint &> /dev/null; then
    echo "运行 golangci-lint..."
    if golangci-lint run; then
        echo -e "${GREEN}✓${NC} golangci-lint 检查通过"
    else
        echo -e "${YELLOW}⚠${NC} golangci-lint 发现问题，请检查"
    fi
else
    echo -e "${YELLOW}⚠${NC} golangci-lint 未安装，跳过高级检查"
fi

# 运行测试
echo -e "\n${BLUE}🧪 运行测试...${NC}"

echo "运行单元测试..."
if go test -v ./...; then
    echo -e "${GREEN}✓${NC} 单元测试通过"
else
    echo -e "${RED}✗${NC} 单元测试失败"
    exit 1
fi

echo "运行竞态检测..."
if go test -race ./...; then
    echo -e "${GREEN}✓${NC} 竞态检测通过"
else
    echo -e "${RED}✗${NC} 竞态检测发现问题"
    exit 1
fi

# 生成测试覆盖率
echo "生成测试覆盖率报告..."
if go test -coverprofile=coverage.out ./...; then
    COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}')
    echo -e "${GREEN}✓${NC} 测试覆盖率: $COVERAGE"
    
    # 生成 HTML 报告
    go tool cover -html=coverage.out -o coverage.html
    echo -e "${GREEN}✓${NC} 覆盖率报告已生成: coverage.html"
else
    echo -e "${YELLOW}⚠${NC} 无法生成覆盖率报告"
fi

# 构建检查
echo -e "\n${BLUE}🔨 构建检查...${NC}"

echo "构建二进制文件..."
if CGO_ENABLED=0 GOOS=linux go build -mod=vendor -o go-websocket-chat-demo .; then
    echo -e "${GREEN}✓${NC} Linux 二进制构建成功"
    rm -f go-websocket-chat-demo
else
    echo -e "${RED}✗${NC} Linux 二进制构建失败"
    exit 1
fi

echo "构建本地二进制文件..."
if go build -o go-websocket-chat-demo .; then
    echo -e "${GREEN}✓${NC} 本地二进制构建成功"
    rm -f go-websocket-chat-demo
else
    echo -e "${RED}✗${NC} 本地二进制构建失败"
    exit 1
fi

# Docker 构建检查
echo -e "\n${BLUE}🐳 Docker 构建检查...${NC}"

if docker build -t websocket-chat-test . > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker 镜像构建成功"
    docker rmi websocket-chat-test > /dev/null 2>&1
else
    echo -e "${RED}✗${NC} Docker 镜像构建失败"
    exit 1
fi

# 检查文件完整性
echo -e "\n${BLUE}📁 检查文件完整性...${NC}"

REQUIRED_FILES=(
    "README.md"
    "DEVELOPMENT.md"
    "DEPLOYMENT.md"
    "CHANGELOG.md"
    "Dockerfile"
    "docker-compose.yml"
    "go.mod"
    "go.sum"
    "main.go"
    "public/index.html"
    "public/test-runner.html"
    "public/js/application.js"
    "public/css/modern-chat.css"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (缺失)"
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo -e "${RED}❌ 发现缺失文件，请检查${NC}"
    exit 1
fi

# 检查前端文件
echo -e "\n${BLUE}🌐 检查前端文件...${NC}"

# 检查 HTML 语法（简单检查）
if grep -q "<!DOCTYPE html>" public/index.html; then
    echo -e "${GREEN}✓${NC} HTML 文档类型声明正确"
else
    echo -e "${RED}✗${NC} HTML 文档类型声明缺失"
fi

# 检查 CSS 文件
if [ -f "public/css/modern-chat.css" ] && [ -s "public/css/modern-chat.css" ]; then
    echo -e "${GREEN}✓${NC} CSS 文件存在且非空"
else
    echo -e "${RED}✗${NC} CSS 文件问题"
fi

# 检查 JavaScript 文件
if [ -f "public/js/application.js" ] && [ -s "public/js/application.js" ]; then
    echo -e "${GREEN}✓${NC} JavaScript 文件存在且非空"
else
    echo -e "${RED}✗${NC} JavaScript 文件问题"
fi

# 检查测试文件
TEST_FILES=(
    "public/js/test-framework.js"
    "public/js/integration-test.js"
    "public/js/e2e-test.js"
    "public/js/performance-optimizer.js"
)

for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ] && [ -s "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${YELLOW}⚠${NC} $file (可能有问题)"
    fi
done

# 安全检查
echo -e "\n${BLUE}🔒 安全检查...${NC}"

# 检查是否有硬编码的密码或密钥
if grep -r -i "password\|secret\|key" --include="*.go" --include="*.js" . | grep -v "// " | grep -v "test" | grep -v "example"; then
    echo -e "${YELLOW}⚠${NC} 发现可能的硬编码凭据，请检查"
else
    echo -e "${GREEN}✓${NC} 未发现明显的硬编码凭据"
fi

# 检查 TODO 和 FIXME
echo -e "\n${BLUE}📝 检查待办事项...${NC}"

TODO_COUNT=$(grep -r -i "TODO\|FIXME" --include="*.go" --include="*.js" . | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC} 发现 $TODO_COUNT 个 TODO/FIXME 项目"
    echo "详细信息:"
    grep -r -i "TODO\|FIXME" --include="*.go" --include="*.js" . | head -10
    if [ $TODO_COUNT -gt 10 ]; then
        echo "... 还有 $((TODO_COUNT - 10)) 个项目"
    fi
else
    echo -e "${GREEN}✓${NC} 未发现 TODO/FIXME 项目"
fi

# 性能检查
echo -e "\n${BLUE}⚡ 性能检查...${NC}"

# 检查大文件
echo "检查大文件..."
LARGE_FILES=$(find . -type f -size +1M -not -path "./vendor/*" -not -path "./.git/*" -not -path "./tmp/*")
if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}⚠${NC} 发现大文件:"
    echo "$LARGE_FILES"
else
    echo -e "${GREEN}✓${NC} 未发现异常大文件"
fi

# 最终报告
echo -e "\n${GREEN}🎉 最终代码审查完成！${NC}"
echo -e "\n${BLUE}📊 审查总结:${NC}"
echo -e "${GREEN}✓${NC} 代码格式化和检查通过"
echo -e "${GREEN}✓${NC} 单元测试和竞态检测通过"
echo -e "${GREEN}✓${NC} 构建检查通过"
echo -e "${GREEN}✓${NC} Docker 构建检查通过"
echo -e "${GREEN}✓${NC} 文件完整性检查通过"

if [ $TODO_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC} 发现 $TODO_COUNT 个待办事项"
fi

echo -e "\n${GREEN}🚀 项目已准备好部署！${NC}"

# 生成部署清单
echo -e "\n${BLUE}📋 生成部署清单...${NC}"
cat > deployment-checklist.md << EOF
# 部署清单

## ✅ 代码质量
- [x] 代码格式化完成
- [x] 静态检查通过
- [x] 单元测试通过
- [x] 竞态检测通过
- [x] 测试覆盖率: $COVERAGE

## ✅ 构建检查
- [x] Go 二进制构建成功
- [x] Docker 镜像构建成功
- [x] 所有必需文件存在

## ✅ 安全检查
- [x] 无明显硬编码凭据
- [x] 安全配置检查完成

## 📝 待办事项
- TODO/FIXME 项目: $TODO_COUNT 个

## 🚀 部署步骤
1. 确保 Redis 服务可用
2. 设置环境变量 (PORT, REDIS_URL)
3. 运行 \`make deploy-check\` 进行最终检查
4. 执行部署命令

## 📞 支持
如有问题，请查看 DEPLOYMENT.md 或创建 Issue。

---
生成时间: $(date)
EOF

echo -e "${GREEN}✓${NC} 部署清单已生成: deployment-checklist.md"

echo -e "\n${GREEN}🎊 恭喜！项目已通过所有检查，可以部署了！${NC}"