#!/usr/bin/env node

import { execSync } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'

const packages = ['core', 'plugin']

console.log('🏗️  构建包...')

for (const pkg of packages) {
  const pkgPath = join('packages', pkg)
  
  if (!existsSync(pkgPath)) {
    console.log(`❌ 包 ${pkg} 不存在`)
    continue
  }
  
  console.log(`\n📦 构建 @vue-mcp-next/${pkg}...`)
  
  try {
    // 先清理
    execSync(`pnpm --filter="@vue-mcp-next/${pkg}" clean`, { stdio: 'inherit' })
    
    // 使用独立的 tsc 命令，不依赖根 tsconfig
    const cmd = `pnpm --filter="@vue-mcp-next/${pkg}" build`
    execSync(cmd, { stdio: 'inherit' })
    
    // TypeScript 有时不会同时生成 JS 和 .d.ts，需要额外生成声明文件
    const declCmd = `pnpm --filter="@vue-mcp-next/${pkg}" exec -- tsc --emitDeclarationOnly --outDir temp-dist`
    try {
      execSync(declCmd, { stdio: 'pipe' })
      // 复制声明文件
      execSync(`pnpm --filter="@vue-mcp-next/${pkg}" exec -- cp temp-dist/*.d.ts dist/ 2>/dev/null || true`, { stdio: 'pipe' })
      execSync(`pnpm --filter="@vue-mcp-next/${pkg}" exec -- rm -rf temp-dist`, { stdio: 'pipe' })
    } catch (e) {
      // 忽略声明文件生成错误
    }
    
    // 验证构建结果
    const distPath = join(pkgPath, 'dist')
    if (existsSync(distPath)) {
      console.log(`✅ @vue-mcp-next/${pkg} 构建成功`)
    } else {
      console.log(`⚠️ @vue-mcp-next/${pkg} 构建完成但没有输出文件`)
    }
  } catch (error) {
    console.error(`❌ @vue-mcp-next/${pkg} 构建失败:`, error.message)
    if (pkg === 'core') {
      // 如果 core 构建失败，后续包无法构建
      process.exit(1)
    }
  }
}

console.log('\n🎉 包构建完成！')