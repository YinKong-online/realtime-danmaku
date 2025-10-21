# 实时弹幕组件库

一个功能强大、易于集成的实时弹幕组件库，支持Vue、React和原生JavaScript，适用于Web、移动APP和小程序等多平台环境。

## 📖 快速开始

### 安装

```bash
# NPM
npm install danmaku-components --save

# Yarn
yarn add danmaku-components

# PNPM
pnpm add danmaku-components
```

## 🚀 核心功能特性

- 📱 **多平台适配**：支持Web、移动设备和小程序环境
- 🔧 **多框架支持**：提供Vue 3、React和原生JavaScript组件
- 🎨 **高度可定制**：支持自定义样式、动画效果、弹幕类型
- 🚀 **性能优化**：通道分配、动画优化、内存管理
- 🌐 **响应式**：自动适配屏幕大小变化
- ⚡ **实时交互**：支持暂停/恢复、点击弹幕、清空等交互功能
- 👑 **管理员标识**：支持管理员弹幕特殊标记
- 😊 **表情弹幕**：支持文字和图片表情弹幕

## 📚 详细使用指南

### 直接引入

对于不使用构建工具的项目，可以直接通过CDN引入：

```html
<script src="https://unpkg.com/danmaku-components/dist/danmaku-components.umd.js"></script>
<link rel="stylesheet" href="https://unpkg.com/danmaku-components/dist/style.css">
```

### 本地开发

对于希望直接引用本地组件库的项目，可以通过相对路径导入：

```javascript
// Vue项目示例
import DanmakuRenderer from '../../danmaku-components/src/vue/DanmakuRenderer.vue'

// React项目示例
import DanmakuRenderer from '../../danmaku-components/src/react/DanmakuRenderer.tsx'
```

### 1. Vue 3 使用指南

#### 基础用法

```vue
<template>
  <div class="app-container">
    <!-- 弹幕容器 -->
    <DanmakuRendererVue
      ref="danmakuRef"
      :config="danmakuConfig"
      :danmaku="currentDanmaku"
      @pause="handleDanmakuPause"
      @resume="handleDanmakuResume"
      @container-click="handleContainerClick"
    />
    
    <!-- 弹幕输入控件 -->
    <div class="danmaku-input">
      <input 
        v-model="danmakuContent" 
        @keyup.enter="sendDanmaku" 
        placeholder="输入弹幕内容..." 
      />
      <button @click="sendDanmaku">发送</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { DanmakuRendererVue } from 'danmaku-components'
import type { Danmaku, DanmakuConfig, DanmakuType } from 'danmaku-components'

// 组件引用
const danmakuRef = ref<InstanceType<typeof DanmakuRendererVue> | null>(null)

// 弹幕数据
const danmakuContent = ref('')
const currentDanmaku = ref<Danmaku | null>(null)
const danmakuType = ref<DanmakuType>('scroll')

// 弹幕配置
const danmakuConfig = reactive<DanmakuConfig>({
  fullScreen: true,
  autoAdaptScreen: true,
  enableClickPause: true,
  enableTouchPause: true,
  showAdminBadge: true,
  defaultFontSize: 24,
  defaultOpacity: 0.9,
  channelCount: 12,
  minDisplayTime: 3000,
  maxDisplayTime: 8000
})

// 发送弹幕
function sendDanmaku() {
  if (!danmakuContent.value.trim()) return
  
  // 创建弹幕数据
  currentDanmaku.value = {
    id: Date.now().toString(),
    content: danmakuContent.value.trim(),
    type: danmakuType.value,
    userId: 'current-user-id',
    userName: '当前用户',
    avatar: 'user-avatar-url', // 可选
    color: getRandomColor(),
    fontSize: 24,
    opacity: 0.9,
    timestamp: Date.now(),
    isAdmin: false, // 设置为true可显示管理员标识
    userLevel: 5 // 用户等级，用于特殊样式
  }
  
  // 清空输入
  danmakuContent.value = ''
  
  // 清除引用以便下次发送（重要）
  setTimeout(() => {
    currentDanmaku.value = null
  }, 100)
}

// 工具函数：生成随机颜色
function getRandomColor(): string {
  const colors = ['#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
  return colors[Math.floor(Math.random() * colors.length)]
}

// 事件处理
function handleDanmakuPause() {
  console.log('弹幕已暂停')
}

function handleDanmakuResume() {
  console.log('弹幕已恢复')
}

function handleContainerClick() {
  // 点击容器时可以触发暂停/恢复
  if (danmakuRef.value) {
    // 这里可以添加判断逻辑
    danmakuRef.value.pause()
  }
}

// 监听配置变化
watch(() => danmakuConfig.defaultFontSize, (newSize) => {
  // 配置变化时可以在这里执行额外逻辑
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.danmaku-input {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

input {
  padding: 8px 12px;
  width: 300px;
  border: none;
  border-radius: 4px;
}

button {
  padding: 8px 20px;
  background-color: #4ECDC4;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}
</style>
```

