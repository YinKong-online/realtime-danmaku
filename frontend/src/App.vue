<template>
  <div class="app-container">
    <header class="header">
      <h1>实时互动弹幕系统</h1>
      <div class="room-info">
        <div class="room-id-input-group">
          <label>房间ID:</label>
          <input 
            v-model="roomId" 
            @keyup.enter="changeRoom"
            class="room-id-input"
            placeholder="输入房间ID"
          />
          <button @click="changeRoom" class="change-room-btn">切换房间</button>
        </div>
        <span>在线人数: {{ onlineCount }}</span>
      </div>
    </header>
    
    <main class="main-content">
      <DanmakuRenderer 
        ref="danmakuRenderer"
        :config="danmakuConfig"
        :danmaku="currentDanmaku"
        @pause="handleDanmakuPause"
        @resume="handleDanmakuResume"
        @container-click="handleContainerClick"
        @danmaku-click="handleDanmakuClick"
      />
    </main>
    
    <div class="control-panel">
      <!-- 主要控制按钮 -->
      <div class="main-controls">
        <button @click="clearAllDanmakus" class="control-btn">
          清空弹幕
        </button>
        <button @click="toggleFullScreen" class="control-btn">
          {{ danmakuConfig.fullScreen ? '退出全屏' : '全屏模式' }}
        </button>
        <button @click="showSettingsPanel = !showSettingsPanel" class="control-btn">
          弹幕设置
        </button>
        <button @click="showHistoryPanel = !showHistoryPanel" class="control-btn">
          历史记录 ({{ danmakus.length }})
        </button>
      </div>
      
      <!-- 弹幕输入区域 -->
      <div class="danmaku-input-container">
        <div class="danmaku-controls">
          <div class="danmaku-type-selector">
            <button 
              :class="['type-btn', { active: danmakuType === 'scroll' }]"
              @click="() => danmakuType = 'scroll'"
              title="滚动弹幕"
            >
              滚动
            </button>
            <button 
              :class="['type-btn', { active: danmakuType === 'top' }]"
              @click="() => danmakuType = 'top'"
              title="顶部弹幕"
            >
              顶部
            </button>
            <button 
              :class="['type-btn', { active: danmakuType === 'bottom' }]"
              @click="() => danmakuType = 'bottom'"
              title="底部弹幕"
            >
              底部
            </button>
            <button 
              :class="['type-btn emoji-btn', { active: danmakuType === 'emoji' }]"
              @click="() => { danmakuType = 'emoji'; toggleEmojiSelector(); }"
              title="表情弹幕"
            >
              😊
            </button>
          </div>
          
          <div class="input-wrapper">
            <input
              v-model="danmakuContent"
              @keyup.enter="sendDanmaku"
              @keyup.esc="showEmojiSelector = false"
              placeholder="输入弹幕内容..."
              maxlength="50"
            />
            <button @click="sendDanmaku" :disabled="(danmakuType !== 'emoji' && !danmakuContent.trim())">
              发送弹幕
            </button>
          </div>
          
          <!-- 表情选择器 -->
          <div 
            v-if="showEmojiSelector" 
            class="emoji-selector-wrapper"
            @click.stop
          >
            <EmojiSelector @insert-placeholder="insertEmojiPlaceholder" />
          </div>
        </div>
      </div>
      
      <!-- 状态信息 -->
      <div class="status-info">
        {{ statusMessage }}
      </div>
    </div>
    
    <!-- 设置面板 -->
    <div v-if="showSettingsPanel" class="settings-panel">
      <div class="settings-header">
        <h3>弹幕设置</h3>
        <button @click="showSettingsPanel = false" class="close-btn">×</button>
      </div>
      <div class="settings-content">
        <!-- 弹幕速度 -->
        <div class="setting-item">
          <label>弹幕速度: {{ danmakuSpeed }}</label>
          <input 
            type="range" 
            min="1" 
            max="10" 
            v-model.number="danmakuSpeed"
            class="slider"
          />
          <div class="range-labels">
            <span>慢</span>
            <span>快</span>
          </div>
        </div>
        
        <!-- 字体大小 -->
        <div class="setting-item">
          <label>字体大小: {{ fontSize }}px</label>
          <input 
            type="range" 
            min="12" 
            max="50" 
            v-model.number="fontSize"
            class="slider"
          />
        </div>
        
        <!-- 透明度 -->
        <div class="setting-item">
          <label>透明度: {{ Math.round(opacity * 100) }}%</label>
          <input 
            type="range" 
            min="0.1" 
            max="1" 
            step="0.1" 
            v-model.number="opacity"
            class="slider"
          />
        </div>
        
        <!-- 最大同时显示弹幕数 -->
        <div class="setting-item">
          <label>最大同时显示弹幕数: {{ maxDanmakus }}</label>
          <input 
            type="range" 
            min="10" 
            max="500" 
            step="10" 
            v-model.number="maxDanmakus"
            class="slider"
          />
        </div>
        
        <!-- 调试信息 -->
        <div class="setting-item checkbox-item">
          <label>
            <input type="checkbox" v-model="showDebugInfo" />
            显示调试信息
          </label>
        </div>
        
        <!-- 自动演示 -->
        <div class="setting-item checkbox-item">
          <label>
            <input type="checkbox" v-model="autoSendDemoDanmakus" />
            自动发送演示弹幕
          </label>
        </div>
      </div>
    </div>
    
    <!-- 历史记录面板 -->
    <div v-if="showHistoryPanel" class="history-panel">
      <div class="history-header">
        <h3>弹幕历史 ({{ danmakus.length }})</h3>
        <button @click="showHistoryPanel = false" class="close-btn">×</button>
      </div>
      <div class="history-content">
        <div v-if="danmakus.length === 0" class="no-history">
          暂无弹幕历史
        </div>
        <div v-else class="danmaku-list">
          <div 
            v-for="(danmaku, index) in danmakus.slice(-50).reverse()" 
            :key="danmaku.id || index"
            :class="['history-item', { selected: selectedHistoryDanmaku?.id === danmaku.id }]"
            @click="selectedHistoryDanmaku = danmaku"
          >
            <div class="history-item-header">
              <span class="danmaku-type-badge" :class="`type-${danmaku.type}`">
                {{ danmaku.type === 'scroll' ? '滚动' : 
                   danmaku.type === 'top' ? '顶部' : 
                   danmaku.type === 'bottom' ? '底部' : '表情' }}
              </span>
              <span class="danmaku-time">
                {{ new Date(danmaku.timestamp).toLocaleTimeString() }}
              </span>
            </div>
            <div class="history-item-content" :style="{ color: danmaku.color }">
              {{ danmaku.content || (danmaku.emojiInfo ? `${danmaku.emojiInfo.name} ${danmaku.emojiInfo.value}` : '表情弹幕') }}
            </div>
            <button @click.stop="replayHistoryDanmaku(danmaku)" class="replay-btn">
              重播
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch} from 'vue'
import io from 'socket.io-client'
import DanmakuRenderer from '../../danmaku-components/src/vue/DanmakuRenderer.vue'
import EmojiSelector from './components/EmojiSelector.vue'
import { findEmojiById } from './utils/emojis'
import type { Danmaku, DanmakuType } from './types.ts'

