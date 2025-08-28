import type { VueMcpOptions, VueMcpContext, VueAppBridge } from '@vue-mcp-next/core'
import { VueMcpServer } from '@vue-mcp-next/core'
import { VueMcpConfigManager } from './config-manager.js'
import { ClientScriptManager } from '../client/client-script-manager.js'
import { ResourceManager } from './utils.js'
import { HTTP_ROUTES, LOG_PREFIXES } from './constants.js'

/**
 * 通用Vue MCP插件基础类
 * 提供与打包工具无关的核心功能
 */
export class VueMcpBasePlugin {
  protected configManager: VueMcpConfigManager
  protected clientScriptManager: ClientScriptManager
  protected resourceManager: ResourceManager
  protected mcpServer?: VueMcpServer
  protected context?: VueMcpContext
  protected bridge?: VueAppBridge
  protected isEnabled = true

  constructor(options: VueMcpOptions = {}) {
    this.configManager = new VueMcpConfigManager(options)
    this.clientScriptManager = ClientScriptManager.getInstance()
    this.resourceManager = new ResourceManager()
  }

  /**
   * 初始化MCP服务器
   */
  async initialize(buildTool: {
    server?: any
    config: {
      root: string
      mode?: "development" | "production" | "test"
      command?: "serve" | "build"
    }
  }): Promise<void> {
    try {
      // 创建MCP上下文
      this.context = this.configManager.createRuntimeConfig(buildTool.config)

      // 初始化MCP服务器
      this.mcpServer = new VueMcpServer(this.configManager.getConfig(), this.context)
      
      if (this.bridge) {
        this.mcpServer.setBridge(this.bridge)
      }

      await this.mcpServer.start()
      
      this.logStartupMessage()
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.BASE_PLUGIN} Failed to initialize:`, error)
      this.isEnabled = false
      throw error
    }
  }

  setBridge(bridge: VueAppBridge): void {
    this.bridge = bridge
    if (this.mcpServer) {
      this.mcpServer.setBridge(bridge)
    }
  }

  /**
   * 获取客户端注入脚本
   */
  getClientInjectionScript(): string {
    try {
      return this.clientScriptManager.getClientScript()
    } catch (error) {
      console.error(`${LOG_PREFIXES.BASE_PLUGIN} Failed to get client script:`, error)
      return this.createFallbackScript()
    }
  }

  /**
   * 获取 Overlay 脚本 - 直接加载客户端
   */
  getOverlayScript(): string {
    return this.clientScriptManager.getOverlayScript()
  }

  /**
   * 创建备用脚本
   */
  private createFallbackScript(): string {
    return `
// Vue MCP Client - Fallback
console.warn('[Vue MCP] Using fallback client script');
setTimeout(() => {
  fetch('${HTTP_ROUTES.CLIENT_READY}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ready: true, fallback: true, timestamp: Date.now() })
  }).catch(() => console.warn('[Vue MCP] Failed to notify server'));
}, 1000);
`
  }

  /**
   * 获取中间件处理函数（用于处理MCP相关请求）
   */
  getMiddleware() {
    return (req: any, res: any, next: any) => {
      if (req.url === HTTP_ROUTES.CLIENT_SCRIPT) {
        this.handleClientScriptRequest(res)
        return
      }

      if (req.url === HTTP_ROUTES.CLIENT_READY && req.method === 'POST') {
        this.handleClientReadyRequest(req, res)
        return
      }

      next()
    }
  }

  /**
   * 处理客户端脚本请求
   */
  private handleClientScriptRequest(res: any): void {
    res.setHeader('Content-Type', 'application/javascript')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(this.getClientInjectionScript())
  }

  /**
   * 处理客户端就绪通知
   */
  private handleClientReadyRequest(req: any, res: any): void {
    let body = ''
    req.on('data', (chunk: any) => {
      body += chunk.toString()
    })
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        
        // 通知 Bridge 客户端已就绪
        if (this.bridge) {
          this.bridge.setClientReady(true)
        }
        
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
        
        console.log(`${LOG_PREFIXES.BASE_PLUGIN} Client ready notification received`, {
          devtoolsAvailable: data.devtoolsAvailable,
          fallback: data.fallback
        })
      } catch (error) {
        console.error(`${LOG_PREFIXES.BASE_PLUGIN} Failed to parse client ready data:`, error)
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
  }

  /**
   * 获取客户端脚本 - 使用客户端脚本管理器
   */
  private getSimpleClientScript(): string {
    return this.clientScriptManager.getClientScript()
  }

  /**
   * 处理文件转换（注入客户端代码）
   */
  transformCode(code: string, _filename: string): string {
    // 目前不需要代码转换
    return code
  }

  /**
   * 转换HTML（注入脚本标签）
   */
  transformHtml(html: string): string {
    if (!this.isEnabled) {
      return html
    }

    // 注入客户端脚本
    const scriptTag = `
  <script type="module" src="/__vue-mcp-client.js"></script>`

    // 在 </head> 前注入
    if (html.includes('</head>')) {
      return html.replace('</head>', `${scriptTag}
</head>`)
    }
    
    // 在 <body> 后注入
    if (html.includes('<body>')) {
      return html.replace('<body>', `<body>${scriptTag}`)
    }
    
    // 如果都没找到，直接在开头注入
    return scriptTag + '\n' + html
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      
      if (this.mcpServer) {
        await this.mcpServer.stop()
        this.mcpServer = undefined
      }
      
      if (this.bridge) {
        this.bridge = undefined
      }
      
    } catch (error) {
      console.error('[BasePlugin] Cleanup error:', error)
    }
  }

  private logStartupMessage(): void {
    const config = this.configManager.getConfig()
    
    console.log('\n🚀 Vue MCP Next is running!')
    console.log(`   MCP Server: http://localhost:${config.port}`)
    
    if (config.inspector.enabled) {
      console.log(`   Inspector: http://localhost:${config.inspector.port}`)
    }
  }
}