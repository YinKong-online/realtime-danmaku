import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { DanmakuCoreRenderer } from '../core/DanmakuCoreRenderer'
import type { DanmakuConfig } from '../types'
import type { DanmakuComponentRef, DanmakuRendererProps } from '../types/public'

const DanmakuRenderer = forwardRef<DanmakuComponentRef, DanmakuRendererProps>((props, ref) => {
  const { 
    config, 
    danmaku, 
    onPause, 
    onResume, 
    onDanmakuEnd, 
    onDanmakuClick,
    onContainerClick 
  } = props
  
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<DanmakuCoreRenderer | null>(null)
  
  // 初始化渲染器
  useEffect(() => {
    if (!containerRef.current) return
    
    // 创建渲染器实例
    const renderer = new DanmakuCoreRenderer()
    
    // 配置回调
    const configWithCallbacks: DanmakuConfig = {
      ...config,
      onPause,
      onResume,
      onDanmakuEnd,
      onDanmakuClick,
      onContainerClick
    }
    
    // 初始化
    renderer.init(containerRef.current, configWithCallbacks)
    rendererRef.current = renderer
    
    // 清理
    return () => {
      renderer.destroy()
      rendererRef.current = null
    }
  }, []) // 仅在挂载时初始化
  
  // 监听配置变化
  useEffect(() => {
    if (rendererRef.current && config) {
      // 重新初始化以应用新配置
      rendererRef.current.destroy()
      const configWithCallbacks: DanmakuConfig = {
        ...config,
        onPause,
        onResume,
        onDanmakuEnd,
        onDanmakuClick,
        onContainerClick
      }
      rendererRef.current.init(containerRef.current!, configWithCallbacks)
    }
  }, [config]) // 监听配置变化
  
  // 监听弹幕数据
  useEffect(() => {
    if (danmaku && rendererRef.current) {
      rendererRef.current.render(danmaku)
    }
  }, [danmaku])
  
  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    pause: () => rendererRef.current?.pause(),
    resume: () => rendererRef.current?.resume(),
    clear: () => rendererRef.current?.clear(),
    updateSize: (width: number, height: number) => rendererRef.current?.updateSize(width, height)
  }))
  
  // 计算容器样式
  const containerStyle: React.CSSProperties = {
    position: config?.fullScreen ? 'fixed' : 'relative',
    top: config?.fullScreen ? 0 : 'auto',
    left: config?.fullScreen ? 0 : 'auto',
    right: config?.fullScreen ? 0 : 'auto',
    bottom: config?.fullScreen ? 0 : 'auto',
    width: config?.containerWidth ? `${config.containerWidth}px` : '100%',
    height: config?.containerHeight ? `${config.containerHeight}px` : '100%',
    overflow: 'hidden',
    pointerEvents: config?.enableClickPause ? 'auto' : 'none',
    zIndex: 10,
    backgroundColor: 'transparent'
  }
  
  return (
    <div
      ref={containerRef}
      className="danmaku-container"
      style={containerStyle}
    />
  )
})

// 添加默认样式
const style = document.createElement('style')
style.textContent = `
  .danmaku-item {
    font-weight: bold;
    white-space: nowrap;
    overflow: visible;
    animation-fill-mode: forwards;
    pointer-events: all;
    user-select: none;
    z-index: 1000;
  }
  
  .danmaku-scroll {
    background: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 2px 10px;
    border-radius: 4px;
  }
  
  .danmaku-top {
    background: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 2px 10px;
    border-radius: 4px;
  }
  
  .danmaku-bottom {
    background: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 2px 10px;
    border-radius: 4px;
  }
  
  .danmaku-emoji {
    background: transparent;
  }
  
  .danmaku-reverse {
    background: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 2px 10px;
    border-radius: 4px;
  }
  
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
`
document.head.appendChild(style)

export default DanmakuRenderer