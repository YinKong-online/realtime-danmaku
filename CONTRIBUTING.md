# 贡献指南

非常感谢您对实时互动弹幕系统项目的关注和贡献！本指南将帮助您了解如何为项目做出贡献。

## 行为准则

参与本项目的所有贡献者都应遵守以下行为准则，以确保我们维护一个友好、包容的社区环境：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 专注于对社区最有利的事情
- 对其他社区成员表示同理心

## 开始贡献

### 1. 环境准备

```bash
# 克隆仓库
git clone https://github.com/YinKong-online/realtime-danmaku.git
cd realtime-danmaku

# 启动开发环境（使用Docker）
docker-compose up -d

# 或手动启动前后端
cd frontend && npm install && npm run dev
cd ../backend && npm install && npm start
```

### 2. 提交流程

1. **创建分支**：
   ```bash
   git checkout -b feature/amazing-feature  # 新功能
   # 或
   git checkout -b bugfix/fix-issue         # Bug修复
   ```

2. **提交更改**：
   - 确保代码遵循项目的代码风格
   - 添加或更新相关文档
   - 提交消息应简洁明了，清晰描述更改内容
   ```bash
   git commit -m "feat: 添加新功能描述"
   # 或
   git commit -m "fix: 修复问题描述"
   ```

3. **推送分支**：
   ```bash
   git push origin feature/amazing-feature
   ```

4. **创建Pull Request**：
   - 在GitHub上创建一个新的Pull Request
   - 清晰描述您的更改和解决的问题
   - 引用相关的Issue（如有）

## 开发规范

### 前端开发规范

- 遵循Vue 3的最佳实践
- 使用TypeScript编写类型安全的代码
- 组件命名使用PascalCase
- 工具函数使用camelCase
- 新组件应添加适当的注释和类型定义
- 确保代码通过`npm run type-check`检查

### 后端开发规范

- 遵循Node.js模块化开发原则
- 使用ES模块语法
- API路由使用RESTful风格
- 错误处理应包含适当的日志记录
- 新增功能应保持向后兼容
- 配置项应支持环境变量覆盖

## 报告问题

如果您发现任何问题或有新功能建议，请在GitHub上创建一个Issue。提交Issue时，请提供以下信息：

- 问题的简要描述
- 重现步骤
- 预期行为
- 实际行为
- 环境信息（操作系统、浏览器版本等）
- 可能的解决方案（如果有）

## 代码审查

所有Pull Request都将经过代码审查。审查者可能会提出一些修改建议，请及时响应并进行必要的调整。

## 发布流程

维护者负责决定何时发布新版本。发布时将：

1. 更新版本号（遵循语义化版本规范）
2. 更新CHANGELOG.md
3. 合并到主分支
4. 创建新的Release标签

## 联系我们

如有任何问题，可以通过以下方式联系项目维护者：

- GitHub Issues：https://github.com/YinKong-online/realtime-danmaku/issues
- QQ：1541310738

感谢您的贡献！