### 2. React 使用指南

#### 基础用法

```tsx
import React, { useRef, useState, useCallback } from 'react'
import { DanmakuRendererReact } from 'danmaku-components'
import type { Danmaku, DanmakuConfig, DanmakuType } from 'danmaku-components'

function DanmakuApp() {
  // 组件引用
  const danmakuRef = useRef<any>(null)
  
  // 状态管理
  const [danmakuContent, setDanmakuContent] = useState('')
  const [currentDanmaku, setCurrentDanmaku] = useState<Danmaku | null>(null)
  const [danmakuType, setDanmakuType] = useState<DanmakuType>('scroll')
  const [isPaused, setIsPaused] = useState(false)
  
  // 弹幕配置
  const danmakuConfig: DanmakuConfig = {
    fullScreen: true,
    autoAdaptScreen: true,
    enableClickPause: true,
    enableTouchPause: true,
    showAdminBadge: true,
    defaultFontSize: 24,
    defaultOpacity: 0.9,
    channelCount: 12,
    minDisplayTime: 3000,
    maxDisplayTime: 8000
  }
  
  // 生成随机颜色
  const getRandomColor = useCallback((): string => {
    const colors = ['#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
    return colors[Math.floor(Math.random() * colors.length)]
  }, [])
  
  // 发送弹幕
  const sendDanmaku = useCallback(() => {
    if (!danmakuContent.trim()) return
    
    const newDanmaku: Danmaku = {
      id: Date.now().toString(),
      content: danmakuContent.trim(),
      type: danmakuType,
      userId: 'current-user-id',
      userName: '当前用户',
      avatar: 'user-avatar-url', // 可选
      color: getRandomColor(),
      fontSize: 24,
      opacity: 0.9,
      timestamp: Date.now(),
      isAdmin: false,
      userLevel: 5
    }
    
    setCurrentDanmaku(newDanmaku)
    setDanmakuContent('') // 清空输入
    
    // 清除引用以便下次发送（重要）
    setTimeout(() => {
      setCurrentDanmaku(null)
    }, 100)
  }, [danmakuContent, danmakuType, getRandomColor])
  
  // 控制方法
  const pauseDanmakus = useCallback(() => {
    danmakuRef.current?.pause()
    setIsPaused(true)
  }, [])
  
  const resumeDanmakus = useCallback(() => {
    danmakuRef.current?.resume()
    setIsPaused(false)
  }, [])
  
  const clearDanmakus = useCallback(() => {
    danmakuRef.current?.clear()
  }, [])
  
  // 事件处理
  const handleContainerClick = useCallback(() => {
    if (isPaused) {
      resumeDanmakus()
    } else {
      pauseDanmakus()
    }
  }, [isPaused, pauseDanmakus, resumeDanmakus])
  
  const handleDanmakuClick = useCallback((danmaku: Danmaku) => {
    console.log('弹幕被点击:', danmaku)
    // 可以实现弹幕举报、点赞等功能
  }, [])
  
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendDanmaku()
    }
  }, [sendDanmaku])
  
  return (
    <div className="danmaku-app">
      {/* 弹幕容器 */}
      <DanmakuRendererReact
        ref={danmakuRef}
        config={danmakuConfig}
        danmaku={currentDanmaku}
        onContainerClick={handleContainerClick}
        onDanmakuClick={handleDanmakuClick}
        onPause={() => setIsPaused(true)}
        onResume={() => setIsPaused(false)}
      />
      
      {/* 控制区域 */}
      <div className="controls">
        {/* 弹幕类型选择 */}
        <div className="danmaku-type-selector">
          {(['scroll', 'top', 'bottom', 'emoji'] as DanmakuType[]).map(type => (
            <button
              key={type}
              className={`type-btn ${danmakuType === type ? 'active' : ''}`}
              onClick={() => setDanmakuType(type)}
            >
              {type === 'scroll' ? '滚动' : 
               type === 'top' ? '顶部' : 
               type === 'bottom' ? '底部' : '表情'}
            </button>
          ))}
        </div>
        
        {/* 输入区域 */}
        <div className="input-area">
          <input
            type="text"
            value={danmakuContent}
            onChange={(e) => setDanmakuContent(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入弹幕内容..."
            maxLength={50}
          />
          <button onClick={sendDanmaku} disabled={!danmakuContent.trim()}>
            发送弹幕
          </button>
        </div>
        
        {/* 控制按钮 */}
        <div className="control-buttons">
          <button onClick={isPaused ? resumeDanmakus : pauseDanmakus}>
            {isPaused ? '恢复' : '暂停'}
          </button>
          <button onClick={clearDanmakus}>清空弹幕</button>
        </div>
      </div>
    </div>
  )
}

export default DanmakuApp
```

