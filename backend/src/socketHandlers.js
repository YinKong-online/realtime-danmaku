import { nanoid } from 'nanoid'
import { redisClient, mongoClient } from './database.js'
import { filterDanmaku, checkRateLimit, checkDuplicateMessage } from './filterRules.js'

// 房间信息管理
const roomInfo = new Map()

// 为每个用户存储最近发送的消息
const userMessages = new Map()

// 初始化房间
const initRoom = (roomId) => {
  if (!roomInfo.has(roomId)) {
    roomInfo.set(roomId, {
      onlineUsers: new Set(),
      messageQueue: [],
      lastProcessTime: Date.now()
    })
  }
}

// 更新在线人数
const updateOnlineCount = (io, roomId) => {
  const room = roomInfo.get(roomId)
  if (room) {
    io.to(roomId).emit('online-count', {
      roomId,
      count: room.onlineUsers.size
    })
  }
}

// 处理单条弹幕消息
const processDanmaku = async (io, socket, data) => {
  const { roomId, danmaku } = data
  const userId = danmaku.userId || socket.id
  
  try {
    // 1. 检查频率限制
    const rateLimitResult = await checkRateLimit(userId, roomId)
    if (!rateLimitResult.allowed) {
      socket.emit('send-failed', {
        reason: rateLimitResult.reason || '发送太频繁，请稍后再试'
      })
      return
    }
    
    // 2. 检查重复消息（对于表情弹幕，使用emojiInfo或content作为标识）
    const checkContent = danmaku.type === 'emoji' && danmaku.emojiInfo 
      ? `[emoji:${danmaku.emojiInfo.value}]` 
      : danmaku.content
    
    const duplicateResult = await checkDuplicateMessage(userId, checkContent)
    if (!duplicateResult.allowed) {
      socket.emit('send-failed', {
        reason: '请勿发送重复消息'
      })
      return
    }
    
    // 3. 过滤敏感内容（只对文本内容进行过滤）
    let filterResult = { allowed: true, content: danmaku.content }
    if (danmaku.content) {
      filterResult = await filterDanmaku(danmaku.content)
      if (!filterResult.allowed) {
        socket.emit('send-failed', {
          reason: '内容包含敏感词'
        })
        return
      }
    }
    
    // 4. 创建完整的弹幕对象
    const finalDanmaku = {
      id: nanoid(),
      ...danmaku,
      content: filterResult.content, // 使用过滤后的内容
      timestamp: Date.now(),
      // 确保emojiInfo在表情弹幕中存在
      emojiInfo: danmaku.type === 'emoji' ? danmaku.emojiInfo : undefined
    }
    
    // 5. 存储用户最近发送的消息
    if (!userMessages.has(userId)) {
      userMessages.set(userId, [])
    }
    const messages = userMessages.get(userId)
    messages.push({ content: danmaku.content, timestamp: Date.now() })
    // 只保留最近10条消息
    if (messages.length > 10) {
      messages.shift()
    }
    
    // 6. 广播消息到房间
    console.log(`[消息广播] 向房间 ${roomId} 广播弹幕: "${finalDanmaku.content || '[表情]'}"`)  
    io.to(roomId).emit('new-danmaku', {
      roomId,
      danmaku: finalDanmaku
    })
    
    // 7. 可选：存储到MongoDB（历史记录）
    if (mongoClient) {
      try {
        const db = mongoClient.db('danmaku')
        const collection = db.collection(`room_${roomId}`)
        
        // 插入新消息
        await collection.insertOne(finalDanmaku)
        
        // 只保留最近1000条消息
        const count = await collection.countDocuments()
        if (count > 1000) {
          const docs = await collection.find().sort({ timestamp: 1 }).limit(count - 1000).toArray()
          const idsToDelete = docs.map(doc => doc._id)
          await collection.deleteMany({ _id: { $in: idsToDelete } })
        }
      } catch (error) {
        console.error('MongoDB存储失败:', error)
      }
    }
    
  } catch (error) {
    console.error('处理弹幕失败:', error)
    socket.emit('send-failed', {
      reason: '服务器处理失败'
    })
  }
}

// 批量处理弹幕（高并发场景）
const processMessageQueue = async (io, roomId) => {
  const room = roomInfo.get(roomId)
  if (!room || room.messageQueue.length === 0) return
  
  console.log(`[队列处理] 开始处理房间 ${roomId} 的消息队列，当前队列长度: ${room.messageQueue.length}`)
  
  // 限制每批处理的消息数量
  const batchSize = 50
  const messagesToProcess = room.messageQueue.splice(0, batchSize)
  
  console.log(`[队列处理] 本次处理 ${messagesToProcess.length} 条消息`)
  
  // 批量处理
  for (const { socket, data } of messagesToProcess) {
    try {
      await processDanmaku(io, socket, data)
    } catch (error) {
      console.error(`[队列处理] 处理消息失败:`, error)
      // 发送错误通知给用户
      if (socket && socket.connected) {
        socket.emit('send-failed', {
          reason: '服务器处理失败'
        })
      }
    }
  }
  
  room.lastProcessTime = Date.now()
  console.log(`[队列处理] 完成处理，剩余队列长度: ${room.messageQueue.length}`)
}

