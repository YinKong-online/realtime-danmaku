# 数据库适配器使用指南

本文档详细介绍了实时互动弹幕系统中的数据库适配器设计、使用方法和API接口，帮助开发者独立使用或扩展数据库适配器。

## 1. 适配器架构设计

系统采用工厂模式实现数据库适配器，支持多种数据库类型（MongoDB、MySQL、PostgreSQL），并提供统一的接口进行数据操作。

### 核心设计理念

- **统一接口**：所有数据库适配器实现相同的接口，确保业务代码与具体数据库实现解耦
- **工厂模式**：通过工厂类动态创建适合的数据库适配器实例
- **可扩展性**：可以轻松添加新的数据库适配器，只需实现标准接口
- **错误处理**：每个适配器内置错误处理机制，保证系统稳定性

## 2. 适配器基础类

适配器基础类定义了所有数据库适配器必须实现的接口方法，确保接口一致性。

```javascript
// 数据库适配器基础类
class BaseDatabaseAdapter {
  constructor(config) {
    this.config = config;
    this.logger = console; // 可替换为自定义日志器
  }

  // 连接数据库（必须实现）
  async connect() {
    throw new Error('connect 方法必须在子类中实现');
  }

  // 断开数据库连接（必须实现）
  async disconnect() {
    throw new Error('disconnect 方法必须在子类中实现');
  }

  // 保存弹幕（必须实现）
  async saveDanmaku(room, danmaku) {
    throw new Error('saveDanmaku 方法必须在子类中实现');
  }

  // 获取房间历史弹幕（必须实现）
  async getRoomHistory(room, limit = 100) {
    throw new Error('getRoomHistory 方法必须在子类中实现');
  }

  // 保存系统统计（必须实现）
  async saveSystemStats(stats) {
    throw new Error('saveSystemStats 方法必须在子类中实现');
  }

  // 统一的错误处理包装器
  async safeExecute(operationName, fn) {
    try {
      return await fn();
    } catch (error) {
      this.logger.error(`${operationName} 失败:`, error);
      throw new Error(`${operationName} 失败: ${error.message}`);
    }
  }
}
```

## 3. 独立使用适配器

### 3.1 基本使用步骤

1. **引入适配器工厂**
2. **创建适配器实例**
3. **连接数据库**
4. **执行数据操作**
5. **断开连接**

### 3.2 MongoDB适配器使用示例

```javascript
import databaseFactory from './database/adapters.js';

async function useMongoDBAdapter() {
  // 创建MongoDB适配器实例
  const adapter = databaseFactory.getAdapter('mongodb', {
    url: 'mongodb://localhost:27017',
    dbName: 'danmaku_system'
  });

  try {
    // 连接数据库
    await adapter.connect();
    console.log('数据库连接成功');

    // 保存弹幕
    const danmakuId = await adapter.saveDanmaku('room1', {
      userId: 'user123',
      nickname: '弹幕用户',
      content: '这是一条测试弹幕',
      type: 'scroll',
      color: '#FF0000'
    });
    console.log('弹幕保存成功，ID:', danmakuId);

    // 获取历史弹幕
    const history = await adapter.getRoomHistory('room1', 50);
    console.log('获取到的历史弹幕数量:', history.length);

    // 保存系统统计
    const statsId = await adapter.saveSystemStats({
      activeConnections: 100,
      totalMessages: 5000
    });
    console.log('系统统计保存成功，ID:', statsId);
  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    // 断开连接
    await adapter.disconnect();
  }
}

// 执行示例
useMongoDBAdapter();
```

### 3.3 MySQL适配器使用示例

