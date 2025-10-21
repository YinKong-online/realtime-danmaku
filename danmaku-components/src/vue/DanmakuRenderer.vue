<template>
  <div
    ref="danmakuContainer"
    class="danmaku-container"
    :style="{...containerStyle}"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import type { CSSProperties } from 'vue'
import { DanmakuCoreRenderer } from '../core/DanmakuCoreRenderer'
import type { Danmaku, DanmakuConfig } from '../types'

// Props
const props = defineProps<{
  config?: DanmakuConfig
  danmaku?: Danmaku | null
}>()

// Emits
const emit = defineEmits<{
  pause: []
  resume: []
  danmakuEnd: [danmaku: Danmaku]
  danmakuClick: [danmaku: Danmaku]
  containerClick: []
}>()

// Refs
const danmakuContainer = ref<HTMLElement>()
const renderer = ref<DanmakuCoreRenderer | null>(null)

// 容器样式对象
const containerStyle = computed(() => {
  const style: CSSProperties = {}
  if (props.config?.containerWidth) {
    style.width = `${props.config.containerWidth}px`
  }
  if (props.config?.containerHeight) {
    style.height = `${props.config.containerHeight}px`
  }
  return style
})

// 监听弹幕数据变化
watch(() => props.danmaku, (newDanmaku) => {
  if (newDanmaku && renderer.value) {
    renderer.value.render(newDanmaku)
  }
})

// 监听配置变化
watch(() => props.config, () => {
  if (renderer.value && danmakuContainer.value) {
    // 重新初始化渲染器
    renderer.value.destroy()
    initRenderer()
  }
}, { deep: true })

// 初始化渲染器
function initRenderer() {
  if (!danmakuContainer.value) return
  
  // 创建核心渲染器实例
  renderer.value = new DanmakuCoreRenderer()
  
  // 配置回调函数
  const configWithCallbacks: DanmakuConfig = {
    ...props.config,
    onPause: () => emit('pause'),
    onResume: () => emit('resume'),
    onDanmakuEnd: (danmaku) => emit('danmakuEnd', danmaku),
    onDanmakuClick: (danmaku) => emit('danmakuClick', danmaku),
    onContainerClick: () => emit('containerClick')
  }
  
  // 初始化渲染器
  renderer.value.init(danmakuContainer.value, configWithCallbacks)
}

// 组件方法
const pause = () => {
  renderer.value?.pause()
}

const resume = () => {
  renderer.value?.resume()
}

const clear = () => {
  renderer.value?.clear()
}

const updateSize = (width: number, height: number) => {
  renderer.value?.updateSize(width, height)
}

// 暴露方法给父组件
defineExpose({
  pause,
  resume,
  clear,
  updateSize
})

// 生命周期
onMounted(() => {
  initRenderer()
})

onUnmounted(() => {
  if (renderer.value) {
    renderer.value.destroy()
    renderer.value = null
  }
})
</script>

<style scoped>
.danmaku-container {
  position: relative;
  overflow: hidden;
  pointer-events: auto;
}

/* 弹幕样式变量 */
:deep(.danmaku-item) {
  font-weight: bold;
  white-space: nowrap;
  overflow: visible;
  animation-fill-mode: forwards;
  pointer-events: all;
  user-select: none;
  z-index: 1000;
}

/* 滚动弹幕 */
:deep(.danmaku-scroll) {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 2px 10px;
  border-radius: 4px;
}

/* 顶部弹幕 */
:deep(.danmaku-top) {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 2px 10px;
  border-radius: 4px;
}

/* 底部弹幕 */
:deep(.danmaku-bottom) {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 2px 10px;
  border-radius: 4px;
}

/* 表情弹幕 */
:deep(.danmaku-emoji) {
  background: transparent;
}

/* 反向弹幕 */
:deep(.danmaku-reverse) {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 2px 10px;
  border-radius: 4px;
}

/* 管理员标记 */
:deep(.admin-badge) {
  display: inline-block;
  background-color: #ff0000;
  color: #fff;
  font-size: 12px;
  padding: 0 5px;
  border-radius: 3px;
  margin-right: 5px;
  line-height: 18px;
}
</style>