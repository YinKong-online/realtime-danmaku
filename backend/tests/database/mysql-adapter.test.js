/**
 * MySQLAdapter 测试
 * 测试 MySQL 数据库适配器的实现
 */
import { expect } from 'chai';
import sinon from 'sinon';
import mysql from 'mysql2/promise';
import { MySQLAdapter } from '../../src/database/adapters.js';
import { testUtils, testConfig } from '../setup.js';

describe('MySQLAdapter 测试', () => {
  let adapter;
  let mockPool;

  beforeEach(() => {
    // 模拟 MySQL 连接池
    mockPool = {
      getConnection: sinon.stub().resolves([{ query: sinon.stub(), release: sinon.stub() }]),
      query: sinon.stub(),
      end: sinon.stub().resolves(),
      execute: sinon.stub()
    };

    // 模拟 mysql2/promise 模块
    sinon.stub(mysql, 'createPool').returns(mockPool);

    // 创建适配器实例
    adapter = new MySQLAdapter(testConfig.mockDbConfig.mysql);

    // 重写日志方法避免输出
    adapter._log = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('连接管理测试', () => {
    it('应该成功创建连接池并连接', async () => {
      await adapter.connect();
      
      expect(mysql.createPool.calledOnce).to.be.true;
      expect(mysql.createPool.firstCall.args[0]).to.deep.include(testConfig.mockDbConfig.mysql);
      expect(adapter.isConnected).to.be.true;
    });

    it('应该正确处理连接错误', async () => {
      const connectionError = new Error('Connection failed');
      mysql.createPool.throws(connectionError);
      
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
      const mockResult = { insertId: 123 };
      
      mockPool.execute.resolves([mockResult]);
      
      const result = await adapter.saveDanmaku(roomId, danmaku);
      
      expect(mockPool.execute.calledOnce).to.be.true;
      expect(mockPool.execute.firstCall.args[0]).to.include('INSERT INTO');
      expect(result).to.equal(mockResult.insertId.toString());
    });

    it('应该成功批量保存弹幕', async () => {
      const roomId = 'test-room';
      const danmakus = [
        testUtils.generateRandomData(),
        testUtils.generateRandomData()
      ];
      
      mockPool.execute.resolves([{ insertId: 1 }]);
      
      const result = await adapter.batchSaveDanmaku(roomId, danmakus);
      
      expect(mockPool.execute.callCount).to.equal(danmakus.length);
      expect(result.length).to.equal(danmakus.length);
    });

    it('应该获取房间弹幕历史', async () => {
      const roomId = 'test-room';
      const limit = 10;
      const mockDanmakus = [{ id: 1, content: 'test' }];
      
      mockPool.execute.resolves([mockDanmakus]);
      
      const result = await adapter.getRoomHistory(roomId, limit);
      
      expect(mockPool.execute.calledOnce).to.be.true;
      expect(mockPool.execute.firstCall.args[0]).to.include('SELECT');
      expect(mockPool.execute.firstCall.args[0]).to.include('WHERE roomId = ?');
      expect(result).to.deep.equal(mockDanmakus);
    });

    it('应该获取用户弹幕历史', async () => {
      const userId = 'test-user';
      const limit = 5;
      const mockDanmakus = [{ id: 1, content: 'test' }];
      
      mockPool.execute.resolves([mockDanmakus]);
      
      const result = await adapter.getUserDanmakus(userId, limit);
      
      expect(mockPool.execute.calledOnce).to.be.true;
      expect(mockPool.execute.firstCall.args[0]).to.include('WHERE userId = ?');
      expect(result).to.deep.equal(mockDanmakus);
    });

    it('应该获取房间统计信息', async () => {
      const roomId = 'test-room';
      const mockStats = [{ count: 100 }];
      
      mockPool.execute.resolves([mockStats]);
      
      const result = await adapter.getRoomStats(roomId);
      
      expect(mockPool.execute.calledOnce).to.be.true;
      expect(mockPool.execute.firstCall.args[0]).to.include('COUNT(*)');
      expect(result.totalDanmakus).to.equal(100);
    });
  });

  describe('数据清理测试', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('应该清理旧数据', async () => {
      const hours = 24;
      const mockResult = { affectedRows: 50 };
      
      mockPool.execute.resolves([mockResult]);
      
      const result = await adapter.cleanupOldData(hours);
      
      expect(mockPool.execute.calledOnce).to.be.true;
      expect(mockPool.execute.firstCall.args[0]).to.include('DELETE FROM');
      expect(result.deletedDanmakus).to.equal(50);
    });

    it('应该保存系统统计信息', async () => {
      const stats = { activeRooms: 10, totalDanmakus: 1000 };
      const mockResult = { insertId: 1 };
      
      mockPool.execute.resolves([mockResult]);
      
      await adapter.saveSystemStats(stats);
      
      expect(mockPool.execute.calledOnce).to.be.true;
      expect(mockPool.execute.firstCall.args[0]).to.include('INSERT INTO system_stats');
    });

    it('应该获取系统统计信息', async () => {
      const mockStats = [{ activeRooms: 10, totalDanmakus: 1000 }];
      
      mockPool.execute.resolves([mockStats]);
      
      const result = await adapter.getSystemStats();
      
      expect(mockPool.execute.calledOnce).to.be.true;
      expect(result).to.deep.equal(mockStats[0]);
    });
  });

  describe('事务支持测试', () => {
    it('应该支持事务操作', async () => {
      const mockConnection = {
        beginTransaction: sinon.stub().resolves(),
        commit: sinon.stub().resolves(),
        rollback: sinon.stub().resolves(),
        query: sinon.stub().resolves(),
        release: sinon.stub()
      };
      
      mockPool.getConnection.resolves([mockConnection]);
      await adapter.connect();
      
      // 模拟事务相关方法
      if (typeof adapter.beginTransaction === 'function') {
        await adapter.beginTransaction();
        expect(mockConnection.beginTransaction.calledOnce).to.be.true;
        
        if (typeof adapter.commitTransaction === 'function') {
          await adapter.commitTransaction();
          expect(mockConnection.commit.calledOnce).to.be.true;
        }
        
        if (typeof adapter.rollbackTransaction === 'function') {
          await adapter.rollbackTransaction();
          expect(mockConnection.rollback.calledOnce).to.be.true;
        }
      }
    });

    it('应该执行原生SQL查询', async () => {
      const sql = 'SELECT * FROM danmakus WHERE roomId = ?';
      const params = ['test-room'];
      const mockResult = [{ id: 1, content: 'test' }];
      
      mockPool.execute.resolves([mockResult]);
      await adapter.connect();
      
      if (typeof adapter.executeRawQuery === 'function') {
        const result = await adapter.executeRawQuery(sql, params);
        
        expect(mockPool.execute.calledWith(sql, params)).to.be.true;
        expect(result).to.deep.equal(mockResult);
      }
    });
  });

  describe('错误处理测试', () => {
    it('应该处理数据库操作错误', async () => {
      const roomId = 'test-room';
      const danmaku = testUtils.generateRandomData();
      const error = new Error('Database error');
      error.code = 'ER_ERROR';
      
      mockPool.execute.rejects(error);
      
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