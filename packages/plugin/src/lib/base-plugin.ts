import type { VueMcpOptions, VueMcpContext, VueAppBridge } from '@vue-mcp-next/core'
import { VueMcpServer } from '@vue-mcp-next/core'

/**
 * 通用Vue MCP插件基础类
 * 提供与打包工具无关的核心功能
 */
export class VueMcpBasePlugin {
  protected options: VueMcpOptions
  protected mcpServer?: VueMcpServer
  protected context?: VueMcpContext
  protected bridge?: VueAppBridge
  protected isEnabled = true

  constructor(options: VueMcpOptions = {}) {
    this.options = {
      port: 8890,
      inspector: {
        enabled: false,
        autoStart: false,
        openBrowser: false
      },
      ...options
    }
  }

  /**
   * 初始化MCP服务器
   */
  async initialize(buildTool: {
    server?: any
    config: {
      root: string
      mode?: string
      command?: string
    }
  }): Promise<void> {
    try {

      // 创建MCP上下文
      this.context = {
        apps: new Map(),
        projectRoot: buildTool.config.root,
        buildTool: 'vite',
        mode: buildTool.config.mode || 'development',
        command: buildTool.config.command || 'serve'
      }

      // 初始化MCP服务器
      this.mcpServer = new VueMcpServer(this.options, this.context)
      
      if (this.bridge) {
        this.mcpServer.setBridge(this.bridge)
      }

      await this.mcpServer.start()
      
      this.logStartupMessage()
      
    } catch (error) {
      console.error('[BasePlugin] Failed to initialize:', error)
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
      return this.getSimpleClientScript()
    } catch (error) {
      console.error('[BasePlugin] Failed to get client script:', error)
      return ''
    }
  }

