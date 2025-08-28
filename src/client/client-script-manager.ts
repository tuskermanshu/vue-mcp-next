// 内联的客户端模板内容
const CLIENT_TEMPLATE = `// Vue MCP Client - 使用 Vite 内置 HMR + DevTools Kit
import { devtools, devtoolsRouterInfo, devtoolsState, getInspector, stringify, toggleHighPerfMode } from '@vue/devtools-kit'

// Constants
const PINIA_INSPECTOR_ID = 'pinia'
const COMPONENTS_INSPECTOR_ID = 'components'
const HIGHLIGHT_TIMEOUT = 5000
const CLIENT_READY_DELAY = 1000
const CIRCULAR_REF_KEYS = ['vnode', 'component', 'parent', 'root', '__v_skip']

// Global state
let highlightComponentTimeout = null

// Initialize DevTools
devtools.init()
console.log('[Vue MCP] DevTools Kit loaded successfully')

// Utility functions
function flattenChildren(node) {
  const result = []

  function traverse(node) {
    if (!node) return
    result.push(node)

    if (Array.isArray(node.children)) {
      node.children.forEach(child => traverse(child))
    }
  }

  traverse(node)
  return result
}

function cleanCircularReferences(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (seen.has(obj)) {
    return '[Circular Reference]'
  }
  
  seen.add(obj)
  
  if (Array.isArray(obj)) {
    const result = obj.map(item => cleanCircularReferences(item, seen))
    seen.delete(obj)
    return result
  }
  
  const cleaned = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Skip known circular reference properties
      if (CIRCULAR_REF_KEYS.includes(key)) {
        cleaned[key] = '[Skipped Circular]'
      } else {
        cleaned[key] = cleanCircularReferences(obj[key], seen)
      }
    }
  }
  
  seen.delete(obj)
  return cleaned
}

// Safe JSON stringify with error handling
function safeStringify(obj) {
  try {
    return JSON.stringify(cleanCircularReferences(obj))
  } catch (error) {
    console.warn('[Vue MCP Client] Failed to stringify object:', error)
    return JSON.stringify({ error: 'Serialization failed', type: typeof obj })
  }
}

// Communication setup
if (import.meta.hot) {
  // Listen for server MCP commands
  import.meta.hot.on('vue-mcp:command', async (data) => {
    await handleCommand(data)
  })
} else {
  console.warn('[Vue MCP Client] HMR not available, falling back to direct WebSocket')
  
  // Fallback to direct WebSocket connection
  const socket = new WebSocket(\`ws://\${location.host}\`)

  socket.onopen = () => {
    console.log('[Vue MCP Client] WebSocket connected')
  }

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data)
      
      // Only handle Vue MCP commands
      if (message.type !== 'custom' || !message.event?.startsWith('vue-mcp:')) {
        return
      }
      
      if (message.event === 'vue-mcp:command') {
        await handleCommand(message.data)
      }
    } catch (error) {
      console.error('[Vue MCP Client] Message parse error:', error, event.data)
    }
  }
}

// Command handlers
const commandHandlers = {
  'get-component-tree': async () => {
    const inspectorTree = await devtools.api.getInspectorTree({
      inspectorId: COMPONENTS_INSPECTOR_ID,
      filter: '',
    })
    return inspectorTree[0] || []
  },

  'get-component-state': async (data) => {
    const tree = await devtools.api.getInspectorTree({
      inspectorId: COMPONENTS_INSPECTOR_ID,
      filter: '',
    })
    const flattenedChildren = flattenChildren(tree[0])
    const targetNode = flattenedChildren.find(child => 
      child.name === data.selector?.name || 
      child.id === data.selector?.instanceId
    )
    
    if (targetNode) {
      const inspectorState = await devtools.api.getInspectorState({
        inspectorId: COMPONENTS_INSPECTOR_ID,
        nodeId: targetNode.id,
      })
      return JSON.parse(stringify(inspectorState))
    } else {
      console.warn('[Vue MCP Client] Component not found for selector:', data.selector)
      return {
        success: false,
        error: 'Component not found',
        selector: data.selector,
        availableComponents: flattenedChildren.map(child => ({
          name: child.name,
          id: child.id,
          label: child.label
        }))
      }
    }
  },

  'edit-component-state': async (data) => {
    const tree = await devtools.api.getInspectorTree({
      inspectorId: COMPONENTS_INSPECTOR_ID,
      filter: '',
    })
    const flattenedChildren = flattenChildren(tree[0])
    const targetNode = flattenedChildren.find(child => 
      child.name === data.selector?.name || 
      child.id === data.selector?.instanceId
    )
    
    if (targetNode) {
      const payload = {
        inspectorId: COMPONENTS_INSPECTOR_ID,
        nodeId: targetNode.id,
        path: data.patch.path,
        state: {
          new: null,
          remove: false,
          type: data.patch.valueType,
          value: data.patch.value,
        },
        type: undefined,
      }
      await devtools.ctx.api.editInspectorState(payload)
      return { success: true }
    } else {
      console.warn('[Vue MCP Client] Component not found for edit operation:', data.selector)
      return {
        success: false,
        error: 'Component not found for edit operation',
        selector: data.selector
      }
    }
  },

  'highlight-component': async (data) => {
    clearTimeout(highlightComponentTimeout)
    const tree = await devtools.api.getInspectorTree({
      inspectorId: COMPONENTS_INSPECTOR_ID,
      filter: '',
    })
    const flattenedChildren = flattenChildren(tree[0])
    const targetNode = flattenedChildren.find(child => 
      child.name === data.selector?.name || 
      child.id === data.selector?.instanceId
    )
    
    if (targetNode) {
      devtools.ctx.hooks.callHook('componentHighlight', { uid: targetNode.id })
      highlightComponentTimeout = setTimeout(() => {
        devtools.ctx.hooks.callHook('componentUnhighlight')
      }, HIGHLIGHT_TIMEOUT)
      return { success: true }
    } else {
      console.warn('[Vue MCP Client] Component not found for highlight operation:', data.selector)
      return {
        success: false,
        error: 'Component not found for highlight operation',
        selector: data.selector
      }
    }
  },

  'get-router-info': async () => {
    return devtoolsRouterInfo
  },

  'get-pinia-tree': async () => {
    const highPerfModeEnabled = devtoolsState.highPerfModeEnabled
    if (highPerfModeEnabled) {
      toggleHighPerfMode(false)
    }
    const piniaTree = await devtools.api.getInspectorTree({
      inspectorId: PINIA_INSPECTOR_ID,
      filter: '',
    })
    if (highPerfModeEnabled) {
      toggleHighPerfMode(true)
    }
    return piniaTree
  },

  'get-pinia-state': async (data) => {
    const highPerfModeEnabled = devtoolsState.highPerfModeEnabled
    if (highPerfModeEnabled) {
      toggleHighPerfMode(false)
    }
    const payload = {
      inspectorId: PINIA_INSPECTOR_ID,
      nodeId: data.storeId,
    }
    const inspector = getInspector(payload.inspectorId)
    if (inspector) {
      inspector.selectedNodeId = payload.nodeId
    }
    const res = await devtools.ctx.api.getInspectorState(payload)
    if (highPerfModeEnabled) {
      toggleHighPerfMode(true)
    }
    return JSON.parse(stringify(res))
  }
}

async function handleCommand(message) {
  const { type, data, requestId } = message
  
  try {
    const handler = commandHandlers[type]
    if (!handler) {
      throw new Error(\`Unknown command: \${type}\`)
    }
    
    const result = await handler(data)
    sendResponse('vue-mcp:response', { requestId, result })
    
  } catch (error) {
    console.error('[Vue MCP Client] Command error:', error)
    sendResponse('vue-mcp:error', { requestId, error: error.message })
  }
}

function sendResponse(event, data) {
  // Clean possible circular references
  const cleanedData = cleanCircularReferences(data)
  
  if (import.meta.hot) {
    sendViaHMR(event, cleanedData)
  } else if (typeof socket !== 'undefined' && socket.readyState === WebSocket.OPEN) {
    sendViaWebSocket(event, cleanedData)
  } else {
    console.error('[Vue MCP Client] No available connection for sending response')
  }
}

function sendViaHMR(event, data) {
  try {
    import.meta.hot.send(event, data)
  } catch (error) {
    console.error('[Vue MCP Client] Failed to send via HMR:', error)
    // Fallback with enhanced serialization
    try {
      const fallbackData = safeSerializeForTransport(data)
      import.meta.hot.send(event, fallbackData)
    } catch (fallbackError) {
      console.error('[Vue MCP Client] Complete send failure:', fallbackError)
      import.meta.hot.send('vue-mcp:error', { 
        requestId: data.requestId, 
        error: 'Failed to serialize response data: ' + fallbackError.message 
      })
    }
  }
}

function sendViaWebSocket(event, data) {
  const message = {
    type: 'custom',
    event: event,
    data: data
  }
  socket.send(safeStringify(message))
}

function safeSerializeForTransport(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null && key !== '') {
      if (typeof value.constructor === 'function' && 
          value.constructor.name !== 'Object' && 
          value.constructor.name !== 'Array') {
        return '[Object: ' + value.constructor.name + ']'
      }
    }
    return value
  }))
}

// Notify server that client is ready
setTimeout(() => {
  fetch('/__vue-mcp/client-ready', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      ready: true, 
      devtoolsAvailable: true,
      timestamp: Date.now()
    })
  }).catch(() => {
    console.warn('[Vue MCP Client] Failed to notify server via HTTP')
  })
}, CLIENT_READY_DELAY)`

