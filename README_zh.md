# Vue MCP Next

**Language / 语言:** [English](README.md) | [中文](README_zh.md)


## 📦 安装

```bash
# 使用 npm
npm install vue-mcp-next

# 使用 yarn
yarn add vue-mcp-next

# 使用 pnpm
pnpm add vue-mcp-next
```

## ⚠️ 重要前置条件

**使用 Vue MCP Next 之前，必须先安装并启用 Vue DevTools！**

Vue MCP Next 依赖 Vue DevTools 来访问和操作 Vue 应用的运行时状态。请确保：

1. **浏览器中安装 Vue DevTools 扩展**
2. **应用运行时 DevTools 处于连接状态**
3. **确认 DevTools 能正常显示组件树和状态**

没有 Vue DevTools，Vue MCP Next 将无法正常工作。

## ✨ 特性

- 🚀 **标准 MCP 协议**：完全基于官方 SDK 实现
- 🏗️ **分层架构设计**：Core 层专注协议，Plugin 层适配平台
- 🔧 **多平台支持**：支持 Vite、Webpack、Farm 等构建工具
- ⚡ **运行时操作**：实时查看和修改 Vue 应用状态
- 🔍 **内置 Inspector**：集成 MCP Inspector 调试工具
- 📱 **Vue DevTools 集成**：基于 @vue/devtools-kit



## 🚀 快速开始

### 前置要求

在开始之前，请确保：

1. **安装 Vue DevTools 浏览器扩展**
   - [Chrome 扩展](https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
   - [Firefox 扩展](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
   - [Edge 扩展](https://microsoftedge.microsoft.com/addons/detail/vuejs-devtools/olofadcdnkkjdfgjcmjaadnlehnnihnl)

2. **确保 Vue DevTools 能正常连接到你的应用**

### Vite 项目配置

在你的 `vite.config.ts` 中添加插件：

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { vueMcpVitePlugin } from 'vue-mcp-next'
import DevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  server: {
    port: 5174  // Vite 使用 5174 端口
  },
  plugins: [
    vue(),
    DevTools(),  // 推荐：开发时启用 Vue DevTools
    vueMcpVitePlugin({
      port: 8890,                    // MCP 服务器端口
      inspector: {
        enabled: true,               // 启用 MCP Inspector
        autoStart: true,             // 自动启动
        openBrowser: false,          // 是否自动打开浏览器
      }
    })
  ],
})
```

### 启动项目

```bash
pnpm dev
```

启动后：
- 你的 Vue 应用将运行在 http://localhost:5174
- MCP 服务器将运行在端口 8890
- MCP Inspector 将自动启动（如果启用）
- 确保浏览器中的 Vue DevTools 扩展能正常连接到你的应用

## 🔧 配置选项

### VueMcpVitePlugin 选项

```typescript
interface VueMcpVitePluginOptions {
  port?: number                    // MCP 服务器端口，默认 8890
  inspector?: {
    enabled?: boolean              // 启用 Inspector，默认 true
    autoStart?: boolean            // 自动启动，默认 false
    openBrowser?: boolean          // 自动打开浏览器，默认 false
  }
}
```

## 📋 可用功能

- **组件树查看** (`get-component-tree`)
- **组件状态获取/编辑** (`get-component-state`, `edit-component-state`) 
- **组件高亮显示** (`highlight-component`)
- **路由信息获取** (`get-router-info`)
- **Pinia 状态管理** (`get-pinia-tree`, `get-pinia-state`)

## 💡 使用场景

- **实时调试**：在 Cursor 中查看和修改组件状态
- **状态验证**：验证组件和应用状态是否符合预期
- **交互测试**：通过 AI 指令模拟用户交互和状态变化
- **演示和教学**：展示 Vue 应用的内部状态和组件结构
- **开发辅助**：快速查看路由信息、Pinia store 状态等



> 一个现代化的 Vue.js 模型上下文协议实现

Vue MCP Next 是一个为 Vue.js 应用提供**运行时状态操作和控制能力**的现代化 MCP (Model Context Protocol) 实现。该项目受 [vite-plugin-vue-mcp](https://github.com/webfansplz/vite-plugin-vue-mcp) 的优秀工作启发并基于其构建，专注于实时操作正在运行的 Vue 应用，支持测试、调试、演示等场景，采用分层架构设计，支持多种构建工具集成，完全符合 MCP 官方协议规范。

## 🏗️ 项目结构

```
vue-mcp-next/
├── src/
│   ├── client/                 # 客户端脚本
│   │   ├── client-script-manager.ts
│   │   └── devtools-client.ts
│   ├── plugins/                # 构建工具插件
│   │   ├── base/               # 基础插件功能
│   │   └── vite/               # Vite 插件实现
│   ├── server/                 # MCP 服务器
│   │   ├── devtools-layer.ts
│   │   ├── http-server.ts
│   │   └── server.ts
│   └── shared/                 # 共享类型和工具
├── playground/                 # 开发测试环境
└── dist/                      # 构建输出
```

## 🛠️ 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 启动 playground
pnpm dev:playground

# 构建
pnpm build

# 测试
pnpm test

# 类型检查
pnpm typecheck
```

## 📄 许可证

MIT License