// 状态管理
const roomId = ref('default-room')
const danmakuContent = ref('')
const danmakuType = ref<DanmakuType>('scroll')
const danmakus = ref<Danmaku[]>([])
const onlineCount = ref(0)
const statusMessage = ref('连接中...')
const danmakuRenderer = ref<InstanceType<typeof DanmakuRenderer> | null>(null)
const showEmojiSelector = ref(false)
const fontSize = ref(30)
const opacity = ref(1)
const currentDanmaku = ref<Danmaku | null>(null)
const showSettingsPanel = ref(false)
const showHistoryPanel = ref(false)
const selectedHistoryDanmaku = ref<Danmaku | null>(null)
const danmakuSpeed = ref(5) // 1-10，值越大速度越快
const maxDanmakus = ref(100) // 最大同时显示弹幕数
const showDebugInfo = ref(false) // 显示调试信息
const autoSendDemoDanmakus = ref(false) // 自动发送演示弹幕
const demoInterval = ref<NodeJS.Timeout | null>(null)
const demoMessages = [
  '这是一个实时弹幕系统！',
  '大家好！',
  '弹幕效果真棒！',
  '666666',
  '太精彩了！',
  '❤️❤️❤️',
  '前端技术真牛',
  '实时互动体验',
  '弹幕速度可调',
  '多种弹幕类型'
]

