import type { App, ComponentInternalInstance } from 'vue'
import type { ViteDevServer } from 'vite'

// MCP Server 配置
export interface VueMcpOptions {
  /** MCP 上下文 - 通常由构建工具插件自动设置 */
  context?: VueMcpContext
  /** MCP 服务器端口 */
  port?: number
  /** 服务器基本信息 */
  mcpServerInfo?: McpServerInfo
  /** 功能特性开关 */
  features?: FeatureFlags
  /** 客户端脚本注入目标文件 */
  appendTo?: string | RegExp
  /** MCP Inspector 集成配置 */
  inspector?: InspectorConfig
}

/** MCP 服务器基本信息 */
export interface McpServerInfo {
  name?: string
  version?: string
  description?: string
}

/** 功能特性开关 */
export interface FeatureFlags {
  /** 是否启用 DevTools 集成 */
  devtools?: boolean
  /** 是否启用性能监控 */
  performanceMonitoring?: boolean
  /** 是否启用组件高亮 */
  componentHighlight?: boolean
  /** 是否启用状态管理支持 */
  stateManagement?: boolean
}

/** Inspector 配置 */
export interface InspectorConfig {
  /** 是否启用 Inspector */
  enabled?: boolean
  /** 认证 Token */
  authToken?: string
  /** 是否自动启动 */
  autoStart?: boolean
  /** Inspector 端口 */
  port?: number
  /** 是否自动打开浏览器 */
  openBrowser?: boolean
}

// Vue MCP 上下文
export interface VueMcpContext {
  /** 已注册的 Vue 应用实例 */
  apps: Map<string, App>
  /** Vite 开发服务器实例（仅开发模式） */
  viteServer?: ViteDevServer
  /** 项目根目录 */
  projectRoot: string
  /** 构建工具类型 */
  buildTool: 'vite' | 'webpack' | 'farm' | 'rollup' | 'unknown'
  /** 当前运行模式 */
  mode: 'development' | 'production' | 'test' | undefined
  /** 当前命令类型 */
  command: 'serve' | 'build'
  /** 扩展数据 */
  [key: string]: any
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
  /** 状态路径（数组形式，如 ['data', 'count']） */
  path: string[]
  /** 新值 */
  value: any
  /** 值类型 */
  valueType?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined'
  /** 操作类型 */
  operation?: 'set' | 'delete' | 'push' | 'splice'
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