```javascript
import databaseFactory from './database/adapters.js';

async function useMySQLAdapter() {
  // 创建MySQL适配器实例
  const adapter = databaseFactory.getAdapter('mysql', {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'danmaku_system'
  });

  try {
    // 连接数据库
    await adapter.connect();
    console.log('MySQL连接成功');

    // 批量保存弹幕示例
    const danmakuList = [
      { userId: 'user1', nickname: '用户1', content: '第一条弹幕', color: '#FF0000' },
      { userId: 'user2', nickname: '用户2', content: '第二条弹幕', color: '#00FF00' },
      { userId: 'user3', nickname: '用户3', content: '第三条弹幕', color: '#0000FF' }
    ];

    for (const danmaku of danmakuList) {
      await adapter.saveDanmaku('room2', danmaku);
    }
    console.log('批量保存弹幕完成');

    // 获取历史弹幕
    const messages = await adapter.getRoomHistory('room2');
    console.log('获取到的历史弹幕:', messages);
  } catch (error) {
    console.error('MySQL操作失败:', error);
  } finally {
    // 断开连接
    await adapter.disconnect();
  }
}

// 执行示例
useMySQLAdapter();
```

### 3.4 PostgreSQL适配器使用示例

```javascript
import databaseFactory from './database/adapters.js';

async function usePostgreSQLAdapter() {
  // 创建PostgreSQL适配器实例
  const adapter = databaseFactory.getAdapter('postgresql', {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'danmaku_system'
  });

  try {
    await adapter.connect();
    console.log('PostgreSQL连接成功');

    // 执行操作...
    
  } catch (error) {
    console.error('PostgreSQL操作失败:', error);
  } finally {
    await adapter.disconnect();
  }
}
```

## 4. 完整API文档

### 4.1 基础适配器接口 (BaseDatabaseAdapter)

所有数据库适配器都继承自`BaseDatabaseAdapter`类，并实现以下核心接口方法。每个方法都使用`safeExecute`进行了统一的错误处理和日志记录。

#### connect()

**说明**: 初始化并建立数据库连接，包括创建必要的表/集合结构和索引。

**参数**: 无

**返回值**: `Promise<boolean>` - 连接成功返回true，失败返回false

**使用示例**:
```javascript
const connected = await adapter.connect();
if (connected) {
  console.log('数据库连接成功');
} else {
  console.error('数据库连接失败');
}
```

#### disconnect()

**说明**: 关闭数据库连接，释放所有资源。

**参数**: 无

**返回值**: `Promise<boolean>` - 断开成功返回true，失败返回false

**使用示例**:
```javascript
await adapter.disconnect();
console.log('数据库连接已关闭');
```

#### saveDanmaku(room, danmaku)

**说明**: 保存单条弹幕到指定房间。

**参数**:
- `room` (string): 房间ID
- `danmaku` (object): 弹幕对象，包含以下字段:
  - `userId` (string): 用户ID (必填)
  - `nickname` (string): 用户昵称 (必填)
  - `content` (string): 弹幕内容 (必填)
  - `type` (string): 弹幕类型 ('scroll', 'top', 'bottom')，默认'scroll'
  - `color` (string): 弹幕颜色 (十六进制格式)，默认'#FFFFFF'
  - `fontSize` (number): 字体大小，默认16

**返回值**: `Promise<string|null>` - 保存成功返回弹幕ID，失败返回null

**使用示例**:
```javascript
const danmakuId = await adapter.saveDanmaku('room123', {
  userId: 'user456',
  nickname: '小明',
  content: '这是一条弹幕！',
  type: 'scroll',
  color: '#FF0000'
});
```

#### getRoomHistory(room, limit = 100, offset = 0)

**说明**: 获取指定房间的历史弹幕记录，支持分页。

**参数**:
- `room` (string): 房间ID
- `limit` (number): 返回记录数量限制，默认100
- `offset` (number): 偏移量，用于分页，默认0

**返回值**: `Promise<Array>` - 弹幕对象数组，按时间正序排列

**返回的弹幕对象结构**:
```javascript
[
  {
    id: 'string',       // 弹幕ID
    room: 'string',     // 房间ID
    userId: 'string',   // 用户ID
    nickname: 'string', // 用户昵称
    content: 'string',  // 弹幕内容
    type: 'string',     // 弹幕类型
    color: 'string',    // 弹幕颜色
    fontSize: number,   // 字体大小
    timestamp: Date,    // 发送时间
    createdAt: Date     // 创建时间
  },
  // 更多弹幕...
]
```

