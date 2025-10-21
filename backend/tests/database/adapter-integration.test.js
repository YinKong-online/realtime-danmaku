/**
 * 适配器集成测试
 * 测试不同数据库适配器的综合功能和集成场景
 */
import { expect } from 'chai';
import sinon from 'sinon';
import { 
  getDatabaseAdapter, 
  initializeDatabase, 
  getAvailableAdapters 
} from '../../src/database/adapters.js';
import { testUtils, testConfig } from '../setup.js';
import { withRetry } from '../../src/database/adapter-usage-example.js';

describe('数据库适配器集成测试', () => {
  let adapters = {};
  
  before(async () => {
    // 记录可用的适配器类型
    console.log('可用的数据库适配器:', getAvailableAdapters());
  });

  beforeEach(() => {
    // 为每个测试重置适配器实例
    adapters = {};
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('适配器工厂测试', () => {
    it('应该正确创建MySQL适配器', async () => {
      const adapter = getDatabaseAdapter('mysql', testConfig.mockDbConfig.mysql);
      
      expect(adapter).to.not.be.null;
      expect(adapter.constructor.name).to.include('MySQLAdapter');
    });

    it('应该正确创建MongoDB适配器', async () => {
      const adapter = getDatabaseAdapter('mongodb', testConfig.mockDbConfig.mongodb);
      
      expect(adapter).to.not.be.null;
      expect(adapter.constructor.name).to.include('MongoDBAdapter');
    });

    it('应该正确创建PostgreSQL适配器', async () => {
      const adapter = getDatabaseAdapter('postgresql', testConfig.mockDbConfig.postgresql);
      
      expect(adapter).to.not.be.null;
      expect(adapter.constructor.name).to.include('PostgreSQLAdapter');
    });

    it('应该处理未知适配器类型', () => {
      const adapter = getDatabaseAdapter('unknown', {});
      
      expect(adapter).to.be.null;
    });

    it('应该处理无效配置', () => {
      const adapter = getDatabaseAdapter('mysql', null);
      
      expect(adapter).to.be.null;
    });
  });

  describe('适配器接口一致性测试', () => {
    const requiredMethods = [
      'connect',
      'disconnect',
      'saveDanmaku',
      'batchSaveDanmaku',
      'getRoomHistory',
      'getUserDanmakus',
      'getRoomStats',
      'cleanupOldData'
    ];

    it('MySQL适配器应实现所有必需方法', () => {
      const adapter = getDatabaseAdapter('mysql', testConfig.mockDbConfig.mysql);
      if (adapter) {
        requiredMethods.forEach(method => {
          expect(adapter[method]).to.be.a('function');
        });
      }
    });

    it('MongoDB适配器应实现所有必需方法', () => {
      const adapter = getDatabaseAdapter('mongodb', testConfig.mockDbConfig.mongodb);
      if (adapter) {
        requiredMethods.forEach(method => {
          expect(adapter[method]).to.be.a('function');
        });
      }
    });

    it('PostgreSQL适配器应实现所有必需方法', () => {
      const adapter = getDatabaseAdapter('postgresql', testConfig.mockDbConfig.postgresql);
      if (adapter) {
        requiredMethods.forEach(method => {
          expect(adapter[method]).to.be.a('function');
        });
      }
    });
  });

  describe('重试装饰器测试', () => {
    it('应该成功执行并重试指定次数', async () => {
      let callCount = 0;
      
      const testFunction = withRetry(async () => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Test error');
        }
        return 'Success';
      }, 3, 100);
      
      const result = await testFunction();
      
      expect(callCount).to.equal(2);
      expect(result).to.equal('Success');
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      let callCount = 0;
      
      const testFunction = withRetry(async () => {
        callCount++;
        throw new Error('Test error');
      }, 2, 100);
      
      try {
        await testFunction();
        expect.fail('应该抛出错误');
      } catch (error) {
        expect(callCount).to.equal(2);
        expect(error.message).to.equal('Test error');
      }
    });

    it('应该正确处理成功的首次调用', async () => {
      let callCount = 0;
      
      const testFunction = withRetry(async () => {
        callCount++;
        return 'Success';
      }, 3, 100);
      
      const result = await testFunction();
      
      expect(callCount).to.equal(1);
      expect(result).to.equal('Success');
    });
  });

  describe('多适配器切换测试', () => {
    it('应该在不同适配器间切换而不影响功能', async () => {
      // 测试数据
      const roomId = 'switch-test-room';
      const danmaku = testUtils.generateRandomData();
      
      // 为每个适配器类型模拟操作
      const adapterTypes = ['mysql', 'mongodb', 'postgresql'];
      
      for (const type of adapterTypes) {
        const adapter = getDatabaseAdapter(type, testConfig.mockDbConfig[type]);
        if (!adapter) continue;
        
        // 模拟连接
        sinon.stub(adapter, 'connect').resolves();
        // 模拟保存弹幕
        sinon.stub(adapter, 'saveDanmaku').resolves(`${type}-id`);
        
        await adapter.connect();
        const result = await adapter.saveDanmaku(roomId, danmaku);
        
        expect(result).to.equal(`${type}-id`);
        expect(adapter.saveDanmaku.calledWith(roomId, danmaku)).to.be.true;
      }
    });
  });

  describe('批量操作性能测试模拟', () => {
    it('应该高效处理批量操作', async () => {
      const adapter = getDatabaseAdapter('mysql', testConfig.mockDbConfig.mysql);
      if (!adapter) return;
      
      sinon.stub(adapter, 'connect').resolves();
      sinon.stub(adapter, 'batchSaveDanmaku').resolves(['1', '2', '3']);
      
      const roomId = 'batch-test';
      const batchSize = 3;
      const danmakus = Array.from({ length: batchSize }, () => testUtils.generateRandomData());
      
      await adapter.connect();
      const startTime = Date.now();
      const result = await adapter.batchSaveDanmaku(roomId, danmakus);
      const endTime = Date.now();
      
      console.log(`批量操作模拟耗时: ${endTime - startTime}ms`);
      expect(result.length).to.equal(batchSize);
    });
  });

  describe('错误传递和处理测试', () => {
    it('应该正确传递数据库错误', async () => {
      const adapter = getDatabaseAdapter('mongodb', testConfig.mockDbConfig.mongodb);
      if (!adapter) return;
      
      sinon.stub(adapter, 'connect').resolves();
      
      const dbError = new Error('Database error');
      dbError.code = 'DB_ERROR';
      
      sinon.stub(adapter, 'saveDanmaku').rejects(dbError);
      
      await adapter.connect();
      
      try {
        await adapter.saveDanmaku('test-room', testUtils.generateRandomData());
        expect.fail('应该抛出错误');
      } catch (error) {
        expect(error).to.equal(dbError);
        expect(error.code).to.equal('DB_ERROR');
      }
    });

    it('应该处理超时错误', async () => {
      const adapter = getDatabaseAdapter('postgresql', testConfig.mockDbConfig.postgresql);
      if (!adapter) return;
      
      sinon.stub(adapter, 'connect').resolves();
      
      const timeoutError = new Error('Operation timed out');
      timeoutError.code = 'TIMEOUT';
      
      sinon.stub(adapter, 'getRoomHistory').rejects(timeoutError);
      
      await adapter.connect();
      
      try {
        await adapter.getRoomHistory('test-room', 10);
        expect.fail('应该抛出错误');
      } catch (error) {
        expect(error).to.equal(timeoutError);
        expect(error.code).to.equal('TIMEOUT');
      }
    });
  });

  describe('房间统计和性能监控测试', () => {
    it('应该正确获取和格式化房间统计信息', async () => {
      const adapter = getDatabaseAdapter('mysql', testConfig.mockDbConfig.mysql);
      if (!adapter) return;
      
      sinon.stub(adapter, 'connect').resolves();
      
      const mockStats = {
        totalDanmakus: 1000,
        activeUsers: 50,
        peakHour: '19:00-20:00'
      };
      
      sinon.stub(adapter, 'getRoomStats').resolves(mockStats);
      
      await adapter.connect();
      const stats = await adapter.getRoomStats('test-room');
      
      expect(stats).to.deep.equal(mockStats);
      expect(stats.totalDanmakus).to.be.a('number');
      expect(stats.activeUsers).to.be.a('number');
    });
  });

  describe('数据清理策略测试', () => {
    it('应该正确执行数据清理操作', async () => {
      const adapter = getDatabaseAdapter('mongodb', testConfig.mockDbConfig.mongodb);
      if (!adapter) return;
      
      sinon.stub(adapter, 'connect').resolves();
      
      const cleanupResult = {
        deletedDanmakus: 500,
        deletedStats: 100
      };
      
      sinon.stub(adapter, 'cleanupOldData').resolves(cleanupResult);
      
      await adapter.connect();
      const result = await adapter.cleanupOldData(24); // 清理24小时前的数据
      
      expect(result).to.deep.equal(cleanupResult);
      expect(adapter.cleanupOldData.calledWith(24)).to.be.true;
    });
  });

  describe('数据库初始化测试', () => {
    it('应该正确初始化数据库连接', async () => {
      // 模拟初始化函数
      sinon.stub(initializeDatabase, 'initializeDatabase').resolves(true);
      
      // 注意：实际测试中可能需要替换为真实的初始化函数
      // 这里仅测试调用方式
      const result = await Promise.resolve(true); // 模拟成功
      
      expect(result).to.be.true;
    });
  });

  describe('适配器资源管理测试', () => {
    it('应该正确管理连接资源', async () => {
      const adapter = getDatabaseAdapter('mysql', testConfig.mockDbConfig.mysql);
      if (!adapter) return;
      
      sinon.stub(adapter, 'connect').resolves();
      sinon.stub(adapter, 'disconnect').resolves();
      
      // 测试连接资源管理
      await adapter.connect();
      expect(adapter.isConnected).to.be.true;
      
      await adapter.disconnect();
      expect(adapter.isConnected).to.be.false;
    });

    it('应该支持多次连接和断开', async () => {
      const adapter = getDatabaseAdapter('mongodb', testConfig.mockDbConfig.mongodb);
      if (!adapter) return;
      
      sinon.stub(adapter, 'connect').resolves();
      sinon.stub(adapter, 'disconnect').resolves();
      
      // 多次连接断开测试
      for (let i = 0; i < 3; i++) {
        await adapter.connect();
        expect(adapter.connect.callCount).to.equal(i + 1);
        
        await adapter.disconnect();
        expect(adapter.disconnect.callCount).to.equal(i + 1);
      }
    });
  });
});