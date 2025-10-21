/**
 * 数据库适配器测试运行器
 * 集中运行所有数据库适配器相关测试
 */

// 导入测试框架和工具
import Mocha from 'mocha';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// 在 ES 模块中模拟 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 设置断言库
const expect = chai.expect;
const assert = chai.assert;
const should = chai.should();

// 将断言库设置为全局
global.expect = chai.expect;
global.assert = chai.assert;
global.should = chai.should();
global.sinon = sinon;

// 创建Mocha实例
const mocha = new Mocha({
  timeout: 10000, // 10秒超时
  slow: 5000,    // 5秒标记为慢
  bail: false,   // 不遇到第一个错误就退出
  reporter: 'spec' // 使用spec报告器
});

// 测试文件目录
const testDir = path.join(__dirname, 'database');

// 过滤测试文件的函数
function isTestFile(filename) {
  return filename.endsWith('.test.js') && 
         !filename.includes('.tmp.') && 
         !filename.startsWith('_');
}

// 收集所有测试文件
function collectTestFiles(directory) {
  console.log(`开始收集测试文件，目录: ${directory}`);
  const files = [];
  
  function walk(dir) {
    console.log(`正在遍历目录: ${dir}`);
    const items = fs.readdirSync(dir);
    console.log(`找到 ${items.length} 个项目`);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      console.log(`检查项目: ${itemPath}`);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        console.log(`- 是目录，递归遍历`);
        walk(itemPath);
      } else if (isTestFile(item)) {
        console.log(`- 是测试文件，添加到列表`);
        files.push(itemPath);
      } else {
        console.log(`- 不是测试文件，跳过`);
      }
    });
  }
  
  walk(directory);
  console.log(`测试文件收集完成，共找到 ${files.length} 个文件`);
  return files;
}

// 运行测试的主函数
const runTests = async () => {
  try {
    // 收集测试文件
    const testFiles = collectTestFiles(testDir);
    
    if (testFiles.length === 0) {
      console.log('未找到任何测试文件！');
      return 1;
    }
    
    console.log(`找到 ${testFiles.length} 个测试文件:`);
    testFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${path.relative(__dirname, file)}`);
    });
    console.log('');
    
    // 添加测试文件到Mocha
    testFiles.forEach(file => {
      mocha.addFile(file);
    });
    
    // 运行测试
    return new Promise((resolve) => {
      mocha.run(failures => {
        console.log('\n=== 测试运行完成 ===');
        if (failures > 0) {
          console.error(`✗ 有 ${failures} 个测试失败！`);
          resolve(1);
        } else {
          console.log('✓ 所有测试通过！');
          resolve(0);
        }
      });
    });
  } catch (error) {
    console.error('测试运行过程中发生错误:', error);
    return 1;
  }
};

// 导出供其他模块使用
export { runTests, mocha };

// 如果直接运行此脚本
if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  console.log('脚本开始执行');
  console.log(`当前工作目录: ${process.cwd()}`);
  console.log(`脚本路径: ${process.argv[1]}`);
  console.log(`测试目录: ${testDir}`);
  console.log(`测试目录是否存在: ${fs.existsSync(testDir)}`);
  
  (async () => {
    try {
      const code = await runTests();
      process.exit(code);
    } catch (error) {
      console.error('运行失败:', error);
      process.exit(1);
    }
  })();
}