### 3. 原生 JavaScript 使用指南

#### 基础用法

```javascript
// 方法1: 使用模块化导入
import { DanmakuCoreRenderer } from 'danmaku-components'

// 方法2: 直接使用CDN引入的全局变量
// const { DanmakuCoreRenderer } = window.danmakuComponents

// 获取容器元素
const container = document.getElementById('danmaku-container')

// 创建渲染器实例
const renderer = new DanmakuCoreRenderer()

// 初始化配置
const config = {
  fullScreen: true,
  autoAdaptScreen: true,
  enableClickPause: true,
  enableTouchPause: true,
  showAdminBadge: true,
  defaultFontSize: 24,
  defaultOpacity: 0.9,
  channelCount: 12,
  minDisplayTime: 3000,
  maxDisplayTime: 8000,
  clearInterval: 60000 // 自动清理间隔
}

// 初始化渲染器
renderer.init(container, config)

// 生成随机颜色的工具函数
function getRandomColor() {
  const colors = ['#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
  return colors[Math.floor(Math.random() * colors.length)]
}

// 发送弹幕函数
function sendDanmaku(content, type = 'scroll') {
  const danmaku = {
    id: Date.now().toString(),
    content,
    type,
    userId: 'current-user-id',
    userName: '当前用户',
    color: getRandomColor(),
    fontSize: 24,
    opacity: 0.9,
    timestamp: Date.now(),
    isAdmin: false,
    userLevel: 5
  }
  
  renderer.render(danmaku)
}

// 绑定输入框事件
const inputElement = document.getElementById('danmaku-input')
const sendButton = document.getElementById('send-button')

inputElement.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const content = inputElement.value.trim()
    if (content) {
      sendDanmaku(content)
      inputElement.value = ''
    }
  }
})

sendButton.addEventListener('click', () => {
  const content = inputElement.value.trim()
  if (content) {
    sendDanmaku(content)
    inputElement.value = ''
  }
})

// 控制方法
function pauseDanmakus() {
  renderer.pause()
  console.log('弹幕已暂停')
}

function resumeDanmakus() {
  renderer.resume()
  console.log('弹幕已恢复')
}

function clearDanmakus() {
  renderer.clear()
  console.log('弹幕已清空')
}

function updateDanmakuSize(width, height) {
  renderer.updateSize(width, height)
}

// 监听窗口大小变化
window.addEventListener('resize', () => {
  const { width, height } = container.getBoundingClientRect()
  updateDanmakuSize(width, height)
})

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  renderer.destroy()
})
```

## 🛠️ 完整配置项

