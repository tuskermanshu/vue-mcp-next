# Vue MCP Next

**Language / 语言:** [English](README.md) | [中文](README_zh.md)

## 📦 Installation

```bash
# Using npm
npm install vue-mcp-next

# Using yarn
yarn add vue-mcp-next

# Using pnpm
pnpm add vue-mcp-next
```

## ⚠️ Important Prerequisites

**Before using Vue MCP Next, you must install and enable Vue DevTools!**

Vue MCP Next relies on Vue DevTools to access and manipulate the runtime state of Vue applications. Please ensure:

1. **Install Vue DevTools browser extension**
2. **DevTools is connected when the application is running**
3. **Confirm DevTools can properly display component tree and state**

Without Vue DevTools, Vue MCP Next will not work properly.

## ✨ Features

- 🚀 **Standard MCP Protocol**: Fully implemented based on official SDK
- 🏗️ **Layered Architecture**: Core layer focuses on protocol, Plugin layer adapts platforms
- 🔧 **Multi-platform Support**: Supports Vite, Webpack, Farm and other build tools
- ⚡ **Runtime Operations**: Real-time viewing and modification of Vue application state
- 🔍 **Built-in Inspector**: Integrated MCP Inspector debugging tool
- 📱 **Vue DevTools Integration**: Based on @vue/devtools-kit



## 🚀 Quick Start

### Prerequisites

Before getting started, please ensure:

1. **Install Vue DevTools browser extension**
   - [Chrome Extension](https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
   - [Firefox Extension](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
   - [Edge Extension](https://microsoftedge.microsoft.com/addons/detail/vuejs-devtools/olofadcdnkkjdfgjcmjaadnlehnnihnl)

2. **Ensure Vue DevTools can properly connect to your application**

### Vite Project Configuration

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { vueMcpVitePlugin } from 'vue-mcp-next'
import DevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  server: {
    port: 5174  // Vite uses port 5174
  },
  plugins: [
    vue(),
    DevTools(),  // Recommended: Enable Vue DevTools during development
    vueMcpVitePlugin({
      port: 8890,                    // MCP server port
      inspector: {
        enabled: true,               // Enable MCP Inspector
        autoStart: true,             // Auto start
        openBrowser: false,          // Whether to automatically open browser
      }
    })
  ],
})
```

### Start the Project

```bash
pnpm dev
```

After starting:
- Your Vue application will run at http://localhost:5174
- MCP server will run on port 8890
- MCP Inspector will start automatically (if enabled)
- Ensure the Vue DevTools extension in your browser can properly connect to your application

## 🔧 Configuration Options

### VueMcpVitePlugin Options

```typescript
interface VueMcpVitePluginOptions {
  port?: number                    // MCP server port, default 8890
  inspector?: {
    enabled?: boolean              // Enable Inspector, default true
    autoStart?: boolean            // Auto start, default false
    openBrowser?: boolean          // Auto open browser, default false
  }
}
```

## 📋 Available Features

- **Component Tree Viewing** (`get-component-tree`)
- **Component State Get/Edit** (`get-component-state`, `edit-component-state`) 
- **Component Highlighting** (`highlight-component`)
- **Router Information** (`get-router-info`)
- **Pinia State Management** (`get-pinia-tree`, `get-pinia-state`)

## 💡 Use Cases

- **Real-time Debugging**: View and modify component state in Cursor
- **State Validation**: Verify component and application state meets expectations
- **Interactive Testing**: Simulate user interactions and state changes through AI commands
- **Demo and Teaching**: Showcase internal state and component structure of Vue applications
- **Development Assistance**: Quickly view router information, Pinia store state, etc.


> A modern Vue.js Model Context Protocol implementation for Vue.js applications

Vue MCP Next is a modern MCP (Model Context Protocol) implementation that provides **runtime state manipulation and control capabilities** for Vue.js applications. This project is inspired by and built upon the excellent work of [vite-plugin-vue-mcp](https://github.com/webfansplz/vite-plugin-vue-mcp), focusing on real-time manipulation of running Vue applications, supporting testing, debugging, demonstration scenarios, with layered architecture design, multi-build tool integration, and full compliance with official MCP protocol specifications.

## 🏗️ Project Structure

```
vue-mcp-next/
├── src/
│   ├── client/                 # Client scripts
│   │   ├── client-script-manager.ts
│   │   └── devtools-client.ts
│   ├── plugins/                # Build tool plugins
│   │   ├── base/               # Base plugin functionality
│   │   └── vite/               # Vite plugin implementation
│   ├── server/                 # MCP server
│   │   ├── devtools-layer.ts
│   │   ├── http-server.ts
│   │   └── server.ts
│   └── shared/                 # Shared types and utilities
├── playground/                 # Development test environment
└── dist/                      # Build output
```

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Start playground
pnpm dev:playground

# Build
pnpm build

# Test
pnpm test

# Type check
pnpm typecheck
```

## 📄 License

MIT License