#!/bin/bash

# AIIntelligentCustomerService 第14章快速启动脚本

set -e  # 遇到错误立即退出

echo "🚀 第14章 知识库RAG系统 - 快速启动脚本"
echo "============================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印彩色消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "📋 步骤 1: 环境检查"
echo "--------------------"

# 检查 Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    print_success "Node.js 已安装: $NODE_VERSION"
else
    print_error "Node.js 未安装，请先安装 Node.js (https://nodejs.org/)"
    exit 1
fi

# 检查 npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    print_success "npm 已安装: $NPM_VERSION"
else
    print_error "npm 未安装"
    exit 1
fi

# 检查 MySQL
if command_exists mysql; then
    MYSQL_VERSION=$(mysql --version | awk '{print $3}')
    print_success "MySQL 已安装: $MYSQL_VERSION"
else
    print_warning "MySQL 未找到，请确保 MySQL 已安装并启动"
fi

# 检查 Java
if command_exists java; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1 | awk -F '"' '{print $2}')
    print_success "Java 已安装: $JAVA_VERSION"
else
    print_warning "Java 未找到，后端需要 Java 17+"
fi

# 检查 Maven
if command_exists mvn; then
    MVN_VERSION=$(mvn -v | head -n 1 | awk '{print $3}')
    print_success "Maven 已安装: $MVN_VERSION"
else
    print_warning "Maven 未找到，后端需要 Maven"
fi

echo ""
echo "📋 步骤 2: 检查配置"
echo "--------------------"

# 检查环境变量
if [ -z "$DASHSCOPE_API_KEY" ]; then
    print_warning "DASHSCOPE_API_KEY 环境变量未设置"
    echo "  请运行: export DASHSCOPE_API_KEY=your_api_key"
else
    print_success "DASHSCOPE_API_KEY 已设置"
fi

echo ""
echo "📋 步骤 3: 启动前端"
echo "--------------------"

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    print_info "检测到 node_modules 不存在，开始安装依赖..."
    npm install
    print_success "依赖安装完成"
else
    print_info "node_modules 已存在，跳过安装"
fi

# 启动前端开发服务器
print_info "启动前端开发服务器..."
npm run dev &
FRONTEND_PID=$!

# 等待前端启动
sleep 3

if ps -p $FRONTEND_PID > /dev/null; then
    print_success "前端服务已启动 (PID: $FRONTEND_PID)"
    print_success "访问地址: http://localhost:5173"
else
    print_error "前端启动失败"
    exit 1
fi

echo ""
echo "============================================"
echo "✅ 前端启动完成！"
echo ""
echo "📍 访问地址："
echo "   - 前端应用: http://localhost:5173"
echo "   - 第9章: http://localhost:5173/chapter_09"
echo "   - 第12章: http://localhost:5173/chapter_12"
echo "   - 第14章: http://localhost:5173/chapter_14"
echo ""
echo "🔧 后端服务启动说明："
echo "   1. 确保 MySQL 已启动"
echo "   2. 创建数据库: CREATE DATABASE knowledge_base_rag;"
echo "   3. 设置环境变量: export DASHSCOPE_API_KEY=your_api_key"
echo "   4. 进入后端目录: cd ../SpringBootAIProject/chapter_14"
echo "   5. 启动服务: mvn spring-boot:run"
echo "   6. 访问 Swagger: http://localhost:8014/swagger-ui/index.html"
echo ""
echo "📚 文档："
echo "   - 使用指南: CHAPTER14_GUIDE.md"
echo "   - 架构说明: ARCHITECTURE.md"
echo "   - 测试清单: TESTING_CHECKLIST.md"
echo ""
echo "⌨️  按 Ctrl+C 停止前端服务"
echo "============================================"

# 等待用户中断
wait $FRONTEND_PID
