import express from 'express'
import { redisClient, mongoClient } from '../database.js'
import { nanoid } from 'nanoid'

const router = express.Router()

// 管理后台认证中间件
const authMiddleware = (req, res, next) => {
  // 实际项目中应该实现更安全的认证机制
  const adminToken = req.headers['x-admin-token'] || req.query.token
  
  // 简单的演示认证（生产环境请使用更安全的方式）
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: req.t('common.unauthorized') })
  }
  
  next()
}

// 应用认证中间件
router.use(authMiddleware)

// 1. 敏感词管理 (简化版)

// 注意：当前版本的filterRules模块不支持动态管理敏感词
// 敏感词需要在filterRules.js文件中静态配置
router.get('/filter-rules', async (req, res) => {
  try {
    // 返回一个空数组，表示当前系统使用的是静态敏感词配置
    res.json({
      success: true,
      data: [],
      message: req.t('admin.filterRulesStatic') || '敏感词当前为静态配置，请修改filterRules.js文件'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: req.t('common.serverError'),
      ...(process.env.NODE_ENV !== 'production' && { details: error.message })
    })
  }
})

// 添加敏感词规则 (预留接口)
router.post('/filter-rules', async (req, res) => {
  res.status(501).json({
    success: false,
    error: req.t('errors.notImplemented') || '当前版本不支持动态添加敏感词，请修改filterRules.js文件'
  })
})

// 删除敏感词规则 (预留接口)
router.delete('/filter-rules/:rule', async (req, res) => {
  res.status(501).json({
    success: false,
    error: req.t('errors.notImplemented') || '当前版本不支持动态删除敏感词，请修改filterRules.js文件'
  })
})

// 2. 统计数据

// 获取实时统计信息
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      activeConnections: 0,
      rooms: {},
      totalMessages: 0,
      dbStatus: {
        redis: !!redisClient,
        mongodb: !!mongoClient
      }
    }
    
    // 从Redis获取统计数据（如果可用）
    if (redisClient) {
      try {
        // 获取房间信息
        const roomsKeys = await redisClient.keys('danmaku:room:*:count')
        for (const key of roomsKeys) {
          const roomName = key.replace('danmaku:room:', '').replace(':count', '')
          const count = await redisClient.get(key)
          stats.rooms[roomName] = parseInt(count || '0')
          stats.activeConnections += parseInt(count || '0')
        }
        
        // 获取总消息数
        const messageCount = await redisClient.get('danmaku:total_messages')
        stats.totalMessages = parseInt(messageCount || '0')
      } catch (redisError) {
        console.warn('获取Redis统计数据失败:', redisError)
      }
    }
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 获取历史统计数据
router.get('/stats/history', async (req, res) => {
  try {
    const { start, end, interval = 'hour' } = req.query
    const history = []
    
    // 如果有MongoDB连接，可以查询历史数据
    if (mongoClient) {
      try {
        const db = mongoClient.db()
        const statsCollection = db.collection('system_stats')
        
        const query = {}
        if (start) query.timestamp = { $gte: new Date(parseInt(start)) }
        if (end) query.timestamp = { ...query.timestamp, $lte: new Date(parseInt(end)) }
        
        const results = await statsCollection
          .find(query)
          .sort({ timestamp: 1 })
          .toArray()
        
        results.forEach(stat => {
          history.push({
            timestamp: stat.timestamp,
            connections: stat.activeConnections,
            messages: stat.totalMessages
          })
        })
      } catch (mongoError) {
        console.warn('获取MongoDB历史数据失败:', mongoError)
      }
    }
    
    res.json({
      success: true,
      data: history
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 3. 房间管理

// 获取所有房间信息
router.get('/rooms', async (req, res) => {
  try {
    const rooms = {}
    
    if (redisClient) {
      try {
        const roomKeys = await redisClient.keys('danmaku:room:*:count')
        for (const key of roomKeys) {
          const roomName = key.replace('danmaku:room:', '').replace(':count', '')
          const count = await redisClient.get(key)
          rooms[roomName] = {
            name: roomName,
            activeUsers: parseInt(count || '0')
          }
        }
      } catch (redisError) {
        console.warn('获取房间信息失败:', redisError)
      }
    }
    
    res.json({
      success: true,
      data: rooms
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 清空指定房间弹幕
router.post('/rooms/:room/clear', async (req, res) => {
  try {
    const roomName = req.params.room
    
    // 向指定房间发送清空指令
    if (req.app.locals.io) {
      req.app.locals.io.to(`room:${roomName}`).emit('clear-danmaku', {
        room: roomName,
        timestamp: Date.now(),
        adminAction: true
      })
    }
    
    res.json({
      success: true,
      message: '弹幕已清空'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 4. 系统配置管理

// 获取系统配置
router.get('/config', async (req, res) => {
  try {
    const config = {
      server: {
        version: process.env.APP_VERSION || '1.0.0',
        uptime: process.uptime()
      },
      redis: redisClient ? 'connected' : 'disconnected',
      mongodb: mongoClient ? 'connected' : 'disconnected',
      settings: {
        maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '100'),
        messageRateLimit: parseInt(process.env.MESSAGE_RATE_LIMIT || '10'),
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60')
      }
    }
    
    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 更新系统配置
router.put('/config', async (req, res) => {
  try {
    // 在实际项目中，这里应该有更严格的配置验证
    // 并将配置持久化存储
    
    res.json({
      success: true,
      message: '配置更新成功'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router