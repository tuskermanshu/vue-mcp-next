/**
 * Vue MCP Plugin 常量定义
 */

// 网络和通信相关常量
export const NETWORK_CONSTANTS = {
  /** 请求超时时间 (毫秒) */
  REQUEST_TIMEOUT: 10000,
  /** 客户端就绪通知延迟 (毫秒) */
  CLIENT_READY_DELAY: 1000,
  /** WebSocket 重连间隔 (毫秒) */
  WEBSOCKET_RETRY_INTERVAL: 3000,
  /** 最大重连次数 */
  MAX_RETRY_ATTEMPTS: 5
} as const

// 组件相关常量
export const COMPONENT_CONSTANTS = {
  /** 组件高亮显示时长 (毫秒) */
  HIGHLIGHT_TIMEOUT: 5000,
  /** DevTools 等待最大尝试次数 */
  DEVTOOLS_WAIT_MAX_ATTEMPTS: 50,
  /** DevTools 等待间隔 (毫秒) */
  DEVTOOLS_WAIT_INTERVAL: 100
} as const

// Inspector ID 常量
export const INSPECTOR_IDS = {
  /** Pinia Inspector ID */
  PINIA: 'pinia',
  /** 组件 Inspector ID */
  COMPONENTS: 'components',
  /** Router Inspector ID */
  ROUTER: 'router'
} as const

// 虚拟模块常量
export const VIRTUAL_MODULES = {
  /** 客户端模块标识符 */
  CLIENT: 'virtual:vue-mcp-client',
  /** Overlay 模块标识符 */
  OVERLAY: 'virtual:vue-mcp-overlay',
  /** 解析后的客户端模块 */
  RESOLVED_CLIENT: '\0virtual:vue-mcp-client',
  /** 解析后的 Overlay 模块 */
  RESOLVED_OVERLAY: '\0virtual:vue-mcp-overlay'
} as const

// 默认配置常量
export const DEFAULT_CONFIG = {
  /** 默认端口号 */
  PORT: 8890,
  /** 默认构建工具 */
  BUILD_TOOL: 'vite' as const,
  /** 默认模式 */
  MODE: 'development' as const,
  /** 默认命令 */
  COMMAND: 'serve' as const
} as const

// 事件名称常量
export const EVENT_NAMES = {
  /** MCP 命令事件 */
  MCP_COMMAND: 'vue-mcp:command',
  /** 客户端就绪事件 */
  CLIENT_READY: 'vue-mcp:client-ready',
  /** 响应事件 */
  RESPONSE: 'vue-mcp:response',
  /** 错误事件 */
  ERROR: 'vue-mcp:error'
} as const

// HTTP 路由常量
export const HTTP_ROUTES = {
  /** 客户端脚本路由 */
  CLIENT_SCRIPT: '/__vue-mcp-client.js',
  /** 客户端就绪通知路由 */
  CLIENT_READY: '/__vue-mcp/client-ready'
} as const

// 错误消息常量
export const ERROR_MESSAGES = {
  /** 组件未找到 */
  COMPONENT_NOT_FOUND: 'Component not found',
  /** DevTools 不可用 */
  DEVTOOLS_NOT_AVAILABLE: 'DevTools not available',
  /** 客户端未就绪 */
  CLIENT_NOT_READY: 'Vue MCP client not ready. Make sure the browser has the Vue DevTools and the client script is loaded.',
  /** Vite WebSocket 不可用 */
  VITE_WS_NOT_AVAILABLE: 'Vite WebSocket server not available',
  /** WebSocket 不可用 */
  WEBSOCKET_NOT_AVAILABLE: 'WebSocket server not available',
  /** HMR 不可用 */
  HMR_NOT_AVAILABLE: 'HMR not available',
  /** 请求超时 */
  REQUEST_TIMEOUT: 'Request timed out',
  /** 未知命令 */
  UNKNOWN_COMMAND: 'Unknown command'
} as const

// 日志前缀常量
export const LOG_PREFIXES = {
  /** 基础插件 */
  BASE_PLUGIN: '[BasePlugin]',
  /** Vite 插件 */
  VITE_PLUGIN: '[VitePlugin]',
  /** DevTools Bridge */
  DEVTOOLS_BRIDGE: '[ViteDevToolsBridge]',
  /** MCP 客户端 */
  MCP_CLIENT: '[Vue MCP Client]'
} as const