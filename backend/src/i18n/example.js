// i18n使用示例

/**
 * 这个文件展示了如何在路由和控制器中使用i18n模块
 * 包含新增的复数形式支持、缓存配置和验证工具功能
 * 
 * 基本使用步骤：
 * 1. 确保i18n中间件已在app.js中注册：app.use(i18n.middleware())
 * 2. 在路由处理函数中通过req.t()方法获取翻译文本
 * 3. 可以通过查询参数?lang=en-US动态切换语言
 */

// 导入i18n实例（直接使用时）
import i18n from './index.js'

/**
 * 示例1：在路由处理函数中使用i18n
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const exampleRouteHandler = (req, res) => {
  // 1. 使用req.t()获取翻译文本
  const successMessage = req.t('common.success')
  const welcomeMessage = req.t('admin.welcome')
  
  // 2. 使用变量替换
  const greeting = req.t('auth.loginSuccess', {
    username: req.query.username || 'Guest'
  })
  
  // 3. 使用复数形式（新增）
  const messageCount = parseInt(req.query.count) || 1
  const messageText = req.t('common.messageCount', {
    count: messageCount
  })
  
  // 3. 发送响应
  res.json({
    success: true,
    message: successMessage,
    greeting,
    welcome: welcomeMessage,
    messageCount: messageText, // 复数形式示例
    currentLocale: req.locale,
    supportedLocales: req.res.locals.supportedLocales
  })
}

/**
 * 示例2：动态切换语言
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const changeLanguageHandler = (req, res) => {
  const newLang = req.query.lang
  
  if (!newLang) {
    return res.status(400).json({
      error: req.t('errors.validation'),
      message: req.t('common.error')
    })
  }
  
  // 使用req.changeLocale()方法切换语言
  const success = req.changeLocale(newLang)
  
  if (success) {
    // 切换成功，所有后续的req.t()调用将使用新语言
    res.json({
      success: true,
      message: req.t('common.success'),
      newLocale: req.locale
    })
  } else {
    res.status(400).json({
      error: req.t('errors.validation'),
      message: req.t('common.error')
    })
  }
}

/**
 * 示例3：在Socket.IO事件处理中使用i18n
 * @param {import('socket.io').Server} io
 */
export const setupSocketI18n = (io) => {
  // 获取Socket.IO适配器
  const socketAdapter = i18n.socketAdapter()
  
  io.on('connection', (socket) => {
    // 获取当前socket的翻译函数
    const t = socketAdapter.getTranslator(socket)
    
    // 使用翻译函数发送国际化消息
    socket.emit('welcome', {
      message: t('auth.welcome')
    })
    
    // 在事件处理中使用
    socket.on('send-danmaku', (data) => {
      // 验证失败时发送翻译后的错误消息
      if (!data.content) {
        socket.emit('error', {
          message: t('danmaku.contentEmpty')
        })
        return
      }
      
      // 成功处理后的反馈
      socket.emit('success', {
        message: t('danmaku.sendSuccess')
      })
    })
  })
}

/**
 * 示例4：在不依赖请求对象的地方使用i18n
 * （如服务层、工具函数等）
 */
export const notificationService = {
  /**
   * 发送通知
   * @param {string} userId
   * @param {string} messageKey
   * @param {object} replacements
   * @param {string} locale
   */
  sendNotification: (userId, messageKey, replacements = {}, locale = 'zh-CN') => {
    // 直接使用i18n.t()方法，传入指定的语言
    const message = i18n.t(messageKey, locale, replacements)
    
    console.log(`[${locale}] Sending notification to ${userId}: ${message}`)
    // 实际发送通知的逻辑...
    return {
      userId,
      message,
      locale,
      timestamp: new Date()
    }
  },
  
  /**
   * 发送带有复数形式的通知
   * @param {string} userId
   * @param {string} messageKey
   * @param {number} count
   * @param {string} locale
   */
  sendCountNotification: (userId, messageKey, count, locale = 'zh-CN') => {
    // 使用复数形式发送通知
    const message = i18n.t(messageKey, locale, { count })
    
    console.log(`[${locale}] Sending count notification to ${userId}: ${message} (count: ${count})`)
    return {
      userId,
      message,
      count,
      locale,
      timestamp: new Date()
    }
  }
}

