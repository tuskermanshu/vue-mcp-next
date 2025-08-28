import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { DevToolsRuntimeLayer } from './devtools-layer.js'
import { VueMcpHttpServer } from './http-server.js'
import { VueMcpError, ErrorCode, errorManager } from './errors.js'
import { logger } from './logger.js'
import type { 
  VueMcpOptions, 
  VueMcpContext, 
  ComponentSelector, 
  StatePatch
} from './types.js'

export class VueMcpServer {
  private mcpServer: McpServer
  private httpServer: VueMcpHttpServer
  private devtoolsLayer: DevToolsRuntimeLayer
  private context: VueMcpContext
  private options: VueMcpOptions
  private serverLogger = logger.child('Server')
  private isStarted = false

  constructor(
    options: VueMcpOptions,
    context: VueMcpContext,
    bridge?: any // VueAppBridge - 可选，稍后由插件层设置
  ) {
    this.options = { ...this.getDefaultOptions(), ...options }
    this.context = context
    
    this.serverLogger.info('Initializing Vue MCP Server', {
      port: this.options.port,
      buildTool: context.buildTool,
      mode: context.mode
    })

    try {
      // 创建MCP服务器
      this.mcpServer = new McpServer({
        name: 'vue-mcp-next',
        version: '0.1.0',
        ...this.options.mcpServerInfo,
      })

      // 初始化运行时层（DevTools）
      this.devtoolsLayer = new DevToolsRuntimeLayer(bridge, context)

      // 创建 HTTP 服务器
      this.httpServer = new VueMcpHttpServer(this.mcpServer, {
        port: this.options.port || 8080,
        cors: true,
        enableMcpInspector: this.options.inspector?.enabled || false,
        authToken: this.options.inspector?.authToken,
        serverName: this.options.mcpServerInfo?.name || 'vue-mcp-next',
        serverVersion: this.options.mcpServerInfo?.version || '0.1.0',
        inspector: {
          enabled: this.options.inspector?.enabled || false,
          authToken: this.options.inspector?.authToken,
          autoStart: this.options.inspector?.autoStart || false,
          openBrowser: this.options.inspector?.openBrowser || false
        }
      })

      this.serverLogger.debug('Vue MCP Server initialized successfully')
    } catch (error) {
      const mcpError = VueMcpError.serverStartFailed(this.options.port || 8080, error as Error)
      this.serverLogger.error('Failed to initialize Vue MCP Server', { error: mcpError.toJSON() })
      errorManager.handle(mcpError)
      throw mcpError
    }

    this.setupTools()
  }

  /**
   * 获取默认配置
   */
  private getDefaultOptions(): VueMcpOptions {
    return {
      port: 8890,
      mcpServerInfo: {
        name: 'vue-mcp-next',
        version: '0.1.0',
        description: 'Vue MCP Next Server'
      },
      features: {
        devtools: true,
        performanceMonitoring: false,
        componentHighlight: true,
        stateManagement: true
      },
      inspector: {
        enabled: false,
        autoStart: false,
        openBrowser: false
      }
    }
  }

  setBridge(bridge: any) {
    this.devtoolsLayer.setBridge(bridge)
  }

  private setupTools() {
    // 运行时操作工具（基于DevTools）
    this.setupRuntimeTools()
  }