**使用示例**:
```javascript
// 获取最新10条弹幕
const recentMessages = await adapter.getRoomHistory('room123', 10);

// 分页获取 - 第二页，每页20条
const page2Messages = await adapter.getRoomHistory('room123', 20, 20);
```

#### saveSystemStats(stats)

**说明**: 保存系统统计信息。

**参数**:
- `stats` (object): 统计信息对象，包含以下字段:
  - `onlineUsers` (number): 在线用户数
  - `activeRooms` (number): 活跃房间数
  - `danmakuPerSecond` (number): 每秒弹幕数
  - `totalDanmakus` (number): 总弹幕数
  - `serverLoad` (number): 服务器负载

**返回值**: `Promise<string|null>` - 保存成功返回统计记录ID，失败返回null

**使用示例**:
```javascript
const statsId = await adapter.saveSystemStats({
  onlineUsers: 1234,
  activeRooms: 56,
  danmakuPerSecond: 23.5,
  totalDanmakus: 100000,
  serverLoad: 0.75
});
```

### 4.2 通用扩展方法

以下方法是在`BaseDatabaseAdapter`中提供的通用方法，所有适配器都支持：

#### batchSaveDanmaku(room, danmakus)

**说明**: 批量保存多条弹幕，比单条保存更高效。

**参数**:
- `room` (string): 房间ID
- `danmakus` (Array): 弹幕对象数组，每个对象结构同`saveDanmaku`

**返回值**: `Promise<Array>` - 保存结果数组，每条包含id和success状态

**返回的结果数组结构**:
```javascript
[
  { id: 'string', success: true },
  { id: 'string', success: true },
  // 更多结果...
]
```

**使用示例**:
```javascript
const batchResults = await adapter.batchSaveDanmaku('room123', [
  { userId: 'u1', nickname: '用户1', content: '弹幕1' },
  { userId: 'u2', nickname: '用户2', content: '弹幕2' },
  { userId: 'u3', nickname: '用户3', content: '弹幕3' }
]);

// 检查成功保存的数量
const successCount = batchResults.filter(r => r.success).length;
```

#### getUserDanmakus(userId, limit = 100, offset = 0)

**说明**: 获取指定用户发送的弹幕历史。

**参数**:
- `userId` (string): 用户ID
- `limit` (number): 返回记录数量限制，默认100
- `offset` (number): 偏移量，用于分页，默认0

**返回值**: `Promise<Array>` - 用户弹幕历史数组

**使用示例**:
```javascript
const userMessages = await adapter.getUserDanmakus('user456', 50);
```

#### getRoomStats(room)

**说明**: 获取指定房间的统计信息。

**参数**:
- `room` (string): 房间ID

**返回值**: `Promise<Object>` - 房间统计信息

**返回的统计对象结构**:
```javascript
{
  room: 'string',         // 房间ID
  totalDanmakus: number,  // 总弹幕数
  uniqueUsers: number,    // 发送弹幕的独立用户数
  topSenders: Array,      // 发送最多弹幕的用户列表
  recentActivity: number  // 最近活跃度（每分钟弹幕数）
}
```

**使用示例**:
```javascript
const roomStats = await adapter.getRoomStats('room123');
console.log(`${roomStats.room} 房间共有 ${roomStats.totalDanmakus} 条弹幕`);
```

#### cleanupOldData(days)

**说明**: 清理指定天数之前的旧数据，保持数据库性能。

**参数**:
- `days` (number): 保留天数，超过此天数的数据将被删除

**返回值**: `Promise<Object>` - 清理结果统计

**返回的结果对象结构**:
```javascript
{
  success: boolean,      // 清理操作是否成功
  totalDeleted: number,  // 删除的记录总数
  details: {
    messages: number,    // 删除的消息记录数
    stats: number        // 删除的统计记录数
  }
}
```

