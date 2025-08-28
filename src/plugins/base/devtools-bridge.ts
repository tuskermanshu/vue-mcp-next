import type { ViteDevServer } from 'vite'
import type { VueAppBridge, ComponentSelector, ComponentNode, ComponentState, StatePatch, RouterInfo, PiniaState } from '../../server'
import { NETWORK_CONSTANTS, LOG_PREFIXES, ERROR_MESSAGES } from './constants.js'
import { generateRequestId, createTimeoutPromise, ResourceManager } from './utils.js'

/**
 * 统一的 Vite DevTools Bridge 实现
 * 通过 Vite WebSocket 与浏览器客户端进行通信
 */
export class ViteDevToolsBridge implements VueAppBridge {
  private viteServer: ViteDevServer
  private clientReady = false
  private pendingRequests = new Map<string, { resolve: Function, reject: Function, timeout: NodeJS.Timeout }>()
  private resourceManager = new ResourceManager()

  constructor(viteServer: ViteDevServer) {
    this.viteServer = viteServer
    this.setupViteWebSocket()
  }

  private setupViteWebSocket(): void {
    if (!this.viteServer?.ws) {
      console.warn(`${LOG_PREFIXES.DEVTOOLS_BRIDGE} Vite WebSocket server not available`)
      return
    }

    // 监听客户端连接
    this.viteServer.ws.on('connection', () => {
      console.log(`${LOG_PREFIXES.DEVTOOLS_BRIDGE} Client connected`)
    })

    // 监听 Vue MCP 客户端就绪信号
    this.viteServer.ws.on('vue-mcp:client-ready', (data: any) => {
      this.handleClientReady(data)
    })

    // 监听客户端响应
    this.viteServer.ws.on('vue-mcp:response', (data: any) => {
      this.handleClientResponse(data)
    })

    // 监听客户端错误
    this.viteServer.ws.on('vue-mcp:error', (data: any) => {
      this.handleClientError(data)
    })
  }

  private handleClientReady(data: any): void {
    this.clientReady = true
    console.log(`${LOG_PREFIXES.DEVTOOLS_BRIDGE} Client ready:`, {
      devtoolsAvailable: data?.devtoolsAvailable,
      fallback: data?.fallback
    })
  }

  private handleClientResponse(data: any): void {
    if (!data || typeof data.requestId !== 'string') {
      console.warn(`${LOG_PREFIXES.DEVTOOLS_BRIDGE} Invalid response data:`, data)
      return
    }

    const { requestId, result } = data
    const pending = this.pendingRequests.get(requestId)
    
    if (pending) {
      clearTimeout(pending.timeout)
      this.pendingRequests.delete(requestId)
      pending.resolve(result)
    } else {
      console.warn(`${LOG_PREFIXES.DEVTOOLS_BRIDGE} Received response for unknown request: ${requestId}`)
    }
  }

  private handleClientError(data: any): void {
    if (!data || typeof data.requestId !== 'string') {
      console.warn(`${LOG_PREFIXES.DEVTOOLS_BRIDGE} Invalid error data:`, data)
      return
    }

    const { requestId, error } = data
    const pending = this.pendingRequests.get(requestId)
    
    if (pending) {
      clearTimeout(pending.timeout)
      this.pendingRequests.delete(requestId)
      pending.reject(new Error(error || 'Unknown client error'))
    } else {
      console.warn(`${LOG_PREFIXES.DEVTOOLS_BRIDGE} Received error for unknown request: ${requestId}`)
    }
  }

  setClientReady(ready: boolean): void {
    this.clientReady = ready
  }

  isClientReady(): boolean {
    return this.clientReady
  }

  async sendCommand(method: string, params?: any): Promise<any> {
    if (!method || typeof method !== 'string') {
      throw new Error('Method name is required and must be a string')
    }

    if (!this.viteServer?.ws) {
      throw new Error(ERROR_MESSAGES.WEBSOCKET_NOT_AVAILABLE)
    }

    if (!this.clientReady) {
      console.error(`${LOG_PREFIXES.DEVTOOLS_BRIDGE} Client not ready, current status:`, this.clientReady)
      throw new Error(ERROR_MESSAGES.CLIENT_NOT_READY)
    }

    const requestId = generateRequestId()
    const commandPromise = new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        console.error(`${LOG_PREFIXES.DEVTOOLS_BRIDGE} Request ${method} (${requestId}) timed out after ${NETWORK_CONSTANTS.REQUEST_TIMEOUT}ms`)
        this.pendingRequests.delete(requestId)
        reject(new Error(`${ERROR_MESSAGES.REQUEST_TIMEOUT}: ${method}`))
      }, NETWORK_CONSTANTS.REQUEST_TIMEOUT)
      
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
        console.error(`${LOG_PREFIXES.DEVTOOLS_BRIDGE} Failed to send command:`, error)
        clearTimeout(timeout)
        this.pendingRequests.delete(requestId)
        reject(error)
      }
    })

    return createTimeoutPromise(commandPromise, NETWORK_CONSTANTS.REQUEST_TIMEOUT)
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
    try {
      // 清理所有未完成的请求
      for (const [, pending] of this.pendingRequests) {
        clearTimeout(pending.timeout)
        pending.reject(new Error('ViteDevToolsBridge shutting down'))
      }
      this.pendingRequests.clear()
      
      // 清理资源管理器中的资源
      this.resourceManager.cleanup()
      
      this.clientReady = false
      console.log(`${LOG_PREFIXES.DEVTOOLS_BRIDGE} Cleanup completed`)
    } catch (error) {
      console.error(`${LOG_PREFIXES.DEVTOOLS_BRIDGE} Error during cleanup:`, error)
    }
  }
}

/**
 * Bridge工厂接口
 */
interface BridgeFactory {
  create(serverContext: any): VueAppBridge
  validate(serverContext: any): boolean
}

/**
 * Vite Bridge工厂
 */
class ViteBridgeFactory implements BridgeFactory {
  create(serverContext: any): VueAppBridge {
    return new ViteDevToolsBridge(serverContext)
  }

  validate(serverContext: any): boolean {
    return !!(serverContext && serverContext.ws)
  }
}

/**
 * Bridge工厂注册表
 */
const bridgeFactories = new Map<string, BridgeFactory>([
  ['vite', new ViteBridgeFactory()]
])

/**
 * 创建适合不同构建工具的Bridge实例
 */
export function createDevToolsBridge(buildTool: string, serverContext?: any): VueAppBridge {
  if (!buildTool || typeof buildTool !== 'string') {
    throw new Error('Build tool name is required')
  }

  const factory = bridgeFactories.get(buildTool.toLowerCase())
  if (!factory) {
    const supportedTools = Array.from(bridgeFactories.keys()).join(', ')
    throw new Error(`Unsupported build tool: ${buildTool}. Supported: ${supportedTools}`)
  }

  if (!serverContext) {
    throw new Error(`${buildTool} server context is required for DevTools bridge`)
  }

  if (!factory.validate(serverContext)) {
    throw new Error(`Invalid server context for ${buildTool} bridge`)
  }

  return factory.create(serverContext)
}

/**
 * 注册新的Bridge工厂（用于扩展支持）
 */
export function registerBridgeFactory(buildTool: string, factory: BridgeFactory): void {
  bridgeFactories.set(buildTool.toLowerCase(), factory)
}

/**
 * 获取支持的构建工具列表
 */
export function getSupportedBuildTools(): string[] {
  return Array.from(bridgeFactories.keys())
}