  /**
   * 获取中间件处理函数（用于处理MCP相关请求）
   */
  getMiddleware() {
    return (req: any, res: any, next: any) => {
      // 处理客户端脚本请求
      if (req.url === '/__vue-mcp-client.js') {
        res.setHeader('Content-Type', 'application/javascript')
        res.setHeader('Cache-Control', 'no-cache')
        res.end(this.getClientInjectionScript())
        return
      }

      // 处理客户端就绪通知
      if (req.url === '/__vue-mcp/client-ready' && req.method === 'POST') {
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
          } catch (error) {
            console.error('[BasePlugin] Failed to parse client ready data:', error)
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid JSON' }))
          }
        })
        return
      }

      next()
    }
  }

  /**
   * 获取客户端脚本 - 使用 Vite 内置 HMR API
   */
  private getSimpleClientScript(): string {
    return `// Vue MCP Client - 使用 Vite 内置 HMR + DevTools Kit
import { devtools, devtoolsRouterInfo, devtoolsState, getInspector, stringify, toggleHighPerfMode } from '@vue/devtools-kit'


const PINIA_INSPECTOR_ID = 'pinia'
const COMPONENTS_INSPECTOR_ID = 'components'

// 初始化 DevTools
devtools.init()

let highlightComponentTimeout = null

function flattenChildren(node) {
  const result = []

  function traverse(node) {
    if (!node)
      return
    result.push(node)

    if (Array.isArray(node.children)) {
      node.children.forEach(child => traverse(child))
    }
  }

  traverse(node)
  return result
}

// 使用 Vite 内置 HMR API
if (import.meta.hot) {
  
  // 监听服务端 MCP 命令
  import.meta.hot.on('vue-mcp:command', async (data) => {
    await handleCommand(data)
  })
  
} else {
  console.warn('[Vue MCP Client] HMR not available, falling back to direct WebSocket')
  
  // 回退到直接 WebSocket 连接
  const socket = new WebSocket(\`ws://\${location.host}\`)

  socket.onopen = () => {
  }

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data)
      
      // 只处理 Vue MCP 命令
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

async function handleCommand(message) {
  const { type, data, requestId } = message
  
  try {
    let result
    
    switch (type) {
      case 'get-component-tree':
        
        const inspectorTree = await devtools.api.getInspectorTree({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          filter: '',
        })
        result = inspectorTree[0] || []
        break
        
      case 'get-component-state':
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
          // 使用 DevTools Kit 的 stringify 来处理复杂数据
          result = JSON.parse(stringify(inspectorState))
        } else {
          console.error('[Vue MCP Client] Component not found for selector:', data.selector)
          throw new Error('Component not found')
        }
        break
        
      case 'edit-component-state':
        const editTree = await devtools.api.getInspectorTree({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          filter: '',
        })
        const editFlattenedChildren = flattenChildren(editTree[0])
        const editTargetNode = editFlattenedChildren.find(child => 
          child.name === data.selector?.name || 
          child.id === data.selector?.instanceId
        )
        if (editTargetNode) {
          const payload = {
            inspectorId: COMPONENTS_INSPECTOR_ID,
            nodeId: editTargetNode.id,
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
          result = { success: true }
        } else {
          throw new Error('Component not found')
        }
        break
        
      case 'highlight-component':
        clearTimeout(highlightComponentTimeout)
        const highlightTree = await devtools.api.getInspectorTree({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          filter: '',
        })
        const highlightFlattenedChildren = flattenChildren(highlightTree[0])
        const highlightTargetNode = highlightFlattenedChildren.find(child => 
          child.name === data.selector?.name || 
          child.id === data.selector?.instanceId
        )
        if (highlightTargetNode) {
          devtools.ctx.hooks.callHook('componentHighlight', { uid: highlightTargetNode.id })
          highlightComponentTimeout = setTimeout(() => {
            devtools.ctx.hooks.callHook('componentUnhighlight')
          }, 5000)
          result = { success: true }
        } else {
          throw new Error('Component not found')
        }
        break
        
      case 'get-router-info':
        result = devtoolsRouterInfo
        break
        
      case 'get-pinia-tree':
        const highPerfModeEnabled1 = devtoolsState.highPerfModeEnabled
        if (highPerfModeEnabled1) {
          toggleHighPerfMode(false)
        }
        const piniaTree = await devtools.api.getInspectorTree({
          inspectorId: PINIA_INSPECTOR_ID,
          filter: '',
        })
        if (highPerfModeEnabled1) {
          toggleHighPerfMode(true)
        }
        result = piniaTree
        break
        
      case 'get-pinia-state':
        const highPerfModeEnabled2 = devtoolsState.highPerfModeEnabled
        if (highPerfModeEnabled2) {
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
        if (highPerfModeEnabled2) {
          toggleHighPerfMode(true)
        }
        // 使用 DevTools Kit 的 stringify 来处理复杂数据
        result = JSON.parse(stringify(res))
        break
        
      default:
        throw new Error(\`Unknown command: \${type}\`)
    }
    
    // 发送响应
    sendResponse('vue-mcp:response', { requestId, result })
    
  } catch (error) {
    console.error('[Vue MCP Client] Command error:', error)
    sendResponse('vue-mcp:error', { requestId, error: error.message })
  }
}

// 清理循环引用的辅助函数
function cleanCircularReferences(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (seen.has(obj)) {
    return '[Circular Reference]'
  }
  
  seen.add(obj)
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanCircularReferences(item, seen))
  }
  
  const cleaned = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // 跳过一些已知的循环引用属性
      if (key === 'vnode' || key === 'component' || key === 'parent' || key === 'root' || key === '__v_skip') {
        cleaned[key] = '[Skipped Circular]'
      } else {
        cleaned[key] = cleanCircularReferences(obj[key], seen)
      }
    }
  }
  
  seen.delete(obj)
  return cleaned
}

function sendResponse(event, data) {
  
  // 清理可能的循环引用
  const cleanedData = cleanCircularReferences(data)
  
  if (import.meta.hot) {
    try {
      import.meta.hot.send(event, cleanedData)
    } catch (error) {
      console.error('[Vue MCP Client] Failed to send via HMR:', error)
      // 如果还是有问题，尝试使用 stringify 进一步处理
      try {
        const stringified = JSON.stringify(cleanedData, (key, value) => {
          if (typeof value === 'object' && value !== null && key !== '') {
            if (typeof value.constructor === 'function' && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
              return '[Object: ' + value.constructor.name + ']'
            }
          }
          return value
        })
        import.meta.hot.send(event, JSON.parse(stringified))
      } catch (stringifyError) {
        console.error('[Vue MCP Client] Complete send failure:', stringifyError)
        import.meta.hot.send('vue-mcp:error', { 
          requestId: data.requestId, 
          error: 'Failed to serialize response data: ' + stringifyError.message 
        })
      }
    }
  } else if (typeof socket !== 'undefined' && socket.readyState === WebSocket.OPEN) {
    const message = {
      type: 'custom',
      event: event,
      data: cleanedData
    }
    socket.send(JSON.stringify(message))
  } else {
    console.error('[Vue MCP Client] No available connection for sending response')
  }
}


// 通知服务端客户端就绪
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
  
}, 1000)`
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
    const { port, inspector } = this.options
    
    console.log('\n🚀 Vue MCP Next is running!')
    console.log(`   MCP Server: http://localhost:${port}`)
    
    if (inspector?.enabled) {
    }
    
  }
}