**使用示例**:
```javascript
// 保留30天数据，删除更早的数据
const cleanupResult = await adapter.cleanupOldData(30);
console.log(`清理了 ${cleanupResult.totalDeleted} 条过期记录`);
```

### 4.3 工厂类方法 (DatabaseAdapterFactory)

`DatabaseAdapterFactory`负责创建和管理数据库适配器实例：

#### register(type, adapterClass)

**说明**: 注册新的数据库适配器类型。

**参数**:
- `type` (string): 适配器类型标识符（如'mysql', 'mongodb'）
- `adapterClass` (class): 适配器类构造函数

**返回值**: 无

**使用示例**:
```javascript
DatabaseAdapterFactory.register('customdb', CustomDatabaseAdapter);
```

#### getAdapter(type, config)

**说明**: 创建指定类型的数据库适配器实例。

**参数**:
- `type` (string): 适配器类型标识符
- `config` (object): 适配器配置对象

**返回值**: `BaseDatabaseAdapter` - 适配器实例

**使用示例**:
```javascript
const adapter = DatabaseAdapterFactory.getAdapter('mysql', {
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'danmaku'
});
```

#### getRegisteredTypes()

**说明**: 获取所有已注册的适配器类型。

**参数**: 无

**返回值**: `Array<string>` - 已注册的适配器类型数组

**使用示例**:
```javascript
const availableTypes = DatabaseAdapterFactory.getRegisteredTypes();
console.log('可用的数据库适配器:', availableTypes); // 输出: ['mongodb', 'mysql', 'postgres']
```

#### supports(type)

**说明**: 检查是否支持指定类型的适配器。

**参数**:
- `type` (string): 适配器类型标识符

**返回值**: `boolean` - 支持返回true，否则返回false

**使用示例**:
```javascript
if (DatabaseAdapterFactory.supports('oracle')) {
  // 使用Oracle适配器
} else {
  console.log('不支持Oracle数据库');
}

## 5. 扩展自定义适配器

要创建自定义数据库适配器，只需继承基础适配器类并实现所有抽象方法。

```javascript
// 自定义数据库适配器示例
class CustomDatabaseAdapter extends BaseDatabaseAdapter {
  constructor(config) {
    super(config);
    this.client = null;
    this.logger.info('初始化自定义数据库适配器');
  }

  async connect() {
    return this.safeExecute('自定义数据库连接', async () => {
      // 实现数据库连接逻辑
      // 例如：初始化客户端、测试连接、创建表结构等
      this.isConnected = true;
      this.logger.info('自定义数据库连接成功');
      return true;
    });
  }

  async disconnect() {
    return this.safeExecute('自定义数据库断开连接', async () => {
      if (this.client) {
        // 关闭连接逻辑
        this.client = null;
        this.isConnected = false;
        this.logger.info('自定义数据库连接已关闭');
      }
      return true;
    }, true);
  }

  async saveDanmaku(room, danmaku) {
    return this.safeExecute(`保存弹幕到房间 ${room}`, async () => {
      if (!this.isConnected) {
        this.logger.warn('数据库未连接');
        return null;
      }
      
      // 标准化数据格式
      const normalizedDanmaku = {
        ...danmaku,
        room,
        timestamp: new Date(),
        type: danmaku.type || 'scroll',
        color: danmaku.color || '#FFFFFF'
      };
      
      // 实现保存逻辑
      // const result = await this.client.save(normalizedDanmaku);
      const mockId = Date.now();
      this.logger.debug('弹幕保存成功', { room, userId: danmaku.userId, id: mockId });
      return mockId;
    }, null);
  }

  async getRoomHistory(room, limit = 100, offset = 0) {
    return this.safeExecute(`获取房间 ${room} 的历史弹幕`, async () => {
      if (!this.isConnected) {
        this.logger.warn('数据库未连接');
        return [];
      }
      
      // 实现查询逻辑
      // const messages = await this.client.query(room, limit, offset);
      return [];
    }, []);
  }

