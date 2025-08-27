import type { Plugin, ResolvedConfig } from 'vite'
import type { VueMcpOptions } from '@vue-mcp-next/core'
import { VueMcpBasePlugin } from '../lib/base-plugin.js'
import { createDevToolsBridge } from '../lib/devtools-bridge.js'

// 虚拟模块标识符
const VIRTUAL_CLIENT_MODULE = 'virtual:vue-mcp-client'
const RESOLVED_VIRTUAL_CLIENT_MODULE = '\0' + VIRTUAL_CLIENT_MODULE

/**
 * Vite适配器 - 将Vue MCP集成到Vite构建工具中
 */
export function vueMcpVitePlugin(options: VueMcpOptions = {
  context: undefined
}): Plugin {
  const basePlugin = new VueMcpBasePlugin(options)
  let bridge: any = null
  let config: ResolvedConfig

  return {
    name: 'vue-mcp-vite',
    apply: 'serve', // 仅在开发模式下应用
    enforce: 'pre', // 确保在其他插件之前运行
    
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    // 解析虚拟模块
    resolveId(id: string) {
      if (id === VIRTUAL_CLIENT_MODULE) {
        return RESOLVED_VIRTUAL_CLIENT_MODULE
      }
    },

    // 加载虚拟模块内容
    load(id: string) {
      if (id === RESOLVED_VIRTUAL_CLIENT_MODULE) {
        return basePlugin.getClientInjectionScript()
      }
    },
    
    async configureServer(server) {
      try {
        
        // 创建统一的 DevTools 桥接
        bridge = createDevToolsBridge('vite', server)
        
        // 设置桥接
        basePlugin.setBridge(bridge)
        
        // 使用基础插件初始化
        await basePlugin.initialize({
          server,
          config: {
            root: server.config.root,
            mode: server.config.mode || 'development',
            command: server.config.command || 'serve'
          }
        })

        // 添加中间件
        server.middlewares.use(basePlugin.getMiddleware())
        
        
        // 错误处理
        server.ws.on('error', (error) => {
          console.error('[VitePlugin] WebSocket error:', error)
        })

        // 优雅关闭处理
        process.on('SIGINT', () => {
          if (bridge) {
            bridge.cleanup()
          }
          basePlugin.cleanup()
        })

        process.on('SIGTERM', () => {
          if (bridge) {
            bridge.cleanup()
          }
          basePlugin.cleanup()
        })
        
      } catch (error) {
        console.error('[VitePlugin] Failed to configure Vue MCP server:', error)
        // 继续启动 Vite，但禁用 MCP 功能
      }
    },

    transformIndexHtml() {
      // 使用虚拟模块注入而不是直接 HTML 注入
      return {
        html: '',
        tags: [
          {
            tag: 'script',
            injectTo: 'head-prepend',
            attrs: {
              type: 'module',
              src: `${config.base || '/'}@id/${VIRTUAL_CLIENT_MODULE}`,
            },
          },
        ],
      }
    },

    transform(code, id) {
      try {
        const [filename] = id.split('?', 2)
        return basePlugin.transformCode(code, filename)
      } catch (error) {
        console.error('[VitePlugin] Failed to transform code:', error)
        return null
      }
    },

    buildStart() {
    },

    buildEnd() {
      try {
        if (bridge) {
          bridge.cleanup()
        }
        basePlugin.cleanup()
      } catch (error) {
        console.error('[VitePlugin] Cleanup error:', error)
      }
    },

    closeBundle() {
    }
  }
}

// 默认导出
export default vueMcpVitePlugin