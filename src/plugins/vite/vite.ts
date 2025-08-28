import type { Plugin, ResolvedConfig } from 'vite'
import type { VueMcpOptions } from '../../server'
import { VueMcpBasePlugin } from '../base/base-plugin.js'
import { createDevToolsBridge } from '../base/devtools-bridge.js'
import { VIRTUAL_MODULES, LOG_PREFIXES, DEFAULT_CONFIG } from '../base/constants.js'
import { ResourceManager } from '../base/utils.js'

/**
 * Vite适配器 - 将Vue MCP集成到Vite构建工具中
 */
export function vueMcpVitePlugin(options: VueMcpOptions = {}): Plugin {
  const basePlugin = new VueMcpBasePlugin(options)
  const resourceManager = new ResourceManager()
  let bridge: any = null
  let config: ResolvedConfig
  let isInitialized = false

  return {
    name: 'vue-mcp-vite',
    apply: 'serve',
    enforce: 'pre',
    
    configResolved(resolvedConfig) {
      config = resolvedConfig
      console.log(`${LOG_PREFIXES.VITE_PLUGIN} Config resolved for mode: ${config.mode}`)
    },

    resolveId(id: string) {
      if (id === VIRTUAL_MODULES.CLIENT) {
        return VIRTUAL_MODULES.RESOLVED_CLIENT
      }
      if (id === VIRTUAL_MODULES.OVERLAY) {
        return VIRTUAL_MODULES.RESOLVED_OVERLAY
      }
    },

    load(id: string) {
      try {
        if (id === VIRTUAL_MODULES.RESOLVED_CLIENT) {
          return basePlugin.getClientInjectionScript()
        }
        if (id === VIRTUAL_MODULES.RESOLVED_OVERLAY) {
          return basePlugin.getOverlayScript()
        }
      } catch (error) {
        console.error(`${LOG_PREFIXES.VITE_PLUGIN} Failed to load virtual module:`, error)
        return null
      }
    },
    
    async configureServer(server) {
      try {
        if (isInitialized) {
          console.warn(`${LOG_PREFIXES.VITE_PLUGIN} Already initialized, skipping`)
          return
        }

        // 创建 DevTools 桥接
        bridge = createDevToolsBridge(DEFAULT_CONFIG.BUILD_TOOL, server)
        
        // 设置桥接
        basePlugin.setBridge(bridge)
        
        // 初始化基础插件
        await basePlugin.initialize({
          server,
          config: {
            root: server.config.root,
            mode: (server.config.mode as "development" | "production" | "test") || DEFAULT_CONFIG.MODE,
            command: server.config.command || DEFAULT_CONFIG.COMMAND
          }
        })

        // 添加中间件
        server.middlewares.use(basePlugin.getMiddleware())
        
        // WebSocket 错误处理
        const wsErrorHandler = (error: Error) => {
          console.error(`${LOG_PREFIXES.VITE_PLUGIN} WebSocket error:`, error)
        }
        server.ws.on('error', wsErrorHandler)
        resourceManager.add(() => {
          server.ws.off('error', wsErrorHandler)
        })

        // 注册优雅关闭处理
        registerShutdownHandlers()
        
        isInitialized = true
        console.log(`${LOG_PREFIXES.VITE_PLUGIN} Successfully configured for Vite server`)
        
      } catch (error) {
        console.error(`${LOG_PREFIXES.VITE_PLUGIN} Failed to configure server:`, error)
        // 继续启动 Vite，但禁用 MCP 功能
        cleanup()
      }
    },

    transformIndexHtml() {
      try {
        if (!isInitialized) {
          console.warn(`${LOG_PREFIXES.VITE_PLUGIN} Not initialized, skipping HTML transform`)
          return
        }

        const baseUrl = config?.base || '/'
        const overlayUrl = `${baseUrl}@id/${VIRTUAL_MODULES.OVERLAY}`

        return {
          html: '',
          tags: [
            {
              tag: 'script',
              injectTo: 'head-prepend',
              attrs: {
                type: 'module',
                src: overlayUrl,
              },
            },
          ],
        }
      } catch (error) {
        console.error(`${LOG_PREFIXES.VITE_PLUGIN} Failed to transform HTML:`, error)
        return
      }
    },

    transform(code, id) {
      if (!isInitialized) {
        return null
      }

      try {
        const [filename] = id.split('?', 2)
        return basePlugin.transformCode(code, filename)
      } catch (error) {
        console.error(`${LOG_PREFIXES.VITE_PLUGIN} Failed to transform code for ${id}:`, error)
        return null
      }
    },

    buildStart() {
      if (isInitialized) {
        console.log(`${LOG_PREFIXES.VITE_PLUGIN} Build started`)
      }
    },

    buildEnd() {
      cleanup()
    },

    closeBundle() {
      cleanup()
    }
  }

  // Helper functions for the plugin
  function cleanup() {
    try {
      if (bridge) {
        bridge.cleanup()
        bridge = null
      }
      basePlugin.cleanup()
      resourceManager.cleanup()
      isInitialized = false
      console.log(`${LOG_PREFIXES.VITE_PLUGIN} Cleanup completed`)
    } catch (error) {
      console.error(`${LOG_PREFIXES.VITE_PLUGIN} Cleanup error:`, error)
    }
  }

  function registerShutdownHandlers() {
    const shutdownHandler = () => cleanup()
    
    process.on('SIGINT', shutdownHandler)
    process.on('SIGTERM', shutdownHandler)
    process.on('exit', shutdownHandler)
    
    resourceManager.add(() => {
      process.off('SIGINT', shutdownHandler)
      process.off('SIGTERM', shutdownHandler)
      process.off('exit', shutdownHandler)
    })
  }
}

/**
 * 检查是否为开发环境
 */
export function isDevelopmentMode(config?: ResolvedConfig): boolean {
  return config?.mode === 'development' || config?.command === 'serve'
}

/**
 * 获取虚拟模块的完整 URL
 */
export function getVirtualModuleUrl(moduleName: string, baseUrl = '/'): string {
  return `${baseUrl}@id/${moduleName}`
}

// 默认导出
export default vueMcpVitePlugin