  async saveSystemStats(stats) {
    return this.safeExecute('保存系统统计', async () => {
      if (!this.isConnected) {
        this.logger.warn('数据库未连接');
        return null;
      }
      
      // 实现保存统计逻辑
      // const result = await this.client.saveStats(stats);
      const mockId = Date.now();
      return mockId;
    }, null);
  }

  // 实现批量保存方法
  async batchSaveDanmaku(room, danmakus) {
    return this.safeExecute(`批量保存弹幕到房间 ${room}`, async () => {
      if (!this.isConnected || !Array.isArray(danmakus) || danmakus.length === 0) {
        return [];
      }
      
      // 实现批量保存逻辑
      const results = danmakus.map((_, index) => ({
        id: Date.now() + index,
        success: true
      }));
      
      return results;
    }, []);
  }
}

// 注册自定义适配器
databaseFactory.register('customdb', CustomDatabaseAdapter);

// 使用自定义适配器
const adapter = databaseFactory.getAdapter('customdb', { 
  // 配置选项
  host: 'localhost',
  port: 12345,
  logLevel: 'debug'
});
```

### 5.1 扩展现有适配器

你也可以扩展现有的适配器，添加额外的功能：

```javascript
// 扩展MySQL适配器示例
class EnhancedMySQLAdapter extends MySQLAdapter {
  constructor(config) {
    super(config);
    this.logger.info('初始化增强型MySQL适配器');
  }

  async getPopularRooms(limit = 10) {
    return this.safeExecute(`获取热门房间Top${limit}`, async () => {
      if (!this.pool) {
        return [];
      }
      
      const query = `
        SELECT room, COUNT(*) as messageCount 
        FROM messages 
        GROUP BY room 
        ORDER BY messageCount DESC 
        LIMIT ?
      `;
      
      const [rows] = await this.pool.query(query, [limit]);
      return rows;
    }, []);
  }

  async getMessageCountByUser(userId) {
    return this.safeExecute(`获取用户 ${userId} 的消息总数`, async () => {
      if (!this.pool) {
        return 0;
      }
      
      const query = 'SELECT COUNT(*) as count FROM messages WHERE userId = ?';
      const [rows] = await this.pool.query(query, [userId]);
      return rows[0].count || 0;
    }, 0);
  }

  async searchMessages(keyword, room = null, limit = 50) {
    return this.safeExecute(`搜索消息: ${keyword}`, async () => {
      if (!this.pool) {
        return [];
      }
      
      let query = 'SELECT * FROM messages WHERE content LIKE ?';
      const params = [`%${keyword}%`];
      
      if (room) {
        query += ' AND room = ?';
        params.push(room);
      }
      
      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);
      
      const [rows] = await this.pool.query(query, params);
      return rows;
    }, []);
  }
}