| 配置项 | 类型 | 默认值 | 说明 |
|-------|------|--------|------|
| containerWidth | number | 容器宽度 | 弹幕容器宽度，若设置了fullScreen则自动计算 |
| containerHeight | number | 容器高度 | 弹幕容器高度，若设置了fullScreen则自动计算 |
| channelCount | number | 10 | 弹幕通道数量，影响同时显示的滚动弹幕数量 |
| defaultFontSize | number | 20 | 默认字体大小，单位为px |
| defaultOpacity | number | 0.8 | 弹幕默认透明度，范围0-1 |
| minDisplayTime | number | 3000 | 滚动弹幕最小显示时间(ms) |
| maxDisplayTime | number | 8000 | 滚动弹幕最大显示时间(ms) |
| fixedDisplayTime | number | 3000 | 顶部/底部固定弹幕显示时间(ms) |
| clearInterval | number | 60000 | 自动清理过期弹幕的间隔时间(ms) |
| fullScreen | boolean | false | 是否全屏显示弹幕容器 |
| showAdminBadge | boolean | true | 是否显示管理员标识徽章 |
| enableClickPause | boolean | true | 是否允许点击容器暂停/恢复弹幕 |
| enableTouchPause | boolean | false | 是否允许触摸暂停(移动端优化) |
| autoAdaptScreen | boolean | true | 是否自动适配屏幕大小变化 |
| baseSpeed | number | 100 | 弹幕基础速度因子，值越大速度越快 |
| maxDanmakus | number | 500 | 同时显示的最大弹幕数量 |
| debug | boolean | false | 是否启用调试模式，会输出性能指标 |
| customClass | string | '' | 自定义CSS类名，用于样式覆盖 |

## ❓ 常见问题解答

### 1. 弹幕发送后没有显示怎么办？

- 确保弹幕数据格式正确，特别是`id`字段必须唯一
- 检查弹幕内容是否为空（非表情弹幕需要有content）
- 确认在发送后正确清除了currentDanmaku引用
- 查看控制台是否有错误信息

### 2. 如何优化大量弹幕时的性能？

- 减少`channelCount`值，避免同时显示过多弹幕
- 调整`minDisplayTime`和`maxDisplayTime`，控制弹幕停留时间
- 启用`autoAdaptScreen`让组件自动优化
- 限制单个用户的弹幕发送频率
- 考虑使用`maxDanmakus`限制同时显示的弹幕总数

### 3. 移动端触摸事件不灵敏？

- 确保启用了`enableTouchPause: true`
- 调整容器的触摸区域大小
- 检查是否有其他元素阻止了触摸事件冒泡

### 4. 如何自定义弹幕样式？

- 使用CSS覆盖默认样式，组件库使用了特定的类名前缀
- 通过配置`customClass`添加自定义样式类
- 对于特殊弹幕，可通过`userLevel`字段控制不同的样式

### 5. WebSocket连接断开后如何自动重连？

- 在`onclose`事件中设置定时器尝试重新连接
- 实现指数退避算法，避免频繁重连
- 重连前先检查网络状态

## 💡 最佳实践

### 性能优化

1. **合理设置通道数**：根据屏幕高度和弹幕字体大小调整`channelCount`
2. **限制弹幕频率**：服务端实现频率限制，如每用户每秒最多发送3条弹幕
3. **批量渲染**：对于大量历史弹幕，可以实现批量渲染逻辑
4. **资源预加载**：对于图片表情，实现预加载机制
5. **避免复杂样式**：简化弹幕样式，避免使用复杂的CSS动画

### 稳定性建议

1. **WebSocket重连机制**：实现可靠的重连逻辑和错误处理
2. **数据验证**：服务端验证所有弹幕数据，防止恶意数据
3. **内存管理**：定期清理不再需要的弹幕对象
4. **降级策略**：在极端情况下，实现弹幕降级显示策略

### 用户体验优化

1. **弹幕密度控制**：根据在线人数动态调整弹幕显示密度
2. **防遮挡设计**：重要内容区域（如视频播放器控制栏）可设置弹幕避让
3. **弹幕屏蔽**：提供用户自定义屏蔽功能（关键词、颜色等）
4. **透明度调节**：允许用户调整弹幕透明度
5. **字体大小调整**：提供多种字体大小选项

## 弹幕类型

- **scroll**: 滚动弹幕 (从右到左)
- **top**: 顶部固定弹幕
- **bottom**: 底部固定弹幕
- **emoji**: 表情弹幕
- **reverse**: 反向滚动弹幕 (从左到右)

