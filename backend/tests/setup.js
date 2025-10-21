/**
 * 测试环境设置
 * 提供测试所需的工具函数和配置
 */

// 导入需要的模块
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { nanoid } from 'nanoid';

// 设置环境变量
dotenv.config({
  path: resolve(process.cwd(), '.env.test')
});

// 获取当前目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

// 模拟数据库配置
export const testConfig = {
  timeout: 5000,
  retryCount: 3,
  mockDbConfig: {
    mysql: {
      host: 'localhost',
      port: 3306,
      user: 'test_user',
      password: 'test_password',
      database: 'test_db'
    },
    mongodb: {
      uri: 'mongodb://localhost:27017/test_db'
    },
    postgresql: {
      host: 'localhost',
      port: 5432,
      user: 'test_user',
      password: 'test_password',
      database: 'test_db'
    }
  }
};

// 测试工具函数
export const testUtils = {
  // 生成随机ID
  generateId() {
    return nanoid();
  },
  
  // 生成随机弹幕数据
  generateRandomData() {
    const contents = [
      '太棒了！',
      '666666',
      '主播加油！',
      '这波操作太秀了',
      '哈哈哈',
      '不明觉厉',
      '学到了学到了',
      '前方高能',
      'awsl',
      '奥利给'
    ];
    
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'];
    
    return {
      id: this.generateId(),
      userId: `user_${this.generateId()}`,
      content: contents[Math.floor(Math.random() * contents.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      type: Math.random() > 0.8 ? 'super' : 'normal',
      timestamp: Date.now(),
      roomId: `room_${Math.floor(Math.random() * 1000)}`
    };
  },
  
  // 生成批量测试数据
  generateBatchData(count = 10) {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push(this.generateRandomData());
    }
    return data;
  },
  
  // 延迟函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // 创建模拟错误
  createMockError(type = 'generic') {
    const errors = {
      generic: new Error('Generic test error'),
      connection: new Error('Connection failed'),
      timeout: new Error('Operation timed out'),
      validation: new Error('Validation failed'),
      database: new Error('Database error')
    };
    
    // 设置错误代码
    if (type === 'connection') {
      errors[type].code = 'ECONNREFUSED';
    } else if (type === 'timeout') {
      errors[type].code = 'ETIMEDOUT';
    } else if (type === 'database') {
      errors[type].code = 'DB_ERROR';
    }
    
    return errors[type] || errors.generic;
  },
  
  // 验证弹幕数据格式
  validateDanmakuFormat(danmaku) {
    const requiredFields = ['id', 'userId', 'content', 'timestamp', 'roomId'];
    
    for (const field of requiredFields) {
      if (!(field in danmaku)) {
        return false;
      }
    }
    
    if (typeof danmaku.id !== 'string' || danmaku.id.length === 0) return false;
    if (typeof danmaku.userId !== 'string' || danmaku.userId.length === 0) return false;
    if (typeof danmaku.content !== 'string' || danmaku.content.length === 0) return false;
    if (typeof danmaku.timestamp !== 'number') return false;
    if (typeof danmaku.roomId !== 'string' || danmaku.roomId.length === 0) return false;
    
    return true;
  },
  
  // 模拟成功的Promise
  mockSuccess(data = {}) {
    return Promise.resolve(data);
  },
  
  // 模拟失败的Promise
  mockFailure(error = this.createMockError()) {
    return Promise.reject(error);
  }
};

// 测试配置
export const testSettings = {
  timeout: 5000,       // 测试超时时间（毫秒）
  retryCount: 3,       // 默认重试次数
  retryDelay: 1000,    // 默认重试延迟（毫秒）
  batchSize: 100,      // 批量操作测试大小
  maxConcurrent: 10    // 最大并发操作数
};

// 导出所有内容
export { __dirname };

export default {
  testUtils,
  testConfig,
  testSettings,
  __dirname
};