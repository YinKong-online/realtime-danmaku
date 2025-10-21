// 国际化支持模块

// 导入语言包
import zhCN from './locales/zh-CN.js'
import enUS from './locales/en-US.js'
import jaJP from './locales/ja-JP.js'

class I18n {
  constructor() {
    this.locales = {}
    this.defaultLocale = 'zh-CN'
    this.fallbackLocale = 'zh-CN' // 回退语言
    this.logger = console
    
    // 缓存机制
    this.cache = new Map()
    this.cacheEnabled = true
    this.cacheMaxSize = 10000 // 缓存最大条目数
    
    // 复数形式规则配置
    this.pluralRules = {
      // 中文: 没有复数形式区分
      'zh-CN': (count) => 0,
      'ja-JP': (count) => 0,
      // 英文: 规则: 0和1使用单数，其他使用复数
      'en-US': (count) => {
        if (count === 0 || count === 1) return 0
        return 1
      }
      // 可以添加更多语言的复数规则
    }
  }

  // 添加语言包
  addLocale(locale, messages) {
    if (!locale || typeof locale !== 'string') {
      throw new Error('语言代码必须是非空字符串')
    }
    this.locales[locale] = messages
    return this
  }

  // 批量添加语言包
  addLocales(locales) {
    if (!locales || typeof locales !== 'object') {
      throw new Error('locales参数必须是对象')
    }
    
    Object.entries(locales).forEach(([locale, messages]) => {
      this.addLocale(locale, messages)
    })
    
    return this
  }

  // 设置默认语言
  setDefaultLocale(locale) {
    if (!this.locales[locale]) {
      throw new Error(`未找到语言包: ${locale}`)
    }
    this.defaultLocale = locale
    return this
  }

  // 设置回退语言
  setFallbackLocale(locale) {
    if (!this.locales[locale]) {
      throw new Error(`未找到语言包: ${locale}`)
    }
    this.fallbackLocale = locale
    return this
  }

  // 获取翻译
  t(key, locale = this.defaultLocale, replacements = {}) {
    if (!key || typeof key !== 'string') {
      return key
    }
    
    // 检查是否有复数形式需求
    let count = null
    if (replacements && typeof replacements.count !== 'undefined') {
      count = replacements.count
    }
    
    // 生成缓存键
    const cacheKey = `${locale}:${key}:${count || 'singular'}:${JSON.stringify(replacements)}`
    
    // 尝试从缓存获取
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    // 确定使用的语言包
    let localeMessages = this.locales[locale]
    let fallbackMessages = this.locales[this.fallbackLocale]
    
    // 如果找不到指定语言，使用默认语言
    if (!localeMessages) {
      this.logger.warn(`未找到语言包: ${locale}，使用默认语言`)
      localeMessages = this.locales[this.defaultLocale]
    }

    // 尝试从指定语言包中获取翻译
    let value = this._getValueFromPath(localeMessages, key)
    
    // 处理复数形式
    if (count !== null && Array.isArray(value)) {
      const rule = this.pluralRules[locale] || this.pluralRules[this.defaultLocale]
      const index = rule(count)
      // 确保索引在有效范围内
      if (index >= 0 && index < value.length) {
        value = value[index]
      } else {
        // 如果索引无效，使用第一个形式
        value = value[0]
      }
    }
    
    // 如果在指定语言包中找不到，尝试从回退语言包中获取
    if (value === key && fallbackMessages && fallbackMessages !== localeMessages) {
      let fallbackValue = this._getValueFromPath(fallbackMessages, key)
      
      // 处理回退语言的复数形式
      if (count !== null && Array.isArray(fallbackValue)) {
        const rule = this.pluralRules[this.fallbackLocale]
        const index = rule(count)
        if (index >= 0 && index < fallbackValue.length) {
          fallbackValue = fallbackValue[index]
        } else {
          fallbackValue = fallbackValue[0]
        }
      }
      
      if (fallbackValue !== key) {
        value = fallbackValue
      }
    }

    // 处理变量替换
    if (typeof value === 'string') {
      value = this._replacePlaceholders(value, replacements)
      
      // 更新缓存
      if (this.cacheEnabled) {
        if (this.cache.size >= this.cacheMaxSize) {
          // 简单的缓存淘汰策略：删除第一个条目
          const firstKey = this.cache.keys().next().value
          this.cache.delete(firstKey)
        }
        this.cache.set(cacheKey, value)
      }
    }

    return value
  }

