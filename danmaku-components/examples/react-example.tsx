import React, { useRef, useState, useEffect } from 'react'
import { DanmakuRendererReact, platformAdaptors, autoDetectPlatform } from '../src'
import type { Danmaku, DanmakuConfig } from '../src/types'

const ReactExample: React.FC = () => {
  // 引用
  const danmakuRef = useRef<any>(null)
  const contentAreaRef = useRef<HTMLDivElement>(null)
  
  // 状态
  const [danmakuText, setDanmakuText] = useState('')
  const [danmakuType, setDanmakuType] = useState<'scroll' | 'top' | 'bottom'>('scroll')
  const [currentDanmaku, setCurrentDanmaku] = useState<Danmaku | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  
  // 检测平台
  const platform = autoDetectPlatform()
  const platformConfig = platformAdaptors[platform].defaultConfig
  
  // 弹幕配置
  const [danmakuConfig, setDanmakuConfig] = useState<DanmakuConfig>({
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
  const sendDanmaku = () => {
    if (!danmakuText.trim()) return
    
    const newDanmaku: Danmaku = {
      id: Date.now().toString(),
      content: danmakuText.trim(),
      type: danmakuType,
      userId: 'user-' + Math.floor(Math.random() * 1000),
      userName: '用户' + Math.floor(Math.random() * 1000),
      color: getRandomColor(),
      fontSize: 24,
      isAdmin: Math.random() > 0.8, // 20%几率是管理员弹幕
      timestamp: Date.now(),
      avatar: `https://picsum.photos/32/32?random=${Math.floor(Math.random() * 1000)}`
    }
    
    // 设置当前弹幕，触发组件渲染
    setCurrentDanmaku(newDanmaku)
    
    // 清空输入框
    setDanmakuText('')
    
    // 增加计数
    setSentCount(prev => prev + 1)
    
    // 清除当前弹幕引用，以便下次发送
    setTimeout(() => {
      setCurrentDanmaku(null)
    }, 100)
  }
  
  // 暂停/恢复
  const togglePause = () => {
    if (isPaused) {
      danmakuRef.current?.resume()
    } else {
      danmakuRef.current?.pause()
    }
  }
  
  // 清空所有弹幕
  const clearAll = () => {
    danmakuRef.current?.clear()
    setSentCount(0)
  }
  
  // 处理暂停事件
  const handlePause = () => {
    setIsPaused(true)
  }
  
  // 处理恢复事件
  const handleResume = () => {
    setIsPaused(false)
  }
  
  // 处理弹幕点击事件
  const handleDanmakuClick = (danmaku: Danmaku) => {
    console.log('点击了弹幕:', danmaku)
    alert(`点击了${danmaku.userName}的弹幕: ${danmaku.content}`)
  }
  
  // 生成随机颜色
  const getRandomColor = () => {
    const colors = [
      '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
      '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }
  
  // 监听窗口大小变化
  const handleResize = () => {
    if (contentAreaRef.current && platform === 'web') {
      const { width, height } = contentAreaRef.current.getBoundingClientRect()
      setDanmakuConfig(prev => ({
        ...prev,
        containerWidth: width,
        containerHeight: height
      }))
      danmakuRef.current?.updateSize(width, height)
    }
  }
  
  // 模拟接收其他用户的弹幕
  const simulateRandomDanmaku = () => {
    const contents = [
      '精彩！', '太厉害了！', '666666', '这波操作我给满分',
      '哈哈哈', '加油！', '支持！', '弹幕护体'
    ]
    
    const newDanmaku: Danmaku = {
      id: Date.now().toString(),
      content: contents[Math.floor(Math.random() * contents.length)],
      type: (['scroll', 'top', 'bottom'] as const)[Math.floor(Math.random() * 3)],
      userId: 'user-' + Math.floor(Math.random() * 1000),
      userName: '用户' + Math.floor(Math.random() * 1000),
      color: getRandomColor(),
      fontSize: 24,
      isAdmin: Math.random() > 0.9, // 10%几率是管理员弹幕
      timestamp: Date.now(),
      avatar: `https://picsum.photos/32/32?random=${Math.floor(Math.random() * 1000)}`
    }
    
    setCurrentDanmaku(newDanmaku)
    setTimeout(() => {
      setCurrentDanmaku(null)
    }, 100)
    
    setSentCount(prev => prev + 1)
  }
  
  // 生命周期
  useEffect(() => {
    // 添加窗口大小变化监听
    window.addEventListener('resize', handleResize)
    
    // 初始计算大小
    handleResize()
    
    // 模拟随机弹幕
    const interval = setInterval(simulateRandomDanmaku, 5000)
    
    // 清理
    return () => {
      window.removeEventListener('resize', handleResize)
      clearInterval(interval)
    }
  }, [])
  
  // 键盘事件处理
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendDanmaku()
    }
  }
  
  return (
    <div className="example-container">
      <h1>React弹幕组件示例</h1>
      
      <div className="control-panel">
        <input 
          value={danmakuText}
          onChange={(e) => setDanmakuText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="请输入弹幕内容" 
          className="danmaku-input"
        />
        
        <select 
          value={danmakuType} 
          onChange={(e) => setDanmakuType(e.target.value as any)}
          className="danmaku-type"
        >
          <option value="scroll">滚动</option>
          <option value="top">顶部</option>
          <option value="bottom">底部</option>
        </select>
        
        <button onClick={sendDanmaku} className="send-btn">发送</button>
        
        <button onClick={togglePause} className="control-btn">
          {isPaused ? '恢复' : '暂停'}
        </button>
        
        <button onClick={clearAll} className="control-btn">清空</button>
      </div>
      
      {/* 视频/内容区域 */}
      <div className="content-area" ref={contentAreaRef}>
        <img 
          src="https://picsum.photos/800/450" 
          alt="示例图片" 
          className="content-image"
        />
        
        {/* 弹幕组件 */}
        <DanmakuRendererReact
          ref={danmakuRef}
          config={danmakuConfig}
          danmaku={currentDanmaku}
          onPause={handlePause}
          onResume={handleResume}
          onDanmakuClick={handleDanmakuClick}
        />
      </div>
      
      <div className="status-info">
        <p>弹幕状态: {isPaused ? '已暂停' : '播放中'}</p>
        <p>已发送弹幕: {sentCount} 条</p>
      </div>
    </div>
  )
}

// 添加样式
const styles = `
  .example-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }
  
  .example-container h1 {
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
    outline: none;
    transition: border-color 0.3s;
  }
  
  .danmaku-input:focus {
    border-color: #1890ff;
  }
  
  .danmaku-type {
    padding: 10px;
    font-size: 16px;
    border: 1px solid #ddd;
    border-radius: 4px;
    outline: none;
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
`

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}

export default ReactExample