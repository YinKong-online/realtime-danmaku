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

// 弹幕数据接口 - 与组件库保持一致
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

// 弹幕轨道
export interface DanmakuTrack {
  id: number;
  isOccupied: boolean;
  lastDanmakuTime: number;
}

// 弹幕配置
export interface DanmakuConfig {
  showDanmaku: boolean;
  danmakuColor: string;
  fontSize: number;
  opacity: number;
  speed: number;
  trackHeight: number;
  zIndex: number;
}

// 表情包接口
export interface Emoji {
  id: string;
  name: string;
  type: 'unicode' | 'image';
  value: string;
  category: 'emotion' | 'action' | 'object' | 'symbol';
}

// 表情包分类
export interface EmojiCategory {
  id: string;
  name: string;
}