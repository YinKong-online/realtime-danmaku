import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { createClient } from 'redis'
import { createAdapter } from '@socket.io/redis-adapter'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { setupSocketHandlers } from './socketHandlers.js'
import { initializeRedis } from './database.js'
import { initializeFilterRules } from './filterRules.js'
import adminRouter from './admin/index.js'
import databaseFactory from './database/adapters.js'
import i18n from './i18n/index.js'
import setupSwagger from './api/swagger.js'

// 配置环境变量
dotenv.config()

// 处理ES模块路径问题
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 创建Express应用
const app = express()
const server = http.createServer(app)

// 配置静态文件
app.use(express.static(path.join(__dirname, '../public')))

// 配置CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  // 性能优化配置
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6 // 1MB
})

// 保存io实例到app.locals
app.locals.io = io

// 初始化数据库连接
const initDatabases = async () => {
  try {
    // 初始化Redis
    await initializeRedis()
    console.log('Redis连接成功')
    
    // 初始化Redis适配器用于Socket.io水平扩展
    const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })
    const subClient = pubClient.duplicate()
    
    await Promise.all([pubClient.connect(), subClient.connect()])
    io.adapter(createAdapter(pubClient, subClient))
    
    // 根据配置初始化数据库适配器
    let dbAdapter = null
    const dbType = process.env.DB_TYPE || 'mysql' // 默认使用MySQL
    
    try {
      switch (dbType) {
        case 'mysql':
          dbAdapter = databaseFactory.getAdapter('mysql', {
            host: process.env.MYSQL_HOST || 'localhost',
            port: process.env.MYSQL_PORT || 3306,
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE || 'danmaku_system'
          })
          await dbAdapter.connect()
          app.locals.dbAdapter = dbAdapter
          console.log('MySQL适配器初始化成功')
          break
        case 'mongodb':
          if (process.env.MONGODB_URL) {
            dbAdapter = databaseFactory.getAdapter('mongodb', {
              url: process.env.MONGODB_URL,
              dbName: process.env.MONGODB_DB_NAME || 'danmaku_system'
            })
            await dbAdapter.connect()
            app.locals.dbAdapter = dbAdapter
            console.log('MongoDB适配器初始化成功')
          }
          break
        case 'postgresql':
          dbAdapter = databaseFactory.getAdapter('postgresql', {
            host: process.env.PG_HOST || 'localhost',
            port: process.env.PG_PORT || 5432,
            user: process.env.PG_USER || 'postgres',
            password: process.env.PG_PASSWORD,
            database: process.env.PG_DATABASE || 'danmaku_system'
          })
          await dbAdapter.connect()
          app.locals.dbAdapter = dbAdapter
          console.log('PostgreSQL适配器初始化成功')
          break
        default:
          console.warn(`不支持的数据库类型: ${dbType}`)
      }
    } catch (dbError) {
      console.warn(`数据库连接失败，但将继续运行（部分功能可能受限）: ${dbError.message}`)
    }
    
    // 初始化过滤规则
    await initializeFilterRules()
    console.log('过滤规则初始化完成')
    
  } catch (error) {
    console.error('数据库初始化失败:', error)
    // 如果Redis连接失败，可以继续运行，但会失去一些功能
    console.warn('系统将在无Redis支持的模式下运行')
  }
}

// 启动服务
const startServer = async () => {
  try {
    // 初始化数据库
    await initDatabases()
    
    // 配置中间件
    app.use(express.json())
    app.use(i18n.middleware())
    
    // 设置Swagger文档
    setupSwagger(app)
    
    // 设置管理后台路由
    app.use('/admin', adminRouter)
    
    // 设置Socket.io事件处理
    setupSocketHandlers(io)
    
    // 启动HTTP服务器
    const PORT = process.env.PORT || 8000
    server.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`)
      console.log(`WebSocket服务已启动: ws://localhost:${PORT}`)
      console.log(`管理后台API: http://localhost:${PORT}/admin`)
      console.log(`API文档: http://localhost:${PORT}/api-docs`)
    })
    
    // 健康检查接口
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      })
    })
    
  } catch (error) {
    console.error('服务器启动失败:', error)
    process.exit(1)
  }
}

// 启动服务器
startServer()

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('正在关闭服务器...')
  
  // 关闭数据库连接
  if (app.locals.dbAdapter) {
    try {
      await app.locals.dbAdapter.disconnect()
    } catch (error) {
      console.error('关闭数据库连接失败:', error)
    }
  }
  
  // 关闭服务器
  server.close(() => {
    console.log('服务器已关闭')
    process.exit(0)
  })
})