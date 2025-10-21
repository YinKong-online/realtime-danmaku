import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

// Swagger配置
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: '实时互动弹幕系统 API',
    version: '1.0.0',
    description: '高性能实时弹幕系统的RESTful API和WebSocket接口文档',
    contact: {
      name: 'YinKong-online',
      qq: '1541310738'
    }
  },
  servers: [
    {
      url: 'http://localhost:8000',
      description: '开发环境'
    },
    {
      url: 'https://api.realtime-danmaku.com',
      description: '生产环境（用户请替换为实际部署地址）'
    }
  ],
  components: {
    schemas: {
      Danmaku: {
        type: 'object',
        required: ['content', 'userId', 'nickname'],
        properties: {
          content: {
            type: 'string',
            description: '弹幕内容',
            maxLength: 100
          },
          userId: {
            type: 'string',
            description: '用户ID'
          },
          nickname: {
            type: 'string',
            description: '用户昵称',
            maxLength: 20
          },
          type: {
            type: 'string',
            description: '弹幕类型',
            enum: ['scroll', 'top', 'bottom', 'reverse'],
            default: 'scroll'
          },
          color: {
            type: 'string',
            description: '弹幕颜色',
            default: '#FFFFFF'
          },
          room: {
            type: 'string',
            description: '房间ID'
          },
          timestamp: {
            type: 'integer',
            description: '发送时间戳'
          }
        }
      },
      FilterRule: {
        type: 'object',
        required: ['rule'],
        properties: {
          rule: {
            type: 'string',
            description: '过滤规则内容'
          },
          type: {
            type: 'string',
            description: '规则类型',
            enum: ['ban', 'warn', 'replace'],
            default: 'ban'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: '创建时间'
          }
        }
      },
      SystemStats: {
        type: 'object',
        properties: {
          activeConnections: {
            type: 'integer',
            description: '活跃连接数'
          },
          rooms: {
            type: 'object',
            description: '各房间信息'
          },
          totalMessages: {
            type: 'integer',
            description: '总消息数'
          },
          dbStatus: {
            type: 'object',
            description: '数据库状态'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            default: false
          },
          error: {
            type: 'string',
            description: '错误信息'
          }
        }
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            default: true
          },
          message: {
            type: 'string',
            description: '成功消息'
          },
          data: {
            type: 'object',
            description: '响应数据'
          }
        }
      }
    },
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key'
      },
      AdminAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-admin-token'
      }
    }
  }
}

// Swagger选项
const options = {
  swaggerDefinition,
  apis: ['./src/api/*.js', './src/admin/*.js']
}

// 生成Swagger文档
const swaggerSpec = swaggerJSDoc(options)

// 导出Swagger中间件
const setupSwagger = (app) => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
  
  // JSON格式的API文档
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })
  
  console.log('Swagger文档已启用: http://localhost:8000/api-docs')
}

// WebSocket事件文档（作为注释供参考）
/**
 * WebSocket事件说明
 * 
 * 客户端事件：
 * - connect: 连接到服务器
 * - join-room: 加入指定房间
 *   参数: { room: '房间ID' }
 * - leave-room: 离开当前房间
 *   参数: { room: '房间ID' }
 * - send-danmaku: 发送弹幕
 *   参数: Danmaku对象
 * - disconnect: 断开连接
 * 
 * 服务端事件：
 * - connect: 连接成功
 * - danmaku: 接收新弹幕
 *   数据: Danmaku对象
 * - error: 错误通知
 *   数据: { message: '错误信息', code: '错误代码' }
 * - user-joined: 用户加入房间
 *   数据: { room: '房间ID', userId: '用户ID', nickname: '用户昵称' }
 * - user-left: 用户离开房间
 *   数据: { room: '房间ID', userId: '用户ID' }
 * - room-stats: 房间统计更新
 *   数据: { room: '房间ID', userCount: 100 }
 * - clear-danmaku: 清空弹幕
 *   数据: { room: '房间ID', timestamp: 时间戳 }
 */

export default setupSwagger