# 国际化支持系统使用指南

## 概述

本项目实现了一个完整的国际化(i18n)支持系统，允许应用在不同语言环境下向用户提供本地化内容。本文档详细介绍了系统的架构、使用方法和扩展指南。

## 系统架构

国际化系统位于 `backend/src/i18n/` 目录下，采用模块化设计：

```
i18n/
├── index.js          # 核心i18n实现和中间件
├── locales/          # 语言包目录
│   ├── zh-CN.js      # 中文语言包
│   ├── en-US.js      # 英文语言包
│   └── ja-JP.js      # 日语语言包
├── example.js        # 使用示例
└── README.md         # 本文档
```

## 主要功能特性

1. **多语言支持**：支持中文、英文、日语等多种语言
2. **命名空间组织**：翻译文本按功能模块组织，便于管理
3. **中间件集成**：与Express无缝集成，支持请求级别的语言切换
4. **变量替换**：支持动态文本中的变量替换
5. **回退语言**：当特定语言包中缺少翻译时，自动回退到默认语言
6. **Socket.IO支持**：为WebSocket连接提供国际化支持
7. **开发模式验证**：在开发环境自动验证语言包的完整性
8. **复数形式支持**：为不同语言提供特定的复数规则处理
9. **性能优化缓存**：内置缓存机制，提高翻译效率
10. **高级语言包验证**：支持JSON、Markdown等多种格式的验证报告生成

## 在路由中使用

### 1. 基本使用方法

```javascript
// 在路由处理函数中使用req.t()获取翻译文本
router.get('/example', (req, res) => {
  const message = req.t('common.success')
  res.json({ message })
})
```

### 2. 带变量替换的翻译

```javascript
router.get('/greeting', (req, res) => {
  const username = req.query.username || 'Guest'
  const greeting = req.t('auth.loginSuccess', { username })
  res.json({ greeting })
})
```

### 3. 使用复数形式

```javascript
router.get('/messages', (req, res) => {
  const count = parseInt(req.query.count) || 0
  const message = req.t('common.messageCount', { count })
  res.json({ 
    message, 
    count 
  })
  // 当count=1时: { message: "You have 1 message", count: 1 }
  // 当count=5时: { message: "You have 5 messages", count: 5 }
})
```

### 3. 动态切换语言

可以通过查询参数 `?lang=en-US` 或 `Accept-Language` 头来指定语言。也可以在代码中手动切换：

```javascript
router.post('/change-language', (req, res) => {
  const newLang = req.body.language
  if (req.changeLocale(newLang)) {
    res.json({ success: true, message: req.t('common.success') })
  } else {
    res.status(400).json({ error: req.t('errors.invalidLanguage') })
  }
})
```

## 在Socket.IO中使用

系统提供了Socket.IO适配器，用于在WebSocket事件处理中提供国际化支持：

```javascript
import { io } from '../index.js'
import { i18n } from './index.js'

// 获取Socket.IO适配器
const socketAdapter = i18n.socketAdapter()

io.on('connection', (socket) => {
  // 获取当前socket的翻译函数
  const t = socketAdapter.getTranslator(socket)
  
  // 使用翻译函数发送消息
  socket.emit('welcome', {
    message: t('auth.welcome')
  })
})
```

## 在服务层使用

在不依赖请求对象的地方（如服务层、工具函数），可以直接使用i18n实例：

```javascript
import i18n from './i18n/index.js'

class NotificationService {
  sendNotification(userId, messageKey, locale = 'zh-CN') {
    const message = i18n.t(messageKey, locale)
    // 发送通知的逻辑...
  }
}
```

## 语言包结构

语言包采用模块化结构，每个语言独立文件，按命名空间组织：

```javascript
// en-US.js 示例结构
const enUS = {
  common: {
    success: 'Success',
    error: 'Error',
    loading: 'Loading...',
    // 复数形式示例
    messageCount: ['You have {{count}} message', 'You have {{count}} messages']
  },
  auth: {
    login: 'Login',
    logout: 'Logout',
    loginSuccess: 'Welcome back, {{username}}!'
  }
}

export default enUS
```

### 可用的命名空间

- **common**: 通用文本（成功/失败消息、按钮文本等）
- **auth**: 认证相关文本（登录、注册、权限等）
- **danmaku**: 弹幕相关文本（发送、内容规则等）
- **admin**: 管理后台文本
- **statistics**: 统计相关文本
- **errors**: 错误消息
- **success**: 成功消息

## 添加新语言

要添加新的语言支持，请按照以下步骤操作：

1. 在 `locales/` 目录下创建新的语言文件，如 `ko-KR.js`
2. 复制现有语言包的结构，并翻译所有文本
3. 在 `i18n/index.js` 中导入并注册新语言包

