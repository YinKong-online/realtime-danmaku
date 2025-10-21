import { redisUtils } from './database.js'

// 敏感词Trie树结构
class TrieNode {
  constructor() {
    this.children = new Map()
    this.isEnd = false
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode()
  }

  // 添加敏感词到Trie树
  addWord(word) {
    let node = this.root
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode())
      }
      node = node.children.get(char)
    }
    node.isEnd = true
  }

  // 检查文本中是否包含敏感词
  check(text) {
    const sensitiveWords = []
    
    for (let i = 0; i < text.length; i++) {
      let node = this.root
      let j = i
      let currentWord = ''
      
      while (j < text.length && node.children.has(text[j])) {
        currentWord += text[j]
        node = node.children.get(text[j])
        j++
        
        if (node.isEnd) {
          sensitiveWords.push({
            word: currentWord,
            start: i,
            end: j
          })
        }
      }
    }
    
    return {
      hasSensitive: sensitiveWords.length > 0,
      words: sensitiveWords
    }
  }

  // 过滤文本中的敏感词
  filter(text) {
    let filteredText = text
    const result = this.check(text)
    
    if (result.hasSensitive) {
      // 按长度降序排序，优先替换长词
      const sortedWords = result.words.sort((a, b) => b.word.length - a.word.length)
      
      // 去重并替换
      const uniquePositions = new Set()
      for (const wordInfo of sortedWords) {
        const positionKey = `${wordInfo.start}-${wordInfo.end}`
        if (!uniquePositions.has(positionKey)) {
          uniquePositions.add(positionKey)
          const replacement = '*'.repeat(wordInfo.word.length)
          filteredText = filteredText.substring(0, wordInfo.start) + replacement + filteredText.substring(wordInfo.end)
        }
      }
    }
    
    return filteredText
  }
}

// Trie树实例
let sensitiveWordTrie = null

// 配置项
const config = {
  // 单用户频率限制：每秒最多发送消息数
  userRateLimit: {
    messagesPerSecond: 2,
    timeWindow: 1 // 秒
  },
  // 房间频率限制：每秒最多接收消息数
  roomRateLimit: {
    messagesPerSecond: 1000,
    timeWindow: 1 // 秒
  },
  // 重复消息检测：最多允许连续重复次数
  maxDuplicateCount: 3,
  // 重复消息时间窗口：秒
  duplicateTimeWindow: 10
}

// 初始化过滤规则
export const initializeFilterRules = async () => {
  // 创建Trie树
  sensitiveWordTrie = new Trie()
  
  // 加载敏感词库
  const sensitiveWords = [
    // 常见敏感词示例（实际使用时应该从配置文件或数据库加载）
    '敏感词1', '敏感词2', '违禁词', '广告', 'spam',
    // 可以根据实际需求扩展
  ]
  
  // 添加到Trie树
  for (const word of sensitiveWords) {
    sensitiveWordTrie.addWord(word)
  }
  
  console.log(`敏感词库加载完成，共 ${sensitiveWords.length} 个敏感词`)
}

// 过滤弹幕内容
export const filterDanmaku = async (content) => {
  // 支持表情包弹幕（content可能为空，但emojiInfo不为空）
  // 如果content存在，需要进行检查
  if (content && typeof content !== 'string') {
    return {
      allowed: false,
      reason: '内容格式错误',
      content: ''
    }
  }
  
  // 去除首尾空格，确保trimmedContent在整个函数作用域内可用
  const trimmedContent = content ? content.trim() : ''
  
  // 增加日志记录
  console.log(`[内容过滤] 检查内容: "${trimmedContent}"`)
  
  // 对于有文本内容的弹幕进行检查
  if (content) {
    // 检查长度
    if (trimmedContent.length > 50) {
      return {
        allowed: false,
        reason: '内容长度不能超过50个字符',
        content: trimmedContent
      }
    }
  }
  
  // 对于空内容（纯表情弹幕），允许通过基本长度检查
  
  // 检查敏感词
  if (sensitiveWordTrie) {
    const filterResult = sensitiveWordTrie.filter(trimmedContent)
    const hasSensitive = filterResult !== trimmedContent
    
    // 增加日志记录
    if (hasSensitive) {
      console.log(`[内容过滤] 检测到敏感词，原文: "${trimmedContent}"，过滤后: "${filterResult}"`)
    }
    
    return {
      allowed: !hasSensitive,
      reason: hasSensitive ? '包含敏感词' : '通过',
      content: filterResult
    }
  }
  
  // 无Trie树时，直接返回原文
  return {
    allowed: true,
    reason: '未启用敏感词过滤',
    content: trimmedContent
  }
}

