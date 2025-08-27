import type { ViteDevServer } from 'vite'
import type { VueAppBridge, ComponentSelector, ComponentNode, ComponentState, StatePatch, RouterInfo, PiniaState } from '@vue-mcp-next/core'

/**
 * 统一的 Vite DevTools Bridge 实现
 * 通过 Vite WebSocket 与浏览器客户端进行通信
 */
export class ViteDevToolsBridge implements VueAppBridge {
  private viteServer: ViteDevServer
  private clientReady = false
  private pendingRequests = new Map<string, { resolve: Function, reject: Function, timeout: NodeJS.Timeout }>()
  private messageId = 0

  constructor(viteServer: ViteDevServer) {
    this.viteServer = viteServer
    this.setupViteWebSocket()
  }

  private setupViteWebSocket() {
    if (!this.viteServer?.ws) {
      console.warn('[ViteDevToolsBridge] Vite WebSocket server not available')
      return
    }


    // 监听客户端连接
    this.viteServer.ws.on('connection', () => {
    })

    // 监听 Vue MCP 客户端就绪信号
    this.viteServer.ws.on('vue-mcp:client-ready', (data: any) => {
      this.clientReady = true
    })

    // 监听客户端响应 (通过 custom 事件)
    this.viteServer.ws.on('vue-mcp:response', (data: any) => {
      this.handleClientResponse(data)
    })

    // 监听客户端错误 (通过 custom 事件)
    this.viteServer.ws.on('vue-mcp:error', (data: any) => {
      this.handleClientError(data)
    })

  }

  private handleClientResponse(data: any) {
    const { requestId, result } = data
    
    const pending = this.pendingRequests.get(requestId)
    
    if (pending) {
      clearTimeout(pending.timeout)
      this.pendingRequests.delete(requestId)
      pending.resolve(result)
    } else {
      console.warn(`[ViteDevToolsBridge] Received response for unknown request: ${requestId}`)
    }
  }

  private handleClientError(data: any) {
    const { requestId, error } = data
    const pending = this.pendingRequests.get(requestId)
    
    if (pending) {
      clearTimeout(pending.timeout)
      this.pendingRequests.delete(requestId)
      pending.reject(new Error(error))
    } else {
      console.warn(`[ViteDevToolsBridge] Received error for unknown request: ${requestId}`)
    }
  }

  setClientReady(ready: boolean): void {
    this.clientReady = ready
  }

  isClientReady(): boolean {
    return this.clientReady
  }

  async sendCommand(method: string, params?: any): Promise<any> {
    
    if (!this.viteServer?.ws) {
      throw new Error('Vite WebSocket server not available')
    }

    if (!this.clientReady) {
      console.error('[ViteDevToolsBridge] Client not ready, current status:', this.clientReady)
      throw new Error('Vue MCP client not ready. Make sure the browser has the Vue DevTools and the client script is loaded.')
    }

    return new Promise((resolve, reject) => {
      const requestId = `req_${++this.messageId}_${Date.now()}`
      
      // 设置超时
      const timeout = setTimeout(() => {
        console.error(`[ViteDevToolsBridge] Request ${method} (${requestId}) timed out after 10000ms`)
        this.pendingRequests.delete(requestId)
        reject(new Error(`Request ${method} timed out after 10000ms`))
      }, 10000)
      
      // 存储请求信息
      this.pendingRequests.set(requestId, { resolve, reject, timeout })
      
      try {
        // 使用 Vite HMR API 发送命令到客户端
        const commandData = { 
          type: method, 
          data: params, 
          requestId 
        }
        this.viteServer.ws.send('vue-mcp:command', commandData)
        
      } catch (error) {
        console.error(`[ViteDevToolsBridge] Failed to send command:`, error)
        clearTimeout(timeout)
        this.pendingRequests.delete(requestId)
        reject(error)
      }
    })
  }

  async getComponentTree(): Promise<ComponentNode[]> {
    return this.sendCommand('get-component-tree')
  }

  async getComponentState(selector: ComponentSelector): Promise<ComponentState> {
    return this.sendCommand('get-component-state', { selector })
  }

  async updateComponentState(selector: ComponentSelector, patch: StatePatch): Promise<void> {
    return this.sendCommand('edit-component-state', { selector, patch })
  }

  async highlightComponent(selector: ComponentSelector): Promise<void> {
    return this.sendCommand('highlight-component', { selector })
  }

  async getRouterInfo(): Promise<RouterInfo> {
    return this.sendCommand('get-router-info')
  }

  async getPiniaState(storeId?: string): Promise<PiniaState> {
    return this.sendCommand('get-pinia-state', { storeId })
  }

  async getPiniaTree(): Promise<any> {
    return this.sendCommand('get-pinia-tree')
  }

  cleanup(): void {
    // 清理所有未完成的请求
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout)
      pending.reject(new Error('ViteDevToolsBridge shutting down'))
    }
    this.pendingRequests.clear()
    this.clientReady = false
  }
}

/**
 * 创建适合不同构建工具的Bridge实例 - 目前只支持 Vite
 */
export function createDevToolsBridge(buildTool: string, serverContext?: any): VueAppBridge {
  switch (buildTool) {
    case 'vite':
      if (!serverContext) {
        throw new Error('Vite server context is required for Vite DevTools bridge')
      }
      return new ViteDevToolsBridge(serverContext)
    
    case 'webpack':
      throw new Error('Webpack DevTools bridge not implemented yet')
      
    case 'farm':
      throw new Error('Farm DevTools bridge not implemented yet')
      
    default:
      throw new Error(`Unsupported build tool: ${buildTool}`)
  }
}