// 计算弹幕显示时间范围（基于速度设置）
const displayTimeRange = computed(() => {
  const baseTime = 10000 // 基准时间10秒
  const speedFactor = 11 - danmakuSpeed.value // 速度反向映射到时间
  return {
    min: baseTime * 0.5 * (speedFactor / 5),
    max: baseTime * 1.5 * (speedFactor / 5)
  }
})

// 弹幕配置
const danmakuConfig = ref({
  fullScreen: false,
  containerWidth: 0,
  containerHeight: 0,
  autoAdaptScreen: true,
  enableClickPause: true,
  enableTouchPause: true,
  showAdminBadge: true,
  defaultFontSize: fontSize.value,
  defaultOpacity: opacity.value,
  minDisplayTime: displayTimeRange.value.min,
  maxDisplayTime: displayTimeRange.value.max,
  maxDanmakus: maxDanmakus.value,
  showDebugInfo: showDebugInfo.value
})

// Socket连接
let socket: any = null

// 生成随机颜色
const getRandomColor = (): string => {
  const colors = ['#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
  return colors[Math.floor(Math.random() * colors.length)]
}

// 发送弹幕
const sendDanmaku = async () => {
  if (!socket) return
  
  let danmakuData: Partial<Danmaku> = {};
  
  if (danmakuType.value === 'emoji') {
    // 发送纯表情弹幕
    const emojiId = danmakuContent.value.replace(/\[emoji:([a-zA-Z0-9_]+)\]/, '$1');
    const emoji = findEmojiById(emojiId);
    
    if (emoji) {
      danmakuData = {
        id: Date.now().toString(),
        content: '',
        type: 'emoji',
        color: getRandomColor(),
        timestamp: Date.now(),
        userLevel: Math.floor(Math.random() * 10) + 1,
        emojiInfo: {
          type: emoji.type as 'unicode' | 'image',
          value: emoji.value,
          name: emoji.name
        },
        fontSize: fontSize.value,
        opacity: opacity.value
      };
    } else {
      // 如果表情不存在，转为普通弹幕
      danmakuData = createNormalDanmaku();
    }
  } else {
    // 发送普通文字弹幕（可能包含表情）
    danmakuData = createNormalDanmaku();
  }
  
  socket.emit('send-danmaku', {
    roomId: roomId.value,
    danmaku: danmakuData
  })
  
  danmakuContent.value = ''
  showEmojiSelector.value = false
  danmakuType.value = 'scroll' // 重置为默认类型
}

// 创建普通弹幕
const createNormalDanmaku = (): Danmaku => {
  // 确保类型安全，普通弹幕不会是emoji类型
  const safeType = danmakuType.value !== 'emoji' ? danmakuType.value : 'scroll';
  
  return {
    id: Date.now().toString(),
    content: danmakuContent.value.trim(),
    type: safeType,
    color: getRandomColor(),
    timestamp: Date.now(),
    userLevel: Math.floor(Math.random() * 10) + 1,
    fontSize: fontSize.value,
    opacity: opacity.value
  };
}

// 切换表情选择器
const toggleEmojiSelector = () => {
  showEmojiSelector.value = !showEmojiSelector.value;
}

// 插入表情占位符
const insertEmojiPlaceholder = (placeholder: string) => {
  danmakuContent.value += placeholder;
};

// 处理弹幕暂停
const handleDanmakuPause = () => {
  statusMessage.value = '弹幕已暂停'
}

// 处理弹幕恢复
const handleDanmakuResume = () => {
  statusMessage.value = '弹幕滚动中'
}

// 处理容器点击
const handleContainerClick = () => {
  // 点击容器时可以触发暂停/恢复
  if (danmakuRenderer.value) {
    // 可以根据当前状态决定是暂停还是恢复
    if (statusMessage.value.includes('滚动中')) {
      danmakuRenderer.value.pause()
    } else {
      danmakuRenderer.value.resume()
    }
  }
}

// 处理弹幕点击
const handleDanmakuClick = (danmaku: Danmaku) => {
  statusMessage.value = `点击了弹幕: ${danmaku.content || (danmaku.emojiInfo?.name || '表情')}`
  setTimeout(() => {
    statusMessage.value = statusMessage.value.includes('暂停') ? '弹幕已暂停' : '弹幕滚动中'
  }, 2000)
}

// 清空所有弹幕
const clearAllDanmakus = () => {
  if (danmakuRenderer.value) {
    danmakuRenderer.value.clear()
    statusMessage.value = '已清空所有弹幕'
    setTimeout(() => {
      statusMessage.value = statusMessage.value.includes('暂停') ? '弹幕已暂停' : '弹幕滚动中'
    }, 2000)
  }
}

// 切换全屏模式
const toggleFullScreen = () => {
  danmakuConfig.value.fullScreen = !danmakuConfig.value.fullScreen
  statusMessage.value = danmakuConfig.value.fullScreen ? '全屏模式' : '普通模式'
  setTimeout(() => {
    statusMessage.value = statusMessage.value.includes('暂停') ? '弹幕已暂停' : '弹幕滚动中'
  }, 2000)
}

// 从历史记录中重播弹幕
const replayHistoryDanmaku = (danmaku: Danmaku) => {
  const clonedDanmaku = { ...danmaku, id: Date.now().toString(), timestamp: Date.now() }
  currentDanmaku.value = clonedDanmaku
  statusMessage.value = `重播历史弹幕`
}

// 开始自动发送演示弹幕
const startDemoDanmakus = () => {
  if (demoInterval.value) {
    clearInterval(demoInterval.value)
  }
  
  demoInterval.value = setInterval(() => {
    const randomMessage = demoMessages[Math.floor(Math.random() * demoMessages.length)]
    const types: DanmakuType[] = ['scroll', 'top', 'bottom']
    const randomType = types[Math.floor(Math.random() * types.length)]
    
    danmakuContent.value = randomMessage
    danmakuType.value = randomType
    sendDanmaku()
  }, 1500)
}

// 停止自动发送演示弹幕
const stopDemoDanmakus = () => {
  if (demoInterval.value) {
    clearInterval(demoInterval.value)
    demoInterval.value = null
  }
}

// 加入房间
const joinRoom = () => {
  if (socket) {
    socket.emit('join-room', roomId.value)
  }
}

// 离开房间
const leaveRoom = () => {
  if (socket) {
    socket.emit('leave-room', roomId.value)
  }
}

// 切换房间
const changeRoom = () => {
  if (!roomId.value.trim()) {
    roomId.value = 'default-room'
    return
  }
  
  // 离开当前房间
  leaveRoom()
  
  // 清空弹幕历史
  danmakus.value = []
  
  // 加入新房间
  setTimeout(() => {
    joinRoom()
    statusMessage.value = `已切换到房间: ${roomId.value}`
  }, 100)
}

onMounted(() => {
  // 连接WebSocket
  // 注意：在生产环境中，需要将此地址修改为您实际部署的后端服务地址
  const SOCKET_URL = import.meta.env.DEV 
    ? 'http://localhost:8000' // 开发环境地址
    : 'https://your-backend-server.com' // 生产环境地址（需用户修改）
    
  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  })
  
  // 连接成功
  socket.on('connect', () => {
    statusMessage.value = '已连接'
    joinRoom()
  })
  
  // 接收弹幕
  socket.on('new-danmaku', (data: { roomId: string; danmaku: Danmaku }) => {
    if (data.roomId === roomId.value) {
      // 组件库渲染器一次处理一条弹幕
      currentDanmaku.value = data.danmaku
      
      // 保存弹幕历史记录
      danmakus.value.push(data.danmaku)
      // 保持数组长度，避免内存溢出
      if (danmakus.value.length > 1000) {
        danmakus.value.shift()
      }
    }
  })
  
  // 监听配置变化
  watch(fontSize, (newSize) => {
    danmakuConfig.value.defaultFontSize = newSize
  })
  
  watch(opacity, (newOpacity) => {
    danmakuConfig.value.defaultOpacity = newOpacity
  })
  
  watch(displayTimeRange, (newRange) => {
    danmakuConfig.value.minDisplayTime = newRange.min
    danmakuConfig.value.maxDisplayTime = newRange.max
  }, { deep: true })
  
  watch(maxDanmakus, (newValue) => {
    danmakuConfig.value.maxDanmakus = newValue
  })
  
  watch(showDebugInfo, (newValue) => {
    danmakuConfig.value.showDebugInfo = newValue
  })
  
  // 监听自动发送演示弹幕
  watch(autoSendDemoDanmakus, (enabled) => {
    if (enabled) {
      startDemoDanmakus()
    } else {
      stopDemoDanmakus()
    }
  })
  
  // 在线人数更新
  socket.on('online-count', (data: { roomId: string; count: number }) => {
    if (data.roomId === roomId.value) {
      onlineCount.value = data.count
    }
  })
  
  // 发送失败
  socket.on('send-failed', (data: { reason: string }) => {
    statusMessage.value = `发送失败: ${data.reason}`
    setTimeout(() => {
      statusMessage.value = ''
    }, 3000)
  })
  
  // 连接断开
  socket.on('disconnect', () => {
    statusMessage.value = '连接断开'
  })
})

