import { io } from 'socket.io-client'
import { performance } from 'perf_hooks'
import fs from 'fs'
import path from 'path'

// 压测配置
const config = {
  serverUrl: 'http://localhost:8000',
  roomId: 'load-test-room',
  totalClients: 100, // 模拟的总客户端数
  messagesPerClient: 10, // 每个客户端发送的消息数
  sendIntervalMs: 500, // 消息发送间隔（毫秒）
  rampUpTimeMs: 10000, // 客户端启动的时间跨度（毫秒）
  randomDelay: true // 是否在发送间隔中添加随机延迟
}

// 统计数据
const stats = {
  totalConnections: 0,
  successfulConnections: 0,
  failedConnections: 0,
  totalMessagesSent: 0,
  totalMessagesReceived: 0,
  messageLatencies: [],
  connectionTimes: [],
  startTime: 0,
  endTime: 0
}

// 模拟弹幕内容池
const danmakuPool = [
  '666666',
  '太精彩了！',
  '主播好厉害',
  '前排打卡',
  '这个视频太棒了',
  '支持支持！',
  '学到了学到了',
  '主播加油',
  '6666666666',
  '哈哈哈',
  '666',
  '好有意思',
  '主播666',
  '这个操作太秀了',
  '6666'
]

// 生成随机弹幕内容
const getRandomDanmaku = () => {
  return danmakuPool[Math.floor(Math.random() * danmakuPool.length)]
}

// 生成随机颜色
const getRandomColor = () => {
  const colors = ['#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
  return colors[Math.floor(Math.random() * colors.length)]
}

// 模拟单个客户端
class SimulatedClient {
  constructor(clientId) {
    this.clientId = clientId
    this.socket = null
    this.connected = false
    this.messagesSent = 0
    this.messagesReceived = 0
    this.messageTimes = new Map() // 存储消息发送时间
  }

  async connect() {
    const connectStartTime = performance.now()
    
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(config.serverUrl, {
          transports: ['websocket'],
          reconnection: false,
          timeout: 5000
        })

        this.socket.on('connect', () => {
          const connectEndTime = performance.now()
          const connectTime = connectEndTime - connectStartTime
          
          this.connected = true
          stats.successfulConnections++
          stats.connectionTimes.push(connectTime)
          
          console.log(`[客户端 ${this.clientId}] 连接成功，耗时 ${connectTime.toFixed(2)}ms`)
          
          // 加入房间
          this.socket.emit('join-room', config.roomId)
          resolve()
        })

        this.socket.on('disconnect', () => {
          this.connected = false
          console.log(`[客户端 ${this.clientId}] 断开连接`)
        })

        this.socket.on('connect_error', (error) => {
          const connectEndTime = performance.now()
          stats.failedConnections++
          console.error(`[客户端 ${this.clientId}] 连接失败:`, error.message)
          reject(error)
        })

        this.socket.on('new-danmaku', (data) => {
          this.messagesReceived++
          stats.totalMessagesReceived++
          
          // 计算延迟（如果是自己发送的消息）
          const messageId = data.danmaku.id
          if (this.messageTimes.has(messageId)) {
            const sendTime = this.messageTimes.get(messageId)
            const receiveTime = performance.now()
            const latency = receiveTime - sendTime
            
            stats.messageLatencies.push(latency)
            this.messageTimes.delete(messageId)
            
            console.log(`[客户端 ${this.clientId}] 消息延迟: ${latency.toFixed(2)}ms`)
          }
        })

        this.socket.on('send-failed', (data) => {
          console.log(`[客户端 ${this.clientId}] 发送失败:`, data.reason)
        })

      } catch (error) {
        stats.failedConnections++
        reject(error)
      }
    })
  }

  async startSending() {
    if (!this.connected) {
      console.log(`[客户端 ${this.clientId}] 未连接，无法发送消息`)
      return
    }

    for (let i = 0; i < config.messagesPerClient; i++) {
      if (!this.connected) break

      const danmaku = {
        content: getRandomDanmaku(),
        type: ['scroll', 'top', 'bottom'][Math.floor(Math.random() * 3)],
        color: getRandomColor(),
        timestamp: Date.now(),
        userId: `simulated_user_${this.clientId}`
      }

      // 记录发送时间（这里使用临时ID，实际中服务端会返回真实ID）
      const tempId = `temp_${this.clientId}_${i}`
      this.messageTimes.set(tempId, performance.now())

      // 发送消息
      this.socket.emit('send-danmaku', {
        roomId: config.roomId,
        danmaku
      })

      this.messagesSent++
      stats.totalMessagesSent++

      // 等待下一次发送
      const delay = config.randomDelay 
        ? config.sendIntervalMs + Math.random() * 200 - 100 
        : config.sendIntervalMs
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
    this.connected = false
  }
}

