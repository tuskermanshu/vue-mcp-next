import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

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
   * 加载客户端模板文件
   */
  private loadClientTemplate(): string {
    try {
      // 在 ESM 环境中获取当前文件的目录
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      const templatePath = join(__dirname, 'client-template.js')
      
      return readFileSync(templatePath, 'utf-8')
    } catch (error) {
      console.warn('[ClientScriptManager] Failed to load client template, using fallback:', error)
      return this.createFallbackClientScript()
    }
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
   * 创建fallback客户端脚本（当无法读取模板文件时使用）
   */
  private createFallbackClientScript(): string {
    return `
// Vue MCP Client - Fallback implementation
console.warn('[Vue MCP] Using fallback client implementation - DevTools integration may be limited');

// Basic client ready notification
setTimeout(() => {
  fetch('/__vue-mcp/client-ready', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      ready: true, 
      devtoolsAvailable: false,
      fallback: true,
      timestamp: Date.now()
    })
  }).catch(() => {
    console.warn('[Vue MCP Client] Failed to notify server via HTTP')
  })
}, 1000)

// Basic error handling for unhandled promises
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Vue MCP Client] Unhandled promise rejection:', event.reason)
})
`
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