## 📱 多平台适配指南

### Web端适配

```javascript
// 响应式容器示例
const config = {
  containerWidth: window.innerWidth,
  containerHeight: window.innerHeight * 0.8,
  autoAdaptScreen: true
};

// 监听窗口大小变化
window.addEventListener('resize', () => {
  // 重新设置容器大小
  danmakuRenderer.updateContainerSize({
    width: window.innerWidth,
    height: window.innerHeight * 0.8
  });
});
```

### 移动端优化

```javascript
const mobileConfig = {
  containerWidth: window.innerWidth,
  containerHeight: window.innerHeight,
  defaultFontSize: 16, // 移动端字体稍小
  channelCount: 6,     // 移动端通道数减少
  enableTouchPause: true,
  autoAdaptScreen: true
};

// 横屏切换处理
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    danmakuRenderer.updateContainerSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }, 200); // 延迟执行以获取正确的屏幕尺寸
});
```

### 小程序集成

**微信小程序示例 (使用原生组件)**:

```javascript
// 在页面初始化时
Page({
  data: {
    containerWidth: 375,
    containerHeight: 667
  },
  
  onLoad() {
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      containerWidth: systemInfo.windowWidth,
      containerHeight: systemInfo.windowHeight
    });
    
    // 初始化弹幕渲染器
    this.initDanmakuRenderer();
  },
  
  initDanmakuRenderer() {
    // 导入并初始化组件
    const DanmakuRenderer = require('danmaku-components/dist/mini/DanmakuRenderer');
    this.danmakuRenderer = new DanmakuRenderer({
      containerWidth: this.data.containerWidth,
      containerHeight: this.data.containerHeight,
      // 其他配置项
    });
  }
});
```

库提供了内置的平台适配工具：

```javascript
import { platformAdaptors, autoDetectPlatform } from 'danmaku-components'

// 自动检测平台
const platform = autoDetectPlatform() // 'web', 'mobile', 'applet'

// 获取平台特定配置
const config = platformAdaptors[platform].defaultConfig
```

### 4. WebSocket 实时弹幕集成

在实际项目中，弹幕系统通常需要通过WebSocket进行实时通信。以下是一个完整的集成示例：

#### Vue 3 WebSocket 集成示例

```vue
<template>
  <div class="danmaku-app">
    <DanmakuRendererVue
      ref="danmakuRef"
      :config="danmakuConfig"
      :danmaku="currentDanmaku"
      @container-click="handleContainerClick"
    />
    
    <!-- 其他UI组件 -->
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { DanmakuRendererVue } from 'danmaku-components'
import type { Danmaku, DanmakuConfig } from 'danmaku-components'

const danmakuRef = ref(null)
const currentDanmaku = ref<Danmaku | null>(null)
const danmakuConfig = reactive<DanmakuConfig>({
  fullScreen: true,
  autoAdaptScreen: true,
  enableClickPause: true,
  enableTouchPause: true,
  showAdminBadge: true,
  defaultFontSize: 24,
  defaultOpacity: 0.9,
  channelCount: 12,
  minDisplayTime: 3000,
  maxDisplayTime: 8000
})

// WebSocket连接管理
let socket: WebSocket | null = null
const roomId = 'live-room-1'
const userId = `user-${Math.random().toString(36).substr(2, 9)}`

// 连接WebSocket
function connectWebSocket() {
  // 在生产环境中，替换为实际的WebSocket服务器地址
  const wsUrl = import.meta.env.DEV 
    ? 'ws://localhost:8000/danmaku' 
    : 'wss://your-production-server.com/danmaku'
    
  socket = new WebSocket(wsUrl)
  
  socket.onopen = () => {
    console.log('WebSocket连接已建立')
    // 加入房间
    socket?.send(JSON.stringify({
      type: 'join-room',
      roomId,
      userId,
      userName: `用户${Math.floor(Math.random() * 1000)}`
    }))
  }
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      
      // 处理不同类型的消息
      switch (data.type) {
        case 'new-danmaku':
          // 接收到新弹幕
          renderDanmaku(data.danmaku)
          break
        case 'online-count':
          // 更新在线人数
          console.log('在线人数:', data.count)
          break
        case 'error':
          console.error('服务器错误:', data.message)
          break
        default:
          console.log('未知消息类型:', data)
      }
    } catch (error) {
      console.error('解析消息失败:', error)
    }
  }
  
  socket.onclose = () => {
    console.log('WebSocket连接已关闭')
    // 尝试重连
    setTimeout(connectWebSocket, 5000)
  }
  
  socket.onerror = (error) => {
    console.error('WebSocket错误:', error)
  }
}

// 渲染弹幕
function renderDanmaku(danmaku: Danmaku) {
  // 设置当前弹幕
  currentDanmaku.value = danmaku
  
  // 清除引用以便下次渲染（重要）
  setTimeout(() => {
    currentDanmaku.value = null
  }, 100)
}

// 发送弹幕到服务器
function sendDanmaku(content: string, type: string = 'scroll') {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket未连接')
    return
  }
  
  const danmaku = {
    id: Date.now().toString(),
    content,
    type,
    userId,
    userName: `用户${Math.floor(Math.random() * 1000)}`,
    color: getRandomColor(),
    fontSize: 24,
    opacity: 0.9,
    timestamp: Date.now()
  }
  
  socket.send(JSON.stringify({
    type: 'send-danmaku',
    roomId,
    danmaku
  }))
}

// 工具函数
function getRandomColor(): string {
  const colors = ['#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
  return colors[Math.floor(Math.random() * colors.length)]
}

function handleContainerClick() {
  // 点击处理逻辑
}

// 生命周期
onMounted(() => {
  connectWebSocket()
})

onUnmounted(() => {
  // 离开房间
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'leave-room',
      roomId,
      userId
    }))
  }
  // 关闭连接
  socket?.close()
})
</script>```

