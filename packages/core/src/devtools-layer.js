/**
 * DevTools运行时层 - 负责与浏览器中运行的Vue应用进行实时交互
 * 基于Vue DevTools API实现运行时状态获取和修改
 */
export class DevToolsRuntimeLayer {
    constructor(viteServer, context) {
        this.viteServer = viteServer;
        this.context = context;
    }
    async initialize() {
        // 初始化与Vue DevTools的连接
        // 这里需要建立与浏览器端DevTools API的通信
        console.log('Initializing DevTools runtime layer...');
        // 注入客户端脚本到浏览器
        await this.injectDevToolsClient();
    }
    async injectDevToolsClient() {
        // 通过Vite的中间件注入DevTools客户端代码
        // 类似于原项目中的overlay机制
        if (this.viteServer) {
            this.viteServer.middlewares.use('/__vue-mcp-devtools', (req, res, next) => {
                if (req.url === '/__vue-mcp-devtools/client.js') {
                    res.setHeader('Content-Type', 'application/javascript');
                    res.end(this.getDevToolsClientScript());
                }
                else {
                    next();
                }
            });
        }
    }
    getDevToolsClientScript() {
        // 返回注入到浏览器的客户端脚本
        // 这个脚本会与Vue DevTools API交互
        return `
      (function() {
        // 建立与服务端的WebSocket连接
        const ws = new WebSocket('ws://localhost:8080/__vue-mcp-ws')
        
        // 等待Vue DevTools API可用
        function waitForDevTools() {
          if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
            initializeDevToolsIntegration()
          } else {
            setTimeout(waitForDevTools, 100)
          }
        }
        
        function initializeDevToolsIntegration() {
          const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__
          
          // 监听DevTools事件
          hook.on('component-updated', (component) => {
            ws.send(JSON.stringify({
              type: 'component-updated',
              data: component
            }))
          })
          
          // 处理来自服务端的命令
          ws.onmessage = (event) => {
            const message = JSON.parse(event.data)
            handleDevToolsCommand(message)
          }
        }
        
        function handleDevToolsCommand(message) {
          const { type, data, id } = message
          
          switch (type) {
            case 'get-component-tree':
              getComponentTree().then(result => {
                ws.send(JSON.stringify({ id, result }))
              })
              break
              
            case 'get-component-state':
              getComponentState(data.selector).then(result => {
                ws.send(JSON.stringify({ id, result }))
              })
              break
              
            case 'edit-component-state':
              editComponentState(data.selector, data.patch).then(result => {
                ws.send(JSON.stringify({ id, result }))
              })
              break
              
            case 'highlight-component':
              highlightComponent(data.selector).then(result => {
                ws.send(JSON.stringify({ id, result }))
              })
              break
          }
        }
        
        async function getComponentTree() {
          const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__
          const apps = hook.apps || []
          
          if (apps.length === 0) {
            throw new Error('No Vue apps found')
          }
          
          // 获取第一个app的组件树
          const app = apps[0]
          return traverseComponentTree(app._instance)
        }
        
        function traverseComponentTree(instance, depth = 0) {
          if (!instance) return null
          
          const component = {
            id: instance.uid,
            name: getComponentName(instance),
            type: instance.type?.name || 'Anonymous',
            props: instance.props || {},
            children: []
          }
          
          // 遍历子组件
          if (instance.subTree && instance.subTree.component) {
            const child = traverseComponentTree(instance.subTree.component, depth + 1)
            if (child) component.children.push(child)
          }
          
          return component
        }
        
        function getComponentName(instance) {
          return instance.type?.name || 
                 instance.type?.__name || 
                 instance.type?.__file?.split('/').pop()?.replace('.vue', '') ||
                 'Anonymous'
        }
        
        async function getComponentState(selector) {
          const instance = findComponentInstance(selector)
          if (!instance) {
            throw new Error('Component not found')
          }
          
          return {
            data: instance.setupState || instance.data || {},
            props: instance.props || {},
            computed: extractComputed(instance),
            methods: extractMethods(instance),
            emits: instance.emitsOptions || []
          }
        }
        
        async function editComponentState(selector, patch) {
          const instance = findComponentInstance(selector)
          if (!instance) {
            throw new Error('Component not found')
          }
          
          const { path, value, valueType } = patch
          const target = resolvePath(instance.setupState || instance.data, path.slice(0, -1))
          const key = path[path.length - 1]
          
          // 处理不同的值类型
          let parsedValue = value
          if (valueType) {
            parsedValue = parseValueByType(value, valueType)
          }
          
          // 更新状态
          if (target && key in target) {
            target[key] = parsedValue
            
            // 强制更新组件
            if (instance.proxy && instance.proxy.$forceUpdate) {
              instance.proxy.$forceUpdate()
            }
          }
          
          return true
        }
        
        async function highlightComponent(selector) {
          const instance = findComponentInstance(selector)
          if (!instance) {
            throw new Error('Component not found')
          }
          
          // 高亮组件的DOM元素
          const el = instance.vnode?.el
          if (el && el.nodeType === 1) {
            highlightElement(el)
          }
          
          return true
        }
        
        function findComponentInstance(selector) {
          const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__
          const apps = hook.apps || []
          
          for (const app of apps) {
            const instance = findInstanceInTree(app._instance, selector)
            if (instance) return instance
          }
          
          return null
        }
        
        function findInstanceInTree(instance, selector) {
          if (!instance) return null
          
          // 按名称查找
          if (selector.name && getComponentName(instance) === selector.name) {
            return instance
          }
          
          // 按实例ID查找
          if (selector.instanceId && instance.uid.toString() === selector.instanceId) {
            return instance
          }
          
          // 递归查找子组件
          if (instance.subTree && instance.subTree.component) {
            const found = findInstanceInTree(instance.subTree.component, selector)
            if (found) return found
          }
          
          return null
        }
        
        function resolvePath(obj, path) {
          return path.reduce((current, key) => current?.[key], obj)
        }
        
        function parseValueByType(value, type) {
          switch (type) {
            case 'number': return Number(value)
            case 'boolean': return Boolean(value)
            case 'object': return typeof value === 'string' ? JSON.parse(value) : value
            case 'array': return Array.isArray(value) ? value : JSON.parse(value)
            default: return value
          }
        }
        
        function extractComputed(instance) {
          const computed = {}
          if (instance.setupState) {
            Object.keys(instance.setupState).forEach(key => {
              const value = instance.setupState[key]
              if (value && value.__v_isRef && value.effect) {
                computed[key] = value.value
              }
            })
          }
          return computed
        }
        
        function extractMethods(instance) {
          const methods = []
          if (instance.setupState) {
            Object.keys(instance.setupState).forEach(key => {
              if (typeof instance.setupState[key] === 'function') {
                methods.push(key)
              }
            })
          }
          return methods
        }
        
        function highlightElement(el) {
          // 创建高亮覆盖层
          const highlight = document.createElement('div')
          const rect = el.getBoundingClientRect()
          
          highlight.style.cssText = \`
            position: fixed;
            top: \${rect.top}px;
            left: \${rect.left}px;
            width: \${rect.width}px;
            height: \${rect.height}px;
            background: rgba(65, 184, 131, 0.35);
            border: 2px solid rgba(65, 184, 131, 0.8);
            pointer-events: none;
            z-index: 9999;
            box-sizing: border-box;
          \`
          
          document.body.appendChild(highlight)
          
          // 3秒后移除高亮
          setTimeout(() => {
            if (highlight.parentNode) {
              highlight.parentNode.removeChild(highlight)
            }
          }, 3000)
        }
        
        // 初始化
        waitForDevTools()
      })()
    `;
    }
    async getComponentTree() {
        return this.sendDevToolsCommand('get-component-tree');
    }
    async getComponentState(selector) {
        return this.sendDevToolsCommand('get-component-state', { selector });
    }
    async updateComponentState(selector, patch) {
        return this.sendDevToolsCommand('edit-component-state', { selector, patch });
    }
    async highlightComponent(selector) {
        return this.sendDevToolsCommand('highlight-component', { selector });
    }
    async getRouterInfo() {
        // 实现路由信息获取
        return this.sendDevToolsCommand('get-router-info');
    }
    async getPiniaState(storeId) {
        return this.sendDevToolsCommand('get-pinia-state', { storeId });
    }
    async getPiniaTree() {
        return this.sendDevToolsCommand('get-pinia-tree');
    }
    async sendDevToolsCommand(type, data) {
        // 这里实现与浏览器端的WebSocket通信
        // 发送命令到浏览器，等待响应
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).substr(2, 9);
            // 发送命令到浏览器
            this.sendToClient({ type, data, id });
            // 等待响应（这里需要实现WebSocket服务器）
            this.waitForResponse(id).then(resolve).catch(reject);
        });
    }
    sendToClient(message) {
        // 通过WebSocket发送消息到浏览器客户端
        // 这里需要实现WebSocket服务器
        console.log('Sending to client:', message);
    }
    async waitForResponse(id) {
        // 等待来自浏览器的响应
        // 这里需要实现响应等待机制
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ mock: true, id });
            }, 100);
        });
    }
    async cleanup() {
        console.log('Cleaning up DevTools runtime layer...');
    }
}