  // 从嵌套对象中获取值
  _getValueFromPath(obj, path) {
    if (!obj) return path
    
    const keys = path.split('.')
    let value = obj
    
    for (const k of keys) {
      if (value[k] === undefined) {
        return path // 未找到翻译，返回原键
      }
      value = value[k]
    }
    
    return value
  }

  // 替换占位符
  _replacePlaceholders(str, replacements) {
    if (!replacements || typeof replacements !== 'object') {
      return str
    }
    
    // 支持 {count} 特殊格式，确保数字被正确处理
    return str.replace(/\{([^}]*)\}/g, (match, key) => {
      if (replacements[key] !== undefined) {
        return replacements[key]
      }
      return match
    })
  }
  
  // 配置缓存
  configureCache(options) {
    if (options.enabled !== undefined) {
      this.cacheEnabled = options.enabled
      if (!options.enabled) {
        this.cache.clear()
      }
    }
    
    if (options.maxSize && typeof options.maxSize === 'number' && options.maxSize > 0) {
      this.cacheMaxSize = options.maxSize
    }
    
    return this
  }
  
  // 清除缓存
  clearCache() {
    this.cache.clear()
    return this
  }
  
  // 添加复数规则
  addPluralRule(locale, ruleFn) {
    if (!locale || typeof ruleFn !== 'function') {
      throw new Error('无效的语言代码或规则函数')
    }
    
    this.pluralRules[locale] = ruleFn
    return this
  }

  // 获取支持的语言列表
  getSupportedLocales() {
    return Object.keys(this.locales)
  }

  // 获取语言信息
  getLocaleInfo(locale = this.defaultLocale) {
    const locales = {
      'zh-CN': { name: '中文（简体）', nativeName: '中文（简体）', dir: 'ltr' },
      'en-US': { name: 'English (US)', nativeName: 'English (US)', dir: 'ltr' },
      'ja-JP': { name: 'Japanese', nativeName: '日本語', dir: 'ltr' }
    }
    
    return locales[locale] || { name: locale, nativeName: locale, dir: 'ltr' }
  }

  // 动态切换语言
  changeLocale(req, locale) {
    if (!req || !this.locales[locale]) {
      return false
    }
    
    req.locale = locale
    req.t = (key, replacements) => this.t(key, locale, replacements)
    if (req.res && req.res.locals) {
      req.res.locals.t = (key, replacements) => this.t(key, locale, replacements)
    }
    
    return true
  }

  // 创建Express中间件
  middleware() {
    return (req, res, next) => {
      // 从请求中获取语言偏好
      let locale = this._detectLocale(req)
      
      // 如果没有找到或不支持，使用默认语言
      if (!locale || !this.locales[locale]) {
        locale = this.defaultLocale
      }

      // 添加i18n方法到请求和响应对象
      req.locale = locale
      req.t = (key, replacements) => this.t(key, locale, replacements)
      res.locals.t = (key, replacements) => this.t(key, locale, replacements)
      res.locals.locale = locale
      res.locals.supportedLocales = this.getSupportedLocales().map(lang => ({
        code: lang,
        ...this.getLocaleInfo(lang)
      }))

      // 添加语言切换方法
      req.changeLocale = (newLocale) => this.changeLocale(req, newLocale)

      next()
    }
  }

  // 检测请求的语言偏好
  _detectLocale(req) {
    // 1. 从查询参数中获取
    if (req.query && req.query.lang) {
      return req.query.lang
    }
    
    // 2. 从请求头中获取
    if (req.headers && req.headers['accept-language']) {
      const acceptLanguage = req.headers['accept-language']
      // 解析 accept-language 头，获取首选语言
      const preferredLanguage = acceptLanguage.split(',')[0].split(';')[0].trim()
      
      // 检查是否有完全匹配的语言
      if (this.locales[preferredLanguage]) {
        return preferredLanguage
      }
      
      // 检查是否有部分匹配（如 en 匹配 en-US）
      const langCode = preferredLanguage.split('-')[0]
      for (const locale of Object.keys(this.locales)) {
        if (locale.startsWith(langCode)) {
          return locale
        }
      }
    }
    
    // 3. 从Cookie中获取（如果存在）
    if (req.cookies && req.cookies.lang) {
      return req.cookies.lang
    }
    
    // 4. 从Session中获取（如果存在）
    if (req.session && req.session.lang) {
      return req.session.lang
    }
    
    return null
  }

  // 为Socket.IO创建适配器
  socketAdapter() {
    return {
      // 获取适合Socket.IO使用的翻译函数
      getTranslator: (socket) => {
        // 尝试从socket.handshake中获取语言偏好
        const locale = socket.handshake.query?.lang || 
                      socket.handshake.headers?.['accept-language']?.split(',')[0]?.split(';')[0] || 
                      this.defaultLocale
        
        return (key, replacements) => this.t(key, locale, replacements)
      }
    }
  }

  // 验证所有语言包的完整性
  validateAllLocales() {
    const referenceKeys = this._getAllKeys(this.locales[this.defaultLocale])
    const validationResults = {}
    
    for (const [locale, messages] of Object.entries(this.locales)) {
      const localeKeys = this._getAllKeys(messages)
      const missingKeys = referenceKeys.filter(key => !localeKeys.includes(key))
      const extraKeys = localeKeys.filter(key => !referenceKeys.includes(key))
      
      // 检查复数形式一致性
      const pluralIssues = this._validatePluralForms(this.locales[this.defaultLocale], messages, locale)
      
      validationResults[locale] = {
        missingKeys,
        extraKeys,
        pluralIssues,
        isValid: missingKeys.length === 0 && extraKeys.length === 0 && pluralIssues.length === 0,
        totalKeys: localeKeys.length,
        coverage: ((localeKeys.length - missingKeys.length) / referenceKeys.length * 100).toFixed(2) + '%'
      }
    }
    
    return validationResults
  }
  
  // 验证复数形式的一致性
  _validatePluralForms(referenceMessages, localeMessages, locale) {
    const issues = []
    const referenceKeys = this._getAllKeys(referenceMessages)
    
    for (const key of referenceKeys) {
      const refValue = this._getValueFromPath(referenceMessages, key)
      const localeValue = this._getValueFromPath(localeMessages, key)
      
      // 如果参考值是数组（复数形式），但本地化值不是数组
      if (Array.isArray(refValue) && !Array.isArray(localeValue)) {
        issues.push({
          key,
          message: `复数形式不一致：参考语言使用数组表示复数形式，而 ${locale} 语言使用字符串`
        })
      }
      // 如果参考值是字符串，但本地化值是数组
      else if (!Array.isArray(refValue) && Array.isArray(localeValue)) {
        issues.push({
          key,
          message: `复数形式不一致：参考语言使用字符串，而 ${locale} 语言使用数组表示复数形式`
        })
      }
      // 如果两者都是数组，但长度不同
      else if (Array.isArray(refValue) && Array.isArray(localeValue) && refValue.length !== localeValue.length) {
        issues.push({
          key,
          message: `复数形式数组长度不同：参考语言 (${refValue.length}) vs ${locale} (${localeValue.length})`
        })
      }
    }
    
    return issues
  }
  
  // 生成详细的验证报告
  generateValidationReport(format = 'console') {
    const results = this.validateAllLocales()
    let report = ''
    
    // 计算总体统计
    let totalIssues = 0
    for (const [, result] of Object.entries(results)) {
      totalIssues += result.missingKeys.length + result.extraKeys.length + result.pluralIssues.length
    }
    
    if (format === 'json') {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        defaultLocale: this.defaultLocale,
        totalIssues,
        localeCount: Object.keys(results).length,
        locales: results
      }, null, 2)
    } else if (format === 'markdown') {
      report = `# 国际化语言包验证报告\n\n`
      report += `**生成时间**: ${new Date().toISOString()}\n`
      report += `**默认语言**: ${this.defaultLocale}\n`
      report += `**总问题数**: ${totalIssues}\n\n`
      
      report += `## 各语言包状态\n\n`
      report += `| 语言 | 有效 | 覆盖率 | 缺失键 | 额外键 | 复数问题 |\n`
      report += `|------|------|--------|--------|--------|----------|\n`
      
      for (const [locale, result] of Object.entries(results)) {
        report += `| ${locale} | ${result.isValid ? '✅' : '❌'} | ${result.coverage} | ${result.missingKeys.length} | ${result.extraKeys.length} | ${result.pluralIssues.length} |\n`
      }
      
      // 添加详细问题描述
      for (const [locale, result] of Object.entries(results)) {
        if (!result.isValid) {
          report += `\n## ${locale} 问题详情\n\n`
          
          if (result.missingKeys.length > 0) {
            report += `### 缺失的翻译键\n\n`
            report += '```\n'
            report += result.missingKeys.slice(0, 10).join('\n')
            if (result.missingKeys.length > 10) {
              report += `\n... 以及其他 ${result.missingKeys.length - 10} 个键\n`
            }
            report += '```\n\n'
          }
          
          if (result.pluralIssues.length > 0) {
            report += `### 复数形式问题\n\n`
            report += '```\n'
            result.pluralIssues.slice(0, 5).forEach(issue => {
              report += `${issue.key}: ${issue.message}\n`
            })
            if (result.pluralIssues.length > 5) {
              report += `... 以及其他 ${result.pluralIssues.length - 5} 个问题\n`
            }
            report += '```\n\n'
          }
        }
      }
    } else {
      // 默认控制台格式
      report = `国际化语言包验证报告\n`
      report += `======================\n`
      report += `生成时间: ${new Date().toISOString()}\n`
      report += `默认语言: ${this.defaultLocale}\n`
      report += `总问题数: ${totalIssues}\n\n`
      
      for (const [locale, result] of Object.entries(results)) {
        report += `[${locale}] ${result.isValid ? '✅ 验证通过' : '❌ 验证失败'}\n`
        report += `  覆盖率: ${result.coverage}\n`
        report += `  缺失键: ${result.missingKeys.length}\n`
        report += `  额外键: ${result.extraKeys.length}\n`
        report += `  复数问题: ${result.pluralIssues.length}\n`
        
        if (!result.isValid && result.missingKeys.length > 0) {
          report += `  缺失键示例: ${result.missingKeys.slice(0, 3).join(', ')}\n`
        }
        
        report += '\n'
      }
    }
    
    return report
  }

  // 获取对象中所有嵌套键
  _getAllKeys(obj, prefix = '') {
    let keys = []
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      
      if (typeof value === 'object' && value !== null) {
        keys = [...keys, ...this._getAllKeys(value, fullKey)]
      } else {
        keys.push(fullKey)
      }
    }
    
    return keys
  }
}

// 创建i18n实例
const i18n = new I18n()

// 加载所有语言包
i18n.addLocales({
  'zh-CN': zhCN,
  'en-US': enUS,
  'ja-JP': jaJP
})

// 设置默认语言和回退语言
i18n.setDefaultLocale('zh-CN')
i18n.setFallbackLocale('zh-CN')

// 验证语言包完整性（开发环境）
if (process.env.NODE_ENV !== 'production') {
  // 使用新的报告生成功能
  const report = i18n.generateValidationReport()
  if (report.includes('❌')) {
    console.warn(report)
  } else {
    console.log('所有语言包验证通过')
  }
}

// 导出i18n实例和I18n类
export default i18n
export { I18n }