#### 服务器端设计建议

对于WebSocket服务器，建议实现以下功能：

1. **房间管理**：支持多房间隔离
2. **用户认证**：可选的用户身份验证
3. **消息广播**：向房间内所有用户广播弹幕
4. **频率限制**：防止单个用户发送过多弹幕
5. **内容过滤**：可选的敏感词过滤
6. **历史记录**：保存最近的弹幕记录

### 5. 表情弹幕使用指南

表情弹幕需要特殊处理，以下是使用示例：

```javascript
// 发送Unicode表情弹幕
function sendEmojiDanmaku(emojiUnicode) {
  const danmaku = {
    id: Date.now().toString(),
    content: '', // 表情弹幕内容为空
    type: 'emoji',
    userId: 'current-user',
    userName: '用户',
    emojiInfo: {
      type: 'unicode', // unicode表情
      value: emojiUnicode, // 例如: '😊'
      name: 'smile'
    },
    fontSize: 48, // 表情通常更大
    timestamp: Date.now()
  }
  
  renderer.render(danmaku)
}

// 发送图片表情弹幕
function sendImageEmojiDanmaku(emojiUrl) {
  const danmaku = {
    id: Date.now().toString(),
    content: '',
    type: 'emoji',
    userId: 'current-user',
    userName: '用户',
    emojiInfo: {
      type: 'image', // 图片表情
      value: emojiUrl, // 图片URL
      name: 'custom-emoji',
      width: 64, // 可选：图片宽度
      height: 64 // 可选：图片高度
    },
    timestamp: Date.now()
  }
  
  renderer.render(danmaku)
}
```

## ⚡ 性能优化建议

1. **合理设置通道数量**：根据屏幕高度调整
2. **限制弹幕频率**：服务器端进行频率限制
3. **优化样式**：避免复杂的CSS动画
4. **使用表情缓存**：缓存常用表情资源
5. **定期清理**：使用`clearInterval`配置自动清理
6. **对于低端设备优化**：降低 `channelCount` 和 `maxDanmakus` 值
7. **网络优化**：在网络条件较差时实现弹幕节流功能

## 🔧 开发环境配置

### 完整开发流程

1. **克隆仓库并安装依赖**
   ```bash
   git clone [repository-url]
   cd danmaku-components
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   # 开发服务器默认在 http://localhost:3000 启动
   ```

3. **运行测试**
   ```bash
   npm test
   ```

