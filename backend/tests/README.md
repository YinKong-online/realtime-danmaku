# 数据库适配器测试文档

## 测试文件结构

本目录包含实时互动弹幕系统数据库适配器的全面测试套件，测试文件组织如下：

```
tests/
├── setup.js              # 测试环境设置和工具函数
├── run-db-tests.js       # 测试运行器
├── README.md             # 测试文档（本文档）
└── database/             # 数据库相关测试
    ├── base-adapter.test.js          # 基础适配器测试
    ├── mongodb-adapter.test.js       # MongoDB适配器测试
    ├── mysql-adapter.test.js         # MySQL适配器测试
    ├── postgresql-adapter.test.js    # PostgreSQL适配器测试
    └── adapter-integration.test.js   # 适配器集成测试
```

## 测试目的

测试套件旨在验证数据库适配器的以下方面：

- **功能正确性**：确保所有适配器实现了必要的功能，并且能够正确执行各种数据库操作
- **接口一致性**：验证所有数据库适配器实现了统一的接口规范
- **错误处理**：测试在各种错误情况下适配器的行为是否符合预期
- **性能模拟**：模拟并验证批量操作等性能敏感场景的处理能力
- **集成场景**：测试在实际使用场景中的综合表现

## 测试环境设置

### 安装依赖

运行测试前需要安装测试所需的依赖包：

```bash
npm install
```

主要测试依赖包：
- `mocha`：测试运行框架
- `chai`：断言库
- `sinon`：用于创建测试替身（stubs, mocks, spies）
- `chai-as-promised`：Promise断言支持

### 环境变量

测试使用模拟数据和模拟连接，不需要实际的数据库连接。测试配置在 `setup.js` 中定义：

```javascript
// 模拟数据库配置
export const testConfig = {
  mockDbConfig: {
    mysql: {
      host: 'localhost',
      port: 3306,
      user: 'test_user',
      password: 'test_password',
      database: 'test_db'
    },
    mongodb: {
      uri: 'mongodb://localhost:27017/test_db'
    },
    postgresql: {
      host: 'localhost',
      port: 5432,
      user: 'test_user',
      password: 'test_password',
      database: 'test_db'
    }
  }
};
```

## 运行测试

### 运行所有数据库测试

使用以下命令运行所有数据库适配器测试：

```bash
npm test
# 或者
npm run test:db
```

### 运行单个测试文件

如果需要运行特定的测试文件，可以使用Node.js直接执行：

```bash
node tests/database/base-adapter.test.js
```

或者使用Mocha命令行：

```bash
npx mocha tests/database/base-adapter.test.js
```

## 测试文件说明

### 1. setup.js

包含测试环境设置、通用工具函数和测试配置。提供随机数据生成、错误模拟等功能，供所有测试文件使用。

### 2. base-adapter.test.js

测试基础适配器类 `BaseDatabaseAdapter` 的功能，包括：
- 构造函数测试
- 错误处理方法 `safeExecute`
- 日志功能
- 抽象方法定义
- 资源管理

### 3. 特定数据库适配器测试

- **mongodb-adapter.test.js**：测试MongoDB适配器实现
- **mysql-adapter.test.js**：测试MySQL适配器实现  
- **postgresql-adapter.test.js**：测试PostgreSQL适配器实现

每个适配器测试包含：
- 连接管理测试
- 弹幕操作测试（保存、获取、统计等）
- 数据清理测试
- 特定数据库功能测试（事务、自定义查询等）
- 错误处理测试

### 4. adapter-integration.test.js

测试不同数据库适配器的集成场景：
- 适配器工厂测试
- 接口一致性测试
- 重试装饰器测试
- 多适配器切换测试
- 批量操作性能模拟
- 错误传递和处理
- 资源管理

### 5. run-db-tests.js

测试运行器，负责收集和执行所有测试文件，提供统一的测试报告。

## 测试策略

测试采用**单元测试**和**集成测试**相结合的策略：

1. **单元测试**：使用模拟（mocks）和桩（stubs）隔离测试对象，验证单个组件的功能
2. **集成测试**：测试多个组件之间的交互
3. **模拟数据**：使用模拟数据而非真实数据库连接，确保测试的独立性和可靠性

## 测试覆盖率

测试覆盖了以下关键功能：

- ✅ 数据库连接管理
- ✅ 弹幕CRUD操作
- ✅ 批量操作
- ✅ 数据统计和分析
- ✅ 数据清理
- ✅ 错误处理和重试机制
- ✅ 事务支持（如适用）
- ✅ 资源管理

## 最佳实践

1. **隔离测试**：每个测试应该独立运行，不依赖其他测试的状态
2. **模拟依赖**：使用模拟对象代替实际的数据库连接
3. **完整断言**：测试应该验证预期的输出、状态变化和行为
4. **清理资源**：确保每个测试后清理模拟和桩
5. **测试边界条件**：测试正常、错误和边缘情况

## 故障排除

### 常见问题

1. **依赖安装失败**：确保使用最新的npm版本，并检查网络连接
   ```bash
   npm install --force
   ```

2. **测试运行超时**：检查测试代码中的异步操作是否正确使用了await

3. **测试失败**：查看失败信息，通常会包含错误堆栈和期望/实际值的对比

## 贡献指南

添加新测试时，请遵循以下指南：

1. 在相应的测试文件中添加新的测试用例
2. 确保测试名称清晰描述测试场景
3. 添加适当的断言验证预期行为
4. 清理测试中的模拟和桩
5. 运行测试确保所有测试通过

---

## 许可证

此测试套件是实时互动弹幕系统的一部分，遵循相同的许可证。