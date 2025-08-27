import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { DevToolsRuntimeLayer } from './devtools-layer.js'
import { VueMcpHttpServer } from './http-server.js'
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

  constructor(
    options: VueMcpOptions,
    context: VueMcpContext,
    bridge?: any // VueAppBridge - 可选，稍后由插件层设置
  ) {
    this.context = context
    
    // 创建MCP服务器
    this.mcpServer = new McpServer({
      name: 'vue-mcp-next',
      version: '0.1.0',
      ...options.mcpServerInfo,
    })

    // 初始化运行时层（DevTools）
    this.devtoolsLayer = new DevToolsRuntimeLayer(bridge, context)

    // 创建 HTTP 服务器
    this.httpServer = new VueMcpHttpServer(this.mcpServer, {
      port: options.port || 8080,
      cors: true,
      enableMcpInspector: options.inspector?.enabled || false,
      authToken: options.inspector?.authToken,
      serverName: options.mcpServerInfo?.name || 'vue-mcp-next',
      serverVersion: options.mcpServerInfo?.version || '0.1.0',
      inspector: {
        enabled: options.inspector?.enabled || false,
        authToken: options.inspector?.authToken,
        autoStart: options.inspector?.autoStart || false,
        openBrowser: options.inspector?.openBrowser || false
      }
    })

    this.setupTools()
  }

  setBridge(bridge: any) {
    this.devtoolsLayer.setBridge(bridge)
  }

  private setupTools() {
    // 运行时操作工具（基于DevTools）
    this.setupRuntimeTools()
  }

  private setupRuntimeTools() {
    // 获取组件树
    this.mcpServer.registerTool(
      'get-component-tree',
      {
        title: 'Get Component Tree',
        description: '获取Vue应用的组件树结构',
        inputSchema: {}
      },
      async () => {
        try {
          const tree = await this.devtoolsLayer.getComponentTree()
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, data: tree }, null, 2) }]
          }
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
          }
        }
      }
    )

    // 获取组件状态
    this.mcpServer.registerTool(
      'get-component-state',
      {
        title: 'Get Component State',
        description: '获取指定组件的状态信息',
        inputSchema: {
          componentName: z.string().describe('组件名称') as any,
          instanceId: z.string().optional().describe('组件实例ID') as any
        } 
      },
      async ({ componentName, instanceId }) => {
        try {
          const selector: ComponentSelector = { name: componentName, instanceId}
          const state = await this.devtoolsLayer.getComponentState(selector)
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, data: state }, null, 2) }]
          }
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
          }
        }
      }
    )

    // 编辑组件状态
    this.mcpServer.registerTool(
      'edit-component-state',
      {
        title: 'Edit Component State',
        description: '修改指定组件的状态',
        inputSchema: {
          componentName: z.string().describe('组件名称') as any,
          path: z.array(z.string()).describe('状态路径数组')as any,
          value: z.any().describe('新值')as any,
          valueType: z.string().optional().describe('值类型')as any,
          instanceId: z.string().optional().describe('组件实例ID')as any
        }
      },
      async ({ componentName, path, value, valueType, instanceId }) => {
        try {
          const selector: ComponentSelector = { name: componentName, instanceId }
          const patch: StatePatch = { path, value, valueType }
          await this.devtoolsLayer.updateComponentState(selector, patch)
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, data: 'State updated successfully' }, null, 2) }]
          }
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
          }
        }
      }
    )

    // 高亮组件
    this.mcpServer.registerTool(
      'highlight-component',
      {
        title: 'Highlight Component',
        description: '在浏览器中高亮显示指定组件',
        inputSchema: {
          componentName: z.string().describe('组件名称') as any,
          instanceId: z.string().optional().describe('组件实例ID')as any
        }
      },
      async ({ componentName, instanceId }) => {
        try {
          const selector: ComponentSelector = { name: componentName, instanceId }
          await this.devtoolsLayer.highlightComponent(selector)
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, data: 'Component highlighted' }, null, 2) }]
          }
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
          }
        }
      }
    )

    // 获取路由信息
    this.mcpServer.registerTool(
      'get-router-info',
      {
        title: 'Get Router Info',
        description: '获取Vue Router的路由信息',
        inputSchema: {}
      },
      async () => {
        try {
          const routerInfo = await this.devtoolsLayer.getRouterInfo()
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, data: routerInfo }, null, 2) }]
          }
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
          }
        }
      }
    )

    // 获取Pinia状态
    this.mcpServer.registerTool(
      'get-pinia-state',
      {
        title: 'Get Pinia State',
        description: '获取Pinia状态管理的数据',
        inputSchema: {
          storeId: z.string().optional().describe('Store ID')as any
        }
      },
      async ({ storeId }) => {
        try {
          const piniaState = await this.devtoolsLayer.getPiniaState(storeId)
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, data: piniaState }, null, 2) }]
          }
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
          }
        }
      }
    )

    // 获取Pinia树
    this.mcpServer.registerTool(
      'get-pinia-tree',
      {
        title: 'Get Pinia Tree',
        description: '获取Pinia stores的树形结构',
        inputSchema: {}
      },
      async () => {
        try {
          const piniaTree = await this.devtoolsLayer.getPiniaTree()
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, data: piniaTree }, null, 2) }]
          }
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
          }
        }
      }
    )
  }


  async start() {
    // 启动DevTools层
    await this.devtoolsLayer.initialize()
    
    // 启动 HTTP 服务器
    await this.httpServer.start()
    
    console.log('Vue MCP Server started successfully')
  }

  async stop() {
    await this.httpServer.stop()
    await this.devtoolsLayer.cleanup()
  }

  getServer() {
    return this.mcpServer
  }
}