// 设置Socket.io事件处理
export const setupSocketHandlers = (io) => {
  // 连接事件
  io.on('connection', (socket) => {
    console.log(`新用户连接: ${socket.id}`)
    
    // 加入房间
    socket.on('join-room', (roomId) => {
      initRoom(roomId)
      const room = roomInfo.get(roomId)
      
      socket.join(roomId)
      room.onlineUsers.add(socket.id)
      
      console.log(`用户 ${socket.id} 加入房间 ${roomId}`)
      
      // 更新在线人数
      updateOnlineCount(io, roomId)
      
      // 可选：发送历史弹幕
      if (mongoClient) {
        const db = mongoClient.db('danmaku')
        const collection = db.collection(`room_${roomId}`)
        
        collection.find()
          .sort({ timestamp: -1 })
          .limit(50)
          .toArray()
          .then(historyDanmakus => {
            // 按时间正序发送历史弹幕
            historyDanmakus.reverse().forEach(danmaku => {
              socket.emit('new-danmaku', {
                roomId,
                danmaku: {
                  id: danmaku.id,
                  content: danmaku.content,
                  type: danmaku.type,
                  color: danmaku.color,
                  timestamp: danmaku.timestamp,
                  userId: danmaku.userId,
                  userLevel: danmaku.userLevel,
                  isAdmin: danmaku.isAdmin,
                  emojiInfo: danmaku.emojiInfo,
                  fontSize: danmaku.fontSize,
                  opacity: danmaku.opacity
                }
              })
            })
          })
          .catch(error => {
            console.error('获取历史弹幕失败:', error)
          })
      }
    })
    
    // 离开房间
    socket.on('leave-room', (roomId) => {
      const room = roomInfo.get(roomId)
      if (room) {
        socket.leave(roomId)
        room.onlineUsers.delete(socket.id)
        
        console.log(`用户 ${socket.id} 离开房间 ${roomId}`)
        
        // 更新在线人数
        updateOnlineCount(io, roomId)
        
        // 清理空房间
        if (room.onlineUsers.size === 0 && room.messageQueue.length === 0) {
          roomInfo.delete(roomId)
        }
      }
    })
    
    // 发送弹幕
    socket.on('send-danmaku', (data) => {
      console.log(`[接收弹幕] 用户 ${socket.id} 发送弹幕: data =`, data)
      const { roomId } = data
      const room = roomInfo.get(roomId)
      
      if (!room) {
        console.log(`[接收弹幕] 用户 ${socket.id} 发送弹幕失败: 房间不存在`, roomId)
        socket.emit('send-failed', {
          reason: '房间不存在'
        })
        return
      }
      
      // 高并发优化：加入队列
      if (room.messageQueue.length > 100) {
        // 队列积压，直接处理
        console.log(`[接收弹幕] 队列积压，直接处理用户 ${socket.id} 的弹幕`)
        processDanmaku(io, socket, data)
      } else {
        // 加入队列
        console.log(`[接收弹幕] 将用户 ${socket.id} 的弹幕加入队列，当前队列长度: ${room.messageQueue.length}`)
        room.messageQueue.push({ socket, data })
        
        // 检查是否需要处理队列
        const now = Date.now()
        if (now - room.lastProcessTime > 100) { // 100ms处理一次
          console.log(`[接收弹幕] 超过100ms未处理，触发队列处理`)
          processMessageQueue(io, roomId)
        }
      }
    })
    
    // 断开连接
    socket.on('disconnect', () => {
      console.log(`用户断开连接: ${socket.id}`)
      
      // 从所有房间中移除用户
      roomInfo.forEach((room, roomId) => {
        if (room.onlineUsers.has(socket.id)) {
          room.onlineUsers.delete(socket.id)
          updateOnlineCount(io, roomId)
          
          if (room.onlineUsers.size === 0 && room.messageQueue.length === 0) {
            roomInfo.delete(roomId)
          }
        }
      })
      
      // 清理用户消息缓存
      userMessages.forEach((messages, userId) => {
        if (userId === socket.id) {
          userMessages.delete(userId)
        }
      })
    })
  })
  
  // 定期处理所有房间的消息队列
  setInterval(() => {
    roomInfo.forEach((room, roomId) => {
      if (room.messageQueue.length > 0) {
        processMessageQueue(io, roomId)
      }
    })
  }, 50) // 每50ms检查一次
  
  // 定期清理过期的用户消息缓存
  setInterval(() => {
    const now = Date.now()
    userMessages.forEach((messages, userId) => {
      // 只保留最近1分钟的消息记录
      const filteredMessages = messages.filter(msg => now - msg.timestamp < 60000)
      if (filteredMessages.length > 0) {
        userMessages.set(userId, filteredMessages)
      } else {
        userMessages.delete(userId)
      }
    })
  }, 60000) // 每分钟清理一次
}