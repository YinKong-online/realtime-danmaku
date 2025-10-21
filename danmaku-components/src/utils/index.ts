import type { Danmaku, DanmakuConfig } from '../types'

/**
 * 生成唯一ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 替换文本中的表情占位符
 * @param text 原始文本
 * @returns 处理后的文本
 */
export const replaceEmojiPlaceholders = (text: string): string => {
  // 简单的表情替换实现，实际项目中可以扩展更复杂的规则
  const emojiMap: Record<string, string> = {
    ':smile:': '😊',
    ':laugh:': '😂',
    ':love:': '❤️',
    ':angry:': '😠',
    ':sad:': '😢'
  }
  
  let result = text
  Object.entries(emojiMap).forEach(([placeholder, emoji]) => {
    result = result.replace(new RegExp(placeholder, 'g'), emoji)
  })
  
  return result
}

/**
 * 计算弹幕动画持续时间
 * @param danmaku 弹幕数据
 * @param containerWidth 容器宽度
 * @param config 配置项
 * @returns 动画持续时间（毫秒）
 */
export const calculateDuration = (danmaku: Danmaku, _containerWidth: number, config: DanmakuConfig): number => {
  if (danmaku.type === 'top' || danmaku.type === 'bottom') {
    return 3000 // 顶部和底部弹幕固定显示3秒
  }
  
  if (danmaku.type === 'emoji') {
    return config.minDisplayTime || 3000
  }
  
  // 滚动弹幕根据内容长度计算持续时间
  const textLength = danmaku.content.length
  const baseDuration = config.minDisplayTime || 3000
  const extraDuration = textLength * 100 // 每个字符增加100ms
  const maxDuration = config.maxDisplayTime || 8000
  
  return Math.min(baseDuration + extraDuration, maxDuration)
}

/**
 * 判断是否为移动设备
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * 获取设备像素比
 */
export const getDevicePixelRatio = (): number => {
  return window.devicePixelRatio || 1
}

/**
 * 节流函数
 */
export const throttle = <T extends (...args: any[]) => any>(func: T, limit: number): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * 计算弹幕的初始位置
 */
export const calculateDanmakuPosition = (
  danmaku: Danmaku,
  containerWidth: number,
  containerHeight: number,
  channelIndex: number,
  config: DanmakuConfig
): { top: string; left: string; transform?: string } => {
  const { danmakuHeight = 30, channelSpacing = 2 } = config
  
  switch (danmaku.type) {
    case 'top':
      return {
        top: `${containerHeight * 0.1}px`,
        left: '50%',
        transform: 'translateX(-50%)'
      }
    case 'bottom':
      return {
        top: `${containerHeight * 0.9 - danmakuHeight}px`,
        left: '50%',
        transform: 'translateX(-50%)'
      }
    case 'scroll':
    case 'emoji':
    case 'reverse':
      return {
        top: `${channelIndex * (danmakuHeight + channelSpacing)}px`,
        left: danmaku.type === 'reverse' ? '-100%' : `${containerWidth}px`
      }
    default:
      return {
        top: '0px',
        left: '0px'
      }
  }
}

/**
 * 生成默认弹幕样式
 */
export const generateDanmakuStyle = (danmaku: Danmaku, config: DanmakuConfig): Record<string, string> => {
  const style: Record<string, string> = {
    color: danmaku.color,
    fontSize: `${danmaku.fontSize || config.defaultFontSize || 20}px`,
    fontFamily: config.fontFamily || 'Arial, sans-serif'
  }
  
  if (danmaku.opacity !== undefined) {
    style.opacity = String(danmaku.opacity)
  } else {
    style.opacity = String(config.defaultOpacity || 1)
  }
  
  if (danmaku.isAdmin && config.showAdminBadge) {
    style.fontWeight = 'bold'
    style.textShadow = '0 0 5px #ff0000'
  }
  
  return style
}

/**
 * 检测是否需要清理弹幕
 */
export const shouldCleanDanmaku = (danmaku: Danmaku, currentTime: number, maxAge: number = 60000): boolean => {
  return currentTime - danmaku.timestamp > maxAge
}

/**
 * 适配移动设备的配置
 */
export const adaptMobileConfig = (config: DanmakuConfig): DanmakuConfig => {
  if (!isMobile() || !config.mobileOptimize) {
    return config
  }
  
  return {
    ...config,
    channelCount: Math.floor((config.channelCount || 10) * 0.7),
    danmakuHeight: Math.floor((config.danmakuHeight || 30) * 0.8),
    defaultFontSize: Math.floor((config.defaultFontSize || 20) * 0.8),
    maxDanmakus: Math.floor((config.maxDanmakus || 500) * 0.5)
  }
}

/**
 * 合并默认配置
 */
export const mergeConfig = (userConfig: Partial<DanmakuConfig> = {}, defaultConfig: DanmakuConfig): DanmakuConfig => {
  const merged = { ...defaultConfig, ...userConfig }
  
  // 如果启用了移动端优化，适配移动设备
  if (merged.mobileOptimize) {
    return adaptMobileConfig(merged)
  }
  
  return merged
}