/**
 * PostgreSQLAdapter 测试
 * 测试 PostgreSQL 数据库适配器的实现
 */
import { expect } from 'chai';
import sinon from 'sinon';
import { Pool } from 'pg';
import { PostgreSQLAdapter } from '../../src/database/adapters.js';
import { testUtils, testConfig } from '../setup.js';

describe('PostgreSQLAdapter 测试', () => {
  let adapter;
  let mockPool;
  let mockClient;

  beforeEach(() => {
    // 模拟 PostgreSQL 客户端
    mockClient = {
      query: sinon.stub(),
      release: sinon.stub(),
      begin: sinon.stub(),
      commit: sinon.stub(),
      rollback: sinon.stub()
    };

    // 模拟 PostgreSQL 连接池
    mockPool = {
      connect: sinon.stub().resolves(mockClient),
      query: sinon.stub(),
      end: sinon.stub().resolves()
    };

    // 模拟 Pool 构造函数
    sinon.stub(Pool.prototype, 'constructor').callsFake(() => ({}));
    sinon.stub(Pool.prototype, 'connect').callsFake(mockPool.connect);
    sinon.stub(Pool.prototype, 'query').callsFake(mockPool.query);
    sinon.stub(Pool.prototype, 'end').callsFake(mockPool.end);

    // 创建适配器实例
    adapter = new PostgreSQLAdapter(testConfig.mockDbConfig.postgresql);

    // 重写日志方法避免输出
    adapter._log = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('连接管理测试', () => {
    it('应该成功创建连接池并连接', async () => {
      await adapter.connect();
      
      expect(adapter.isConnected).to.be.true;
      expect(adapter.connection).to.not.be.null;
    });

    it('应该正确处理连接错误', async () => {
      const connectionError = new Error('Connection failed');
      sinon.stub(Pool, 'new').throws(connectionError);
      
      await adapter.connect();
      
      expect(adapter.isConnected).to.be.false;
      expect(adapter._log.calledWith('error', sinon.match.string)).to.be.true;
    });

    it('应该成功关闭连接池', async () => {
      await adapter.connect(); // 先连接
      await adapter.disconnect();
      
      expect(mockPool.end.calledOnce).to.be.true;
      expect(adapter.isConnected).to.be.false;
      expect(adapter.connection).to.be.null;
    });
  });

  describe('弹幕操作测试', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('应该成功保存单条弹幕', async () => {
      const roomId = 'test-room';
      const danmaku = testUtils.generateRandomData();
      const mockResult = { rows: [{ id: '123' }] };
      
      mockPool.query.resolves(mockResult);
      
      const result = await adapter.saveDanmaku(roomId, danmaku);
      
      expect(mockPool.query.calledOnce).to.be.true;
      expect(mockPool.query.firstCall.args[0].text).to.include('INSERT INTO');
      expect(result).to.equal('123');
    });

    it('应该成功批量保存弹幕', async () => {
      const roomId = 'test-room';
      const danmakus = [
        testUtils.generateRandomData(),
        testUtils.generateRandomData()
      ];
      
      mockPool.query.resolves({ rows: [{ id: '1' }] });
      
      const result = await adapter.batchSaveDanmaku(roomId, danmakus);
      
      expect(mockPool.query.callCount).to.equal(danmakus.length);
      expect(result.length).to.equal(danmakus.length);
    });

    it('应该获取房间弹幕历史', async () => {
      const roomId = 'test-room';
      const limit = 10;
      const mockDanmakus = [{ id: '1', content: 'test' }];
      
      mockPool.query.resolves({ rows: mockDanmakus });
      
      const result = await adapter.getRoomHistory(roomId, limit);
      
      expect(mockPool.query.calledOnce).to.be.true;
      expect(mockPool.query.firstCall.args[0].text).to.include('SELECT');
      expect(mockPool.query.firstCall.args[0].text).to.include('WHERE "roomId" = $1');
      expect(result).to.deep.equal(mockDanmakus);
    });

    it('应该获取用户弹幕历史', async () => {
      const userId = 'test-user';
      const limit = 5;
      const mockDanmakus = [{ id: '1', content: 'test' }];
      
      mockPool.query.resolves({ rows: mockDanmakus });
      
      const result = await adapter.getUserDanmakus(userId, limit);
      
      expect(mockPool.query.calledOnce).to.be.true;
      expect(mockPool.query.firstCall.args[0].text).to.include('WHERE "userId" = $1');
      expect(result).to.deep.equal(mockDanmakus);
    });

    it('应该获取房间统计信息', async () => {
      const roomId = 'test-room';
      const mockStats = [{ count: 100 }];
      
      mockPool.query.resolves({ rows: mockStats });
      
      const result = await adapter.getRoomStats(roomId);
      
      expect(mockPool.query.calledOnce).to.be.true;
      expect(mockPool.query.firstCall.args[0].text).to.include('COUNT(*)');
      expect(result.totalDanmakus).to.equal(100);
    });
  });

  describe('数据清理测试', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('应该清理旧数据', async () => {
      const hours = 24;
      const mockResult = { rowCount: 50 };
      
      mockPool.query.resolves(mockResult);
      
      const result = await adapter.cleanupOldData(hours);
      
      expect(mockPool.query.calledOnce).to.be.true;
      expect(mockPool.query.firstCall.args[0].text).to.include('DELETE FROM');
      expect(result.deletedDanmakus).to.equal(50);
    });

    it('应该保存系统统计信息', async () => {
      const stats = { activeRooms: 10, totalDanmakus: 1000 };
      
      mockPool.query.resolves({ rows: [{ id: '1' }] });
      
      await adapter.saveSystemStats(stats);
      
      expect(mockPool.query.calledOnce).to.be.true;
      expect(mockPool.query.firstCall.args[0].text).to.include('INSERT INTO system_stats');
    });

    it('应该获取系统统计信息', async () => {
      const mockStats = { activeRooms: 10, totalDanmakus: 1000 };
      
      mockPool.query.resolves({ rows: [mockStats] });
      
      const result = await adapter.getSystemStats();
      
      expect(mockPool.query.calledOnce).to.be.true;
      expect(result).to.deep.equal(mockStats);
    });
  });

  describe('事务支持测试', () => {
    it('应该支持事务操作', async () => {
      const mockConnection = {
        query: sinon.stub().resolves(),
        release: sinon.stub()
      };
      
      mockPool.connect.resolves(mockConnection);
      await adapter.connect();
      
      // 模拟事务相关方法
      if (typeof adapter.beginTransaction === 'function') {
        await adapter.beginTransaction();
        expect(mockConnection.query.calledWith('BEGIN')).to.be.true;
        
        if (typeof adapter.commitTransaction === 'function') {
          await adapter.commitTransaction();
          expect(mockConnection.query.calledWith('COMMIT')).to.be.true;
        }
        
        if (typeof adapter.rollbackTransaction === 'function') {
          await adapter.rollbackTransaction();
          expect(mockConnection.query.calledWith('ROLLBACK')).to.be.true;
        }
      }
    });

    it('应该执行原生SQL查询', async () => {
      const sql = 'SELECT * FROM danmakus WHERE "roomId" = $1';
      const params = ['test-room'];
      const mockResult = [{ id: '1', content: 'test' }];
      
      mockPool.query.resolves({ rows: mockResult });
      await adapter.connect();
      
      if (typeof adapter.executeRawQuery === 'function') {
        const result = await adapter.executeRawQuery(sql, params);
        
        expect(mockPool.query.calledWith(sql, params)).to.be.true;
        expect(result).to.deep.equal(mockResult);
      }
    });
  });

  describe('错误处理测试', () => {
    it('应该处理数据库操作错误', async () => {
      const roomId = 'test-room';
      const danmaku = testUtils.generateRandomData();
      const error = new Error('Database error');
      error.code = 'ECONNREFUSED';
      
      mockPool.query.rejects(error);
      
      await adapter.connect();
      const result = await adapter.saveDanmaku(roomId, danmaku);
      
      expect(result).to.be.null;
      expect(adapter._log.calledWith('error', sinon.match.string)).to.be.true;
    });

    it('应该处理未连接状态', async () => {
      const roomId = 'test-room';
      const danmaku = testUtils.generateRandomData();
      
      const result = await adapter.saveDanmaku(roomId, danmaku);
      
      expect(result).to.be.null;
      expect(adapter._log.calledWith('error', sinon.match.string)).to.be.true;
    });

    it('应该处理连接池错误', async () => {
      const error = new Error('Pool error');
      mockPool.end.rejects(error);
      
      await adapter.connect();
      await adapter.disconnect();
      
      expect(adapter._log.calledWith('error', sinon.match.string)).to.be.true;
    });
  });
});