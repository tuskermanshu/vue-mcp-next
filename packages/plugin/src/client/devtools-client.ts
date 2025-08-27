/**
 * Vue DevTools 客户端实现
 * 在浏览器环境中运行，使用 @vue/devtools-kit 进行实际的 DevTools 操作
 */

// 类型定义
interface ComponentSelector {
  name?: string
  id?: string
  domSelector?: string
  instanceId?: string
}

interface ComponentNode {
  id: string
  name: string
  type: string
  props?: Record<string, any>
  children?: ComponentNode[]
  file?: string
  line?: number
}

interface ComponentState {
  data?: Record<string, any>
  props?: Record<string, any>
  computed?: Record<string, any>
  methods?: string[]
  emits?: string[]
}

interface StatePatch {
  path: string[]
  value: any
  valueType?: string | number | boolean | object | []
}

interface RouterInfo {
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

interface PiniaState {
  stores: Record<string, {
    id: string
    state: Record<string, any>
    getters?: Record<string, any>
    actions?: string[]
  }>
}

/**
 * Vue MCP DevTools 客户端
 */
export class VueMcpDevToolsClient {
  private isClientReady = false
  private viteHot: any = null
  private devtools: any = null
  private devtoolsState: any = null
  private devtoolsRouterInfo: any = null
  private getInspector: any = null

  constructor() {
    this.initialize()
  }

  private async initialize() {
    
    try {
      // 尝试动态导入 @vue/devtools-kit
      await this.loadDevToolsKit()
      
      // 初始化HMR通信
      await this.initializeHMR()
      
    } catch (error) {
      console.error('[Vue MCP DevTools Client] Failed to load @vue/devtools-kit:', error)
      // 回退到基础实现
      this.initializeFallback()
    }
  }

