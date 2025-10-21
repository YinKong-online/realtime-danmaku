// 弹幕类型定义
export type DanmakuType = 'scroll' | 'top' | 'bottom' | 'reverse' | 'emoji'

// 表情类型
export type EmojiType = 'unicode' | 'image'

// 表情信息接口
export interface EmojiInfo {
  type: EmojiType
  value: string
  name?: string
}

// 弹幕数据接口
export interface Danmaku {
  id: string
  content: string
  type: DanmakuType
  color: string
  timestamp: number
  userId?: string
  userName?: string
  userLevel?: number
  isAdmin?: boolean
  emojiInfo?: EmojiInfo
  fontSize?: number
  opacity?: number
  avatar?: string
}

// 弹幕配置接口
export interface DanmakuConfig {
  // 容器配置
  containerWidth?: number
  containerHeight?: number
  fullScreen?: boolean
  
  // 弹幕渲染配置
  channelCount?: number // 滚动弹幕通道数
  danmakuHeight?: number // 弹幕高度
  channelSpacing?: number // 通道间距
  maxDisplayTime?: number // 最大显示时间（毫秒）
  minDisplayTime?: number // 最小显示时间（毫秒）
  baseSpeed?: number // 基础速度
  
  // 交互配置
  enableClickPause?: boolean
  enableTouchPause?: boolean
  showAdminBadge?: boolean
  enableEmoji?: boolean
  
  // 样式配置
  defaultFontSize?: number
  defaultOpacity?: number
  fontFamily?: string
  
  // 性能配置
  maxDanmakus?: number // 最大显示弹幕数
  clearInterval?: number // 清理间隔（毫秒）
  
  // 适配配置
  autoAdaptScreen?: boolean
  mobileOptimize?: boolean
  
  // 事件回调
  onDanmakuClick?: (danmaku: Danmaku) => void
  onDanmakuEnd?: (danmaku: Danmaku) => void
  onContainerClick?: () => void
  onPause?: () => void
  onResume?: () => void
}

// 默认配置
export const defaultConfig: DanmakuConfig = {
  containerWidth: 800,
  containerHeight: 450,
  fullScreen: false,
  channelCount: 10,
  danmakuHeight: 30,
  channelSpacing: 2,
  maxDisplayTime: 8000,
  minDisplayTime: 3000,
  baseSpeed: 100,
  enableClickPause: true,
  enableTouchPause: true,
  showAdminBadge: true,
  enableEmoji: true,
  defaultFontSize: 20,
  defaultOpacity: 1,
  fontFamily: 'Arial, sans-serif',
  maxDanmakus: 500,
  clearInterval: 60000,
  autoAdaptScreen: true,
  mobileOptimize: true
}

// 弹幕管理器接口
export interface DanmakuManager {
  // 方法
  addDanmaku: (danmaku: Omit<Danmaku, 'id' | 'timestamp'>) => Danmaku
  addDanmakus: (danmakus: Array<Omit<Danmaku, 'id' | 'timestamp'>>) => Danmaku[]
  clearAll: () => void
  pause: () => void
  resume: () => void
  updateConfig: (config: Partial<DanmakuConfig>) => void
  destroy: () => void
  
  // 属性
  isPaused: boolean
  danmakuCount: number
  config: DanmakuConfig
}

// 框架无关的渲染器接口
export interface DanmakuRenderer {
  init: (container: HTMLElement, config?: DanmakuConfig) => void
  render: (danmaku: Danmaku) => void
  clear: () => void
  updateSize: (width: number, height: number) => void
  pause: () => void
  resume: () => void
  destroy: () => void
}