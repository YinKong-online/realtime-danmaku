# 使用Node.js官方镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装依赖（先复制package.json以利用Docker缓存）
COPY package*.json ./
RUN npm install --registry=https://registry.npmmirror.com

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["node", "src/index.js"]