4. **构建生产版本**
   ```bash
   npm run build
   # 构建后的文件位于 dist 目录
   ```

5. **生成类型定义**
   ```bash
   npm run types
   ```

### 开发注意事项

- 开发时推荐使用 TypeScript 以获得更好的类型支持
- 组件使用 Vue 3 Composition API 和 React Hooks 实现，熟悉这些特性将有助于理解源码
- 性能敏感操作请在 requestAnimationFrame 中执行
- 测试新功能时建议使用模拟数据，避免依赖实际 WebSocket 连接

## 🖥️ 浏览器兼容性

### 桌面浏览器

- Chrome: 最新2个主要版本
- Firefox: 最新2个主要版本
- Safari: 最新2个主要版本
- Edge: 最新2个主要版本

### 移动浏览器

- iOS Safari: 最新2个主要版本
- Android Chrome: 最新2个主要版本
- Android WebView: 最新2个主要版本

### IE 兼容性

不支持 Internet Explorer。推荐用户升级到现代浏览器或使用兼容模式。

## 🌟 高级使用场景

### 1. 视频播放器集成

将弹幕系统与视频播放器完美结合，实现类似 B 站的弹幕体验：

```javascript
// Vue 3 视频+弹幕集成示例
const DanmakuVideoPlayer = {
  template: `
    <div class="video-container">
      <video ref="video" @timeupdate="onTimeUpdate" @play="onPlay" @pause="onPause"></video>
      <DanmakuRenderer 
        ref="danmakuRenderer"
        :config="danmakuConfig"
        :danmaku="currentDanmakus"
      />
    </div>
  `,
  setup() {
    const video = ref(null);
    const danmakuRenderer = ref(null);
    const currentDanmakus = ref([]);
    const historyDanmakus = ref([]); // 存储按时间戳排序的历史弹幕
    
    const danmakuConfig = reactive({
      containerWidth: 800,
      containerHeight: 450,
      channelCount: 8,
      enableClickPause: false, // 由视频播放器控制暂停
    });
    
    // 加载历史弹幕
    const loadHistoryDanmakus = async () => {
      const res = await fetch('/api/danmakus?videoId=123');
      const data = await res.json();
      historyDanmakus.value = data.sort((a, b) => a.timestamp - b.timestamp);
    };
    
    // 根据视频播放时间显示对应的弹幕
    const onTimeUpdate = () => {
      const currentTime = video.value.currentTime;
      const visibleDanmakus = historyDanmakus.value.filter(
        danmaku => Math.abs(danmaku.timestamp - currentTime) < 0.5
      );
      
      visibleDanmakus.forEach(danmaku => {
        if (!currentDanmakus.value.find(d => d.id === danmaku.id)) {
          currentDanmakus.value.push(danmaku);
        }
      });
    };
    
    const onPlay = () => {
      danmakuRenderer.value.resume();
    };
    
    const onPause = () => {
      danmakuRenderer.value.pause();
    };
    
    onMounted(() => {
      loadHistoryDanmakus();
    });
    
    return {
      video,
      danmakuRenderer,
      currentDanmakus,
      danmakuConfig,
      onTimeUpdate,
      onPlay,
      onPause
    };
  }
};
```

### 2. 实时弹幕过滤系统

实现基于用户设置的弹幕过滤功能：

```javascript
// React 弹幕过滤系统示例
function DanmakuFilterSystem() {
  const [filterSettings, setFilterSettings] = useState({
    keywords: [],
    minLevel: 0,
    maxSpeed: 999,
    hideColorful: false,
    hideTop: false,
    hideBottom: false,
    hideReverse: false
  });
  
  // 过滤函数
  const filterDanmaku = (danmaku) => {
    // 关键词过滤
    if (filterSettings.keywords.some(keyword => 
        danmaku.content?.includes(keyword)
    )) {
      return false;
    }
    
    // 用户等级过滤
    if (danmaku.userLevel < filterSettings.minLevel) {
      return false;
    }
    
    // 弹幕类型过滤
    if (filterSettings.hideTop && danmaku.type === 'top') return false;
    if (filterSettings.hideBottom && danmaku.type === 'bottom') return false;
    if (filterSettings.hideReverse && danmaku.type === 'reverse') return false;
    
    // 颜色过滤
    if (filterSettings.hideColorful && danmaku.color && danmaku.color !== '#ffffff') {
      return false;
    }
    
    return true;
  };
  
  // 在接收到弹幕时应用过滤
  const handleReceiveDanmaku = (danmaku) => {
    if (filterDanmaku(danmaku)) {
      addDanmaku(danmaku); // 添加到渲染队列
    }
  };
  
  // 过滤设置 UI
  return (
    <div className="danmaku-filter">
      <h3>弹幕过滤设置</h3>
      {/* 过滤设置表单组件 */}
      <DanmakuFilterForm 
        settings={filterSettings} 
        onChange={setFilterSettings} 
      />
    </div>
  );
}
```

