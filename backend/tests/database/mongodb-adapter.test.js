/**
 * MongoDBAdapter 测试
 * 测试 MongoDB 数据库适配器的实现
 */
import { expect } from 'chai';
import sinon from 'sinon';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoDBAdapter } from '../../src/database/adapters.js';
import { testUtils, testConfig } from '../setup.js';

describe('MongoDBAdapter 测试', () => {
  let adapter;
  let mockClient;
  let mockDb;
  let mockCollection;

  beforeEach(() => {
    // 模拟 MongoDB 客户端和集合
    mockCollection = {
      insertOne: sinon.stub(),
      find: sinon.stub(),
      findOne: sinon.stub(),
      deleteMany: sinon.stub(),
      updateOne: sinon.stub(),
      countDocuments: sinon.stub(),
      aggregate: sinon.stub()
    };

    mockDb = {
      collection: sinon.stub().returns(mockCollection),
      createCollection: sinon.stub(),
      dropCollection: sinon.stub()
    };

    mockClient = {
      db: sinon.stub().returns(mockDb),
      close: sinon.stub().resolves()
    };

    // 模拟 MongoClient
    sinon.stub(MongoClient, 'connect').resolves(mockClient);

    // 创建适配器实例
    adapter = new MongoDBAdapter(testConfig.mockDbConfig.mongodb);

    // 重写日志方法避免输出
    adapter._log = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('连接管理测试', () => {
    it('应该成功连接到 MongoDB', async () => {
      await adapter.connect();
      
      expect(MongoClient.connect.calledOnce).to.be.true;
      expect(MongoClient.connect.firstCall.args[0]).to.equal(testConfig.mockDbConfig.mongodb.uri);
      expect(mockClient.db.calledOnce).to.be.true;
      expect(adapter.isConnected).to.be.true;
    });

    it('应该正确处理连接错误', async () => {
      const connectionError = new Error('Connection failed');
      MongoClient.connect.rejects(connectionError);
      
      await adapter.connect();
      
      expect(adapter.isConnected).to.be.false;
      expect(adapter._log.calledWith('error', sinon.match.string)).to.be.true;
    });

    it('应该成功断开连接', async () => {
      await adapter.connect(); // 先连接
      await adapter.disconnect();
      
      expect(mockClient.close.calledOnce).to.be.true;
      expect(adapter.isConnected).to.be.false;
      expect(adapter.connection).to.be.null;
    });
  });

  describe('弹幕操作测试', () => {
    beforeEach(async () => {
      // 设置连接状态
      await adapter.connect();
    });

    it('应该成功保存单条弹幕', async () => {
      const roomId = 'test-room';
      const danmaku = testUtils.generateRandomData();
      const mockResult = { insertedId: new ObjectId('507f191e810c19729de860ea') };
      
      mockCollection.insertOne.resolves(mockResult);
      
      const result = await adapter.saveDanmaku(roomId, danmaku);
      
      expect(mockCollection.insertOne.calledOnce).to.be.true;
      expect(mockCollection.insertOne.firstCall.args[0].roomId).to.equal(roomId);
      expect(result).to.equal(mockResult.insertedId.toString());
    });

    it('应该成功批量保存弹幕', async () => {
      const roomId = 'test-room';
      const danmakus = [
        testUtils.generateRandomData(),
        testUtils.generateRandomData()
      ];
      
      mockCollection.insertOne.resolves({ insertedId: new ObjectId() });
      
      const result = await adapter.batchSaveDanmaku(roomId, danmakus);
      
      expect(mockCollection.insertOne.callCount).to.equal(danmakus.length);
      expect(result.length).to.equal(danmakus.length);
    });

    it('应该获取房间弹幕历史', async () => {
      const roomId = 'test-room';
      const limit = 10;
      const mockDanmakus = [{ id: 1, content: 'test' }];
      
      mockCollection.find.returns({
        sort: sinon.stub().returns({
          limit: sinon.stub().returns({
            toArray: sinon.stub().resolves(mockDanmakus)
          })
        })
      });
      
      const result = await adapter.getRoomHistory(roomId, limit);
      
      expect(mockCollection.find.calledOnce).to.be.true;
      expect(result).to.deep.equal(mockDanmakus);
    });

    it('应该获取用户弹幕历史', async () => {
      const userId = 'test-user';
      const mockDanmakus = [{ id: 1, content: 'test' }];
      
      mockCollection.find.returns({
        sort: sinon.stub().returns({
          toArray: sinon.stub().resolves(mockDanmakus)
        })
      });
      
      const result = await adapter.getUserDanmakus(userId, 5);
      
      expect(mockCollection.find.calledOnce).to.be.true;
      expect(result).to.deep.equal(mockDanmakus);
    });

    it('应该获取房间统计信息', async () => {
      const roomId = 'test-room';
      mockCollection.countDocuments.resolves(100);
      
      const result = await adapter.getRoomStats(roomId);
      
      expect(mockCollection.countDocuments.calledOnce).to.be.true;
      expect(result.totalDanmakus).to.equal(100);
    });
  });

  describe('数据清理测试', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('应该清理旧数据', async () => {
      const hours = 24;
      mockCollection.deleteMany.resolves({ deletedCount: 50 });
      
      const result = await adapter.cleanupOldData(hours);
      
      expect(mockCollection.deleteMany.calledOnce).to.be.true;
      expect(result.deletedDanmakus).to.equal(50);
    });

    it('应该保存系统统计信息', async () => {
      const stats = { activeRooms: 10, totalDanmakus: 1000 };
      mockCollection.insertOne.resolves({ insertedId: new ObjectId() });
      
      await adapter.saveSystemStats(stats);
      
      expect(mockCollection.insertOne.calledOnce).to.be.true;
    });

    it('应该获取系统统计信息', async () => {
      const mockStats = { activeRooms: 10, totalDanmakus: 1000 };
      mockCollection.find.returns({
        sort: sinon.stub().returns({
          limit: sinon.stub().returns({
            toArray: sinon.stub().resolves([mockStats])
          })
        })
      });
      
      const result = await adapter.getSystemStats();
      
      expect(result).to.deep.equal(mockStats);
    });
  });

  describe('错误处理测试', () => {
    it('应该处理数据库操作错误', async () => {
      const roomId = 'test-room';
      const danmaku = testUtils.generateRandomData();
      const error = new Error('Database error');
      
      mockCollection.insertOne.rejects(error);
      
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
  });
});