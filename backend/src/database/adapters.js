// 日志记录器
class DatabaseLogger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.prefix = options.prefix || '[数据库]';
  }

  log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} ${this.prefix} [${level.toUpperCase()}] ${message}`;
    
    if (meta.error) {
      console[level === 'error' ? 'error' : 'warn'](logMessage, meta.error);
    } else if (meta.data) {
      console[level](logMessage, meta.data);
    } else {
      console[level](logMessage);
    }
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }
}

// 数据库适配器基础类
class BaseDatabaseAdapter {
  constructor(config) {
    this.config = config || {};
    this.logger = new DatabaseLogger({ prefix: `[${this.constructor.name}]` });
    this.isConnected = false;
  }

  // 连接数据库（必须在子类中实现）
  async connect() {
    throw new Error('connect 方法必须在子类中实现');
  }

  // 断开数据库连接（必须在子类中实现）
  async disconnect() {
    throw new Error('disconnect 方法必须在子类中实现');
  }

  // 保存弹幕（必须在子类中实现）
  async saveDanmaku(room, danmaku) {
    throw new Error('saveDanmaku 方法必须在子类中实现');
  }

  // 获取房间历史弹幕（必须在子类中实现）
  async getRoomHistory(room, limit = 100, offset = 0) {
    throw new Error('getRoomHistory 方法必须在子类中实现');
  }

  // 保存系统统计（必须在子类中实现）
  async saveSystemStats(stats) {
    throw new Error('saveSystemStats 方法必须在子类中实现');
  }

  // 统一的错误处理包装器
  async safeExecute(operationName, fn, fallbackValue = null) {
    try {
      this.logger.debug(`${operationName} 开始执行`);
      const result = await fn();
      this.logger.debug(`${operationName} 执行成功`);
      return result;
    } catch (error) {
      const errorMessage = `${operationName} 失败: ${error.message}`;
      this.logger.error(errorMessage, { error });
      
      // 返回fallback值或抛出错误
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      throw new Error(errorMessage);
    }
  }

  // 批量保存弹幕（通用方法）
  async batchSaveDanmaku(room, danmakus) {
    if (!Array.isArray(danmakus) || danmakus.length === 0) {
      return [];
    }

    const results = [];
    for (const danmaku of danmakus) {
      try {
        const id = await this.saveDanmaku(room, danmaku);
        results.push({ id, success: true });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    return results;
  }

  // 获取用户的弹幕历史（通用方法，子类可重写以优化性能）
  async getUserDanmakus(userId, limit = 50) {
    this.logger.warn('使用默认实现获取用户弹幕历史，效率较低，请在具体适配器中实现优化版本');
    // 注意：这个方法需要在具体适配器中实现，这里只是提供接口
    throw new Error('getUserDanmakus 方法需要在子类中实现');
  }

  // 获取房间统计信息（通用方法）
  async getRoomStats(room) {
    this.logger.warn('使用默认实现获取房间统计信息，效率较低，请在具体适配器中实现优化版本');
    // 注意：这个方法需要在具体适配器中实现，这里只是提供接口
    throw new Error('getRoomStats 方法需要在子类中实现');
  }

  // 清理过期数据（通用方法）
  async cleanupOldData(daysToKeep = 7) {
    this.logger.warn('使用默认实现清理过期数据，请在具体适配器中实现优化版本');
    // 注意：这个方法需要在具体适配器中实现，这里只是提供接口
    throw new Error('cleanupOldData 方法需要在子类中实现');
  }

  // 检查连接状态
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      adapterType: this.constructor.name,
      timestamp: new Date().toISOString()
    };
  }

  // 格式化错误信息
  formatError(error, context = {}) {
    return {
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      context,
      timestamp: new Date().toISOString()
    };
  }
}

// 数据库适配器工厂
class DatabaseAdapterFactory {
  constructor() {
    this.adapters = {}
    this.logger = new DatabaseLogger({ prefix: '[适配器工厂]' })
  }

  // 注册适配器
  register(name, adapter) {
    this.adapters[name] = adapter;
    this.logger.info(`已注册数据库适配器: ${name}`);
    return this;
  }

  // 获取适配器
  getAdapter(type, config) {
    const AdapterClass = this.adapters[type];
    if (!AdapterClass) {
      const errorMessage = `不支持的数据库类型: ${type}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    this.logger.info(`创建数据库适配器实例: ${type}`);
    return new AdapterClass(config);
  }

  // 获取已注册的适配器类型列表
  getRegisteredTypes() {
    return Object.keys(this.adapters);
  }

  // 检查是否支持指定的适配器类型
  supports(type) {
    return this.adapters[type] !== undefined;
  }
}

