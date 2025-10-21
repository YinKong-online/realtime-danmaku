// 数据库适配器独立使用示例
// 此文件演示如何在应用外部独立使用数据库适配器，无需完整的系统环境
// 包含详细的使用场景、错误处理、性能优化和最佳实践

const { DatabaseAdapterFactory } = require('./adapters');

// 自定义日志记录器（可选）
const customLogger = {
  info: (msg, data = {}) => console.log(`[INFO] ${msg}`, Object.keys(data).length ? data : ''),
  warn: (msg, data = {}) => console.warn(`[WARN] ${msg}`, Object.keys(data).length ? data : ''),
  error: (msg, data = {}) => console.error(`[ERROR] ${msg}`, Object.keys(data).length ? data : ''),
  debug: (msg, data = {}) => console.debug(`[DEBUG] ${msg}`, Object.keys(data).length ? data : '')
};

/**
 * 高级重试装饰器 - 用于自动重试失败的操作
 * @param {Function} operation - 要执行的操作函数
 * @param {Object} options - 重试选项
 * @param {number} options.maxRetries - 最大重试次数
 * @param {number} options.initialDelay - 初始延迟时间(ms)
 * @param {Function} options.shouldRetry - 判断是否应该重试的函数
 * @returns {Promise<any>} - 操作结果
 */
