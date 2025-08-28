#!/usr/bin/env node

import { readFileSync, statSync } from 'fs'
import { resolve } from 'path'

const EXPECTED_FILES = [
  'dist/index.js',
  'dist/index.cjs', 
  'dist/index.d.ts',
  'dist/plugin.js',
  'dist/plugin.d.ts'
]

console.log('🔍 验证构建结果...\n')

// 检查必要文件是否存在
let allFilesExist = true
for (const file of EXPECTED_FILES) {
  try {
    const stats = statSync(file)
    const sizeKB = Math.round(stats.size / 1024)
    console.log(`✅ ${file} (${sizeKB}KB)`)
  } catch (error) {
    console.log(`❌ ${file} - 文件不存在`)
    allFilesExist = false
  }
}

if (!allFilesExist) {
  console.log('\n❌ 构建验证失败: 缺少必要文件')
  process.exit(1)
}

// 测试导入
console.log('\n🧪 测试模块导入...')

try {
  // 测试主入口
  const mainModule = await import(resolve('dist/index.js'))
  const { vueMcpVitePlugin, VueMcpServer, DevToolsRuntimeLayer } = mainModule
  
  console.log(`✅ 主入口 - vueMcpVitePlugin: ${typeof vueMcpVitePlugin}`)
  console.log(`✅ 主入口 - VueMcpServer: ${typeof VueMcpServer}`) 
  console.log(`✅ 主入口 - DevToolsRuntimeLayer: ${typeof DevToolsRuntimeLayer}`)
  
  // 测试插件入口
  const pluginModule = await import(resolve('dist/plugin.js'))
  const { vueMcpVitePlugin: pluginOnly } = pluginModule
  
  console.log(`✅ 插件入口 - vueMcpVitePlugin: ${typeof pluginOnly}`)
  
  // 验证类型定义
  const indexDts = readFileSync('dist/index.d.ts', 'utf-8')
  const pluginDts = readFileSync('dist/plugin.d.ts', 'utf-8')
  
  if (indexDts.includes('VueMcpServer') && indexDts.includes('vueMcpVitePlugin')) {
    console.log('✅ 主入口类型定义完整')
  } else {
    throw new Error('主入口类型定义不完整')
  }
  
  if (pluginDts.includes('vueMcpVitePlugin')) {
    console.log('✅ 插件入口类型定义完整')
  } else {
    throw new Error('插件入口类型定义不完整')
  }
  
  console.log('\n🎉 构建验证通过!')
  console.log('\n📦 使用方式:')
  console.log('import { vueMcpVitePlugin } from "vue-mcp-next"')
  console.log('import { VueMcpServer } from "vue-mcp-next"')
  console.log('import { vueMcpVitePlugin } from "vue-mcp-next/plugin"')
  
} catch (error) {
  console.log(`\n❌ 导入测试失败: ${error.message}`)
  process.exit(1)
}