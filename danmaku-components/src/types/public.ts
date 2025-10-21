// 公共组件引用类型定义
export interface DanmakuComponentRef {
  pause: () => void
  resume: () => void
  clear: () => void
  updateSize: (width: number, height: number) => void
}

// 弹幕渲染器属性类型
export interface DanmakuRendererProps {
  config?: any
  danmaku?: any
  onPause?: () => void
  onResume?: () => void
  onDanmakuEnd?: (danmaku: any) => void
  onDanmakuClick?: (danmaku: any) => void
  onContainerClick?: () => void
}