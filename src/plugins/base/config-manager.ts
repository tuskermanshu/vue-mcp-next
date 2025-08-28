import type { VueMcpOptions } from '../../server'
import { DEFAULT_CONFIG } from './constants.js'
import { deepMerge } from './utils.js'

/**
 * 配置验证错误
 */
export class ConfigValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ConfigValidationError'
  }
}

/**
 * 标准化的配置管理器
 */
export class VueMcpConfigManager {
  private config: Required<VueMcpOptions>

  constructor(userOptions: VueMcpOptions = {}) {
    this.config = this.createDefaultConfig()
    this.mergeUserOptions(userOptions)
    this.validateConfig()
  }

  /**
   * 创建默认配置
   */
  private createDefaultConfig(): Required<VueMcpOptions> {
    return {
      port: DEFAULT_CONFIG.PORT,
      mcpServerInfo: {
        name: 'vue-mcp-next',
        version: '0.1.0',
        description: 'Vue MCP Next Plugin'
      },
      features: {
        devtools: true,
        performanceMonitoring: false,
        componentHighlight: true,
        stateManagement: true
      },
      inspector: {
        enabled: false,
        autoStart: false,
        openBrowser: false,
        port: 6274
      },
      appendTo: /\.html$/,
      context: {
        apps: new Map(),
        projectRoot: process.cwd(),
        buildTool: DEFAULT_CONFIG.BUILD_TOOL,
        mode: DEFAULT_CONFIG.MODE,
        command: DEFAULT_CONFIG.COMMAND
      }
    }
  }

  /**
   * 合并用户配置
   */
  private mergeUserOptions(userOptions: VueMcpOptions): void {
    this.config = deepMerge(this.config, userOptions)
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    // 验证端口号
    if (!this.isValidPort(this.config.port)) {
      throw new ConfigValidationError(
        `Invalid port number: ${this.config.port}. Must be between 1 and 65535.`,
        'port'
      )
    }

    // 验证 Inspector 端口号
    if (this.config.inspector.port && !this.isValidPort(this.config.inspector.port)) {
      throw new ConfigValidationError(
        `Invalid inspector port number: ${this.config.inspector.port}. Must be between 1 and 65535.`,
        'inspector.port'
      )
    }

    // 验证服务器信息
    if (!this.config.mcpServerInfo.name || this.config.mcpServerInfo.name.trim().length === 0) {
      throw new ConfigValidationError(
        'Server name cannot be empty.',
        'mcpServerInfo.name'
      )
    }

    // 验证版本格式
    if (this.config.mcpServerInfo.version && !this.isValidVersion(this.config.mcpServerInfo.version)) {
      throw new ConfigValidationError(
        `Invalid version format: ${this.config.mcpServerInfo.version}. Expected semver format.`,
        'mcpServerInfo.version'
      )
    }

    // 验证 appendTo 配置
    if (this.config.appendTo && typeof this.config.appendTo !== 'string' && !(this.config.appendTo instanceof RegExp)) {
      throw new ConfigValidationError(
        'appendTo must be a string or RegExp.',
        'appendTo'
      )
    }
  }

  /**
   * 检查端口号是否有效
   */
  private isValidPort(port: number): boolean {
    return Number.isInteger(port) && port > 0 && port <= 65535
  }

  /**
   * 检查版本格式是否有效（简单的semver检查）
   */
  private isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+)?$/
    return semverRegex.test(version)
  }

  /**
   * 获取完整配置
   */
  getConfig(): Required<VueMcpOptions> {
    return { ...this.config }
  }

  /**
   * 获取指定配置项
   */
  get<K extends keyof VueMcpOptions>(key: K): Required<VueMcpOptions>[K] {
    return this.config[key]
  }

  /**
   * 更新配置项
   */
  update<K extends keyof VueMcpOptions>(key: K, value: VueMcpOptions[K]): void {
    this.config[key] = value as any
    this.validateConfig()
  }

  /**
   * 合并新的配置选项
   */
  merge(options: Partial<VueMcpOptions>): void {
    this.config = deepMerge(this.config, options) as Required<VueMcpOptions>
    this.validateConfig()
  }

  /**
   * 检查功能是否启用
   */
  isFeatureEnabled(feature: keyof Required<VueMcpOptions>['features']): boolean {
    return this.config.features[feature] ?? false
  }

  /**
   * 检查 Inspector 是否启用
   */
  isInspectorEnabled(): boolean {
    return this.config.inspector.enabled ?? false
  }

  /**
   * 获取服务器端口
   */
  getPort(): number {
    return this.config.port
  }

  /**
   * 获取 Inspector 配置
   */
  getInspectorConfig() {
    return { ...this.config.inspector }
  }

  /**
   * 获取服务器信息
   */
  getServerInfo() {
    return { ...this.config.mcpServerInfo }
  }

  /**
   * 创建运行时上下文配置
   */
  createRuntimeConfig(buildToolConfig: {
    root: string
    mode?: 'development' | 'production' | 'test'
    command?: 'serve' | 'build'
  }) {
    const baseContext = {
      apps: new Map(),
      projectRoot: buildToolConfig.root,
      buildTool: DEFAULT_CONFIG.BUILD_TOOL,
      mode: buildToolConfig.mode || DEFAULT_CONFIG.MODE,
      command: buildToolConfig.command || DEFAULT_CONFIG.COMMAND
    }

    // 如果有自定义上下文，合并配置（但不覆盖基础属性）
    if (this.config.context) {
      const { apps, projectRoot, buildTool, mode, command, ...customContext } = this.config.context
      
      return {
        ...baseContext,
        ...customContext
      }
    }

    return baseContext
  }

  /**
   * 检查是否应该注入到指定文件
   */
  shouldInjectTo(filename: string): boolean {
    if (!this.config.appendTo) return false
    
    if (typeof this.config.appendTo === 'string') {
      return filename.includes(this.config.appendTo)
    }
    
    if (this.config.appendTo instanceof RegExp) {
      return this.config.appendTo.test(filename)
    }
    
    return false
  }

  /**
   * 获取配置的JSON表示（用于调试）
   */
  toJSON(): Record<string, any> {
    return {
      port: this.config.port,
      mcpServerInfo: this.config.mcpServerInfo,
      features: this.config.features,
      inspector: this.config.inspector,
      appendTo: this.config.appendTo?.toString(),
      hasContext: !!this.config.context
    }
  }
}

/**
 * 创建配置管理器的工厂函数
 */
export function createConfigManager(options: VueMcpOptions = {}): VueMcpConfigManager {
  try {
    return new VueMcpConfigManager(options)
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw error
    }
    
    throw new ConfigValidationError(
      `Failed to create config manager: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}