/**
 * 客户端脚本管理器
 * 负责加载和管理客户端脚本模板
 */
export class ClientScriptManager {
  private static instance: ClientScriptManager
  private clientScript: string | null = null
  private overlayScript: string | null = null

  private constructor() {}

  static getInstance(): ClientScriptManager {
    if (!ClientScriptManager.instance) {
      ClientScriptManager.instance = new ClientScriptManager()
    }
    return ClientScriptManager.instance
  }

  /**
   * 获取客户端注入脚本
   */
  getClientScript(): string {
    if (this.clientScript === null) {
      this.clientScript = this.loadClientTemplate()
    }
    return this.clientScript
  }

  /**
   * 获取 Overlay 脚本
   */
  getOverlayScript(): string {
    if (this.overlayScript === null) {
      this.overlayScript = this.createOverlayScript()
    }
    return this.overlayScript
  }

  /**
   * 加载客户端模板内容（现在是内联的）
   */
  private loadClientTemplate(): string {
    return CLIENT_TEMPLATE
  }

  /**
   * 创建 Overlay 脚本
   */
  private createOverlayScript(): string {
    return `// Vue MCP Overlay - 加载客户端
import('virtual:vue-mcp-client')
  .then(() => console.log('[Vue MCP] Client loaded'))
  .catch(err => console.error('[Vue MCP] Failed to load client:', err))`
  }


  /**
   * 重新加载脚本（开发时使用）
   */
  reload(): void {
    this.clientScript = null
    this.overlayScript = null
  }

  /**
   * 检查脚本是否已加载
   */
  isLoaded(): boolean {
    return this.clientScript !== null
  }

  /**
   * 获取脚本大小（字节）
   */
  getScriptSize(): number {
    return this.getClientScript().length
  }

  /**
   * 创建带有自定义配置的客户端脚本
   */
  createCustomScript(config: {
    enableDevtools?: boolean
    debugMode?: boolean
    customEndpoints?: Record<string, string>
  }): string {
    const baseScript = this.getClientScript()
    
    // 注入自定义配置
    const configInjection = `
// Custom configuration
const CUSTOM_CONFIG = ${JSON.stringify(config, null, 2)};
console.log('[Vue MCP] Custom config loaded:', CUSTOM_CONFIG);
`
    
    return configInjection + baseScript
  }
}