async function withRetry(operation, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    shouldRetry = (error) => true // 默认对所有错误都重试
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      customLogger.debug(`重试尝试 ${attempt}/${maxRetries}`);
      return await operation();
    } catch (error) {
      lastError = error;
      
      // 检查是否应该重试
      if (!shouldRetry(error) || attempt >= maxRetries) {
        customLogger.error(`操作失败，不再重试: ${error.message}`);
        throw error;
      }
      
      // 计算指数退避延迟
      const delay = initialDelay * Math.pow(2, attempt - 1);
      customLogger.warn(`操作失败(${attempt}/${maxRetries})，${delay}ms后重试: ${error.message}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError; // 所有重试都失败
}

/**
 * 数据库适配器综合使用示例 - 主函数
 * 
 * 此函数展示了如何在实际应用中完整地使用数据库适配器，包括：
 * - 根据配置选择适当的数据库适配器
 * - 初始化和连接管理
 * - 执行各种数据操作（基础、批量、高级）
 * - 实现完善的错误处理和资源清理
 * - 支持不同数据库类型的统一接口操作
 */
async function databaseAdapterExample() {
  customLogger.info('\n=== 数据库适配器综合使用示例 ===');
  
  // 示例全局配置 - 实际应用中应从配置文件或环境变量加载
  const appConfig = {
    // 数据库配置选项
    database: {
      type: process.env.DB_TYPE || 'mongodb', // mongodb, mysql, postgresql
      // 每个数据库类型的特定配置
      mongodb: {
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017/danmaku-system',
        options: {
          connectTimeoutMS: 5000,
          maxPoolSize: 10,
          minPoolSize: 2,
          maxIdleTimeMS: 30000,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          // 启用自动重连
          autoReconnect: true,
          reconnectTries: 3,
          reconnectInterval: 1000
        },
        // 自定义日志配置
        log: {
          level: 'info',
          enabled: true,
          showStack: false
        },
        // 错误重试配置
        retry: {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 5000,
          factor: 2 // 指数退避因子
        }
      },
      mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'password',
        database: process.env.MYSQL_DB || 'danmaku_system',
        // 连接池高级配置
        connectionLimit: 10,
        queueLimit: 0, // 无限队列
        waitForConnections: true,
        connectTimeout: 10000,
        acquireTimeout: 10000,
        timeout: 30000,
        // 启用连接保活
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
      },
      postgresql: {
        host: process.env.POSTGRES_HOST || 'localhost',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password',
        database: process.env.POSTGRES_DB || 'danmaku_system',
        port: process.env.POSTGRES_PORT || 5432,
        // 连接池配置
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        // SSL配置
        ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
      }
    },
    // 业务相关配置
    app: {
      defaultRoom: '测试房间',
      maxDanmakuLength: 200,
      danmakuRetentionDays: 1,
      statsRetentionDays: 7
    }
  };
  
  // 支持的数据库类型列表
  const supportedDbTypes = ['mongodb', 'mysql', 'postgresql'];
  
  // 当前选择的数据库类型
  const dbType = appConfig.database.type;
  
  // 适配器实例和连接状态
  let adapter = null;
  let isConnected = false;
  
  // 性能监控变量
  const startTime = Date.now();
  const operationStats = {
    operations: 0,
    successful: 0,
    failed: 0,
    totalTime: 0
  };
  
  // 记录操作结果的辅助函数
  function recordOperationResult(success, timeTaken) {
    operationStats.operations++;
    operationStats[success ? 'successful' : 'failed']++;
    operationStats.totalTime += timeTaken;
  }
  
  try {
    // 1. 数据库类型验证
    customLogger.info(`正在初始化数据库适配器 (类型: ${dbType})...`);
    
    if (!supportedDbTypes.includes(dbType)) {
      throw new Error(`不支持的数据库类型: ${dbType}。支持的类型: ${supportedDbTypes.join(', ')}`);
    }
    
    // 2. 配置验证和完整性检查
    const config = appConfig.database[dbType];
    if (!config) {
      throw new Error(`未找到数据库类型 ${dbType} 的配置`);
    }
    
    // 3. 初始化数据库适配器
    customLogger.info(`使用配置: 主机=${config.host || 'localhost'}, 数据库=${config.database || config.uri?.split('/').pop() || 'N/A'}`);
    
    // 使用带重试的初始化函数
    adapter = await initDatabaseAdapter(dbType, config);
    isConnected = true;
    
    // 4. 执行示例操作
    customLogger.info('\n=== 执行基础数据操作 ===');
    const basicOpTime = await timingWrapper(async () => {
      await performBasicOperations(adapter, appConfig.app.defaultRoom);
    });
    recordOperationResult(true, basicOpTime);
    
    // 5. 执行批量操作示例
    customLogger.info('\n=== 执行批量数据操作 ===');
    const batchOpTime = await timingWrapper(async () => {
      await performBatchOperations(adapter, appConfig.app.defaultRoom);
    });
    recordOperationResult(true, batchOpTime);
    
    // 6. 执行统计和清理操作示例
    customLogger.info('\n=== 执行统计和数据清理操作 ===');
    const statsOpTime = await timingWrapper(async () => {
      await performStatsAndCleanupOperations(adapter, appConfig.app.defaultRoom);
    });
    recordOperationResult(true, statsOpTime);
    
    // 7. 执行高级错误处理示例
    customLogger.info('\n=== 执行高级错误处理示例 ===');
    const errorOpTime = await timingWrapper(async () => {
      await errorHandlingWithRetry(adapter, appConfig.app.defaultRoom);
    });
    recordOperationResult(true, errorOpTime);
    
    // 8. 执行独立数据库使用示例
    customLogger.info('\n=== 执行独立数据库适配器使用示例 ===');
    const standaloneOpTime = await timingWrapper(async () => {
      await useOnlyMySQLAdapter();
    });
    recordOperationResult(true, standaloneOpTime);
    
    // 9. 执行全面错误处理和恢复策略示例
    customLogger.info('\n=== 执行全面错误处理策略示例 ===');
    const errorStrategyOpTime = await timingWrapper(async () => {
      await errorHandlingExample();
    });
    recordOperationResult(true, errorStrategyOpTime);
    
    // 10. 适配器类型检查和特性检测示例
    customLogger.info('\n=== 执行适配器特性检测示例 ===');
    const featureDetectionTime = await timingWrapper(async () => {
      // 检测适配器支持的特性
      const features = detectAdapterFeatures(adapter);
      customLogger.info('适配器支持的特性:', features);
      
      // 根据特性选择性地执行操作
      if (features.transactions) {
        customLogger.info('适配器支持事务操作');
      }
      
      if (features.rawQueries) {
        customLogger.info('适配器支持原生查询操作');
      }
      
      if (features.bulkOperations) {
        customLogger.info('适配器支持批量操作');
      }
      
      // 获取适配器元数据
      const metadata = adapter.getMetadata ? adapter.getMetadata() : {};
      customLogger.info('适配器元数据:', metadata);
    });
    recordOperationResult(true, featureDetectionTime);
    
  } catch (error) {
    // 全局错误处理
    customLogger.error('数据库适配器示例执行出错:', error.message);
    customLogger.debug('错误详情:', error.stack);
    
    // 记录失败操作
    recordOperationResult(false, 0);
    
    // 错误分类处理
    if (error.code === 'ECONNREFUSED' || error.code === 'MongoNetworkError' || error.code === 'ENOTFOUND') {
      customLogger.error('连接错误: 数据库服务未启动或不可访问');
      customLogger.info('请检查: 1. 数据库服务是否运行 2. 连接字符串是否正确 3. 防火墙是否阻止连接');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'AuthenticationFailed') {
      customLogger.error('认证错误: 用户名或密码不正确');
      customLogger.info('请检查数据库凭证配置');
    } else if (error.code === 'ER_BAD_DB_ERROR' || error.code === 'MongoError') {
      customLogger.error('数据库错误: 数据库不存在或访问受限');
      customLogger.info('请检查数据库名称是否正确且有权限访问');
    } else {
      customLogger.error('未知错误类型:', error.code || 'N/A');
    }
    
    // 紧急回退策略
    customLogger.info('执行紧急回退策略: 切换到内存存储模式或备用数据库');
    
  } finally {
    // 确保清理所有资源
    customLogger.info('\n=== 清理资源 ===');
    
    // 断开适配器连接
    if (adapter && isConnected) {
      try {
        await adapter.disconnect();
        isConnected = false;
        customLogger.info('适配器已成功断开连接');
      } catch (disconnectError) {
        customLogger.error('断开连接失败:', disconnectError.message);
      }
    }
    
    // 输出操作统计信息
    const totalTime = Date.now() - startTime;
    customLogger.info('\n=== 操作统计信息 ===');
    customLogger.info(`总操作数: ${operationStats.operations}`);
    customLogger.info(`成功操作: ${operationStats.successful}`);
    customLogger.info(`失败操作: ${operationStats.failed}`);
    customLogger.info(`平均操作时间: ${operationStats.operations ? (operationStats.totalTime / operationStats.operations).toFixed(2) : 0}ms`);
    customLogger.info(`总执行时间: ${totalTime}ms`);
    
    customLogger.info('\n数据库适配器示例执行完成');
  }
}

/**
 * 测量异步操作执行时间的辅助函数
 * @param {Function} operation - 要执行的异步操作
 * @returns {Promise<number>} - 操作执行的毫秒数
 */
async function timingWrapper(operation) {
  const start = Date.now();
  await operation();
  return Date.now() - start;
}

/**
 * 检测适配器支持的特性
 * @param {BaseDatabaseAdapter} adapter - 数据库适配器实例
 * @returns {Object} - 特性支持情况
 */
function detectAdapterFeatures(adapter) {
  return {
    transactions: typeof adapter.beginTransaction === 'function' && 
                  typeof adapter.commitTransaction === 'function' && 
                  typeof adapter.rollbackTransaction === 'function',
    rawQueries: typeof adapter.executeRawQuery === 'function',
    bulkOperations: typeof adapter.batchSaveDanmaku === 'function',
    pagination: typeof adapter.getDanmakusByPage === 'function',
    indexing: typeof adapter.createIndex === 'function',
    monitoring: typeof adapter.getStats === 'function',
    metadata: typeof adapter.getMetadata === 'function'
  };
}

/**
 * 初始化数据库适配器（带重试逻辑）
 * @param {string} type - 数据库类型: 'mysql', 'mongodb', 'postgres'
 * @param {Object} config - 数据库配置
 * @returns {Promise<Object>} - 数据库适配器实例
 */
async function initDatabaseAdapter(type, config) {
  customLogger.info(`初始化 ${type} 数据库适配器...`);
  
  // 使用工厂创建适配器
  const adapter = DatabaseAdapterFactory.create(type, config);
  
  // 使用重试机制连接数据库
  try {
    const connected = await withRetry(
      () => adapter.connect(),
      {
        maxRetries: 3,
        initialDelay: 2000,
        shouldRetry: (error) => {
          // 只对连接相关错误进行重试
          return error.message.includes('connect') || 
                 error.message.includes('Connection') ||
                 error.message.includes('timeout');
        }
      }
    );
    
    if (connected) {
      customLogger.info(`${type} 数据库连接成功`);
      return adapter;
    } else {
      throw new Error(`${type} 数据库连接失败: 返回false`);
    }
  } catch (error) {
    customLogger.error(`${type} 数据库连接失败: ${error.message}`);
    throw error;
  }
}

/**
 * 执行基本数据库操作（演示参数验证和错误处理）
 * @param {Object} adapter - 数据库适配器实例
 * @param {string} room - 房间ID
 */
async function performBasicOperations(adapter, room) {
  customLogger.info(`\n在房间 ${room} 执行基本操作:`);

  // 参数验证
  if (!room || typeof room !== 'string') {
    throw new Error('房间ID必须是非空字符串');
  }

  try {
    // 1. 保存单条弹幕（带完整参数）
    customLogger.info('1. 保存单条弹幕（带完整参数）');
    
    // 准备弹幕数据
    const danmakuData = {
      userId: 'user123',               // 必填：用户唯一标识
      nickname: '测试用户',             // 必填：用户昵称
      content: '这是一条测试弹幕，演示完整参数', // 必填：弹幕内容
      type: 'scroll',                  // 可选：弹幕类型 (scroll/top/bottom)
      color: '#FF0000',                // 可选：弹幕颜色（十六进制）
      fontSize: 18                     // 可选：字体大小
    };
    
    // 验证弹幕数据
    if (!validateDanmakuData(danmakuData)) {
      throw new Error('弹幕数据验证失败');
    }
    
    const danmakuId = await adapter.saveDanmaku(room, danmakuData);
    
    if (danmakuId) {
      customLogger.info(`弹幕保存成功，ID: ${danmakuId}`);
    } else {
      customLogger.warn('弹幕保存返回null，可能失败');
    }

    // 2. 保存系统统计信息（带完整字段）
    customLogger.info('\n2. 保存系统统计信息');
    const statsData = {
      onlineUsers: 1500,              // 在线用户数
      activeRooms: 67,                // 活跃房间数
      danmakuPerSecond: 12.3,         // 每秒弹幕数
      totalDanmakus: 100000,          // 总弹幕数
      serverLoad: 0.56                // 服务器负载
    };
    
    const statsId = await adapter.saveSystemStats(statsData);
    customLogger.info(`系统统计保存成功，ID: ${statsId}`);

    // 3. 获取房间历史弹幕（带分页参数）
    customLogger.info('\n3. 获取房间历史弹幕（带分页）');
    const limit = 10;
    const offset = 0;
    const history = await adapter.getRoomHistory(room, limit, offset);
    
    customLogger.info(`获取到 ${history.length} 条历史弹幕 (第1页，每页${limit}条)`);
    
    if (history.length > 0) {
      // 显示部分弹幕内容
      history.slice(0, 3).forEach((dm, index) => {
        customLogger.info(`  弹幕${index + 1}: ${dm.nickname} - ${dm.content.substring(0, 20)}${dm.content.length > 20 ? '...' : ''}`);
      });
    }

    // 4. 获取用户弹幕历史
    customLogger.info('\n4. 获取用户弹幕历史');
    const userDanmakus = await adapter.getUserDanmakus('user123', 5);
    customLogger.info(`用户 user123 发送了 ${userDanmakus.length} 条弹幕`);
    
    // 5. 获取房间统计信息
    customLogger.info('\n5. 获取房间统计信息');
    const roomStats = await adapter.getRoomStats(room);
    if (roomStats) {
      customLogger.info('房间统计摘要:', {
        totalDanmakus: roomStats.totalDanmakus || roomStats.totalMessages,
        uniqueUsers: roomStats.uniqueUsers || roomStats.activeUsersCount
      });
    }
    
  } catch (error) {
    customLogger.error(`基本操作执行失败: ${error.message}`);
    // 这里可以根据错误类型进行不同处理
    throw error;
  }
}

/**
 * 验证弹幕数据的合法性
 * @param {Object} danmaku - 弹幕数据对象
 * @returns {boolean} - 验证是否通过
 */
function validateDanmakuData(danmaku) {
  // 检查必填字段
  if (!danmaku || !danmaku.userId || !danmaku.nickname || !danmaku.content) {
    customLogger.warn('弹幕数据缺少必填字段');
    return false;
  }
  
  // 验证内容长度（防止过长弹幕）
  if (danmaku.content.length > 200) {
    customLogger.warn('弹幕内容超过最大长度限制');
    return false;
  }
  
  // 验证弹幕类型
  const validTypes = ['scroll', 'top', 'bottom'];
  if (danmaku.type && !validTypes.includes(danmaku.type)) {
    customLogger.warn('无效的弹幕类型');
    return false;
  }
  
  // 验证颜色格式
  if (danmaku.color && !/^#[0-9A-F]{6}$/i.test(danmaku.color)) {
    customLogger.warn('无效的颜色格式');
    return false;
  }
  
  // 验证字体大小范围
  if (danmaku.fontSize && (danmaku.fontSize < 12 || danmaku.fontSize > 36)) {
    customLogger.warn('字体大小超出有效范围');
    return false;
  }
  
  return true;
}

/**
 * 高级错误处理和重试策略示例
 * @param {Object} adapter - 数据库适配器实例
 * @param {string} room - 房间ID
 */
async function errorHandlingWithRetry(adapter, room) {
  customLogger.info(`在房间 ${room} 演示高级错误处理和重试策略`);
  
  try {
    // 1. 使用重试机制进行关键操作
    customLogger.info('\n1. 使用指数退避重试机制保存弹幕');
    
    const danmakuId = await withRetry(
      () => adapter.saveDanmaku(room, {
        userId: 'retry-user',
        nickname: '重试用户',
        content: '这条弹幕使用了重试机制',
        type: 'top',
        color: '#00FF00'
      }),
      {
        maxRetries: 3,
        initialDelay: 1000,
        // 自定义重试条件 - 只对特定错误重试
        shouldRetry: (error) => {
          // 例如：只对连接错误重试，对验证错误不重试
          const retryableErrors = ['connection', 'timeout', 'deadlock'];
          return retryableErrors.some(err => 
            error.message.toLowerCase().includes(err)
          );
        }
      }
    );
    
    customLogger.info(`弹幕保存成功，ID: ${danmakuId}`);
    
    // 2. 模拟数据库临时故障
    customLogger.info('\n2. 演示断路器模式（模拟临时故障）');
    
    let circuitState = 'closed'; // closed, open, half-open
    let failureCount = 0;
    const maxFailures = 2;
    const resetTimeout = 3000;
    
    async function withCircuitBreaker(operation) {
      if (circuitState === 'open') {
        customLogger.warn('断路器打开，拒绝操作');
        return null; // 快速失败
      }
      
      try {
        const result = await operation();
        // 操作成功，重置状态
        failureCount = 0;
        circuitState = 'closed';
        return result;
      } catch (error) {
        failureCount++;
        
        if (failureCount >= maxFailures) {
          customLogger.warn('达到最大失败次数，断路器打开');
          circuitState = 'open';
          
          // 一段时间后尝试半开状态
          setTimeout(() => {
            customLogger.info('断路器进入半开状态');
            circuitState = 'half-open';
          }, resetTimeout);
        }
        
        throw error;
      }
    }
    
    // 模拟使用断路器
    const result = await withCircuitBreaker(() => 
      adapter.getRoomHistory(room, 5)
    );
    
    if (result !== null) {
      customLogger.info(`断路器测试成功，获取到 ${result.length} 条弹幕`);
    }
    
    // 3. 降级策略示例
    customLogger.info('\n3. 演示降级策略');
    
    async function withFallback(operation, fallback) {
      try {
        return await operation();
      } catch (error) {
        customLogger.warn(`主要操作失败，使用降级策略: ${error.message}`);
        return await fallback();
      }
    }
    
    // 使用降级策略获取房间历史
    const history = await withFallback(
      () => adapter.getRoomHistory(room, 100), // 尝试获取100条
      () => adapter.getRoomHistory(room, 10)   // 降级为只获取10条
    );
    
    customLogger.info(`通过降级策略获取到 ${history.length} 条弹幕`);
    
  } catch (error) {
    customLogger.error(`错误处理示例执行失败: ${error.message}`);
  }
}

/**
 * 执行批量数据库操作（高性能批量处理）
 * @param {Object} adapter - 数据库适配器实例
 * @param {string} room - 房间ID
 */
async function performBatchOperations(adapter, room) {
  customLogger.info(`\n在房间 ${room} 执行批量操作 (高性能批量处理):`);

  try {
    // 1. 生成测试数据 - 模拟高流量场景
    customLogger.info('1. 生成批量测试数据');
    const batchDanmakus = [];
    const userCount = 5;
    const danmakuPerUser = 3;
    
    for (let u = 1; u <= userCount; u++) {
      const userId = `user_${u}`;
      const nickname = `用户${u}`;
      
      for (let d = 1; d <= danmakuPerUser; d++) {
        batchDanmakus.push({
          userId,
          nickname,
          content: `用户${u}的第${d}条批量弹幕 - ${Date.now()}`,
          type: d % 3 === 0 ? 'top' : d % 3 === 1 ? 'bottom' : 'scroll',
          color: ['#FF0000', '#00FF00', '#0000FF'][Math.floor(Math.random() * 3)]
        });
      }
    }
    
    customLogger.info(`准备了 ${batchDanmakus.length} 条弹幕用于批量插入`);
    
    // 2. 批量保存弹幕（带性能计时）
    customLogger.info('2. 批量保存弹幕（带性能计时）');
    const startTime = Date.now();
    
    // 使用批量插入
    const batchResults = await adapter.batchSaveDanmaku(room, batchDanmakus);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 分析结果
    if (Array.isArray(batchResults)) {
      const successCount = batchResults.filter(r => r?.success !== false && r?.id).length;
      const failCount = batchResults.length - successCount;
      
      customLogger.info(`批量插入完成：成功${successCount}条，失败${failCount}条`);
      customLogger.info(`性能统计：处理${batchDanmakus.length}条耗时${duration}ms (${(batchDanmakus.length * 1000 / duration).toFixed(2)} 条/秒)`);
    } else {
      customLogger.info(`批量插入完成：${duration}ms，返回结果：`, batchResults);
    }

    // 3. 高级分页查询（支持排序和过滤）
    customLogger.info('\n3. 高级分页查询（支持排序和过滤）');
    
    // 计算总页数
    const pageSize = 5;
    const totalCount = batchDanmakus.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    customLogger.info(`总数据量: ${totalCount} 条，每页 ${pageSize} 条，共 ${totalPages} 页`);
    
    // 分页遍历示例
    for (let page = 1; page <= Math.min(totalPages, 2); page++) { // 只演示前2页
      const offset = (page - 1) * pageSize;
      
      customLogger.info(`\n获取第 ${page} 页数据`);
      const paginatedResults = await adapter.getRoomHistory(room, pageSize, offset);
      
      customLogger.info(`第 ${page} 页获取到 ${paginatedResults.length} 条弹幕`);
      
      // 显示部分字段以节省输出
      paginatedResults.forEach((dm, index) => {
        customLogger.info(`  ${index + 1}. ${dm.nickname}: ${dm.content.substring(0, 30)}...`);
      });
    }
    
    // 4. 批量删除演示（可选功能）
    if (typeof adapter.batchDeleteDanmakus === 'function') {
      customLogger.info('\n4. 批量删除演示');
      
      // 准备要删除的ID列表
      const idsToDelete = [];
      if (Array.isArray(batchResults)) {
        idsToDelete.push(...batchResults.filter(r => r?.id).slice(0, 3)); // 只删除前3条
      }
      
      if (idsToDelete.length > 0) {
        const deleteResult = await adapter.batchDeleteDanmakus(room, idsToDelete);
        customLogger.info(`批量删除结果: 影响 ${deleteResult} 条记录`);
      }
    }
    
  } catch (error) {
    customLogger.error(`批量操作执行失败: ${error.message}`);
  }
}

/**
 * 执行统计和清理操作（高级数据管理）
 * @param {Object} adapter - 数据库适配器实例
 * @param {string} room - 房间ID
 */
async function performStatsAndCleanupOperations(adapter, room) {
  customLogger.info(`\n在房间 ${room} 执行统计和清理操作（高级数据管理）:`);

  try {
    // 1. 定期统计信息收集
    customLogger.info('1. 收集详细房间统计信息');
    
    const roomStats = await adapter.getRoomStats(room);
    
    if (roomStats) {
      // 格式化统计信息输出
      const statsOutput = {
        totalMessages: roomStats.totalDanmakus || roomStats.totalMessages || 0,
        uniqueUsers: roomStats.uniqueUsers || roomStats.activeUsersCount || 0,
        messageRate: roomStats.messageRate || roomStats.messagesPerSecond || 0,
        lastMessageTime: roomStats.lastMessageTime ? new Date(roomStats.lastMessageTime).toLocaleString() : 'N/A'
      };
      
      customLogger.info('房间详细统计信息:', JSON.stringify(statsOutput, null, 2));
      
      // 可以将统计信息推送到监控系统
      customLogger.info('统计信息已记录，可用于实时监控');
    }

    // 2. 智能数据清理策略
    customLogger.info('\n2. 执行智能数据清理策略');
    
    // 演示不同时间的清理策略
    const cleanupStrategies = [
      { entity: 'danmakus', hours: 24, maxItems: 1000 }, // 保留24小时，最多1000条
      { entity: 'stats', hours: 7 * 24, maxItems: 10000 }  // 保留7天
    ];
    
    for (const strategy of cleanupStrategies) {
      try {
        customLogger.info(`执行清理: ${strategy.entity} - 保留${strategy.hours}小时内数据，最多${strategy.maxItems}条`);
        
        const deletedCount = await adapter.cleanupOldData(strategy.entity, strategy.hours, strategy.maxItems);
        customLogger.info(`  清理完成: 删除了 ${deletedCount} 条 ${strategy.entity} 数据`);
        
      } catch (err) {
        customLogger.error(`清理${strategy.entity}失败: ${err.message}`);
        // 继续执行其他清理策略
        continue;
      }
    }
    
    // 3. 数据导出/备份示例（模拟）
    customLogger.info('\n3. 数据导出/备份示例');
    
    // 模拟导出最近的弹幕数据
    const recentDanmakus = await adapter.getRoomHistory(room, 50);
    
    // 这里可以添加导出到文件或备份系统的逻辑
    customLogger.info(`导出了 ${recentDanmakus.length} 条最近的弹幕数据用于备份`);
    
    // 4. 数据优化操作（索引重建等，模拟）
    if (typeof adapter.optimizeData === 'function') {
      customLogger.info('\n4. 执行数据优化操作');
      
      const optimizeResult = await adapter.optimizeData();
      customLogger.info('数据优化完成:', optimizeResult);
    }
    
  } catch (error) {
    customLogger.error(`统计和清理操作执行失败: ${error.message}`);
  }
}

/**
 * 数据库适配器独立使用示例 - MySQL专用高级功能
 */
async function useOnlyMySQLAdapter() {
  customLogger.info('\n=== MySQL适配器独立使用示例 (高级配置和事务支持) ===');
  
  // 高级MySQL配置，包含连接池优化和性能参数
  const mysqlConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'danmaku_system',
    // 连接池高级配置
    connectionLimit: 50,        // 连接池大小
    queueLimit: 0,              // 队列大小(0表示无限)
    waitForConnections: true,   // 连接池满时是否等待
    connectTimeout: 10000,      // 连接超时时间(ms)
    acquireTimeout: 10000,      // 获取连接超时时间(ms)
    // 查询优化
    queryTimeout: 5000,         // 查询超时时间(ms)
    supportBigNumbers: true,    // 支持大数值
    enableKeepAlive: true,      // 启用连接保活
    keepAliveInitialDelay: 10000, // 保活初始延迟(ms)
    // 安全配置
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  };
  
  // 直接使用工厂创建MySQL适配器
  const adapter = DatabaseAdapterFactory.create('mysql', mysqlConfig);
  
  try {
    // 使用带超时的连接
    customLogger.info('正在连接MySQL数据库...');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('MySQL连接超时')), 15000)
    );
    
    await Promise.race([adapter.connect(), timeoutPromise]);
    customLogger.info('MySQL连接成功（带超时保护）');
    
    // 示例1: 使用事务保存多条相关弹幕
    customLogger.info('\n示例1: 使用事务保存多条相关弹幕');
    
    // 检查是否支持事务（假设适配器实现了事务方法）
    if (typeof adapter.beginTransaction === 'function' && 
        typeof adapter.commitTransaction === 'function' && 
        typeof adapter.rollbackTransaction === 'function') {
      
      await adapter.beginTransaction();
      
      try {
        // 事务内的多个操作
        const id1 = await adapter.saveDanmaku('transaction_room', {
          userId: 'tx_user',
          nickname: '事务用户',
          content: '事务弹幕1 - 开场弹幕',
          type: 'top',
          color: '#FF0000'
        });
        
        const id2 = await adapter.saveDanmaku('transaction_room', {
          userId: 'tx_user',
          nickname: '事务用户',
          content: '事务弹幕2 - 回应弹幕',
          type: 'scroll',
          color: '#00FF00'
        });
        
        // 更新统计数据
        await adapter.saveSystemStats({
          activeTransactions: 1,
          transactionSuccess: true
        });
        
        // 提交事务
        await adapter.commitTransaction();
        customLogger.info(`事务成功: 保存了 ${id1} 和 ${id2}`);
        
      } catch (txError) {
        // 回滚事务
        await adapter.rollbackTransaction();
        customLogger.error(`事务失败，已回滚: ${txError.message}`);
      }
    } else {
      customLogger.warn('当前适配器版本不支持事务操作');
    }
    
    // 示例2: 批量操作与连接池性能测试
    customLogger.info('\n示例2: 批量操作与连接池性能测试');
    
    const bulkDanmakus = [];
    for (let i = 1; i <= 10; i++) {
      bulkDanmakus.push({
        userId: 'bulk_user',
        nickname: '批量用户',
        content: `批量测试弹幕 ${i} - MySQL性能测试`,
        type: 'scroll',
        color: '#0000FF'
      });
    }
    
    const bulkResult = await adapter.batchSaveDanmaku('performance_room', bulkDanmakus);
    customLogger.info(`批量操作完成: ${bulkResult.length} 条弹幕`);
    
    // 示例3: 自定义查询（如果适配器支持）
    if (typeof adapter.executeRawQuery === 'function') {
      customLogger.info('\n示例3: 执行自定义SQL查询');
      
      const customQuery = `
        SELECT userId, COUNT(*) as messageCount 
        FROM danmakus 
        WHERE room = ? 
        GROUP BY userId 
        ORDER BY messageCount DESC 
        LIMIT 5
      `;
      
      const topUsers = await adapter.executeRawQuery(customQuery, ['performance_room']);
      customLogger.info('房间内发送弹幕最多的5个用户:', topUsers);
    }
    
  } catch (error) {
    customLogger.error('MySQL操作失败:', error.message);
    // 错误分类处理
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      customLogger.error('认证错误: 请检查用户名和密码');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      customLogger.error('数据库错误: 数据库不存在');
    } else if (error.code === 'ECONNREFUSED') {
      customLogger.error('连接错误: 数据库服务未启动或不可访问');
    }
  } finally {
    // 确保断开连接
    try {
      if (adapter.connection) {
        await adapter.disconnect();
        customLogger.info('MySQL连接已关闭');
      }
    } catch (disconnectError) {
      customLogger.error('关闭MySQL连接失败:', disconnectError.message);
    }
  }
}

/**
 * 高级错误处理示例 - 包含各种故障场景和恢复策略
 */
async function errorHandlingExample() {
  customLogger.info('\n=== 高级错误处理示例 - 各种故障场景和恢复策略 ===');
  
  // 场景1: 连接错误处理与重试策略
  customLogger.info('\n场景1: 连接错误处理与重试策略');
  try {
    // 尝试连接不存在的数据库
    const invalidConfig = {
      host: 'localhost',
      user: 'root',
      password: 'wrong_password',
      database: 'nonexistent_db',
      connectTimeout: 5000
    };
    
    const adapter = DatabaseAdapterFactory.create('mysql', invalidConfig);
    
    // 使用带指数退避的重试连接
    await withRetry(
      () => adapter.connect(),
      {
        maxRetries: 2,
        initialDelay: 1000,
        // 只对特定错误码进行重试
        shouldRetry: (error) => ['ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(error.code)
      }
    );
    
  } catch (error) {
    customLogger.error('预期的连接错误捕获成功:', error.message);
    customLogger.info('错误恢复策略: 切换到备用数据库或通知管理员');
    
    // 记录错误到监控系统（模拟）
    customLogger.info('已将错误信息发送到监控系统');
  }
  
  // 场景2: 参数验证错误处理
  customLogger.info('\n场景2: 参数验证和业务错误处理');
  try {
    // 使用有效的适配器配置
    const validAdapter = DatabaseAdapterFactory.create('mysql', {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'danmaku_system'
    });
    
    // 模拟参数验证错误 - 不实际连接数据库
    // 实际应用中，这些错误会在方法内部被捕获并以安全方式处理
    
    // 演示如何在应用层添加额外的验证
    const validateRoomId = (roomId) => {
      if (!roomId || typeof roomId !== 'string') {
        throw new Error('房间ID必须是非空字符串');
      }
      if (roomId.length > 50) {
        throw new Error('房间ID长度不能超过50个字符');
      }
      return true;
    };
    
    // 故意传递无效参数进行验证
    try {
      validateRoomId(''); // 空房间ID
    } catch (validationError) {
      customLogger.error('参数验证错误被捕获:', validationError.message);
      customLogger.info('使用默认房间ID作为回退方案');
      const defaultRoom = 'default_room';
      customLogger.info(`使用默认房间: ${defaultRoom}`);
    }
    
  } catch (error) {
    customLogger.error('参数验证示例中的意外错误:', error.message);
  }
  
  // 场景3: 资源限制和熔断策略
  customLogger.info('\n场景3: 资源限制和熔断保护策略');
  
  // 模拟数据库连接池耗尽场景
  function simulateConnectionPoolExhaustion() {
    customLogger.warn('模拟数据库连接池耗尽');
    const error = new Error('Too many connections');
    error.code = 'ER_CON_COUNT_ERROR';
    throw error;
  }
  
  // 简单的断路器实现
  let circuitBreakerState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  let failureCount = 0;
  const maxFailures = 3;
  const resetTimeout = 5000;
  let lastFailureTime = null;
  
  function checkCircuitBreaker() {
    if (circuitBreakerState === 'OPEN') {
      const currentTime = Date.now();
      // 检查是否可以切换到HALF_OPEN状态
      if (lastFailureTime && (currentTime - lastFailureTime) >= resetTimeout) {
        customLogger.info('断路器: 从OPEN切换到HALF_OPEN');
        circuitBreakerState = 'HALF_OPEN';
      }
    }
    return circuitBreakerState;
  }
  
  function updateCircuitBreaker(success) {
    if (circuitBreakerState === 'HALF_OPEN') {
      if (success) {
        customLogger.info('断路器: 从HALF_OPEN切换到CLOSED');
        circuitBreakerState = 'CLOSED';
        failureCount = 0;
      } else {
        customLogger.info('断路器: 从HALF_OPEN切换到OPEN');
        circuitBreakerState = 'OPEN';
        lastFailureTime = Date.now();
      }
    } else if (circuitBreakerState === 'CLOSED') {
      if (success) {
        failureCount = Math.max(0, failureCount - 1); // 成功时减少失败计数
      } else {
        failureCount++;
        if (failureCount >= maxFailures) {
          customLogger.info('断路器: 从CLOSED切换到OPEN');
          circuitBreakerState = 'OPEN';
          lastFailureTime = Date.now();
        }
      }
    }
  }
  
  // 使用断路器模式
  async function withCircuitBreaker(operation) {
    const state = checkCircuitBreaker();
    
    if (state === 'OPEN') {
      customLogger.warn('断路器打开，拒绝请求');
      return { error: 'Service unavailable', state: 'OPEN' };
    }
    
    try {
      const result = await operation();
      updateCircuitBreaker(true);
      return { result, state };
    } catch (error) {
      updateCircuitBreaker(false);
      return { error: error.message, state: circuitBreakerState };
    }
  }
  
  // 测试断路器
  for (let attempt = 1; attempt <= 5; attempt++) {
    customLogger.info(`\n断路器测试尝试 ${attempt}/5`);
    const result = await withCircuitBreaker(simulateConnectionPoolExhaustion);
    customLogger.info(`断路器测试结果:`, result);
  }
  
  // 场景4: 降级策略和优雅失败
  customLogger.info('\n场景4: 降级策略和优雅失败');
  
  // 降级策略示例
  async function getDanmakusWithFallback(room, limit) {
    try {
      // 尝试从数据库获取
      const adapter = DatabaseAdapterFactory.create('mysql', {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'danmaku_system'
      });
      
      await adapter.connect();
      const result = await adapter.getRoomHistory(room, limit);
      await adapter.disconnect();
      return result;
    } catch (error) {
      customLogger.error('获取弹幕失败，使用降级策略:', error.message);
      
      // 降级策略1: 返回缓存的旧数据（模拟）
      customLogger.info('使用缓存的旧数据作为降级方案');
      return [
        { userId: 'fallback', nickname: '降级提示', content: '当前服务临时不可用', type: 'top', color: '#FF0000' }
      ];
    }
  }
  
  const fallbackResult = await getDanmakusWithFallback('fallback_room', 10);
  customLogger.info('降级策略返回结果:', fallbackResult.length, '条数据');
}

// 运行所有示例
if (require.main === module) {
  (async () => {
    // 运行主示例
    await databaseAdapterExample();
    
    // 运行独立使用示例
    await useOnlyMySQLAdapter();
    
    // 运行错误处理示例
    await errorHandlingExample();
  })();
}

module.exports = {
  databaseAdapterExample,
  useOnlyMySQLAdapter,
  errorHandlingExample,
  initDatabaseAdapter
};