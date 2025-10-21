import type { Danmaku, DanmakuConfig, DanmakuRenderer } from '../types'
import { calculateDuration, calculateDanmakuPosition, generateDanmakuStyle, shouldCleanDanmaku, mergeConfig, debounce } from '../utils'
import { defaultConfig } from '../types'

interface ChannelInfo {
  lastTime: number
  position: number
}

export class DanmakuCoreRenderer implements DanmakuRenderer {
  private container: HTMLElement | null = null
  private config: DanmakuConfig
  private activeDanmakus: Danmaku[] = []
  private isPaused: boolean = false
  private animationFrameId: number | null = null
  private channelStatus: Map<number, ChannelInfo> = new Map()
  private resizeObserver: ResizeObserver | null = null
  private cleanIntervalId: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.config = { ...defaultConfig }
    this.handleContainerResize = debounce(this.handleContainerResize.bind(this), 200)
    this.tick = this.tick.bind(this)
  }

  /**
   * 初始化渲染器
   */
  init(container: HTMLElement, customConfig?: DanmakuConfig): void {
    this.container = container
    this.config = mergeConfig(customConfig, defaultConfig)
    
    // 设置容器样式
    this.setupContainerStyle()
    
    // 监听容器大小变化
    if (this.config.autoAdaptScreen) {
      this.setupResizeObserver()
    }
    
    // 开始清理定时器
    this.startCleanInterval()
    
    // 开始渲染循环
    this.startRenderLoop()
  }

  /**
   * 渲染单条弹幕
   */
  render(danmaku: Danmaku): void {
    if (!this.container || this.isPaused) return
    
    // 添加到活跃弹幕列表
    this.activeDanmakus.push(danmaku)
    
    // 创建弹幕元素
    this.createDanmakuElement(danmaku)
  }

  /**
   * 清空所有弹幕
   */
  clear(): void {
    this.activeDanmakus = []
    if (this.container) {
      this.container.innerHTML = ''
    }
    this.channelStatus.clear()
  }

  /**
   * 更新容器大小
   */
  updateSize(width: number, height: number): void {
    if (!this.container) return
    
    this.config.containerWidth = width
    this.config.containerHeight = height
    
    // 更新容器样式
    this.container.style.width = `${width}px`
    this.container.style.height = `${height}px`
    
    // 重新计算活跃弹幕的位置
    this.updateActiveDanmakusPosition()
  }

  /**
   * 暂停渲染
   */
  pause(): void {
    this.isPaused = true
    this.stopRenderLoop()
    
    // 暂停所有动画
    const danmakuElements = this.container?.querySelectorAll('.danmaku-item')
    danmakuElements?.forEach(el => {
      (el as HTMLElement).style.animationPlayState = 'paused'
    })
    
    // 触发暂停回调
    if (this.config.onPause) {
      this.config.onPause()
    }
  }

  /**
   * 恢复渲染
   */
  resume(): void {
    this.isPaused = false
    this.startRenderLoop()
    
    // 恢复所有动画
    const danmakuElements = this.container?.querySelectorAll('.danmaku-item')
    danmakuElements?.forEach(el => {
      (el as HTMLElement).style.animationPlayState = 'running'
    })
    
    // 触发恢复回调
    if (this.config.onResume) {
      this.config.onResume()
    }
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.clear()
    this.stopRenderLoop()
    this.stopCleanInterval()
    this.disconnectResizeObserver()
    this.container = null
  }

  /**
   * 设置容器样式
   */
  private setupContainerStyle(): void {
    if (!this.container) return
    
    Object.assign(this.container.style, {
      position: this.config.fullScreen ? 'fixed' : 'relative',
      top: this.config.fullScreen ? '0' : 'auto',
      left: this.config.fullScreen ? '0' : 'auto',
      right: this.config.fullScreen ? '0' : 'auto',
      bottom: this.config.fullScreen ? '0' : 'auto',
      width: this.config.containerWidth ? `${this.config.containerWidth}px` : '100%',
      height: this.config.containerHeight ? `${this.config.containerHeight}px` : '100%',
      overflow: 'hidden',
      pointerEvents: this.config.enableClickPause ? 'auto' : 'none',
      zIndex: '10',
      backgroundColor: 'transparent'
    })
    
    // 添加点击事件
    if (this.config.enableClickPause) {
      this.container.addEventListener('click', this.handleContainerClick.bind(this))
    }
    
    // 添加触摸事件
    if (this.config.enableTouchPause) {
      this.container.addEventListener('touchstart', this.handleTouchStart.bind(this))
      this.container.addEventListener('touchend', this.handleTouchEnd.bind(this))
    }
  }

  /**
   * 创建弹幕元素
   */
  private createDanmakuElement(danmaku: Danmaku): void {
    if (!this.container) return
    
    const element = document.createElement('div')
    element.className = `danmaku-item danmaku-${danmaku.type}`
    element.dataset.id = danmaku.id
    
    // 设置基础样式
    const baseStyle = generateDanmakuStyle(danmaku, this.config)
    Object.assign(element.style, baseStyle, {
      position: 'absolute',
      whiteSpace: 'nowrap',
      pointerEvents: 'all',
      userSelect: 'none',
      zIndex: '20'
    })
    
    // 添加管理员标记
    if (danmaku.isAdmin && this.config.showAdminBadge) {
      const badge = document.createElement('span')
      badge.className = 'admin-badge'
      badge.textContent = '管理员'
      badge.style.cssText = `
        display: inline-block;
        background-color: #ff0000;
        color: #fff;
        font-size: 12px;
        padding: 0 5px;
        border-radius: 3px;
        margin-right: 5px;
        line-height: 18px;
      `
      element.appendChild(badge)
    }
    
    // 处理内容
    if (danmaku.type === 'emoji' && danmaku.emojiInfo) {
      this.setupEmojiContent(element, danmaku)
    } else {
      element.textContent = danmaku.content
    }
    
    // 分配通道并设置位置
    if (danmaku.type === 'scroll' || danmaku.type === 'emoji' || danmaku.type === 'reverse') {
      const channelIndex = this.assignChannel()
      const position = calculateDanmakuPosition(
        danmaku,
        this.config.containerWidth || this.container.clientWidth,
        this.config.containerHeight || this.container.clientHeight,
        channelIndex,
        this.config
      )
      
      Object.assign(element.style, position)
      
      // 设置动画
      this.setupAnimation(element, danmaku)
    } else {
      // 顶部和底部弹幕
      const position = calculateDanmakuPosition(
        danmaku,
        this.config.containerWidth || this.container.clientWidth,
        this.config.containerHeight || this.container.clientHeight,
        0,
        this.config
      )
      
      Object.assign(element.style, position, {
        padding: '0 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '15px',
        textAlign: 'center'
      })
      
      // 设置固定显示时间
      setTimeout(() => {
        this.removeDanmaku(danmaku.id)
      }, 3000)
    }
    
    // 添加弹幕点击事件
    if (this.config.onDanmakuClick) {
      element.addEventListener('click', (e) => {
        e.stopPropagation()
        this.config.onDanmakuClick?.(danmaku)
      })
    }
    
    this.container.appendChild(element)
  }

  /**
   * 设置表情内容
   */
  private setupEmojiContent(element: HTMLDivElement, danmaku: Danmaku): void {
    if (!danmaku.emojiInfo) return
    
    if (danmaku.emojiInfo.type === 'image') {
      // 图片表情
      const img = document.createElement('img')
      img.src = danmaku.emojiInfo.value
      img.alt = danmaku.emojiInfo.name || 'emoji'
      img.style.cssText = `
        width: ${danmaku.fontSize || this.config.defaultFontSize || 30}px;
        height: auto;
        display: block;
      `
      element.appendChild(img)
    } else {
      // Unicode表情
      element.textContent = danmaku.emojiInfo.value
    }
  }

  /**
   * 设置动画
   */
  private setupAnimation(element: HTMLElement, danmaku: Danmaku): void {
    const containerWidth = this.config.containerWidth || this.container!.clientWidth
    const duration = calculateDuration(danmaku, containerWidth, this.config)
    
    const keyframes = danmaku.type === 'reverse' 
      ? this.createReverseAnimationKeyframes() 
      : this.createScrollAnimationKeyframes()
    
    const animation = element.animate(keyframes, {
      duration,
      easing: 'linear',
      fill: 'forwards'
    })
    
    // 动画结束后移除弹幕
    animation.onfinish = () => {
      this.removeDanmaku(danmaku.id)
    }
  }

  /**
   * 创建滚动动画关键帧
   */
  private createScrollAnimationKeyframes(): Keyframe[] {
    return [
      { transform: 'translateX(0)', left: '100%' },
      { transform: 'translateX(-100%)', left: '-100%' }
    ]
  }

  /**
   * 创建反向滚动动画关键帧
   */
  private createReverseAnimationKeyframes(): Keyframe[] {
    return [
      { transform: 'translateX(-100%)', left: '-100%' },
      { transform: 'translateX(0)', left: '100%' }
    ]
  }

  /**
   * 分配通道
   */
  private assignChannel(): number {
    const now = Date.now()
    const availableChannels: number[] = []
    const channelCount = this.config.channelCount || 10
    
    // 查找可用通道
    for (let i = 0; i < channelCount; i++) {
      const channel = this.channelStatus.get(i)
      if (!channel || now - channel.lastTime > 3000) {
        availableChannels.push(i)
      }
    }
    
    // 如果有可用通道，选择第一个
    if (availableChannels.length > 0) {
      const channelIndex = availableChannels[0]
      this.channelStatus.set(channelIndex, { lastTime: now, position: 0 })
      return channelIndex
    }
    
    // 否则选择最早使用的通道
    let earliestChannel = 0
    let earliestTime = now
    
    for (let i = 0; i < channelCount; i++) {
      const channel = this.channelStatus.get(i)
      if (channel && channel.lastTime < earliestTime) {
        earliestTime = channel.lastTime
        earliestChannel = i
      }
    }
    
    this.channelStatus.set(earliestChannel, { lastTime: now, position: 0 })
    return earliestChannel
  }

  /**
   * 移除弹幕
   */
  private removeDanmaku(danmakuId: string): void {
    // 从活跃列表中移除
    const index = this.activeDanmakus.findIndex(d => d.id === danmakuId)
    if (index > -1) {
      const removedDanmaku = this.activeDanmakus.splice(index, 1)[0]
      // 触发结束回调
      if (this.config.onDanmakuEnd) {
        this.config.onDanmakuEnd(removedDanmaku)
      }
    }
    
    // 从DOM中移除
    const element = this.container?.querySelector(`.danmaku-item[data-id="${danmakuId}"]`)
    if (element) {
      element.remove()
    }
  }

  /**
   * 开始渲染循环
   */
  private startRenderLoop(): void {
    this.animationFrameId = requestAnimationFrame(this.tick)
  }

  /**
   * 停止渲染循环
   */
  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * 渲染循环
   */
  private tick(): void {
    if (this.isPaused) return
    
    // 这里可以添加额外的渲染逻辑
    
    // 继续下一帧
    this.startRenderLoop()
  }

  /**
   * 开始清理定时器
   */
  private startCleanInterval(): void {
    this.cleanIntervalId = setInterval(() => {
      this.cleanOldDanmakus()
    }, this.config.clearInterval || 60000)
  }

  /**
   * 停止清理定时器
   */
  private stopCleanInterval(): void {
    if (this.cleanIntervalId !== null) {
      clearInterval(this.cleanIntervalId)
      this.cleanIntervalId = null
    }
  }

  /**
   * 清理旧弹幕
   */
  private cleanOldDanmakus(): void {
    const now = Date.now()
    const oldDanmakus = this.activeDanmakus.filter(d => 
      shouldCleanDanmaku(d, now, this.config.maxDisplayTime || 8000)
    )
    
    oldDanmakus.forEach(danmaku => {
      this.removeDanmaku(danmaku.id)
    })
  }

  /**
   * 设置ResizeObserver
   */
  private setupResizeObserver(): void {
    if (!this.container || !window.ResizeObserver) return
    
    this.resizeObserver = new ResizeObserver(() => {
      this.handleContainerResize()
    })
    
    this.resizeObserver.observe(this.container)
  }

  /**
   * 断开ResizeObserver
   */
  private disconnectResizeObserver(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
  }

  /**
   * 处理容器大小变化
   */
  private handleContainerResize(): void {
    if (!this.container) return
    
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    
    this.updateSize(width, height)
  }

  /**
   * 处理容器点击
   */
  private handleContainerClick(): void {
    if (this.isPaused) {
      this.resume()
    } else {
      this.pause()
    }
    
    if (this.config.onContainerClick) {
      this.config.onContainerClick()
    }
  }

  /**
   * 处理触摸开始
   */
  private handleTouchStart(): void {
    // 移动端触摸事件处理
  }

  /**
   * 处理触摸结束
   */
  private handleTouchEnd(): void {
    this.handleContainerClick()
  }

  /**
   * 更新活跃弹幕位置
   */
  private updateActiveDanmakusPosition(): void {
    this.activeDanmakus.forEach(danmaku => {
      const element = this.container?.querySelector(`.danmaku-item[data-id="${danmaku.id}"]`)
      if (element && (danmaku.type === 'scroll' || danmaku.type === 'emoji' || danmaku.type === 'reverse')) {
        // 重新分配通道并设置位置
        const channelIndex = this.assignChannel()
        const position = calculateDanmakuPosition(
          danmaku,
          this.config.containerWidth || this.container!.clientWidth,
          this.config.containerHeight || this.container!.clientHeight,
          channelIndex,
          this.config
        )
        
        Object.assign((element as HTMLElement).style, position)
      }
    })
  }
}