onUnmounted(() => {
  leaveRoom()
  if (socket) {
    socket.disconnect()
  }
  stopDemoDanmakus()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #1a1a1a;
  color: #ffffff;
  overflow: hidden;
}

.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.header {
  height: 80px;
  background-color: #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid #444;
  z-index: 10;
}

.room-id-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.room-id-input {
  padding: 6px 12px;
  background-color: #3a3a3a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  width: 200px;
}

.room-id-input:focus {
  outline: none;
  border-color: #4ECDC4;
}

.change-room-btn {
  padding: 6px 16px;
  background-color: #4ECDC4;
  color: #1a1a1a;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.change-room-btn:hover {
  background-color: #45b7d1;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
}

.room-info {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #aaa;
}

.main-content {
  flex: 1;
  position: relative;
  background-color: #000;
  overflow: hidden;
}

.control-panel {
  min-height: 180px;
  background-color: #2a2a2a;
  padding: 15px 20px;
  border-top: 1px solid #444;
  position: relative;
  z-index: 10;
}

/* 主控制按钮 */
.main-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.control-btn {
  padding: 8px 16px;
  background-color: #4ECDC4;
  color: #000;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.control-btn:hover {
  background-color: #45B7D1;
  transform: translateY(-1px);
}

.control-btn:active {
  transform: translateY(0);
}

.danmaku-input-container {
  width: 100%;
}

.danmaku-controls {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.danmaku-type-selector {
  display: flex;
  gap: 5px;
  justify-content: center;
}

.type-btn {
  padding: 6px 12px;
  border: 1px solid #444;
  border-radius: 15px;
  background: rgba(58, 58, 58, 0.5);
  color: #ccc;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.type-btn:hover {
  background: rgba(58, 58, 58, 0.7);
  color: #fff;
}

.type-btn.active {
  background: #4ECDC4;
  border-color: #4ECDC4;
  color: #000;
}

.emoji-btn {
  font-size: 16px;
  padding: 4px 8px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-wrapper input {
  flex: 1;
  padding: 10px 15px;
  background-color: #3a3a3a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #4ECDC4;
}

.input-wrapper button {
  padding: 10px 30px;
  background-color: #4ECDC4;
  border: none;
  border-radius: 4px;
  color: #000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.input-wrapper button:hover:not(:disabled) {
  background-color: #45B7D1;
}

.input-wrapper button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.emoji-selector-wrapper {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  z-index: 1002;
}

/* 设置面板样式 */
.settings-panel, .history-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #2a2a2a;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.settings-header, .history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #444;
}

.settings-header h3, .history-header h3 {
  margin: 0;
  font-size: 18px;
  color: #4ECDC4;
}

.close-btn {
  background: none;
  border: none;
  color: #ccc;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.close-btn:hover {
  background-color: #444;
  color: #fff;
}

.settings-content {
  padding: 20px;
  overflow-y: auto;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item label {
  display: block;
  margin-bottom: 8px;
  color: #ccc;
  font-size: 14px;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #444;
  outline: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4ECDC4;
  cursor: pointer;
  transition: all 0.3s;
}

.slider::-webkit-slider-thumb:hover {
  background: #45B7D1;
  transform: scale(1.1);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4ECDC4;
  cursor: pointer;
  border: none;
  transition: all 0.3s;
}

.slider::-moz-range-thumb:hover {
  background: #45B7D1;
  transform: scale(1.1);
}

.range-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 12px;
  color: #888;
}

.checkbox-item label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* 历史记录面板样式 */
.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.no-history {
  text-align: center;
  padding: 40px 20px;
  color: #888;
  font-size: 14px;
}

.danmaku-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  padding: 12px 20px;
  border-bottom: 1px solid #444;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.history-item:hover {
  background-color: #333;
}

.history-item.selected {
  background-color: #444;
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.danmaku-type-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.danmaku-type-badge.type-scroll {
  background-color: #4ECDC4;
  color: #000;
}

.danmaku-type-badge.type-top {
  background-color: #FF6B6B;
  color: #fff;
}

.danmaku-type-badge.type-bottom {
  background-color: #45B7D1;
  color: #fff;
}

.danmaku-type-badge.type-emoji {
  background-color: #96CEB4;
  color: #000;
}

.danmaku-time {
  font-size: 12px;
  color: #888;
}

.history-item-content {
  font-size: 14px;
  margin-bottom: 8px;
  word-break: break-word;
}

.replay-btn {
  position: absolute;
  top: 12px;
  right: 20px;
  padding: 4px 12px;
  background-color: #4ECDC4;
  color: #000;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.replay-btn:hover {
  background-color: #45B7D1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .control-panel {
    min-height: 200px;
    padding: 15px;
  }
  
  .main-controls {
    gap: 8px;
  }
  
  .control-btn {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .danmaku-type-selector {
    overflow-x: auto;
    padding-bottom: 5px;
  }
  
  .type-btn {
    flex-shrink: 0;
  }
  
  .settings-panel, .history-panel {
    width: 95%;
    margin: 10px;
    max-height: 90vh;
  }
  
  .replay-btn {
    position: static;
    margin-top: 8px;
    width: 100%;
  }
}

.status-info {
  font-size: 12px;
  color: #4ECDC4;
  min-height: 16px;
  text-align: center;
  margin-top: 10px;
}

/* 全屏模式样式增强 */
.danmaku-container.full-screen {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 9999;
}
</style>