// 注册扩展适配器
databaseFactory.register('enhanced-mysql', EnhancedMySQLAdapter);
```

## 6. 最佳实践和性能优化

### 6.1 连接管理

- **使用连接池**：所有适配器都默认使用连接池管理连接资源
- **合理设置连接池大小**：根据系统负载调整最大连接数
- **及时关闭连接**：在应用关闭时调用`disconnect()`方法
- **使用示例**：
  ```javascript
  const adapter = databaseFactory.getAdapter('mysql', {
    connectionLimit: 20,  // 根据系统负载调整
    enableKeepAlive: true
  });
  
  // 应用启动时连接
  await adapter.connect();
  
  // 应用关闭时断开连接
  process.on('SIGINT', async () => {
    await adapter.disconnect();
    process.exit(0);
  });
  ```

### 6.2 错误处理最佳实践

- **使用统一错误处理**：利用`safeExecute`包装所有数据库操作
- **区分致命错误和非致命错误**：
  - 连接错误通常是致命的，需要重新连接
  - 查询错误可能是非致命的，可以重试或返回默认值
- **错误恢复策略**：
  ```javascript
  async function withRetry(operation, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.log(`操作失败，${i + 1}/${maxRetries}次重试:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    throw lastError;
  }
  
  // 使用
  const result = await withRetry(() => adapter.saveDanmaku(room, danmaku));
  ```

### 6.3 性能优化建议

- **批量操作**：使用`batchSaveDanmaku`替代多次调用`saveDanmaku`
  ```javascript
  // 低效方式
  for (const danmaku of danmakus) {
    await adapter.saveDanmaku(room, danmaku);
  }
  
  // 高效方式
  await adapter.batchSaveDanmaku(room, danmakus);
  ```

- **分页查询**：使用`offset`参数实现分页，避免一次性加载大量数据
  ```javascript
  // 分页获取数据
  const pageSize = 50;
  const page = 1;
  const messages = await adapter.getRoomHistory(room, pageSize, (page - 1) * pageSize);
  ```

- **索引优化**：确保数据库表有适当的索引
  - MongoDB: 索引已自动创建在`room`和`timestamp`字段
  - MySQL/PostgreSQL: 索引已在表创建时设置

- **数据清理**：定期清理过期数据，保持数据库性能
  ```javascript
  // 在具体适配器中实现cleanupOldData方法
  // const result = await adapter.cleanupOldData(30); // 保留30天数据
  ```

### 6.4 事务处理

对于需要保证数据一致性的操作，建议使用数据库事务：

```javascript
async function performTransaction(adapter) {
  // 示例：在MySQL适配器中使用事务
  if (adapter.constructor.name === 'MySQLAdapter') {
    const connection = await adapter.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 执行多个操作
      await connection.query('INSERT INTO messages ...');
      await connection.query('UPDATE system_stats ...');
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
```

### 6.5 安全性考虑

- **参数化查询**：所有适配器都使用参数化查询，防止SQL注入
- **密码安全**：使用环境变量或密钥管理服务存储数据库密码
- **最小权限原则**：为数据库用户分配最小必要权限
- **数据验证**：在应用层验证输入数据的合法性
  ```javascript
  function validateDanmaku(danmaku) {
    // 验证必要字段
    if (!danmaku.userId || !danmaku.nickname || !danmaku.content) {
      return false;
    }
    
    // 验证内容长度
    if (danmaku.content.length > 200) {
      return false;
    }
    
    // 验证颜色格式
    if (danmaku.color && !/^#[0-9A-F]{6}$/i.test(danmaku.color)) {
      return false;
    }
    
    return true;
  }
  ```

## 7. 配置参数说明

### MongoDB配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| url | string | - | MongoDB连接字符串 |
| dbName | string | danmaku_system | 数据库名称 |

### MySQL配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| host | string | localhost | 数据库主机 |
| port | number | 3306 | 数据库端口 |
| user | string | root | 用户名 |
| password | string | - | 密码 |
| database | string | danmaku_system | 数据库名称 |

### PostgreSQL配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| host | string | localhost | 数据库主机 |
| port | number | 5432 | 数据库端口 |
| user | string | postgres | 用户名 |
| password | string | - | 密码 |
| database | string | danmaku_system | 数据库名称 |

## 8. 常见问题解答

**Q: 如何添加新的数据库适配器？**
A: 创建实现标准接口的适配器类，然后通过 `databaseFactory.register()` 方法注册。

**Q: 适配器初始化失败时如何处理？**
A: 系统会记录警告并尝试在无数据库支持的模式下继续运行，但部分功能可能受限。

**Q: 如何优化大量弹幕数据的存储和查询？**
A: 考虑使用分区表、定期归档旧数据、优化索引策略等方法。

**Q: 是否支持事务操作？**
A: 当前适配器接口未直接提供事务支持，需要在具体适配器实现中扩展此功能。

**Q: 如何监控数据库连接状态？**
A: 可以实现连接状态监控，定期检查连接池状态并记录日志。