// MongoDB适配器
class MongoDBAdapter extends BaseDatabaseAdapter {
  constructor(config) {
    super(config);
    this.client = null;
    this.db = null;
  }

  async connect() {
    return this.safeExecute('MongoDB连接', async () => {
      const { MongoClient } = await import('mongodb');
      this.client = new MongoClient(this.config.url, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
        compressors: ['snappy'],
        retryWrites: true
      });

      await this.client.connect();
      this.db = this.client.db(this.config.dbName || 'danmaku_system');
      this.isConnected = true;
      this.logger.info('MongoDB连接成功', { database: this.config.dbName || 'danmaku_system' });
      
      // 创建必要的集合和索引
      await this._createCollectionsAndIndexes();
      
      return true;
    });
  }

  async _createCollectionsAndIndexes() {
    return this.safeExecute('创建MongoDB集合和索引', async () => {
      // 为每个房间创建默认集合（动态创建）
      const systemCollection = this.db.collection('system_stats');
      await systemCollection.createIndex({ timestamp: 1 });
      
      const messageCollection = this.db.collection('messages');
      await messageCollection.createIndex({ room: 1, timestamp: 1 });
      await messageCollection.createIndex({ userId: 1 });
      
      this.logger.info('MongoDB索引创建成功');
      return true;
    }, false);
  }

  async disconnect() {
    return this.safeExecute('MongoDB断开连接', async () => {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        this.isConnected = false;
        this.logger.info('MongoDB连接已关闭');
      }
      return true;
    }, true);
  }

  async saveDanmaku(room, danmaku) {
    return this.safeExecute(`保存弹幕到房间 ${room}`, async () => {
      if (!this.db) {
        this.logger.warn('数据库未连接，无法保存弹幕');
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
      
      // 选择集合（根据room动态选择）
      const collection = this.db.collection(`room_${room}`);
      const result = await collection.insertOne(normalizedDanmaku);
      
      this.logger.debug('弹幕保存成功', { room, userId: danmaku.userId, id: result.insertedId });
      return result.insertedId;
    }, null);
  }

  async getRoomHistory(room, limit = 100, offset = 0) {
    return this.safeExecute(`获取房间 ${room} 的历史弹幕`, async () => {
      if (!this.db) {
        this.logger.warn('数据库未连接，无法获取历史弹幕');
        return [];
      }
      
      const collection = this.db.collection(`room_${room}`);
      const query = {};
      
      const messages = await collection
        .find(query)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .toArray();
      
      this.logger.debug('获取历史弹幕成功', { room, count: messages.length, limit, offset });
      return messages.reverse(); // 按时间正序返回
    }, []);
  }

  async saveSystemStats(stats) {
    return this.safeExecute('保存系统统计', async () => {
      if (!this.db) {
        this.logger.warn('数据库未连接，无法保存系统统计');
        return null;
      }
      
      const collection = this.db.collection('system_stats');
      const normalizedStats = {
        ...stats,
        timestamp: new Date(),
        activeConnections: stats.activeConnections || 0,
        totalMessages: stats.totalMessages || 0
      };
      
      const result = await collection.insertOne(normalizedStats);
      this.logger.debug('系统统计保存成功', { id: result.insertedId });
      return result.insertedId;
    }, null);
  }

  // 实现批量保存弹幕的优化版本
  async batchSaveDanmaku(room, danmakus) {
    return this.safeExecute(`批量保存弹幕到房间 ${room}`, async () => {
      if (!this.db || !Array.isArray(danmakus) || danmakus.length === 0) {
        return [];
      }
      
      const collection = this.db.collection(`room_${room}`);
      const normalizedDanmakus = danmakus.map(danmaku => ({
        ...danmaku,
        room,
        timestamp: new Date(),
        type: danmaku.type || 'scroll',
        color: danmaku.color || '#FFFFFF'
      }));
      
      const result = await collection.insertMany(normalizedDanmakus);
      const insertedIds = Object.values(result.insertedIds);
      
      this.logger.info('批量弹幕保存成功', { room, count: insertedIds.length });
      return insertedIds.map(id => ({ id, success: true }));
    }, []);
  }

  // 实现获取用户弹幕历史的优化版本
  async getUserDanmakus(userId, limit = 50) {
    return this.safeExecute(`获取用户 ${userId} 的弹幕历史`, async () => {
      if (!this.db) {
        return [];
      }
      
      // 优化查询策略：
      // 1. 检查是否存在用户消息索引集合
      const userIndexExists = await this.db.listCollections({ name: 'user_message_index' }).hasNext();
      
      if (userIndexExists) {
        // 使用用户-消息索引集合进行高效查询
        const indexCollection = this.db.collection('user_message_index');
        const messageRefs = await indexCollection
          .find({ userId })
          .sort({ timestamp: -1 })
          .limit(limit)
          .toArray();
        
        // 并行获取实际消息
        const messages = await Promise.all(messageRefs.map(async (ref) => {
          const roomCollection = this.db.collection(`room_${ref.roomId}`);
          return roomCollection.findOne({ _id: ref.messageId });
        }));
        
        return messages.filter(Boolean).sort((a, b) => b.timestamp - a.timestamp);
      } else {
        // 回退到原有查询方式，但优化实现
        const messages = [];
        const collections = await this.db.listCollections({ name: /^room_/ }).toArray();
        
        // 并行查询所有集合
        const messageArrays = await Promise.all(collections.map(async (collInfo) => {
          const coll = this.db.collection(collInfo.name);
          // 添加索引提示，确保userId字段有索引
          return coll
            .find({ userId })
            .sort({ timestamp: -1 })
            .limit(Math.ceil(limit / collections.length)) // 每个集合限制较少的数量
            .toArray();
        }));
        
        // 合并结果
        messageArrays.forEach(arr => messages.push(...arr));
        
        // 按时间排序并限制总数
        return messages
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
      }
    }, []);
  }

  // 实现获取房间统计信息
  async getRoomStats(room) {
    return this.safeExecute(`获取房间 ${room} 的统计信息`, async () => {
      if (!this.db) {
        return null;
      }
      
      const collection = this.db.collection(`room_${room}`);
      const totalMessages = await collection.countDocuments();
      
      // 获取最近一小时的消息数
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      const recentMessages = await collection.countDocuments({ timestamp: { $gte: oneHourAgo } });
      
      // 获取活跃用户数（去重）
      const activeUsers = await collection.distinct('userId', { timestamp: { $gte: oneHourAgo } });
      
      return {
        room,
        totalMessages,
        recentMessages,
        activeUsersCount: activeUsers.length,
        lastUpdated: new Date()
      };
    }, null);
  }

  // 实现清理过期数据
  async cleanupOldData(daysToKeep = 7) {
    return this.safeExecute(`清理 ${daysToKeep} 天前的过期数据`, async () => {
      if (!this.db) {
        return false;
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      // 清理所有房间的旧数据
      const collections = await this.db.listCollections({ name: /^room_/ }).toArray();
      let totalDeleted = 0;
      
      for (const collInfo of collections) {
        const coll = this.db.collection(collInfo.name);
        const result = await coll.deleteMany({ timestamp: { $lt: cutoffDate } });
        totalDeleted += result.deletedCount;
      }
      
      this.logger.info('过期数据清理完成', { daysToKeep, totalDeleted });
      return { success: true, totalDeleted };
    }, { success: false, totalDeleted: 0 });
  }
}

// PostgreSQL适配器
class PostgreSQLAdapter extends BaseDatabaseAdapter {
  constructor(config) {
    super(config);
    this.pool = null;
  }

  async connect() {
    return this.safeExecute('PostgreSQL连接', async () => {
      const { Pool } = await import('pg');
      this.pool = new Pool({
        host: this.config.host || 'localhost',
        port: this.config.port || 5432,
        user: this.config.user || 'postgres',
        password: this.config.password,
        database: this.config.database || 'danmaku_system',
        max: 10,
        idleTimeoutMillis: 30000
      });

      // 测试连接
      await this.pool.query('SELECT NOW()');
      this.isConnected = true;
      this.logger.info('PostgreSQL连接成功', { database: this.config.database || 'danmaku_system' });
      
      // 创建必要的表
      await this._createTables();
      
      return true;
    });
  }

  async _createTables() {
    return this.safeExecute('创建PostgreSQL表', async () => {
      // 创建消息表
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          room VARCHAR(255) NOT NULL,
          userId VARCHAR(255) NOT NULL,
          nickname VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          type VARCHAR(50) NOT NULL DEFAULT 'scroll',
          color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
          timestamp TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      // 创建索引
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_room_timestamp ON messages(room, timestamp)');
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_userId ON messages(userId)');

      // 创建系统统计表
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS system_stats (
          id SERIAL PRIMARY KEY,
          activeConnections INT NOT NULL DEFAULT 0,
          totalMessages INT NOT NULL DEFAULT 0,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_stats_timestamp ON system_stats(timestamp)');
      
      this.logger.info('PostgreSQL表创建成功');
      return true;
    }, false);
  }

  async disconnect() {
    return this.safeExecute('PostgreSQL断开连接', async () => {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        this.isConnected = false;
        this.logger.info('PostgreSQL连接已关闭');
      }
      return true;
    }, true);
  }

  async saveDanmaku(room, danmaku) {
    return this.safeExecute(`保存弹幕到房间 ${room}`, async () => {
      if (!this.pool) {
        this.logger.warn('数据库连接池未初始化，无法保存弹幕');
        return null;
      }
      
      const query = `
        INSERT INTO messages (room, userId, nickname, content, type, color)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      const values = [
        room,
        danmaku.userId,
        danmaku.nickname,
        danmaku.content,
        danmaku.type || 'scroll',
        danmaku.color || '#FFFFFF'
      ];
      
      const result = await this.pool.query(query, values);
      const insertedId = result.rows[0].id;
      
      this.logger.debug('弹幕保存成功', { room, userId: danmaku.userId, id: insertedId });
      return insertedId;
    }, null);
  }

  async getRoomHistory(room, limit = 100, offset = 0) {
    return this.safeExecute(`获取房间 ${room} 的历史弹幕`, async () => {
      if (!this.pool) {
        this.logger.warn('数据库连接池未初始化，无法获取历史弹幕');
        return [];
      }
      
      const query = `
        SELECT * FROM messages
        WHERE room = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await this.pool.query(query, [room, limit, offset]);
      
      this.logger.debug('获取历史弹幕成功', { room, count: result.rows.length, limit, offset });
      return result.rows.reverse(); // 按时间正序返回
    }, []);
  }

  async saveSystemStats(stats) {
    return this.safeExecute('保存系统统计', async () => {
      if (!this.pool) {
        this.logger.warn('数据库连接池未初始化，无法保存系统统计');
        return null;
      }
      
      const query = `
        INSERT INTO system_stats (activeConnections, totalMessages)
        VALUES ($1, $2)
        RETURNING id
      `;
      const values = [
        stats.activeConnections || 0,
        stats.totalMessages || 0
      ];
      
      const result = await this.pool.query(query, values);
      const insertedId = result.rows[0].id;
      
      this.logger.debug('系统统计保存成功', { id: insertedId });
      return insertedId;
    }, null);
  }

  // 实现批量保存弹幕的优化版本
  async batchSaveDanmaku(room, danmakus) {
    return this.safeExecute(`批量保存弹幕到房间 ${room}`, async () => {
      if (!this.pool || !Array.isArray(danmakus) || danmakus.length === 0) {
        return [];
      }
      
      // 使用PostgreSQL的批量插入语法
      const values = [];
      const placeholders = [];
      
      danmakus.forEach((danmaku, index) => {
        const baseIndex = index * 6;
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`);
        
        values.push(
          room,
          danmaku.userId,
          danmaku.nickname,
          danmaku.content,
          danmaku.type || 'scroll',
          danmaku.color || '#FFFFFF'
        );
      });
      
      const query = `
        INSERT INTO messages (room, userId, nickname, content, type, color)
        VALUES ${placeholders.join(', ')}
        RETURNING id
      `;
      
      const result = await this.pool.query(query, values);
      const insertedIds = result.rows.map(row => row.id);
      
      this.logger.info('批量弹幕保存成功', { room, count: insertedIds.length });
      return insertedIds.map(id => ({ id, success: true }));
    }, []);
  }

  // 实现获取用户弹幕历史的优化版本
  async getUserDanmakus(userId, limit = 50) {
    return this.safeExecute(`获取用户 ${userId} 的弹幕历史`, async () => {
      if (!this.pool) {
        return [];
      }
      
      const query = `
        SELECT * FROM messages
        WHERE userId = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `;
      
      const result = await this.pool.query(query, [userId, limit]);
      return result.rows;
    }, []);
  }

  // 实现获取房间统计信息
  async getRoomStats(room) {
    return this.safeExecute(`获取房间 ${room} 的统计信息`, async () => {
      if (!this.pool) {
        return null;
      }
      
      // 获取总消息数
      const totalResult = await this.pool.query(
        'SELECT COUNT(*) FROM messages WHERE room = $1',
        [room]
      );
      const totalMessages = parseInt(totalResult.rows[0].count, 10);
      
      // 获取最近一小时的消息数
      const recentResult = await this.pool.query(
        'SELECT COUNT(*) FROM messages WHERE room = $1 AND timestamp >= NOW() - INTERVAL \'1 hour\'',
        [room]
      );
      const recentMessages = parseInt(recentResult.rows[0].count, 10);
      
      // 获取活跃用户数
      const usersResult = await this.pool.query(
        'SELECT COUNT(DISTINCT userId) FROM messages WHERE room = $1 AND timestamp >= NOW() - INTERVAL \'1 hour\'',
        [room]
      );
      const activeUsersCount = parseInt(usersResult.rows[0].count, 10);
      
      return {
        room,
        totalMessages,
        recentMessages,
        activeUsersCount,
        lastUpdated: new Date()
      };
    }, null);
  }

  // 实现清理过期数据
  async cleanupOldData(daysToKeep = 7) {
    return this.safeExecute(`清理 ${daysToKeep} 天前的过期数据`, async () => {
      if (!this.pool) {
        return { success: false, totalDeleted: 0 };
      }
      
      const query = `
        DELETE FROM messages
        WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
        RETURNING id
      `;
      
      const result = await this.pool.query(query);
      const totalDeleted = result.rowCount;
      
      this.logger.info('过期数据清理完成', { daysToKeep, totalDeleted });
      return { success: true, totalDeleted };
    }, { success: false, totalDeleted: 0 });
  }
}

// MySQL适配器
class MySQLAdapter extends BaseDatabaseAdapter {
  constructor(config) {
    super(config);
    this.pool = null;
  }

  async connect() {
    return this.safeExecute('MySQL连接', async () => {
      const mysql = await import('mysql2/promise');
      this.pool = mysql.createPool({
        host: this.config.host || 'localhost',
        port: this.config.port || 3306,
        user: this.config.user || 'root',
        password: this.config.password,
        database: this.config.database || 'danmaku_system',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // 测试连接
      const [rows] = await this.pool.query('SELECT NOW()');
      this.isConnected = true;
      this.logger.info('MySQL连接成功', { database: this.config.database || 'danmaku_system' });
      
      // 创建必要的表
      await this._createTables();
      
      return true;
    });
  }

  async _createTables() {
    return this.safeExecute('创建MySQL表', async () => {
      // 创建消息表
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          room VARCHAR(255) NOT NULL,
          userId VARCHAR(255) NOT NULL,
          nickname VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          type VARCHAR(50) NOT NULL DEFAULT 'scroll',
          color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
          timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建索引
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_room_timestamp ON messages(room, timestamp)');
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_userId ON messages(userId)');

      // 创建系统统计表
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS system_stats (
          id INT AUTO_INCREMENT PRIMARY KEY,
          activeConnections INT NOT NULL DEFAULT 0,
          totalMessages INT NOT NULL DEFAULT 0,
          timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_stats_timestamp ON system_stats(timestamp)');
      
      this.logger.info('MySQL表创建成功');
      return true;
    }, false);
  }

  async disconnect() {
    return this.safeExecute('MySQL断开连接', async () => {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        this.isConnected = false;
        this.logger.info('MySQL连接已关闭');
      }
      return true;
    }, true);
  }

  async saveDanmaku(room, danmaku) {
    return this.safeExecute(`保存弹幕到房间 ${room}`, async () => {
      if (!this.pool) {
        this.logger.warn('数据库连接池未初始化，无法保存弹幕');
        return null;
      }
      
      const query = `
        INSERT INTO messages (room, userId, nickname, content, type, color)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const values = [
        room,
        danmaku.userId,
        danmaku.nickname,
        danmaku.content,
        danmaku.type || 'scroll',
        danmaku.color || '#FFFFFF'
      ];
      
      const [result] = await this.pool.query(query, values);
      
      this.logger.debug('弹幕保存成功', { room, userId: danmaku.userId, id: result.insertId });
      return result.insertId;
    }, null);
  }

  async getRoomHistory(room, limit = 100, offset = 0) {
    return this.safeExecute(`获取房间 ${room} 的历史弹幕`, async () => {
      if (!this.pool) {
        this.logger.warn('数据库连接池未初始化，无法获取历史弹幕');
        return [];
      }
      
      const query = `
        SELECT * FROM messages
        WHERE room = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await this.pool.query(query, [room, limit, offset]);
      
      this.logger.debug('获取历史弹幕成功', { room, count: rows.length, limit, offset });
      return rows.reverse(); // 按时间正序返回
    }, []);
  }

  async saveSystemStats(stats) {
    return this.safeExecute('保存系统统计', async () => {
      if (!this.pool) {
        this.logger.warn('数据库连接池未初始化，无法保存系统统计');
        return null;
      }
      
      const query = `
        INSERT INTO system_stats (activeConnections, totalMessages)
        VALUES (?, ?)
      `;
      const values = [
        stats.activeConnections || 0,
        stats.totalMessages || 0
      ];
      
      const [result] = await this.pool.query(query, values);
      
      this.logger.debug('系统统计保存成功', { id: result.insertId });
      return result.insertId;
    }, null);
  }

  // 实现批量保存弹幕的优化版本
  async batchSaveDanmaku(room, danmakus) {
    return this.safeExecute(`批量保存弹幕到房间 ${room}`, async () => {
      if (!this.pool || !Array.isArray(danmakus) || danmakus.length === 0) {
        return [];
      }
      
      // 准备批量插入数据
      const values = [];
      const placeholders = [];
      
      danmakus.forEach((danmaku, index) => {
        placeholders.push('(?, ?, ?, ?, ?, ?)');
        values.push(
          room,
          danmaku.userId,
          danmaku.nickname,
          danmaku.content,
          danmaku.type || 'scroll',
          danmaku.color || '#FFFFFF'
        );
      });
      
      const query = `
        INSERT INTO messages (room, userId, nickname, content, type, color)
        VALUES ${placeholders.join(', ')}
      `;
      
      const [result] = await this.pool.query(query, values);
      const insertedId = result.insertId;
      const insertedIds = [];
      
      // 生成插入的ID列表
      for (let i = 0; i < danmakus.length; i++) {
        insertedIds.push(insertedId + i);
      }
      
      this.logger.info('批量弹幕保存成功', { room, count: insertedIds.length });
      return insertedIds.map(id => ({ id, success: true }));
    }, []);
  }

  // 实现获取用户弹幕历史的优化版本
  async getUserDanmakus(userId, limit = 50) {
    return this.safeExecute(`获取用户 ${userId} 的弹幕历史`, async () => {
      if (!this.pool) {
        return [];
      }
      
      const query = `
        SELECT * FROM messages
        WHERE userId = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `;
      
      const [rows] = await this.pool.query(query, [userId, limit]);
      return rows;
    }, []);
  }

  // 实现获取房间统计信息
  async getRoomStats(room) {
    return this.safeExecute(`获取房间 ${room} 的统计信息`, async () => {
      if (!this.pool) {
        return null;
      }
      
      // 获取总消息数
      const [totalResult] = await this.pool.query(
        'SELECT COUNT(*) as count FROM messages WHERE room = ?',
        [room]
      );
      const totalMessages = totalResult[0].count || 0;
      
      // 获取最近一小时的消息数
      const [recentResult] = await this.pool.query(
        'SELECT COUNT(*) as count FROM messages WHERE room = ? AND timestamp >= NOW() - INTERVAL 1 HOUR',
        [room]
      );
      const recentMessages = recentResult[0].count || 0;
      
      // 获取活跃用户数
      const [usersResult] = await this.pool.query(
        'SELECT COUNT(DISTINCT userId) as count FROM messages WHERE room = ? AND timestamp >= NOW() - INTERVAL 1 HOUR',
        [room]
      );
      const activeUsersCount = usersResult[0].count || 0;
      
      return {
        room,
        totalMessages,
        recentMessages,
        activeUsersCount,
        lastUpdated: new Date()
      };
    }, null);
  }

  // 实现清理过期数据
  async cleanupOldData(daysToKeep = 7) {
    return this.safeExecute(`清理 ${daysToKeep} 天前的过期数据`, async () => {
      if (!this.pool) {
        return { success: false, totalDeleted: 0 };
      }
      
      const query = `
        DELETE FROM messages
        WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)
      `;
      
      const [result] = await this.pool.query(query, [daysToKeep]);
      const totalDeleted = result.affectedRows || 0;
      
      this.logger.info('过期数据清理完成', { daysToKeep, totalDeleted });
      return { success: true, totalDeleted };
    }, { success: false, totalDeleted: 0 });
  }
}

// 创建工厂实例并注册适配器
const factory = new DatabaseAdapterFactory()
  .register('mongodb', MongoDBAdapter)
  .register('postgresql', PostgreSQLAdapter)
  .register('mysql', MySQLAdapter)

export default factory