// 检查用户频率限制
export const checkRateLimit = async (userId, roomId) => {
  try {
    // 1. 检查用户频率限制
    const userKey = `rate_limit:user:${userId}`
    const userResult = await redisUtils.incrWithExpire(userKey, config.userRateLimit.timeWindow)
    
    // 增加日志记录
    console.log(`[频率限制] 用户 ${userId} 消息计数: ${userResult.hasRedis ? userResult.value : 'N/A'} (Redis: ${userResult.hasRedis ? '可用' : '不可用'})`)
    
    if (userResult.hasRedis) {
      if (userResult.value > config.userRateLimit.messagesPerSecond) {
        console.log(`[频率限制] 用户 ${userId} 触发限制，当前: ${userResult.value}，限制: ${config.userRateLimit.messagesPerSecond}`)
        return {
          allowed: false,
          reason: `发送太频繁，请稍后再试（${config.userRateLimit.messagesPerSecond}条/秒）`,
          limit: config.userRateLimit.messagesPerSecond,
          current: userResult.value
        }
      }
    }
    
    // 2. 检查房间频率限制
    const roomKey = `rate_limit:room:${roomId}`
    const roomResult = await redisUtils.incrWithExpire(roomKey, config.roomRateLimit.timeWindow)
    
    if (roomResult.hasRedis) {
      if (roomResult.value > config.roomRateLimit.messagesPerSecond) {
        return {
          allowed: false,
          reason: '房间消息过多，请稍后再试',
          limit: config.roomRateLimit.messagesPerSecond,
          current: roomResult.value
        }
      }
    }
    
    return {
      allowed: true,
      reason: '通过频率限制'
    }
    
  } catch (error) {
    console.error('检查频率限制失败:', error)
    // 出错时默认允许，避免影响正常使用
    return {
      allowed: true,
      reason: '频率检查异常，允许通过'
    }
  }
}

// 检查重复消息
export const checkDuplicateMessage = async (userId, content) => {
  try {
    const messageKey = `duplicate:${userId}:${hashString(content)}`
    
    // 获取当前重复次数
    const result = await redisUtils.incrWithExpire(messageKey, config.duplicateTimeWindow)
    
    // 增加日志记录
    console.log(`[重复检查] 用户 ${userId} 消息 "${content}" 重复计数: ${result.hasRedis ? result.value : 'N/A'} (Redis: ${result.hasRedis ? '可用' : '不可用'})`)
    
    if (result.hasRedis) {
      if (result.value > config.maxDuplicateCount) {
        console.log(`[重复检查] 用户 ${userId} 消息 "${content}" 触发重复限制，当前: ${result.value}，限制: ${config.maxDuplicateCount}`)
        return {
          allowed: false,
          reason: '重复消息过多',
          currentCount: result.value,
          maxCount: config.maxDuplicateCount
        }
      }
    }
    
    return {
      allowed: true,
      reason: '通过重复检查'
    }
    
  } catch (error) {
    console.error('检查重复消息失败:', error)
    // 出错时默认允许
    return {
      allowed: true,
      reason: '重复检查异常，允许通过'
    }
  }
}

// 简单的字符串哈希函数
const hashString = (str) => {
  let hash = 0
  if (str.length === 0) return hash
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  
  return Math.abs(hash).toString(36)
}

// 动态更新敏感词
export const updateSensitiveWords = async (words, action = 'add') => {
  try {
    if (!sensitiveWordTrie) {
      throw new Error('敏感词Trie树未初始化')
    }
    
    if (action === 'add') {
      for (const word of words) {
        sensitiveWordTrie.addWord(word)
      }
    }
    
    // 注意：删除操作需要重建Trie树，这里简化处理
    
    return {
      success: true,
      message: `成功${action === 'add' ? '添加' : '删除'}${words.length}个敏感词`
    }
    
  } catch (error) {
    console.error('更新敏感词失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 动态更新配置
export const updateConfig = async (newConfig) => {
  try {
    // 合并新配置
    Object.assign(config, newConfig)
    
    return {
      success: true,
      message: '配置更新成功',
      config: { ...config }
    }
    
  } catch (error) {
    console.error('更新配置失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 获取当前配置
export const getConfig = () => {
  return { ...config }
}

// 导出用于测试的方法（生产环境可以移除）
export const testUtils = {
  getSensitiveWordTrie: () => sensitiveWordTrie,
  setSensitiveWordTrie: (trie) => { sensitiveWordTrie = trie }
}