<template>
  <div class="example-container">
    <h1>Vue弹幕组件示例</h1>
    
    <div class="control-panel">
      <input 
        v-model="danmakuText" 
        placeholder="请输入弹幕内容" 
        class="danmaku-input"
      />
      
      <select v-model="danmakuType" class="danmaku-type">
        <option value="scroll">滚动</option>
        <option value="top">顶部</option>
        <option value="bottom">底部</option>
      </select>
      
      <button @click="sendDanmaku" class="send-btn">发送</button>
      
      <button @click="togglePause" class="control-btn">
        {{ isPaused ? '恢复' : '暂停' }}
      </button>
      
      <button @click="clearAll" class="control-btn">清空</button>
    </div>
    
    <!-- 视频/内容区域 -->
    <div class="content-area" ref="contentArea">
      <img 
        src="https://picsum.photos/800/450" 
        alt="示例图片" 
        class="content-image"
      />
      
      <!-- 弹幕组件 -->
      <DanmakuRendererVue
        ref="danmakuRef"
        :config="danmakuConfig"
        :danmaku="currentDanmaku"
        @pause="handlePause"
        @resume="handleResume"
        @danmakuClick="handleDanmakuClick"
      />
    </div>
    
    <div class="status-info">
      <p>弹幕状态: {{ isPaused ? '已暂停' : '播放中' }}</p>
      <p>已发送弹幕: {{ sentCount }} 条</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { DanmakuRendererVue, platformAdaptors, autoDetectPlatform } from '../src'
import type { Danmaku, DanmakuConfig } from '../src/types'

// 引用
const danmakuRef = ref()
const contentArea = ref<HTMLElement>()

// 数据
const danmakuText = ref('')
const danmakuType = ref<'scroll' | 'top' | 'bottom'>('scroll')
const currentDanmaku = ref<Danmaku | null>(null)
const isPaused = ref(false)
const sentCount = ref(0)


// 检测平台
const platform = autoDetectPlatform()
const platformConfig = platformAdaptors[platform].defaultConfig

// 弹幕配置
const danmakuConfig = ref<DanmakuConfig>({
  ...platformConfig,
  containerWidth: 800,
  containerHeight: 450,
  channelCount: 8,
  defaultFontSize: 20,
  defaultOpacity: 0.8,
  maxDisplayTime: 8000,
  fullScreen: false,
  showAdminBadge: true,
  enableClickPause: true,
  enableTouchPause: platform === 'mobile',
  autoAdaptScreen: true
})

// 发送弹幕
function sendDanmaku() {
  if (!danmakuText.value.trim()) return
  
  const newDanmaku: Danmaku = {
    id: Date.now().toString(),
    content: danmakuText.value.trim(),
    type: danmakuType.value,
    userId: 'user-' + Math.floor(Math.random() * 1000),
    userName: '用户' + Math.floor(Math.random() * 1000),
    color: getRandomColor(),
    fontSize: 24,
    isAdmin: Math.random() > 0.8, // 20%几率是管理员弹幕
    timestamp: Date.now(),
    avatar: `https://picsum.photos/32/32?random=${Math.floor(Math.random() * 1000)}`
  }
  
  // 设置当前弹幕，触发组件渲染
  currentDanmaku.value = newDanmaku
  
  // 清空输入框
  danmakuText.value = ''
  
  // 增加计数
  sentCount.value++
  
  // 清除当前弹幕引用，以便下次发送
  setTimeout(() => {
    currentDanmaku.value = null
  }, 100)
}

// 暂停/恢复
function togglePause() {
  if (isPaused.value) {
    danmakuRef.value?.resume()
  } else {
    danmakuRef.value?.pause()
  }
}

// 清空所有弹幕
function clearAll() {
  danmakuRef.value?.clear()
  sentCount.value = 0
}

// 处理暂停事件
function handlePause() {
  isPaused.value = true
}

// 处理恢复事件
function handleResume() {
  isPaused.value = false
}

// 处理弹幕点击事件
function handleDanmakuClick(danmaku: Danmaku) {
  console.log('点击了弹幕:', danmaku)
  alert(`点击了${danmaku.userName}的弹幕: ${danmaku.content}`)
}

// 生成随机颜色
function getRandomColor() {
  const colors = [
    '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// 监听窗口大小变化
function handleResize() {
  if (contentArea.value && platform === 'web') {
    const { width, height } = contentArea.value.getBoundingClientRect()
    danmakuConfig.value.containerWidth = width
    danmakuConfig.value.containerHeight = height
    danmakuRef.value?.updateSize(width, height)
  }
}

// 模拟接收其他用户的弹幕
function simulateRandomDanmaku() {
  const contents = [
    '精彩！', '太厉害了！', '666666', '这波操作我给满分',
    '哈哈哈', '加油！', '支持！', '弹幕护体'
  ]
  
  const newDanmaku: Danmaku = {
    id: Date.now().toString(),
    content: contents[Math.floor(Math.random() * contents.length)],
    type: ['scroll', 'top', 'bottom'][Math.floor(Math.random() * 3)] as any,
    userId: 'user-' + Math.floor(Math.random() * 1000),
    userName: '用户' + Math.floor(Math.random() * 1000),
    color: getRandomColor(),
    fontSize: 24,
    isAdmin: Math.random() > 0.9, // 10%几率是管理员弹幕
    timestamp: Date.now(),
    avatar: `https://picsum.photos/32/32?random=${Math.floor(Math.random() * 1000)}`
  }
  
  currentDanmaku.value = newDanmaku
  setTimeout(() => {
    currentDanmaku.value = null
  }, 100)
  
  sentCount.value++
}

// 生命周期
onMounted(() => {
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
  
  // 模拟随机弹幕
  const interval = setInterval(simulateRandomDanmaku, 5000)
  
  // 清理
  return () => {
    window.removeEventListener('resize', handleResize)
    clearInterval(interval)
  }
})
</script>

<style scoped>
.example-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.control-panel {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.danmaku-input {
  flex: 1;
  min-width: 300px;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.danmaku-type {
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.send-btn {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.send-btn:hover {
  background-color: #40a9ff;
}

.control-btn {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #52c41a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.control-btn:hover {
  background-color: #73d13d;
}

.content-area {
  position: relative;
  margin: 0 auto;
  background-color: #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.content-image {
  width: 100%;
  height: auto;
  display: block;
}

.status-info {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;
  color: #666;
}

.status-info p {
  margin: 5px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .control-panel {
    flex-direction: column;
  }
  
  .danmaku-input {
    min-width: auto;
    width: 100%;
  }
  
  .content-area {
    width: 100%;
    height: auto;
  }
}
</style>