import { createClient } from 'redis'
import { MongoClient } from 'mongodb'

// Redis客户端实例
export let redisClient = null

// MongoDB客户端实例
export let mongoClient = null

// 初始化Redis连接
export const initializeRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    redisClient = createClient({
      url: redisUrl,
      // 性能优化配置
      socket: {
        keepAlive: 60,
        connectTimeout: 10000
      },
      // 重试策略
      retryStrategy: (times) => {
        // 最大重试次数
        if (times > 5) {
          console.error('Redis连接重试次数过多，放弃重试')
          return null
        }
        // 指数退避策略
        return Math.min(times * 1000, 5000)
      }
    })
    
    // 事件监听
    redisClient.on('error', (err) => {
      console.error('Redis错误:', err)
    })
    
    redisClient.on('connect', () => {
      console.log('Redis连接成功')
    })
    
    redisClient.on('reconnecting', (params) => {
      console.log(`Redis正在重连: ${params.attempt} / ${params.total_attempts}`)
    })
    
    redisClient.on('end', () => {
      console.log('Redis连接已关闭')
    })
    
    // 连接Redis
    await redisClient.connect()
    
    // 测试连接
    const pong = await redisClient.ping()
    console.log('Redis连接测试成功')
    
    // 设置Redis键前缀
    const KEY_PREFIX = 'danmaku:'
    
  } catch (error) {
    console.error('Redis初始化失败:', error)
    // 即使Redis连接失败，也不抛出异常，让系统尝试以无Redis模式运行
    // throw error
  }
}

// 初始化MongoDB连接
export const initializeMongoDB = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017'
    const dbName = process.env.MONGODB_DB_NAME || 'danmaku_system'
    
    mongoClient = new MongoClient(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // 连接池配置
      maxPoolSize: 10,
      minPoolSize: 2,
      // 性能优化
      compressors: ['snappy'],
      // 重试策略
      retryWrites: true
    })
    
    // 连接MongoDB
    await mongoClient.connect()
    
    // 获取数据库实例
    const db = mongoClient.db(dbName)
    
    // 创建必要的集合和索引
    await createCollectionsAndIndexes(db)
    
  } catch (error) {
    console.error('MongoDB初始化失败:', error)
    throw error
  }
}

// 创建集合和索引
async function createCollectionsAndIndexes(db) {
  try {
    // 创建默认房间集合
    const defaultRoomCollection = db.collection('room_default-room')
    await defaultRoomCollection.createIndex({ timestamp: 1 })
    
    console.log('MongoDB索引创建成功')
    
  } catch (error) {
    console.error('MongoDB索引创建失败:', error)
    // 索引创建失败不影响系统运行
  }
}

// 关闭数据库连接
export const closeDatabaseConnections = async () => {
  try {
    if (redisClient) {
      await redisClient.disconnect()
      console.log('Redis连接已关闭')
    }
    
    if (mongoClient) {
      await mongoClient.close()
      console.log('MongoDB连接已关闭')
    }
    
  } catch (error) {
    console.error('关闭数据库连接失败:', error)
  }
}