### 3. 自定义弹幕样式与动画

创建带有特殊效果的自定义弹幕：

```javascript
// 自定义样式处理函数
const createSpecialDanmaku = (content, options = {}) => {
  const baseDanmaku = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    content,
    timestamp: Date.now(),
    color: '#ffffff',
    type: 'scroll',
    ...options
  };
  
  // 根据类型添加特殊样式
  if (options.specialType === 'highlight') {
    return {
      ...baseDanmaku,
      customStyle: {
        fontWeight: 'bold',
        textShadow: '0 0 10px #ff0000, 0 0 20px #ff0000, 0 0 30px #ff0000',
        animation: 'glow 1s infinite alternate'
      }
    };
  } else if (options.specialType === 'rainbow') {
    return {
      ...baseDanmaku,
      customStyle: {
        background: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'rainbow 3s linear infinite'
      }
    };
  }
  
  return baseDanmaku;
};

// 添加必要的CSS动画
const addDanmakuAnimations = () => {
  if (!document.getElementById('danmaku-animations')) {
    const style = document.createElement('style');
    style.id = 'danmaku-animations';
    style.textContent = `
      @keyframes glow {
        from { text-shadow: 0 0 5px #ff0000, 0 0 10px #ff0000; }
        to { text-shadow: 0 0 20px #ff0000, 0 0 30px #ff0000, 0 0 40px #ff0000; }
      }
      @keyframes rainbow {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
    `;
    document.head.appendChild(style);
  }
};
```

### 4. 批量弹幕导入与回放

实现弹幕的批量导入和定时回放功能：

```javascript
// 批量弹幕处理类
class DanmakuBatchProcessor {
  constructor(renderer) {
    this.renderer = renderer;
    this.queue = [];
    this.isPlaying = false;
    this.playbackSpeed = 1.0;
  }
  
  // 导入弹幕数据
  importDanmakus(danmakus) {
    // 按时间戳排序
    this.queue = [...danmakus].sort((a, b) => {
      return (a.timestamp || 0) - (b.timestamp || 0);
    });
    return this;
  }
  
  // 开始回放
  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this._processQueue();
    return this;
  }
  
  // 暂停回放
  pause() {
    this.isPlaying = false;
    return this;
  }
  
  // 设置回放速度
  setSpeed(speed) {
    this.playbackSpeed = speed;
    return this;
  }
  
  // 清空队列
  clear() {
    this.queue = [];
    this.isPlaying = false;
    return this;
  }
  
  // 内部处理队列的方法
  _processQueue() {
    if (!this.isPlaying || this.queue.length === 0) return;
    
    const now = Date.now();
    const nextDanmaku = this.queue[0];
    
    if (nextDanmaku.timestamp <= now) {
      // 发送弹幕
      this.renderer.addDanmaku(nextDanmaku);
      this.queue.shift();
      
      // 立即处理下一个
      this._processQueue();
    } else {
      // 计算延迟时间
      const delay = Math.max(0, (nextDanmaku.timestamp - now) / this.playbackSpeed);
      
      // 设置定时器
      setTimeout(() => {
        this._processQueue();
      }, delay);
    }
  }
}

// 使用示例
const batchProcessor = new DanmakuBatchProcessor(danmakuRenderer);
batchProcessor
  .importDanmakus(historicalDanmakus)
  .setSpeed(1.5) // 1.5倍速回放
  .play();
```

## License

MIT