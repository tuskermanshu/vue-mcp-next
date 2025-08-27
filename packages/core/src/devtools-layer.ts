import type { 
  ComponentSelector, 
  ComponentNode, 
  ComponentState, 
  StatePatch, 
  RouterInfo, 
  PiniaState, 
  VueMcpContext,
  VueAppBridge
} from './types.js'

/**
 * DevTools运行时层 - 负责与浏览器中运行的Vue应用进行实时交互
 * 使用桥接模式适配不同的构建工具
 */
export class DevToolsRuntimeLayer {
  private bridge?: VueAppBridge
  private context: VueMcpContext

  constructor(bridge: VueAppBridge | undefined, context: VueMcpContext) {
    this.bridge = bridge
    this.context = context
  }

  setBridge(bridge: VueAppBridge) {
    this.bridge = bridge
  }

  async initialize() {
    if (!this.bridge) {
      console.warn('No bridge provided - DevTools integration disabled')
    }
  }


  async getComponentTree(): Promise<ComponentNode[]> {
    if (!this.bridge) {
      throw new Error('No bridge available - DevTools integration not configured')
    }
    return this.bridge.getComponentTree()
  }

  async getComponentState(selector: ComponentSelector): Promise<ComponentState> {
    if (!this.bridge) {
      throw new Error('No bridge available - DevTools integration not configured')
    }
    return this.bridge.getComponentState(selector)
  }

  async updateComponentState(selector: ComponentSelector, patch: StatePatch): Promise<void> {
    if (!this.bridge) {
      throw new Error('No bridge available - DevTools integration not configured')
    }
    return this.bridge.updateComponentState(selector, patch)
  }

  async highlightComponent(selector: ComponentSelector): Promise<void> {
    if (!this.bridge) {
      throw new Error('No bridge available - DevTools integration not configured')
    }
    return this.bridge.highlightComponent(selector)
  }

  async getRouterInfo(): Promise<RouterInfo> {
    if (!this.bridge) {
      throw new Error('No bridge available - DevTools integration not configured')
    }
    return this.bridge.getRouterInfo()
  }

  async getPiniaState(storeId?: string): Promise<PiniaState> {
    if (!this.bridge) {
      throw new Error('No bridge available - DevTools integration not configured')
    }
    return this.bridge.getPiniaState(storeId)
  }

  async getPiniaTree(): Promise<any> {
    if (!this.bridge) {
      throw new Error('No bridge available - DevTools integration not configured')
    }
    return this.bridge.getPiniaTree()
  }


  async cleanup() {
    if (this.bridge) {
      this.bridge.cleanup()
    }
  }
}