示例：

```javascript
// 1. 创建 ko-KR.js
// 2. 添加到 index.js 中
import koKR from './locales/ko-KR.js'

// 在初始化时添加新语言
i18n.addLocale('ko-KR', koKR)
```

## 扩展现有语言包

要为现有语言添加新的翻译文本，请直接编辑对应的语言文件：

1. 确定要添加的文本所属的命名空间
2. 在相应位置添加键值对
3. 确保为所有支持的语言添加相同的键（保持一致性）

## 最佳实践

1. **保持键的一致性**：在所有语言包中使用相同的键名
2. **使用描述性键名**：避免使用数字或过于简单的键名
3. **合理使用命名空间**：按功能模块组织翻译文本
4. **测试不同语言**：确保所有语言下的应用都能正常工作
5. **考虑文化差异**：注意不同语言的语法和格式化习惯
6. **避免在翻译文本中硬编码**：使用变量替换动态内容

## 高级功能

### 复数形式支持

不同语言有不同的复数规则，系统支持为每种语言配置特定的复数规则：

```javascript
// 复数形式语言包定义示例
const enUS = {
  common: {
    // 数组形式定义复数形式，按顺序对应不同规则
    itemCount: [
      '{{count}} item',    // 规则0: 单数形式 (count=1)
      '{{count}} items'    // 规则1: 复数形式 (count>1)
    ]
  }
}
```

系统内置了常见语言的复数规则：
- 中文/日语：无复数区分
- 英文：0和1使用单数，其他使用复数

可以自定义复数规则：

```javascript
// 添加自定义复数规则
i18n.addPluralRule('fr-FR', (count) => {
  if (count === 0) return 0      // 零
  if (count === 1) return 1      // 单数
  return 2                        // 复数
})
```

### 缓存机制

为提高性能，系统内置了缓存机制，可以配置缓存选项：

```javascript
// 配置缓存
i18n.configureCache({
  enabled: true,      // 启用/禁用缓存
  maxSize: 5000       // 最大缓存条目数
})

// 手动清除缓存
i18n.clearCache()
```

缓存键由语言、键名、复数形式和替换对象组成，确保不同参数的相同键不会相互影响。

### 语言包验证工具

系统提供了增强的语言包验证功能，支持生成不同格式的验证报告：

```javascript
// 生成控制台格式报告
i18n.generateValidationReport()

// 生成JSON格式报告
const jsonReport = i18n.generateValidationReport('json')

// 生成Markdown格式报告
const mdReport = i18n.generateValidationReport('markdown')
```

验证报告包含：
- 各语言包的覆盖率统计
- 缺失和额外的翻译键
- 复数形式一致性问题
- 总体验证状态

## 故障排除

### 常见问题

1. **翻译不显示**：检查键名是否正确，以及是否在请求处理函数中使用了 `req.t()`
2. **变量不替换**：确保传递的替换对象包含正确的键名
3. **语言切换不生效**：检查语言代码是否正确，以及中间件是否正确注册
4. **Socket.IO中翻译不工作**：确保使用了正确的适配器方法获取翻译函数
5. **复数形式不正确**：检查语言包是否使用数组形式定义复数形式，并确保传递了count参数
6. **缓存问题**：在开发环境中可以临时禁用缓存：`i18n.configureCache({ enabled: false })`

### 调试技巧

1. 在开发环境中，系统会自动验证语言包的完整性并打印警告
2. 生成详细的语言包验证报告：`i18n.generateValidationReport('markdown')`
3. 检查控制台是否有关于语言包的错误信息
4. 临时添加日志来检查当前使用的语言：`console.log(req.locale)`
5. 对于缓存问题，可以在翻译前添加日志：`console.log('Cache enabled:', i18n.cacheEnabled)`

## 性能考虑

1. **内置缓存机制**：系统自动缓存翻译结果，减少重复计算
2. **缓存大小限制**：可配置最大缓存条目数，避免内存过度使用
3. **惰性缓存淘汰**：当缓存达到上限时，自动删除最早的缓存条目
4. **避免在高频调用的循环中进行复杂的变量替换**
5. **缓存键设计**：缓存键考虑了语言、键名、复数形式和替换对象，确保正确性
6. **按需启用/禁用**：可以根据环境和需求动态配置缓存选项

## 相关资源

- `example.js`: 包含完整的使用示例
- 查看 `index.js` 了解底层实现细节
- 参考各语言包文件了解现有翻译文本

---

通过以上指南，您应该能够充分利用本项目的国际化支持系统。如果有任何改进建议或功能需求，请随时提出。