  private async loadDevToolsKit(): Promise<void> {
    try {
      // 检查是否由 Vue MCP 初始化了 DevTools
      if ((window as any).__VUE_MCP_DEVTOOLS_INITIALIZED__ === true) {
        // DevTools 已由 Vue MCP 初始化，可以直接使用全局 Hook
        return
      }
      
      // 检查是否存在全局的 DevTools Kit
      if ((window as any).__VUE_DEVTOOLS_KIT__) {
        const devtoolsKit = (window as any).__VUE_DEVTOOLS_KIT__
        this.devtools = devtoolsKit.devtools
        this.devtoolsState = devtoolsKit.devtoolsState
        this.devtoolsRouterInfo = devtoolsKit.devtoolsRouterInfo
        this.getInspector = devtoolsKit.getInspector
        return
      }

      // 检查是否有外部 DevTools 插件提供的 Global Hook
      if ((window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__) {
        return
      }

      // 都没有可用的 DevTools
      throw new Error('DevTools not available')
    } catch (error) {
      console.warn('[Vue MCP DevTools Client] DevTools initialization failed, using fallback implementation')
      throw error
    }
  }

  private async initializeHMR() {
    try {
      // 检查是否有全局的 HMR 上下文（由 Vite 插件注入）
      if ((window as any).__VUE_MCP_HMR_CONTEXT__) {
        this.viteHot = (window as any).__VUE_MCP_HMR_CONTEXT__
        this.setupCommunication()
        return
      }

      // 尝试通过创建内联模块获取 HMR 上下文
      await this.tryGetHMRContext()
      
    } catch (error) {
      console.error('[Vue MCP DevTools Client] HMR initialization failed:', error)
      this.initializeFallback()
    }
  }

  private async tryGetHMRContext(): Promise<void> {
    return new Promise<void>((resolve) => {
      // 创建一个模块脚本来获取 HMR 上下文
      const script = document.createElement('script')
      script.type = 'module'
      script.textContent = `
        try {
          if (import.meta.hot) {
            window.__vueMcpHotContext = import.meta.hot;
            window.dispatchEvent(new CustomEvent('vue-mcp-hot-ready', { 
              detail: { success: true } 
            }));
          } else {
            window.dispatchEvent(new CustomEvent('vue-mcp-hot-ready', { 
              detail: { success: false, reason: 'import.meta.hot not available' } 
            }));
          }
        } catch (error) {
          window.dispatchEvent(new CustomEvent('vue-mcp-hot-ready', { 
            detail: { success: false, reason: error.message } 
          }));
        }
      `
      
      // 监听结果
      window.addEventListener('vue-mcp-hot-ready', (event: any) => {
        const { success, reason } = event.detail
        
        if (success && (window as any).__vueMcpHotContext) {
          this.viteHot = (window as any).__vueMcpHotContext
          this.setupCommunication()
        } else {
          console.warn('[Vue MCP DevTools Client] HMR not available:', reason || 'unknown')
          this.initializeFallback()
        }
        
        // 清理
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
        resolve()
      }, { once: true })
      
      // 超时处理
      setTimeout(() => {
        if (!this.viteHot) {
          console.warn('[Vue MCP DevTools Client] HMR context timeout, using fallback')
          this.initializeFallback()
          if (script.parentNode) {
            script.parentNode.removeChild(script)
          }
        }
        resolve()
      }, 2000)
      
      // 注入脚本
      document.head.appendChild(script)
    })
  }

  private setupCommunication() {
    if (!this.viteHot) {
      this.initializeFallback()
      return
    }
    
    
    // 监听服务端命令
    this.viteHot.on('vue-mcp:command', this.handleCommand.bind(this))
    
    // 等待DevTools就绪
    this.waitForDevTools(() => {
      if (!this.isClientReady) {
        this.isClientReady = true
        // 通知服务端客户端就绪
        this.viteHot.send('vue-mcp:client-ready', { 
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          devtoolsAvailable: !!this.devtools
        })
      }
    })
  }

  private waitForDevTools(callback: () => void) {
    const maxAttempts = 50 // 5秒超时
    let attempts = 0
    
    const check = () => {
      attempts++
      
      // 检查Vue DevTools是否可用
      if (this.devtools || this.hasVueDevTools() || this.hasVueApps()) {
        callback()
        return
      }
      
      if (attempts < maxAttempts) {
        setTimeout(check, 100)
      } else {
        console.warn('[Vue MCP DevTools Client] Vue DevTools/App not found after timeout')
        callback() // 仍然标记为就绪，但功能可能受限
      }
    }
    
    check()
  }

  private hasVueDevTools(): boolean {
    return !!(window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ && 
           !!(window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__.apps && 
           (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__.apps.length > 0
  }

  private hasVueApps(): boolean {
    return !!((window as any).__VUE__ && (window as any).__VUE__.apps && (window as any).__VUE__.apps.length > 0)
  }

  private async handleCommand(message: any) {
    const { type, data, requestId } = message
    
    try {
      let result: any
      
      switch (type) {
        case 'get-component-tree':
          result = await this.getComponentTree()
          break
          
        case 'get-component-state':
          result = await this.getComponentState(data.selector)
          break
          
        case 'edit-component-state':
          result = await this.editComponentState(data.selector, data.patch)
          break
          
        case 'highlight-component':
          result = await this.highlightComponent(data.selector)
          break
          
        case 'get-router-info':
          result = await this.getRouterInfo()
          break
          
        case 'get-pinia-state':
          result = await this.getPiniaState(data.storeId)
          break
          
        case 'get-pinia-tree':
          result = await this.getPiniaTree()
          break
          
        default:
          throw new Error(`Unknown command: ${type}`)
      }
      
      this.sendResponse('vue-mcp:response', { requestId, result })
      
    } catch (error: any) {
      console.error('[Vue MCP DevTools Client] Command error:', error)
      this.sendResponse('vue-mcp:error', { requestId, error: error.message })
    }
  }

  private sendResponse(type: string, data: any) {
    if (this.viteHot) {
      this.viteHot.send(type, data)
    } else {
      console.warn('[Vue MCP DevTools Client] Cannot send response - HMR not available')
    }
  }

  // DevTools API 实现 - 优先使用 @vue/devtools-kit
  private async getComponentTree(): Promise<ComponentNode[]> {
    if (this.devtools) {
      try {
        // 使用 DevTools Kit 获取组件树
        const inspector = this.getInspector?.('components')
        if (inspector) {
          const tree = await inspector.getComponentTree()
          return this.formatDevToolsComponentTree(tree)
        }
      } catch (error) {
        console.warn('[Vue MCP DevTools Client] DevTools kit failed, using fallback:', error)
      }
    }
    
    // 回退到基础实现
    return this.getComponentTreeFallback()
  }

  private async getComponentState(selector: ComponentSelector): Promise<ComponentState> {
    if (this.devtools && this.devtoolsState) {
      try {
        const instance = await this.findComponentWithDevTools(selector)
        if (instance) {
          return this.extractComponentStateWithDevTools(instance)
        }
      } catch (error) {
        console.warn('[Vue MCP DevTools Client] DevTools state failed, using fallback:', error)
      }
    }
    
    // 回退到基础实现
    return this.getComponentStateFallback(selector)
  }

  private async editComponentState(selector: ComponentSelector, patch: StatePatch): Promise<{ success: boolean }> {
    if (this.devtools && this.devtoolsState) {
      try {
        const instance = await this.findComponentWithDevTools(selector)
        if (instance) {
          return this.applyStatePatchWithDevTools(instance, patch)
        }
      } catch (error) {
        console.warn('[Vue MCP DevTools Client] DevTools edit failed, using fallback:', error)
      }
    }
    
    // 回退到基础实现
    return this.editComponentStateFallback(selector, patch)
  }

  private async getRouterInfo(): Promise<RouterInfo> {
    if (this.devtoolsRouterInfo) {
      try {
        const routerInfo = await this.devtoolsRouterInfo.getRouterInfo()
        return this.formatDevToolsRouterInfo(routerInfo)
      } catch (error) {
        console.warn('[Vue MCP DevTools Client] DevTools router failed, using fallback:', error)
      }
    }
    
    // 回退到基础实现
    return this.getRouterInfoFallback()
  }

  // DevTools Kit 辅助方法
  private formatDevToolsComponentTree(tree: any[]): ComponentNode[] {
    return tree.map(node => ({
      id: node.id || Math.random().toString(36),
      name: node.name || 'Unknown',
      type: node.type || 'Component',
      props: node.props || {},
      children: node.children ? this.formatDevToolsComponentTree(node.children) : [],
      file: node.file,
      line: node.line
    }))
  }

  private async findComponentWithDevTools(selector: ComponentSelector): Promise<any> {
    const inspector = this.getInspector?.('components')
    if (!inspector) return null
    
    const tree = await inspector.getComponentTree()
    return this.findComponentInDevToolsTree(tree, selector)
  }

  private findComponentInDevToolsTree(tree: any[], selector: ComponentSelector): any {
    for (const node of tree) {
      if (this.matchesSelector(node, selector)) {
        return node
      }
      if (node.children) {
        const found = this.findComponentInDevToolsTree(node.children, selector)
        if (found) return found
      }
    }
    return null
  }

  private matchesSelector(node: any, selector: ComponentSelector): boolean {
    if (selector.name && node.name === selector.name) return true
    if (selector.id && node.id === selector.id) return true
    if (selector.instanceId && node.instanceId === selector.instanceId) return true
    return false
  }

  private extractComponentStateWithDevTools(instance: any): ComponentState {
    // 使用 DevTools Kit 提取状态
    return {
      data: instance.state?.data || {},
      props: instance.state?.props || {},
      computed: instance.state?.computed || {},
      methods: instance.state?.methods || [],
      emits: instance.state?.emits || []
    }
  }

  private async applyStatePatchWithDevTools(instance: any, patch: StatePatch): Promise<{ success: boolean }> {
    try {
      // 使用 DevTools Kit 应用状态更改
      if (this.devtoolsState?.editComponentState) {
        await this.devtoolsState.editComponentState(instance.id, patch.path, patch.value)
        return { success: true }
      }
    } catch (error) {
      console.error('[Vue MCP DevTools Client] DevTools state patch failed:', error)
    }
    
    return { success: false }
  }

  private formatDevToolsRouterInfo(routerInfo: any): RouterInfo {
    return {
      currentRoute: {
        path: routerInfo.currentRoute?.path || '',
        name: routerInfo.currentRoute?.name || '',
        params: routerInfo.currentRoute?.params || {},
        query: routerInfo.currentRoute?.query || {}
      },
      routes: routerInfo.routes?.map((route: any) => ({
        path: route.path,
        name: route.name,
        component: route.component
      })) || []
    }
  }

  // 回退实现（基础版本）
  private async getComponentTreeFallback(): Promise<ComponentNode[]> {
    const apps = this.getVueApps()
    if (apps.length === 0) {
      throw new Error('No Vue apps found')
    }
    
    const trees: ComponentNode[] = []
    for (const app of apps) {
      const tree = this.buildComponentTree(app)
      if (tree) trees.push(tree)
    }
    
    return trees
  }

  private async getComponentStateFallback(selector: ComponentSelector): Promise<ComponentState> {
    const instance = this.findComponent(selector)
    if (!instance) {
      throw new Error(`Component not found: ${JSON.stringify(selector)}`)
    }
    
    return this.extractComponentState(instance)
  }

  private async editComponentStateFallback(selector: ComponentSelector, patch: StatePatch): Promise<{ success: boolean }> {
    const instance = this.findComponent(selector)
    if (!instance) {
      throw new Error(`Component not found: ${JSON.stringify(selector)}`)
    }
    
    this.applyStatePatch(instance, patch)
    return { success: true }
  }

  private async getRouterInfoFallback(): Promise<RouterInfo> {
    const apps = this.getVueApps()
    for (const app of apps) {
      const router = app?.config?.globalProperties?.$router
      if (router && router.currentRoute) {
        return {
          currentRoute: {
            path: router.currentRoute.value?.path || '',
            name: router.currentRoute.value?.name || '',
            params: router.currentRoute.value?.params || {},
            query: router.currentRoute.value?.query || {}
          },
          routes: router.getRoutes ? router.getRoutes().map((route: any) => ({
            path: route.path,
            name: route.name,
            component: route.components?.default?.name || 'Anonymous'
          })) : []
        }
      }
    }
    throw new Error('Vue Router not found')
  }

  // 基础实现辅助方法（与之前的实现相同）
  private getVueApps(): any[] {
    if ((window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ && (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__.apps) {
      return (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__.apps
    }
    
    if ((window as any).__VUE__ && (window as any).__VUE__.apps) {
      return (window as any).__VUE__.apps
    }
    
    return []
  }

  private buildComponentTree(app: any): ComponentNode | null {
    if (!app._instance) return null
    return this.traverseComponent(app._instance)
  }

  private traverseComponent(instance: any): ComponentNode | null {
    if (!instance) return null
    
    const node: ComponentNode = {
      id: instance.uid?.toString() || Math.random().toString(36),
      name: this.getComponentName(instance),
      type: instance.type?.name || 'Component',
      props: instance.props || {},
      children: []
    }
    
    if (instance.subTree) {
      const children = this.extractChildComponents(instance.subTree)
      node.children = children.map(child => this.traverseComponent(child)).filter(Boolean) as ComponentNode[]
    }
    
    return node
  }

  private getComponentName(instance: any): string {
    return instance.type?.name || 
           instance.type?.__name ||
           instance.type?.__file?.split('/').pop()?.replace('.vue', '') ||
           'Anonymous'
  }

  private extractChildComponents(vnode: any): any[] {
    const children: any[] = []
    
    if (vnode.component) {
      children.push(vnode.component)
    }
    
    if (vnode.children && Array.isArray(vnode.children)) {
      for (const child of vnode.children) {
        if (child && typeof child === 'object') {
          children.push(...this.extractChildComponents(child))
        }
      }
    }
    
    return children
  }

  private findComponent(selector: ComponentSelector): any {
    const apps = this.getVueApps()
    
    for (const app of apps) {
      const found = this.findComponentInTree(app._instance, selector)
      if (found) return found
    }
    
    return null
  }

  private findComponentInTree(instance: any, selector: ComponentSelector): any {
    if (!instance) return null
    
    if (selector.name && this.getComponentName(instance) === selector.name) {
      return instance
    }
    
    if (selector.instanceId && instance.uid?.toString() === selector.instanceId) {
      return instance
    }
    
    if (instance.subTree) {
      const children = this.extractChildComponents(instance.subTree)
      for (const child of children) {
        const found = this.findComponentInTree(child, selector)
        if (found) return found
      }
    }
    
    return null
  }

  private extractComponentState(instance: any): ComponentState {
    const state: ComponentState = {
      data: {},
      props: instance.props || {},
      computed: {},
      methods: [],
      emits: instance.emitsOptions || []
    }
    
    if (instance.setupState) {
      Object.keys(instance.setupState).forEach(key => {
        const value = instance.setupState[key]
        if (value && typeof value === 'object' && value.__v_isRef) {
          state.computed![key] = value.value
        } else if (typeof value === 'function') {
          state.methods!.push(key)
        } else {
          state.data![key] = value
        }
      })
    }
    
    if (instance.data && typeof instance.data === 'object') {
      Object.assign(state.data!, instance.data)
    }
    
    return state
  }

  private applyStatePatch(instance: any, patch: StatePatch): void {
    const { path, value, valueType } = patch
    
    let target = instance.setupState || instance.data || {}
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]]
      if (!target) throw new Error(`Invalid path: ${path.join('.')}`)
    }
    
    const key = path[path.length - 1]
    let newValue = value
    
    if (valueType) {
      switch (valueType) {
        case 'number': newValue = Number(value); break
        case 'boolean': newValue = Boolean(value); break
        case 'object': newValue = typeof value === 'string' ? JSON.parse(value) : value; break
        // @ts-ignore
        case 'array': newValue = Array.isArray(value) ? value : JSON.parse(value); break
      }
    }
    
    target[key] = newValue
    
    if (instance.proxy && instance.proxy.$forceUpdate) {
      instance.proxy.$forceUpdate()
    }
  }

  private async highlightComponent(selector: ComponentSelector): Promise<{ success: boolean }> {
    const instance = this.findComponent(selector)
    if (!instance) {
      throw new Error(`Component not found: ${JSON.stringify(selector)}`)
    }
    
    this.highlightElement(instance)
    return { success: true }
  }

  private async getPiniaState(storeId?: string): Promise<PiniaState> {
    const pinia = (window as any).pinia || (window as any).__pinia
    if (!pinia) {
      throw new Error('Pinia not found')
    }
    
    const stores: Record<string, any> = {}
    for (const [id, store] of pinia._s || new Map()) {
      if (!storeId || id === storeId) {
        stores[id] = {
          id: id,
          state: store.$state || {},
          getters: this.extractGetters(store),
          actions: this.extractActions(store)
        }
      }
    }
    
    return { stores }
  }

  private async getPiniaTree(): Promise<string[]> {
    const pinia = (window as any).pinia || (window as any).__pinia
    if (!pinia) {
      throw new Error('Pinia not found')
    }
    
    return Array.from((pinia._s || new Map()).keys())
  }

  private extractGetters(store: any): Record<string, any> {
    const getters: Record<string, any> = {}
    Object.keys(store).forEach(key => {
      const descriptor = Object.getOwnPropertyDescriptor(store, key)
      if (descriptor && descriptor.get) {
        try {
          getters[key] = store[key]
        } catch (error) {
          getters[key] = '[Error accessing getter]'
        }
      }
    })
    return getters
  }

  private extractActions(store: any): string[] {
    const actions: string[] = []
    Object.keys(store).forEach(key => {
      if (typeof store[key] === 'function' && !key.startsWith('$') && !key.startsWith('_')) {
        actions.push(key)
      }
    })
    return actions
  }

  private highlightElement(instance: any): void {
    const el = instance.vnode?.el
    if (!el || el.nodeType !== 1) return
    
    const rect = el.getBoundingClientRect()
    const highlight = document.createElement('div')
    
    highlight.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background: rgba(65, 184, 131, 0.35);
      border: 2px solid rgba(65, 184, 131, 0.8);
      pointer-events: none;
      z-index: 9999;
      box-sizing: border-box;
    `
    
    document.body.appendChild(highlight)
    
    setTimeout(() => {
      if (highlight.parentNode) {
        highlight.parentNode.removeChild(highlight)
      }
    }, 3000)
  }

  private initializeFallback(): void {
    setTimeout(() => {
      if (!this.isClientReady) {
        this.isClientReady = true
        fetch('/__vue-mcp/client-ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ready: true })
        }).catch(() => {
          console.warn('[Vue MCP DevTools Client] Failed to notify server via HTTP')
        })
      }
    }, 1000)
  }
}

// 自动初始化客户端
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    new VueMcpDevToolsClient()
  })
}