// 初始化数据库连接
export async function initializeDatabases() {
  try {
    // 初始化Redis连接
    await initializeRedis();
    console.log('Redis连接成功');
    
    try {
      // 尝试初始化MongoDB连接
      await initializeMongoDB();
      console.log('MongoDB连接成功');
    } catch (mongoError) {
      console.warn('MongoDB连接失败，但将继续运行（部分功能可能受限）:', mongoError.message);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Redis初始化失败:', error);
    return { success: false, error };
  }
}

// Redis工具函数
export const redisUtils = {
  // 增加计数器并设置过期时间
  async incrWithExpire(key, expireSeconds = 60) {
    if (!redisClient) {
      // 无Redis模式下返回模拟数据
      return { value: 1, hasRedis: false }
    }
    
    try {
      const fullKey = `danmaku:${key}`
      const value = await redisClient.incr(fullKey)
      
      // 只有第一次增加时设置过期时间
      if (value === 1) {
        await redisClient.expire(fullKey, expireSeconds)
      }
      
      return { value, hasRedis: true }
    } catch (error) {
      console.error('Redis incrWithExpire操作失败:', error)
      return { value: 1, hasRedis: false }
    }
  },
  
  // 设置带有过期时间的键值对
  async setWithExpire(key, value, expireSeconds = 60) {
    if (!redisClient) {
      // 无Redis模式下返回模拟成功
      return { success: true, hasRedis: false }
    }
    
    try {
      const fullKey = `danmaku:${key}`
      await redisClient.set(fullKey, value, { EX: expireSeconds })
      return { success: true, hasRedis: true }
    } catch (error) {
      console.error('Redis setWithExpire操作失败:', error)
      return { success: false, hasRedis: false }
    }
  },
  
  // 获取键值
  async get(key) {
    if (!redisClient) {
      return { value: null, hasRedis: false }
    }
    
    try {
      const fullKey = `danmaku:${key}`
      const value = await redisClient.get(fullKey)
      return { value, hasRedis: true }
    } catch (error) {
      console.error('Redis get操作失败:', error)
      return { value: null, hasRedis: false }
    }
  },
  
  // 删除键
  async del(key) {
    if (!redisClient) {
      return { success: true, hasRedis: false }
    }
    
    try {
      const fullKey = `danmaku:${key}`
      await redisClient.del(fullKey)
      return { success: true, hasRedis: true }
    } catch (error) {
      console.error('Redis del操作失败:', error)
      return { success: false, hasRedis: false }
    }
  },
  
  // 检查键是否存在
  async exists(key) {
    if (!redisClient) {
      return { exists: false, hasRedis: false }
    }
    
    try {
      const fullKey = `danmaku:${key}`
      const result = await redisClient.exists(fullKey)
      return { exists: result > 0, hasRedis: true }
    } catch (error) {
      console.error('Redis exists操作失败:', error)
      return { exists: false, hasRedis: false }
    }
  },
  
  // 获取并设置（原子操作）
  async getSet(key, value) {
    if (!redisClient) {
      return { oldValue: null, hasRedis: false }
    }
    
    try {
      const fullKey = `danmaku:${key}`
      const oldValue = await redisClient.getSet(fullKey, value)
      return { oldValue, hasRedis: true }
    } catch (error) {
      console.error('Redis getSet操作失败:', error)
      return { oldValue: null, hasRedis: false }
    }
  }
}

// MongoDB工具函数
export const mongoUtils = {
  // 保存弹幕消息到指定房间
  async saveDanmaku(roomId, danmaku) {
    if (!mongoClient) {
      // 无MongoDB模式下返回模拟成功
      return { success: true, hasMongoDB: false }
    }
    
    try {
      const db = mongoClient.db()
      const collection = db.collection(`room_${roomId}`)
      
      // 添加时间戳和房间信息
      const danmakuWithMeta = {
        ...danmaku,
        timestamp: Date.now(),
        roomId
      }
      
      await collection.insertOne(danmakuWithMeta)
      return { success: true, hasMongoDB: true }
    } catch (error) {
      console.error('MongoDB保存弹幕失败:', error)
      return { success: false, hasMongoDB: false }
    }
  },
  
  // 获取指定房间的最新弹幕
  async getRecentDanmakus(roomId, limit = 100) {
    if (!mongoClient) {
      // 无MongoDB模式下返回空数组
      return { danmakus: [], hasMongoDB: false }
    }
    
    try {
      const db = mongoClient.db()
      const collection = db.collection(`room_${roomId}`)
      
      const danmakus = await collection
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray()
      
      // 反转顺序，使其按时间正序返回
      return { danmakus: danmakus.reverse(), hasMongoDB: true }
    } catch (error) {
      console.error('MongoDB获取弹幕失败:', error)
      return { danmakus: [], hasMongoDB: false }
    }
  },
  
  // 清理过期数据
  async cleanupOldData(roomId, maxAgeMs = 24 * 60 * 60 * 1000) { // 默认保留24小时
    if (!mongoClient) {
      return { success: true, deletedCount: 0, hasMongoDB: false }
    }
    
    try {
      const db = mongoClient.db()
      const collection = db.collection(`room_${roomId}`)
      
      const cutoffTime = Date.now() - maxAgeMs
      const result = await collection.deleteMany({ timestamp: { $lt: cutoffTime } })
      
      return { 
        success: true, 
        deletedCount: result.deletedCount,
        hasMongoDB: true 
      }
    } catch (error) {
      console.error('MongoDB清理过期数据失败:', error)
      return { success: false, deletedCount: 0, hasMongoDB: false }
    }
  }
}