// 运行压力测试
async function runLoadTest() {
  console.log('====================================')
  console.log('开始弹幕系统压力测试')
  console.log('====================================')
  console.log(`服务器: ${config.serverUrl}`)
  console.log(`房间: ${config.roomId}`)
  console.log(`模拟客户端数: ${config.totalClients}`)
  console.log(`每客户端消息数: ${config.messagesPerClient}`)
  console.log(`发送间隔: ${config.sendIntervalMs}ms`)
  console.log(`启动时间跨度: ${config.rampUpTimeMs}ms`)
  console.log('====================================')

  stats.startTime = performance.now()
  const clients = []

  try {
    // 创建并连接所有客户端
    console.log('正在连接客户端...')
    const connectPromises = []
    
    for (let i = 0; i < config.totalClients; i++) {
      const client = new SimulatedClient(i)
      clients.push(client)
      
      // 计算启动延迟，实现渐进式启动
      const delay = (i / config.totalClients) * config.rampUpTimeMs
      
      const connectPromise = new Promise(resolve => {
        setTimeout(async () => {
          stats.totalConnections++
          try {
            await client.connect()
          } catch (error) {
            // 连接失败不影响其他客户端
          }
          resolve()
        }, delay)
      })
      
      connectPromises.push(connectPromise)
    }

    // 等待所有连接尝试完成
    await Promise.all(connectPromises)

    console.log('\n所有客户端连接尝试完成')
    console.log(`成功连接: ${stats.successfulConnections}`)
    console.log(`失败连接: ${stats.failedConnections}`)

    // 开始发送消息
    console.log('\n开始发送消息...')
    const sendPromises = clients
      .filter(client => client.connected)
      .map(client => client.startSending())

    // 等待所有消息发送完成
    await Promise.all(sendPromises)

    // 等待一段时间让所有消息都能被接收
    console.log('\n等待消息接收完成...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // 断开所有连接
    console.log('\n断开所有连接...')
    clients.forEach(client => client.disconnect())

  } catch (error) {
    console.error('压测过程中出错:', error)
  } finally {
    stats.endTime = performance.now()
    generateReport()
  }
}

// 生成测试报告
function generateReport() {
  const totalTime = (stats.endTime - stats.startTime) / 1000
  const tps = stats.totalMessagesSent / totalTime
  
  // 计算延迟统计
  let avgLatency = 0
  let maxLatency = 0
  let minLatency = Infinity
  
  if (stats.messageLatencies.length > 0) {
    avgLatency = stats.messageLatencies.reduce((sum, latency) => sum + latency, 0) / stats.messageLatencies.length
    maxLatency = Math.max(...stats.messageLatencies)
    minLatency = Math.min(...stats.messageLatencies)
  }

  // 计算连接时间统计
  let avgConnectTime = 0
  if (stats.connectionTimes.length > 0) {
    avgConnectTime = stats.connectionTimes.reduce((sum, time) => sum + time, 0) / stats.connectionTimes.length
  }

  const report = `
====================================
压力测试报告
====================================
测试时长: ${totalTime.toFixed(2)}秒
连接情况:
  总连接数: ${stats.totalConnections}
  成功连接: ${stats.successfulConnections}
  失败连接: ${stats.failedConnections}
  连接成功率: ${(stats.successfulConnections / stats.totalConnections * 100).toFixed(2)}%
  平均连接时间: ${avgConnectTime.toFixed(2)}ms
消息统计:
  总发送消息数: ${stats.totalMessagesSent}
  总接收消息数: ${stats.totalMessagesReceived}
  接收率: ${stats.totalMessagesSent > 0 ? (stats.totalMessagesReceived / stats.totalMessagesSent * 100).toFixed(2) : 0}%
  TPS (每秒消息数): ${tps.toFixed(2)}
延迟统计:
  平均延迟: ${avgLatency.toFixed(2)}ms
  最大延迟: ${maxLatency.toFixed(2)}ms
  最小延迟: ${minLatency.toFixed(2)}ms
====================================`

  console.log(report)

  // 保存报告到文件
  const reportDir = path.join(process.cwd(), 'reports')
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }

  const reportFileName = `load_test_report_${Date.now()}.txt`
  const reportPath = path.join(reportDir, reportFileName)
  
  fs.writeFileSync(reportPath, report)
  console.log(`\n报告已保存到: ${reportPath}`)

  // 生成简化的JSON报告，用于前端图表展示
  const jsonReport = {
    timestamp: new Date().toISOString(),
    config: { ...config },
    stats: {
      totalTime,
      tps,
      connectionStats: {
        total: stats.totalConnections,
        successful: stats.successfulConnections,
        failed: stats.failedConnections,
        successRate: stats.successfulConnections / stats.totalConnections,
        avgConnectTime
      },
      messageStats: {
        sent: stats.totalMessagesSent,
        received: stats.totalMessagesReceived,
        receiveRate: stats.totalMessagesSent > 0 ? stats.totalMessagesReceived / stats.totalMessagesSent : 0
      },
      latencyStats: {
        avg: avgLatency,
        max: maxLatency,
        min: minLatency,
        samples: stats.messageLatencies.length
      }
    }
  }

  const jsonReportPath = path.join(reportDir, `load_test_report_${Date.now()}.json`)
  fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2))
}

// 启动测试
runLoadTest().catch(console.error)