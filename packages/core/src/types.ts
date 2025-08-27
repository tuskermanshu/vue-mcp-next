import type { App, ComponentInternalInstance } from 'vue'
import type { ViteDevServer } from 'vite'

// MCP Server 配置
export interface VueMcpOptions {
  context?: any
  port?: number
  mcpServerInfo?: {
    name?: string
    version?: string
  }
  features?: {
    devtools?: boolean
    performanceMonitoring?: boolean
  }
  /** 客户端脚本注入目标文件 */
  appendTo?: string | RegExp
  /** MCP Inspector 集成 */
  inspector?: {
    enabled?: boolean
    authToken?: string
    autoStart?: boolean
    port?: number
    openBrowser?: boolean   // 是否自动打开浏览器
  }
}

// Vue MCP 上下文
export interface VueMcpContext {
  [x: string]: any
  apps: Map<string, App>
  viteServer?: ViteDevServer
  projectRoot: string
}

// 组件选择器
export interface ComponentSelector {
  name?: string
  id?: string
  domSelector?: string
  instanceId?: string
}

// 组件节点
export interface ComponentNode {
  id: string
  name: string
  type: string
  props?: Record<string, any>
  children?: ComponentNode[]
  file?: string
  line?: number
}

// 组件状态
export interface ComponentState {
  data?: Record<string, any>
  props?: Record<string, any>
  computed?: Record<string, any>
  methods?: string[]
  emits?: string[]
}

// 状态补丁
export interface StatePatch {
  path: string[]
  value: any
  valueType?: string | number | boolean | object| []
}

// 路由信息
export interface RouterInfo {
  currentRoute: {
    path: string
    name?: string
    params?: Record<string, any>
    query?: Record<string, any>
  }
  routes: Array<{
    path: string
    name?: string
    component?: string
  }>
}

// Pinia 状态
export interface PiniaState {
  stores: Record<string, {
    id: string
    state: Record<string, any>
    getters?: Record<string, any>
    actions?: string[]
  }>
}


// MCP 工具结果
export interface McpToolResult {
  success: boolean
  data?: any
  error?: string
}

// WebSocket 消息格式
export interface WebSocketMessage {
  id: string
  method: string
  params?: any
}

export interface WebSocketResponse {
  id: string
  result?: any
  error?: string
}

// Vue App Bridge接口 - 用于与浏览器通信
export interface VueAppBridge {
  // 基础通信方法
  sendCommand(method: string, params?: any): Promise<any>
  setClientReady(ready: boolean): void
  isClientReady(): boolean
  
  // DevTools 具体方法
  getComponentTree(): Promise<ComponentNode[]>
  getComponentState(selector: ComponentSelector): Promise<ComponentState>
  updateComponentState(selector: ComponentSelector, patch: StatePatch): Promise<void>
  highlightComponent(selector: ComponentSelector): Promise<void>
  getRouterInfo(): Promise<RouterInfo>
  getPiniaState(storeId?: string): Promise<PiniaState>
  getPiniaTree(): Promise<any>
  
  // 清理方法
  cleanup(): void
}

