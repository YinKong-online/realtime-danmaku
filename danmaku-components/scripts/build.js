const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// 创建输出目录
const distDir = path.resolve(__dirname, '../dist')
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

console.log('开始构建弹幕组件库...')

// 执行TypeScript编译
console.log('1. 编译TypeScript...')
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' })
  console.log('TypeScript编译成功！')
} catch (error) {
  console.error('TypeScript编译失败！')
  process.exit(1)
}

// 使用Vite构建
console.log('2. 使用Vite构建...')
try {
  execSync('npx vite build', { stdio: 'inherit' })
  console.log('Vite构建成功！')
} catch (error) {
  console.error('Vite构建失败！')
  process.exit(1)
}

// 生成类型定义
console.log('3. 生成类型定义...')
try {
  execSync('npx tsc --emitDeclarationOnly', { stdio: 'inherit' })
  console.log('类型定义生成成功！')
} catch (error) {
  console.error('类型定义生成失败！')
  process.exit(1)
}

// 复制必要文件
console.log('4. 复制必要文件...')
try {
  // 复制README.md
  fs.copyFileSync(
    path.resolve(__dirname, '../README.md'),
    path.resolve(__dirname, '../dist/README.md')
  )
  
  // 复制package.json
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'))
  const distPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    main: packageJson.main,
    module: packageJson.module,
    types: packageJson.types,
    exports: packageJson.exports,
    keywords: packageJson.keywords,
    author: packageJson.author,
    license: packageJson.license,
    peerDependencies: packageJson.peerDependencies
  }
  fs.writeFileSync(
    path.resolve(__dirname, '../dist/package.json'),
    JSON.stringify(distPackageJson, null, 2)
  )
  
  console.log('文件复制成功！')
} catch (error) {
  console.error('文件复制失败！')
  process.exit(1)
}

console.log('构建完成！🎉')
console.log(`输出目录: ${distDir}`)