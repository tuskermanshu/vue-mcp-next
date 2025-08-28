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
import { VueMcpError, ErrorCode } from './errors.js'

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
      throw VueMcpError.devtoolsInitFailed('No bridge available')
    }
    this.validateComponentSelector(selector)
    return this.bridge.getComponentState(selector)
  }

  async updateComponentState(selector: ComponentSelector, patch: StatePatch): Promise<void> {
    if (!this.bridge) {
      throw VueMcpError.devtoolsInitFailed('No bridge available')
    }
    this.validateComponentSelector(selector)
    this.validateStatePatch(patch)
    return this.bridge.updateComponentState(selector, patch)
  }

  async highlightComponent(selector: ComponentSelector): Promise<void> {
    if (!this.bridge) {
      throw VueMcpError.devtoolsInitFailed('No bridge available')
    }
    this.validateComponentSelector(selector)
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

  private validateComponentSelector(selector: ComponentSelector): void {
    if (!selector || typeof selector !== 'object') {
      throw new VueMcpError(
        ErrorCode.COMPONENT_STATE_INVALID,
        'Invalid component selector: must be an object'
      )
    }
    
    if (!selector.name && !selector.id && !selector.domSelector) {
      throw new VueMcpError(
        ErrorCode.COMPONENT_STATE_INVALID,
        'Invalid component selector: must provide name, id, or domSelector'
      )
    }
  }

  private validateStatePatch(patch: StatePatch): void {
    if (!patch || typeof patch !== 'object') {
      throw new VueMcpError(
        ErrorCode.COMPONENT_STATE_INVALID,
        'Invalid state patch: must be an object'
      )
    }
    
    if (!Array.isArray(patch.path) || patch.path.length === 0) {
      throw new VueMcpError(
        ErrorCode.COMPONENT_STATE_INVALID,
        'Invalid state patch: path must be a non-empty array'
      )
    }
    
    if (patch.path.some(p => typeof p !== 'string')) {
      throw new VueMcpError(
        ErrorCode.COMPONENT_STATE_INVALID,
        'Invalid state patch: all path elements must be strings'
      )
    }
  }
}