/**
 * 示例5：错误处理中的i18n使用
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Error} error
 */
export const handleError = (req, res, error) => {
  let errorKey = 'errors.unexpected'
  let statusCode = 500
  
  // 根据错误类型选择不同的错误消息键
  if (error.name === 'ValidationError') {
    errorKey = 'errors.validation'
    statusCode = 400
  } else if (error.code === 'NOT_FOUND') {
    errorKey = 'errors.notFound'
    statusCode = 404
  } else if (error.code === 'UNAUTHORIZED') {
    errorKey = 'errors.permission'
    statusCode = 401
  }
  
  // 使用i18n返回本地化的错误消息
  res.status(statusCode).json({
    success: false,
    error: req.t(errorKey),
    // 开发环境可以返回原始错误详情
    ...(process.env.NODE_ENV !== 'production' && { details: error.message })
  })
}

/**
 * 示例6：批量获取翻译文本
 * @param {import('express').Request} req
 * @param {string[]} keys
 * @returns {Object<string, string>} 键值对形式的翻译文本
 */
export const getTranslations = (req, keys) => {
  const translations = {}
  
  for (const key of keys) {
    translations[key] = req.t(key)
  }
  
  return translations
}

/**
 * 示例7：配置i18n缓存（新增）
 * 在应用启动时配置缓存选项
 */
export const configureI18nCache = () => {
  // 配置缓存
  i18n.configureCache({
    enabled: true,        // 启用缓存
    maxSize: 5000         // 最大缓存条目数
  })
  
  console.log('i18n缓存已配置')
  return i18n
}

/**
 * 示例8：生成语言包验证报告（新增）
 * 用于开发和测试阶段检查语言包的完整性
 */
export const validateLocales = (format = 'console') => {
  // 生成验证报告
  const report = i18n.generateValidationReport(format)
  
  if (format === 'console') {
    console.log(report)
  } else if (format === 'json') {
    // 可以保存到文件
    const fs = require('fs')
    fs.writeFileSync('./i18n-validation-report.json', report)
    console.log('验证报告已保存到 i18n-validation-report.json')
  } else if (format === 'markdown') {
    // 可以保存到文件
    const fs = require('fs')
    fs.writeFileSync('./i18n-validation-report.md', report)
    console.log('验证报告已保存到 i18n-validation-report.md')
  }
  
  return report
}

/**
 * 示例9：自定义复数规则（新增）
 * 为特定语言添加自定义复数规则
 */
export const addCustomPluralRules = () => {
  // 为西班牙语添加复数规则
  i18n.addPluralRule('es-ES', (count) => {
    if (count === 1) return 0        // 单数
    if (count === 0 || (count > 1 && count < 20)) return 1  // 复数形式1
    return 2                          // 复数形式2
  })
  
  console.log('自定义复数规则已添加')
  return i18n
}

/**
 * 如何在路由文件中集成这些示例：
 * 
 * import express from 'express'
 * import { exampleRouteHandler, changeLanguageHandler } from '../i18n/example.js'
 * 
 * const router = express.Router()
 * 
 * // 使用示例路由
 * router.get('/example', exampleRouteHandler)
 * router.get('/change-language', changeLanguageHandler)
 * 
 * export default router
 */

/**
 * 如何在Socket.IO中设置：
 * 
 * import { setupSocketI18n } from './i18n/example.js'
 * 
 * // 在初始化Socket.IO后调用
 * setupSocketI18n(io)
 */

// 导出所有示例函数供其他模块使用
export default {
  exampleRouteHandler,
  changeLanguageHandler,
  setupSocketI18n,
  notificationService,
  handleError,
  getTranslations
}