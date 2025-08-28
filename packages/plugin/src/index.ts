// 通用基础插件
export { VueMcpBasePlugin } from './lib/base-plugin.js'

// 配置管理
export { 
  VueMcpConfigManager, 
  ConfigValidationError,
  createConfigManager 
} from './lib/config-manager.js'

// 工具函数
export {
  generateRequestId,
  createTimeoutPromise,
  cleanCircularReferences,
  safeStringify,
  CancellableTimer,
  ResourceManager,
  debounce,
  throttle,
  retry,
  createErrorResponse,
  createSuccessResponse,
  isEmpty,
  deepMerge
} from './lib/utils.js'

// 常量
export {
  NETWORK_CONSTANTS,
  COMPONENT_CONSTANTS,
  INSPECTOR_IDS,
  VIRTUAL_MODULES,
  DEFAULT_CONFIG,
  EVENT_NAMES,
  HTTP_ROUTES,
  ERROR_MESSAGES,
  LOG_PREFIXES
} from './lib/constants.js'

// DevTools Bridge
export {
  ViteDevToolsBridge,
  createDevToolsBridge,
  registerBridgeFactory,
  getSupportedBuildTools
} from './lib/devtools-bridge.js'

// 客户端脚本管理
export { ClientScriptManager } from './client/client-script-manager.js'

// Vite适配器
export { 
  vueMcpVitePlugin as vite,
  vueMcpVitePlugin,
  isDevelopmentMode,
  getVirtualModuleUrl
} from './adapters/vite.js'

// 默认导出Vite插件
export { vueMcpVitePlugin as default } from './adapters/vite.js'

// 类型导出（从 @vue-mcp-next/core 重新导出）
export type {
  VueMcpOptions,
  VueAppBridge,
  VueMcpContext,
  ComponentSelector,
  ComponentNode,
  ComponentState,
  StatePatch,
  RouterInfo,
  PiniaState
} from '@vue-mcp-next/core'