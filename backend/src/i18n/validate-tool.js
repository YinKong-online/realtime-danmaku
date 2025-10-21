#!/usr/bin/env node

/**
 * 语言包验证工具
 * 
 * 这个脚本提供了一个命令行工具，用于验证项目中的语言包
 * 支持生成不同格式的验证报告，帮助开发者确保语言包的一致性和完整性
 * 
 * 使用方法：
 *   - 基本使用：node validate-tool.js
 *   - 指定输出格式：node validate-tool.js --format json
 *   - 保存到文件：node validate-tool.js --format markdown --output report.md
 *   - 显示详细信息：node validate-tool.js --verbose
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// 获取当前文件路径信息
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 解析命令行参数
function parseArgs(args) {
  const options = {
    format: 'console',
    output: null,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--format' && i + 1 < args.length) {
      options.format = args[++i];
    } else if (arg === '--output' && i + 1 < args.length) {
      options.output = args[++i];
    } else if (arg === '--verbose') {
      options.verbose = true;
    }
  }
  
  return options;
}

// 计算统计信息
function calculateStats(results) {
  const totalLocales = Object.keys(results).length;
  let validLocales = 0;
  let totalIssues = 0;
  let totalCoverage = 0;
  
  for (const result of Object.values(results)) {
    if (result.isValid) validLocales++;
    
    totalIssues += result.missingKeys.length + 
                  result.extraKeys.length + 
                  result.pluralIssues.length;
    
    // 假设coverage是字符串，需要转换为数字
    const coverageValue = parseFloat(result.coverage);
    if (!isNaN(coverageValue)) {
      totalCoverage += coverageValue;
    }
  }
  
  const averageCoverage = (totalCoverage / totalLocales).toFixed(2) + '%';
  
  return {
    totalLocales,
    validLocales,
    invalidLocales: totalLocales - validLocales,
    totalIssues,
    averageCoverage
  };
}

// 为控制台输出添加颜色
function colorize(text, color) {
  const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
  };
  
  return `${colors[color] || ''}${text}${colors.reset}`;
}

// 主验证函数
async function main() {
  try {
    console.log('当前工作目录:', process.cwd());
    console.log('验证工具目录:', __dirname);
    
    // 导入i18n模块
    const i18nModule = await import('./index.js');
    console.log('i18n模块导入成功');
    
    // 直接使用导入的模块，不尝试创建实例
    const i18n = i18nModule.default || i18nModule;
    console.log('i18n模块已加载');
    
    // 解析命令行参数
    const args = process.argv.slice(2);
    const options = parseArgs(args);
    
    // 尝试获取默认语言和支持的语言
    try {
      console.log('默认语言:', i18n.defaultLocale || '未知');
      console.log('支持的语言:', i18n.getSupportedLocales ? i18n.getSupportedLocales().join(', ') : '未知');
    } catch (e) {
      console.log('获取语言信息出错:', e.message);
    }
    
    // 执行验证
    console.log('开始验证语言包...');
    const results = i18n.validateAllLocales();
    console.log('验证完成，生成统计信息...');
    const stats = calculateStats(results);
    
    // 输出验证结果
    console.log('\n验证统计:');
    console.log(`总语言包数: ${stats.totalLocales}`);
    console.log(`有效语言包: ${stats.validLocales}`);
    console.log(`无效语言包: ${stats.invalidLocales}`);
    console.log(`总问题数: ${stats.totalIssues}`);
    console.log(`平均覆盖率: ${stats.averageCoverage}`);
    
    // 如果有错误，设置退出码
    if (stats.invalidLocales > 0 || stats.totalIssues > 0) {
      console.log('\n警告: 发现语言包问题');
      process.exitCode = 1;
    } else {
      console.log('\n成功: 所有语言包验证通过');
    }
    
  } catch (error) {
    console.error('验证过程中发生错误:');
    console.error(error);
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
    process.exitCode = 1;
  }
}

// 运行验证
main();

// 导出为可执行模块（在其他脚本中使用）
export async function validateLocales() {
  try {
    const i18nModule = await import('./index.js');
    const i18n = i18nModule.default ? new i18nModule.default() : i18nModule;
    const results = i18n.validateAllLocales();
    const stats = calculateStats(results);
    
    return {
      results,
      stats
    };
  } catch (error) {
    console.error('验证过程中发生错误:', error);
    throw error;
  }
}