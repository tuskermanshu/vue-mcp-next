# Vue MCP Plugin - 通用多构建工具支持

支持 **Vite** / **Webpack** / **Farm** 等多种构建工具的Vue MCP插件。

## 🚀 特性

- ✅ **DevTools运行时操作** - 实时控制Vue应用状态
- ✅ **静态代码分析** - AST解析和代码生成  
- ✅ **多构建工具支持** - Vite / Webpack / Farm
- ✅ **统一API** - 相同的配置选项和使用方式
- ✅ **TypeScript支持** - 完整的类型定义

## 📦 安装

```bash
pnpm add @vue-mcp-next/plugin
```

## 🔧 使用方式

### Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { vite as vueMcpPlugin } from '@vue-mcp-next/plugin'

export default defineConfig({
  plugins: [
    vue(),
    vueMcpPlugin({
      port: 8080,
      features: {
        devtools: true,
        codeAnalysis: true,
        performanceMonitoring: true
      }
    })
  ]
})
```

### Webpack

```javascript
// webpack.config.js
const { webpack: VueMcpPlugin } = require('@vue-mcp-next/plugin')

module.exports = {
  // ... 其他配置
  plugins: [
    new VueMcpPlugin({
      port: 8080,
      features: {
        devtools: true,
        codeAnalysis: true,
        performanceMonitoring: true
      }
    })
  ],
  devServer: {
    // webpack-dev-server配置
    port: 3000
  }
}
```

### Farm

```typescript
// farm.config.ts
import { defineConfig } from '@farmfe/core'
import { farm as vueMcpPlugin } from '@vue-mcp-next/plugin'

export default defineConfig({
  compilation: {
    input: {
      main: './src/main.ts'
    }
  },
  plugins: [
    vueMcpPlugin({
      port: 8080,
      features: {
        devtools: true,
        codeAnalysis: true,
        performanceMonitoring: true
      }
    })
  ]
})
```

### 自动检测模式

```typescript
// 任意构建工具
import { createVueMcpPlugin } from '@vue-mcp-next/plugin'

const plugin = createVueMcpPlugin({
  port: 8080,
  features: {
    devtools: true,
    codeAnalysis: true
  }
})

// 插件会自动检测当前使用的构建工具并返回对应的插件实例
```

## ⚙️ 配置选项

```typescript
interface VueMcpOptions {
  /** MCP服务器端口 */
  port?: number
  
  /** MCP服务器信息 */
  mcpServerInfo?: {
    name?: string
    version?: string
  }
  
  /** 功能开关 */
  features?: {
    /** 启用DevTools运行时操作 */
    devtools?: boolean
    /** 启用静态代码分析 */
    codeAnalysis?: boolean  
    /** 启用性能监控 */
    performanceMonitoring?: boolean
  }
  
  /** 客户端脚本注入目标文件 */
  appendTo?: string | RegExp
}
```

## 🛠️ MCP工具列表

### DevTools运行时工具
- `get-component-tree` - 获取Vue应用组件树
- `get-component-state` - 获取组件状态
- `edit-component-state` - 实时修改组件状态
- `highlight-component` - 浏览器中高亮组件
- `get-router-info` - 获取路由信息
- `get-pinia-state` - 获取Pinia状态
- `get-pinia-tree` - 获取Pinia状态树

### 静态分析工具
- `analyze-component` - 深度分析组件结构
- `get-project-overview` - 项目概览分析
- `find-component-usage` - 查找组件使用情况
- `generate-component` - AI代码生成

## 🎯 架构优势

### 分层设计
```
┌─────────────────────────────────────────┐
│           MCP 客户端 (Claude/Cursor)      │
└─────────────────┬───────────────────────┘
                  │ WebSocket
┌─────────────────▼───────────────────────┐
│              Vue MCP Server             │
│  ┌─────────────────┬─────────────────┐  │
│  │ DevTools Layer  │ Analysis Layer  │  │
│  │ (运行时操作)     │ (静态分析)       │  │
│  └─────────────────┴─────────────────┘  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│             构建工具适配器                │
│  ┌───────┬─────────┬─────────┬──────┐   │
│  │ Vite  │ Webpack │  Farm   │ ...  │   │
│  └───────┴─────────┴─────────┴──────┘   │
└─────────────────────────────────────────┘
```

### 核心特点
1. **统一API** - 无论使用哪种构建工具，API完全一致
2. **适配器模式** - 每个构建工具有专门的适配器
3. **混合增强** - 结合运行时操作和静态分析
4. **类型安全** - 完整的TypeScript支持

## 🌟 高级用法

### 自定义中间件

```typescript
import { VueMcpBasePlugin } from '@vue-mcp-next/plugin'

const basePlugin = new VueMcpBasePlugin({
  port: 8080,
  features: { devtools: true, codeAnalysis: true }
})

// 获取中间件函数，集成到任何HTTP服务器
const middleware = basePlugin.getMiddleware()

// Express例子
app.use('/__vue-mcp', middleware)
```

### 自定义构建工具集成

```typescript
import { VueMcpBasePlugin } from '@vue-mcp-next/plugin'

class MyCustomBuildToolPlugin {
  private basePlugin = new VueMcpBasePlugin(options)
  
  async initialize() {
    await this.basePlugin.initialize({
      config: {
        root: process.cwd(),
        mode: 'development',
        command: 'serve'
      }
    })
  }
  
  transformCode(code: string, filename: string) {
    return this.basePlugin.transformCode(code, filename)
  }
  
  transformHtml(html: string) {
    return this.basePlugin.transformHtml(html)
  }
}
```

## 🔍 调试

启动开发服务器后，访问：
- `http://localhost:5173/__vue-mcp/status` - 查看MCP状态
- `http://localhost:5173/__vue-mcp-devtools/client.js` - 客户端脚本

控制台输出：
```
🚀 Vue MCP Server started with hybrid capabilities:
  📱 DevTools Runtime Layer - Real-time Vue app control
  🔍 Static Analysis Layer - Code analysis & generation
  🌐 WebSocket Communication - Unified MCP protocol
  🔗 Server running on port 8080
```

## 📝 注意事项

1. **开发模式专用** - 插件只在开发模式下激活
2. **Vue DevTools依赖** - 运行时功能需要Vue DevTools支持
3. **WebSocket连接** - 确保防火墙允许WebSocket连接
4. **端口冲突** - 确保MCP端口未被占用

## 🤝 贡献

欢迎提交Issues和Pull Requests！

## 📄 许可证

MIT License