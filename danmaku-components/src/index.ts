// 类型定义导出
export * from './types'
export type { DanmakuComponentRef } from './types/public'

// 核心渲染器导出
import { DanmakuCoreRenderer } from './core/DanmakuCoreRenderer'
export { DanmakuCoreRenderer }

// 工具函数导出
export * from './utils'

// Vue组件导出
import DanmakuRendererVue from './vue/DanmakuRenderer.vue'
export { DanmakuRendererVue }

// React组件导出
import DanmakuRendererReact from './react/DanmakuRenderer'
export { DanmakuRendererReact }

// 版本信息
export const version = '1.0.0'

// 根据环境动态选择合适的渲染器
export const DanmakuRenderer = (() => {
  if (typeof window !== 'undefined') {
    try {
      // @ts-ignore
      if (window.Vue) return DanmakuRendererVue
    } catch (e) {}
    try {
      // @ts-ignore
      if (window.React) return DanmakuRendererReact
    } catch (e) {}
  }
  return DanmakuCoreRenderer
})()

// 创建渲染器实例的工厂函数
export function createDanmakuRenderer(type?: 'vue' | 'react' | 'core') {
  switch (type) {
    case 'vue':
      return DanmakuRendererVue
    case 'react':
      return DanmakuRendererReact
    case 'core':
      return DanmakuCoreRenderer
    default:
      return DanmakuRenderer
  }
}

// 适配不同平台的工具函数
export const platformAdaptors = {
  web: {
    // Web平台特定配置
    defaultConfig: {
      containerWidth: window.innerWidth,
      containerHeight: window.innerHeight,
      fullScreen: false,
      enableClickPause: true,
      enableTouchPause: false
    }
  },
  mobile: {
    // 移动设备特定配置
    defaultConfig: {
      containerWidth: window.innerWidth,
      containerHeight: window.innerHeight,
      fullScreen: true,
      enableClickPause: false,
      enableTouchPause: true,
      defaultFontSize: 24,
      defaultOpacity: 0.8
    }
  },
  applet: {
    // 小程序特定配置
    defaultConfig: {
      containerWidth: 375,
      containerHeight: 667,
      fullScreen: false,
      enableClickPause: true,
      enableTouchPause: true,
      defaultFontSize: 20,
      defaultOpacity: 0.9
    }
  }
}

// 自动检测平台并返回合适的配置
export function autoDetectPlatform() {
  if (typeof window === 'undefined') {
    return 'web'
  }
  
  // 检测移动设备
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return 'mobile'
  }
  
  // 检测小程序环境 (以微信小程序为例)
  try {
    // @ts-ignore
    if (wx && wx.getSystemInfoSync) {
      return 'applet'
    }
  } catch (e) {}
  
  return 'web'
}