  private setupRuntimeTools() {
    const tools = [
      {
        name: 'get-component-tree',
        config: {
          title: 'Get Component Tree',
          description: '获取Vue应用的组件树结构',
          inputSchema: {}
        },
        handler: () => this.devtoolsLayer.getComponentTree()
      },
      {
        name: 'get-component-state',
        config: {
          title: 'Get Component State',
          description: '获取指定组件的状态信息',
          inputSchema: {
            componentName: z.string().describe('组件名称'),
            instanceId: z.string().optional().describe('组件实例ID')
          } as any
        },
        handler: ({ componentName, instanceId }: any) => {
          const selector: ComponentSelector = { name: componentName, instanceId }
          return this.devtoolsLayer.getComponentState(selector)
        }
      },
      {
        name: 'edit-component-state',
        config: {
          title: 'Edit Component State',
          description: '修改指定组件的状态',
          inputSchema: {
            componentName: z.string().describe('组件名称'),
            path: z.array(z.string()).describe('状态路径数组'),
            value: z.any().describe('新值'),
            valueType: z.string().optional().describe('值类型'),
            instanceId: z.string().optional().describe('组件实例ID')
          } as any
        },
        handler: ({ componentName, path, value, valueType, instanceId }: any) => {
          const selector: ComponentSelector = { name: componentName, instanceId }
          const patch: StatePatch = { path, value, valueType }
          return this.devtoolsLayer.updateComponentState(selector, patch)
        }
      },
      {
        name: 'highlight-component',
        config: {
          title: 'Highlight Component',
          description: '在浏览器中高亮显示指定组件',
          inputSchema: {
            componentName: z.string().describe('组件名称'),
            instanceId: z.string().optional().describe('组件实例ID')
          } as any
        },
        handler: ({ componentName, instanceId }: any) => {
          const selector: ComponentSelector = { name: componentName, instanceId }
          return this.devtoolsLayer.highlightComponent(selector)
        }
      },
      {
        name: 'get-router-info',
        config: {
          title: 'Get Router Info',
          description: '获取Vue Router的路由信息',
          inputSchema: {}
        },
        handler: () => this.devtoolsLayer.getRouterInfo()
      },
      {
        name: 'get-pinia-state',
        config: {
          title: 'Get Pinia State',
          description: '获取Pinia状态管理的数据',
          inputSchema: {
            storeId: z.string().optional().describe('Store ID')
          } as any
        },
        handler: ({ storeId }: any) => this.devtoolsLayer.getPiniaState(storeId)
      },
      {
        name: 'get-pinia-tree',
        config: {
          title: 'Get Pinia Tree',
          description: '获取Pinia stores的树形结构',
          inputSchema: {}
        },
        handler: () => this.devtoolsLayer.getPiniaTree()
      }
    ]

    tools.forEach(tool => {
      this.mcpServer.registerTool(
        tool.name,
        tool.config,
        this.createToolHandler(tool.handler)
      )
    })
  }

  private createToolHandler(handler: Function) {
    return async (params: any) => {
      try {
        const data = await handler(params)
        return this.createSuccessResponse(data)
      } catch (error: any) {
        this.serverLogger.error(`Tool execution failed`, {
          error: error.message,
          stack: error.stack
        })
        return this.createErrorResponse(error.message)
      }
    }
  }

  private createSuccessResponse(data: any) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2)
      }]
    }
  }

  private createErrorResponse(message: string) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: false, error: message }, null, 2)
      }]
    }
  }


  /**
   * 启动 MCP 服务器
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      this.serverLogger.warn('Server is already started')
      return
    }

    try {
      this.serverLogger.info('Starting Vue MCP Server...')
      
      // 初始化 DevTools 层
      if (this.options.features?.devtools) {
        await this.devtoolsLayer.initialize()
        this.serverLogger.debug('DevTools layer initialized')
      }
      
      // 启动 HTTP 服务器
      await this.httpServer.start()
      this.serverLogger.info(`Vue MCP Server started on port ${this.options.port}`)
      
      this.isStarted = true
    } catch (error) {
      const mcpError = VueMcpError.serverStartFailed(this.options.port || 8080, error as Error)
      this.serverLogger.error('Failed to start Vue MCP Server', { error: mcpError.toJSON() })
      errorManager.handle(mcpError)
      throw mcpError
    }
  }

  /**
   * 停止 MCP 服务器
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      this.serverLogger.warn('Server is not started')
      return
    }

    try {
      this.serverLogger.info('Stopping Vue MCP Server...')
      
      await this.httpServer.stop()
      this.serverLogger.debug('HTTP server stopped')
      
      if (this.options.features?.devtools) {
        await this.devtoolsLayer.cleanup()
        this.serverLogger.debug('DevTools layer cleaned up')
      }
      
      this.isStarted = false
      this.serverLogger.info('Vue MCP Server stopped')
    } catch (error) {
      const mcpError = new VueMcpError(
        ErrorCode.SERVER_STOP_FAILED,
        'Failed to stop Vue MCP Server',
        {},
        error as Error
      )
      this.serverLogger.error('Failed to stop Vue MCP Server', { error: mcpError.toJSON() })
      errorManager.handle(mcpError)
      throw mcpError
    }
  }

  /**
   * 检查服务器是否已启动
   */
  isRunning(): boolean {
    return this.isStarted
  }

  getServer() {
    return this.mcpServer
  }
}