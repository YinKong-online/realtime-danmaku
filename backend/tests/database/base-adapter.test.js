/**
 * BaseDatabaseAdapter 基类测试
 * 测试通用接口和错误处理机制
 */
import { expect } from 'chai';
import sinon from 'sinon';
import { BaseDatabaseAdapter } from '../../src/database/adapters.js';
import { testUtils, testConfig } from '../setup.js';

describe('BaseDatabaseAdapter 基类测试', () => {
  let mockAdapter;
  let consoleSpy;

  beforeEach(() => {
    // 创建 BaseDatabaseAdapter 的模拟实现
    mockAdapter = new BaseDatabaseAdapter('mock-db', {});
    // 监视控制台日志
    consoleSpy = sinon.spy(console, 'log');
  });

  afterEach(() => {
    sinon.restore();
    mockAdapter = null;
  });

  describe('构造函数测试', () => {
    it('应该正确初始化适配器属性', () => {
      expect(mockAdapter.dbType).to.equal('mock-db');
      expect(mockAdapter.config).to.be.an('object');
      expect(mockAdapter.connection).to.be.null;
      expect(mockAdapter.isConnected).to.be.false;
    });

    it('应该正确处理配置参数', () => {
      const customConfig = { logLevel: 'debug', retryCount: 5 };
      const adapter = new BaseDatabaseAdapter('test-db', customConfig);
      expect(adapter.config).to.deep.include(customConfig);
    });
  });

  describe('safeExecute 错误处理测试', () => {
    it('应该正确执行成功的操作', async () => {
      const mockOperation = sinon.stub().resolves('success');
      const result = await mockAdapter.safeExecute(mockOperation, '测试操作');
      expect(result).to.equal('success');
      expect(mockOperation.calledOnce).to.be.true;
    });

    it('应该捕获并记录操作错误', async () => {
      const error = new Error('测试错误');
      const mockOperation = sinon.stub().rejects(error);
      
      // 重写 _log 方法以避免实际日志输出
      mockAdapter._log = sinon.stub();
      
      const result = await mockAdapter.safeExecute(mockOperation, '测试操作');
      
      expect(result).to.be.null;
      expect(mockOperation.calledOnce).to.be.true;
      expect(mockAdapter._log.calledWith('error', sinon.match.string)).to.be.true;
    });

    it('应该使用自定义错误处理器', async () => {
      const error = new Error('测试错误');
      const mockOperation = sinon.stub().rejects(error);
      const customErrorHandler = sinon.stub().returns('handled-error');
      
      const result = await mockAdapter.safeExecute(mockOperation, '测试操作', customErrorHandler);
      
      expect(result).to.equal('handled-error');
      expect(customErrorHandler.calledWith(error, '测试操作')).to.be.true;
    });
  });

  describe('日志功能测试', () => {
    it('应该根据日志级别输出信息', () => {
      // 重写 _log 方法
      mockAdapter._log = sinon.stub();
      
      mockAdapter.log('info', '测试信息');
      mockAdapter.log('error', '测试错误');
      mockAdapter.log('debug', '测试调试');
      
      expect(mockAdapter._log.callCount).to.equal(3);
    });

    it('应该在调试模式下输出详细日志', () => {
      mockAdapter.config.logLevel = 'debug';
      mockAdapter._log = sinon.stub();
      
      mockAdapter.log('debug', '调试信息', { details: 'extra' });
      
      expect(mockAdapter._log.calledWith('debug', sinon.match.string)).to.be.true;
    });
  });

  describe('抽象方法测试', () => {
    it('应该抛出错误当调用未实现的 connect 方法', async () => {
      try {
        await mockAdapter.connect();
        expect.fail('应该抛出错误');
      } catch (error) {
        expect(error.message).to.include('connect method must be implemented');
      }
    });

    it('应该抛出错误当调用未实现的 disconnect 方法', async () => {
      try {
        await mockAdapter.disconnect();
        expect.fail('应该抛出错误');
      } catch (error) {
        expect(error.message).to.include('disconnect method must be implemented');
      }
    });

    it('应该抛出错误当调用未实现的 saveDanmaku 方法', async () => {
      try {
        await mockAdapter.saveDanmaku('room1', { content: 'test' });
        expect.fail('应该抛出错误');
      } catch (error) {
        expect(error.message).to.include('saveDanmaku method must be implemented');
      }
    });
  });

  describe('资源管理测试', () => {
    it('应该正确设置连接状态', () => {
      expect(mockAdapter.isConnected).to.be.false;
      mockAdapter._setConnectionState(true);
      expect(mockAdapter.isConnected).to.be.true;
      mockAdapter._setConnectionState(false);
      expect(mockAdapter.isConnected).to.be.false;
    });

    it('应该正确存储数据库连接', () => {
      const mockConnection = { test: 'connection' };
      mockAdapter._setConnection(mockConnection);
      expect(mockAdapter.connection).to.equal(mockConnection);
    });
  });
});