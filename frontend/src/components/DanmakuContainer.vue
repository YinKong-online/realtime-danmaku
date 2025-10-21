<template>
  <div 
    class="danmaku-container" 
    ref="containerRef"
    @click="togglePause"
    @touchstart="handleTouch"
    @touchend="handleTouchEnd"
  >
    <div 
      v-for="danmaku in activeDanmakus" 
      :key="danmaku.id"
      :class="['danmaku-item', danmaku.type]"
      :style="getDanmakuStyle(danmaku)"
      :data-id="danmaku.id"
    >
      <span v-if="danmaku.isAdmin" class="admin-badge">管理员</span>
      {{ danmaku.content }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { replaceEmojiPlaceholders } from '../utils/emojis'

interface Danmaku {
  id: string
  content: string
  type: 'scroll' | 'top' | 'bottom' | 'emoji'
  color: string
  timestamp: number
  userId?: string
  userLevel?: number
  isAdmin?: boolean
  emojiInfo?: {
    type: 'unicode' | 'image'
    value: string
    name?: string
  }
  fontSize?: number
  opacity?: number
}

interface Props {
  danmakus: Danmaku[]
}

interface Emits {
  (e: 'pause'): void
  (e: 'resume'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const containerRef = ref<HTMLElement>()
const activeDanmakus = ref<Danmaku[]>([])
const isPaused = ref(false)
const animationFrameId = ref<number>()
const channelStatus = ref<{ [key: string]: { lastTime: number; position: number } }>({})
const danmakuHeight = 30 // 每条弹幕的高度
const channelCount = 10 // 滚动弹幕的通道数
const channelSpacing = 2 // 通道间距

// 计算属性：过滤出需要显示的弹幕
// 计算属性：过滤出需要显示的弹幕
const recentDanmakus = computed(() => {
  const now = Date.now()
  // 只处理最近1分钟的弹幕
  return props.danmakus.filter(d => now - d.timestamp < 60000)
})

// 获取弹幕样式
const getDanmakuStyle = (danmaku: Danmaku) => {
  const style: Record<string, string> = {
    color: danmaku.color
  }
  
  if (danmaku.isAdmin) {
    style.fontWeight = 'bold'
    style.textShadow = '0 0 5px #ff0000'
  }
  
  if (danmaku.type === 'scroll') {
    // 滚动弹幕样式已在CSS中定义
  } else if (danmaku.type === 'top') {
    style.top = '10%'
    style.left = '50%'
    style.transform = 'translateX(-50%)'
  } else if (danmaku.type === 'bottom') {
    style.bottom = '10%'
    style.left = '50%'
    style.transform = 'translateX(-50%)'
  }
  
  return style
}

// 分配滚动弹幕通道
const assignScrollChannel = (): number => {
  const now = Date.now()
  const availableChannels: number[] = []
  
  // 查找可用通道
  for (let i = 0; i < channelCount; i++) {
    const channel = channelStatus.value[i]
    if (!channel || now - channel.lastTime > 3000) { // 3秒后可复用
      availableChannels.push(i)
    }
  }
  
  // 如果有可用通道，选择第一个
  if (availableChannels.length > 0) {
    const channel = availableChannels[0]
    channelStatus.value[channel] = { lastTime: now, position: 0 }
    return channel
  }
  
  // 否则选择最早使用的通道
  let earliestChannel = 0
  let earliestTime = now
  
  for (let i = 0; i < channelCount; i++) {
    const channel = channelStatus.value[i]
    if (channel && channel.lastTime < earliestTime) {
      earliestTime = channel.lastTime
      earliestChannel = i
    }
  }
  
  channelStatus.value[earliestChannel] = { lastTime: now, position: 0 }
  return earliestChannel
}

// 创建弹幕元素
const createDanmakuElement = async (danmaku: Danmaku) => {
  await nextTick()
  const element = document.querySelector(`.danmaku-item[data-id="${danmaku.id}"]`) as HTMLElement
  if (!element || !containerRef.value) {
    console.warn('[弹幕渲染] 元素未找到:', danmaku.id)
    return
  }
  
  const containerWidth = containerRef.value.clientWidth
  const containerHeight = containerRef.value.clientHeight
  
  // 确保容器尺寸有效
  if (!containerWidth || !containerHeight) {
    console.warn('[弹幕渲染] 容器尺寸无效:', containerWidth, 'x', containerHeight)
    return
  }

  // 重置所有样式，避免继承问题
  element.style.cssText = ''
  
  // 基础样式
  Object.assign(element.style, {
    position: 'absolute',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: '10',
    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
    color: danmaku.color || '#FFFFFF'
  })

  // 处理表情包弹幕 - 修复表情包显示
  if (danmaku.type === 'emoji' && danmaku.emojiInfo) {
    console.log('[弹幕渲染] 渲染表情包弹幕:', danmaku.emojiInfo)
    
    if (danmaku.emojiInfo.type === 'image') {
      // 移除文本内容，添加图片元素
      element.textContent = ''
      const img = document.createElement('img')
      img.src = danmaku.emojiInfo.value
      img.style.width = `${(danmaku.fontSize || 40)}px`
      img.style.height = 'auto'
      img.alt = danmaku.emojiInfo.name || 'emoji'
      img.style.display = 'block'
      element.appendChild(img)
    } else if (danmaku.emojiInfo.type === 'unicode') {
      // 直接显示Unicode表情
      element.textContent = danmaku.emojiInfo.value
      element.style.fontSize = `${(danmaku.fontSize || 40)}px`
    }
    
    // 应用自定义透明度
    if (danmaku.opacity !== undefined) {
      element.style.opacity = String(danmaku.opacity)
    }
  } else if (danmaku.type !== 'emoji') {
    // 普通文字弹幕，支持文本中的表情替换
    const displayContent = replaceEmojiPlaceholders(danmaku.content)
    element.textContent = displayContent
    element.style.fontSize = `${(danmaku.fontSize || 20)}px`
    if (danmaku.opacity !== undefined) {
      element.style.opacity = String(danmaku.opacity)
    }
  }
  
  // 确保弹幕有ID
  element.setAttribute('data-id', danmaku.id)
  
  if (danmaku.type === 'scroll' || danmaku.type === 'emoji') {
    console.log('[弹幕渲染] 渲染滚动/表情弹幕:', danmaku.type)
    
    // 设置初始位置和基本样式
    const channel = assignScrollChannel()
    const top = Math.min(channel * (danmakuHeight + channelSpacing), containerHeight - 50)
    
    // 强制设置关键样式
    Object.assign(element.style, {
      top: `${top}px`,
      left: `${containerWidth}px`,
      transform: 'none',
      // 确保可见性
      opacity: '1'
    })
    
    // 计算动画持续时间
    let duration = 5000
    if (danmaku.type === 'emoji') {
      duration = 4000
    } else {
      const textLength = danmaku.content.length
      duration = Math.max(5000, 3000 + textLength * 80)
    }
    
    // 修复动画应用方式
    requestAnimationFrame(() => {
      if (element) {
        // 确保动画正确应用
        element.style.animation = `danmakuScroll ${duration}ms linear forwards`
      }
    })
    
    // 设置动画结束后的清理
    setTimeout(() => {
      const index = activeDanmakus.value.findIndex(d => d.id === danmaku.id)
      if (index > -1) {
        activeDanmakus.value.splice(index, 1)
      }
      // 从DOM中移除元素
      if (element && element.parentNode) {
        element.parentNode.removeChild(element)
      }
    }, duration)
  } else if (danmaku.type === 'top' || danmaku.type === 'bottom') {
    // 固定弹幕样式
    Object.assign(element.style, {
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: '0 20px',
      borderRadius: '15px'
    })
    
    if (danmaku.type === 'top') {
      element.style.top = '10%'
    } else {
      element.style.bottom = '10%'
    }
    
    // 固定弹幕显示3秒后消失
    setTimeout(() => {
      const index = activeDanmakus.value.findIndex(d => d.id === danmaku.id)
      if (index > -1) {
        activeDanmakus.value.splice(index, 1)
      }
      // 从DOM中移除元素
      if (element && element.parentNode) {
        element.parentNode.removeChild(element)
      }
    }, 3000)
  }
}

// 暂停/恢复弹幕
const togglePause = () => {
  isPaused.value = !isPaused.value
  
  if (isPaused.value) {
    // 暂停所有弹幕动画
    activeDanmakus.value.forEach(danmaku => {
      const element = document.querySelector(`.danmaku-item[data-id="${danmaku.id}"]`) as HTMLElement
      if (element) {
        const computedStyle = window.getComputedStyle(element)
        // 移除matrix使用，避免未使用的变量
        element.style.transform = computedStyle.transform
        element.style.left = `${element.offsetLeft}px`
        element.style.animationPlayState = 'paused'
      }
    })
    emit('pause')
  } else {
    // 恢复弹幕动画
    activeDanmakus.value.forEach(danmaku => {
      const element = document.querySelector(`.danmaku-item[data-id="${danmaku.id}"]`) as HTMLElement
      if (element) {
        element.style.animationPlayState = 'running'
      }
    })
    emit('resume')
  }
}

// 移动端触摸处理
let touchStartTime = 0
const handleTouch = (e: TouchEvent) => {
  touchStartTime = Date.now()
  e.preventDefault()
}

const handleTouchEnd = (e: TouchEvent) => {
  const touchDuration = Date.now() - touchStartTime
  if (touchDuration < 300) { // 轻触
    togglePause()
  }
  e.preventDefault()
}

// 更新弹幕
const updateDanmakus = async () => {
  if (isPaused.value) return
  
  // 找出新的弹幕
  const newDanmakus = recentDanmakus.value.filter(
    d => !activeDanmakus.value.find(ad => ad.id === d.id)
  )
  
  // 确保有新弹幕
  if (newDanmakus.length > 0) {
    console.log(`[弹幕渲染] 新增 ${newDanmakus.length} 条弹幕`)
    
    // 添加新弹幕
    activeDanmakus.value.push(...newDanmakus)
    
    // 为每个新弹幕创建动画
    for (const danmaku of newDanmakus) {
      await createDanmakuElement(danmaku)
    }
  }
  
  // 清理过期弹幕
  const now = Date.now()
  const beforeClean = activeDanmakus.value.length
  activeDanmakus.value = activeDanmakus.value.filter(d => now - d.timestamp < 60000)
  
  if (beforeClean !== activeDanmakus.value.length) {
    console.log(`[弹幕渲染] 清理过期弹幕，当前活跃弹幕: ${activeDanmakus.value.length}`)
  }
}

// 动画循环
const animate = () => {
  updateDanmakus()
  animationFrameId.value = requestAnimationFrame(animate)
}

// 调试函数：检查弹幕状态
const debugDanmakuState = () => {
  console.log(`[弹幕调试] 接收到的弹幕总数: ${props.danmakus.length}`)
  console.log(`[弹幕调试] 活跃显示的弹幕数: ${activeDanmakus.value.length}`)
  console.log(`[弹幕调试] 容器尺寸: ${containerRef.value?.clientWidth || 0}x${containerRef.value?.clientHeight || 0}`)
  
  // 显示最近的几条弹幕
  if (props.danmakus.length > 0) {
    console.log('[弹幕调试] 最近的弹幕:', props.danmakus.slice(-3))
  }
}

// 监听弹幕变化
watch(() => props.danmakus, (newDanmakus) => {
  if (!isPaused.value && newDanmakus.length > 0) {
    console.log(`[弹幕监听] 检测到弹幕数据更新，共 ${newDanmakus.length} 条`)
    updateDanmakus()
  }
}, { deep: true })

onMounted(() => {
  animate()
  
  // 定期执行调试
  const debugInterval = setInterval(debugDanmakuState, 5000)
  
  // 清理
  onUnmounted(() => {
    clearInterval(debugInterval)
  })
})

onUnmounted(() => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
})
</script>

<style scoped>
.danmaku-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  touch-action: manipulation;
}

.danmaku-item {
  position: absolute;
  font-size: 16px;
  line-height: 30px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* 滚动弹幕样式 */
.danmaku-item.scroll {
  display: inline-block;
}

/* 顶部固定弹幕样式 */
.danmaku-item.top {
  position: absolute;
  text-align: center;
  padding: 0 20px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 15px;
}

/* 底部固定弹幕样式 */
.danmaku-item.bottom {
  position: absolute;
  text-align: center;
  padding: 0 20px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 15px;
}

/* 管理员标记 */
.admin-badge {
  display: inline-block;
  background-color: #ff0000;
  color: #fff;
  font-size: 12px;
  padding: 0 5px;
  border-radius: 3px;
  margin-right: 5px;
  line-height: 18px;
}

/* 滚动动画 - 修复动画效果 */
@keyframes danmakuScroll {
  from {
    transform: translateX(0);
    left: 100%;
  }
  to {
    transform: translateX(-100%);
    left: -100%;
  }
}

/* 确保滚动弹幕样式正确应用 */
.danmaku-item.scroll {
  position: absolute;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  color: #FFFFFF;
  /* 确保动画可以正常播放 */
  animation-fill-mode: forwards;
  animation-play-state: running;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .danmaku-item {
    font-size: 14px;
    line-height: 26px;
  }
}

@media (max-width: 480px) {
  .danmaku-item {
    font-size: 12px;
    line-height: 22px;
  }
}
</style>