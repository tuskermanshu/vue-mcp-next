import express from 'express'
import cors from 'cors'
import { randomUUID, randomBytes } from 'node:crypto'
import { spawn, ChildProcess } from 'node:child_process'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'

export interface VueMcpHttpServerOptions {
  port: number
  cors?: boolean
  enableDnsRebindingProtection?: boolean
  allowedHosts?: string[]
  allowedOrigins?: string[]
  serverName?: string
  serverVersion?: string
  enableMcpInspector?: boolean
  authToken?: string
  inspector?: {
    enabled?: boolean
    authToken?: string
    autoStart?: boolean        // 是否自动启动 Inspector
    openBrowser?: boolean      // 是否自动打开浏览器
  }
}

/**
 * Vue MCP HTTP 服务器
 * 实现标准的 MCP Streamable HTTP 协议，支持自动启动 MCP Inspector
 */
export class VueMcpHttpServer {
  private app: express.Application
  private mcpServer: McpServer
  private options: VueMcpHttpServerOptions
  private httpServer?: any
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } = {}
  private serverInfo: { name: string; version: string }
  private authToken: string
  private inspectorProcess?: ChildProcess  // Inspector 进程

  constructor(mcpServer: McpServer, options: VueMcpHttpServerOptions) {
    this.mcpServer = mcpServer
    this.options = {
      enableDnsRebindingProtection: false,
      allowedHosts: ['127.0.0.1', 'localhost'],
      allowedOrigins: [],
      serverName: 'vue-mcp-next',
      serverVersion: '0.1.0',
      enableMcpInspector: false,
      inspector: {
        enabled: false,
        autoStart: true,
        openBrowser: true,
        ...options.inspector
      },
      ...options
    }
    
    // 生成或使用提供的认证token
    this.authToken = this.options.inspector?.authToken || this.options.authToken || this.generateAuthToken()
    
    // 存储服务器信息
    this.serverInfo = {
      name: this.options.serverName!,
      version: this.options.serverVersion!
    }
    
    this.app = express()

    this.app.use((req, res, next) => {
      res.header("Access-Control-Expose-Headers", "mcp-session-id");
      next();
    });
    this.setupMiddleware()
    this.setupMcpEndpoints()
    this.setupInspectorEndpoints()
  }

  /**
   * 更新服务器信息
   */
  updateServerInfo(name: string, version: string) {
    this.serverInfo = { name, version }
  }

  /**
   * 获取服务器信息
   */
  getServerInfo() {
    return { ...this.serverInfo }
  }

  /**
   * 生成认证token
   */
  private generateAuthToken(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * 获取认证token
   */
  getAuthToken(): string {
    return this.authToken
  }


  /**
   * 启动 MCP Inspector
   */
  private async startInspector(): Promise<void> {
    if (!this.options.inspector?.enabled || !this.options.inspector?.autoStart) {
      return
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('🔍 Starting MCP Inspector...')
        
        const args = ['@modelcontextprotocol/inspector']
        
        // 添加 MCP 服务器 URL 参数
        args.push('--url', `http://localhost:${this.options.port}/mcp`)
        args.push('--transport', 'streamable-http')

        console.log('🔍 Inspector startup args:', args)
        
        // 启动 Inspector 进程
        this.inspectorProcess = spawn('npx', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          detached: false
        })

        let inspectorUrl = ''
        let isResolved = false

        // 监听 stdout 以获取 Inspector URL
        this.inspectorProcess.stdout?.on('data', (data: Buffer) => {
          const output = data.toString()
          console.log(`[Inspector] ${output.trim()}`)
          
          // 尝试提取 Inspector URL
          const urlMatch = output.match(/http:\/\/localhost:\d+/)
          if (urlMatch && !isResolved) {
            inspectorUrl = urlMatch[0]
            console.log(`🎉 MCP Inspector started at: ${inspectorUrl}`)
            
            // 自动配置提示
            this.printInspectorConfig(inspectorUrl)
            
            // 可选：自动打开浏览器
            if (this.options.inspector?.openBrowser) {
              this.openBrowser(inspectorUrl)
            }
            
            isResolved = true
            resolve()
          }
        })

        // 监听 stderr
        this.inspectorProcess.stderr?.on('data', (data: Buffer) => {
          const output = data.toString()
          console.error(`[Inspector Error] ${output.trim()}`)
        })

        // 监听进程退出
        this.inspectorProcess.on('exit', (code, signal) => {
          console.log(`[Inspector] Process exited with code ${code}, signal ${signal}`)
          this.inspectorProcess = undefined
        })

        // 监听进程错误
        this.inspectorProcess.on('error', (error) => {
          console.error('[Inspector] Failed to start:', error.message)
          if (!isResolved) {
            reject(error)
          }
        })

        // 设置超时，防止无限等待
        setTimeout(() => {
          if (!isResolved) {
            console.log('⚠️  Inspector startup timeout, but it may still be starting...')
            resolve() // 不阻塞主服务器启动
          }
        }, 10000) // 10秒超时

      } catch (error) {
        console.error('[Inspector] Failed to start:', error)
        reject(error)
      }
    })
  }

  /**
   * 打印 Inspector 配置信息
   */
  private printInspectorConfig(inspectorUrl: string) {
    console.log('')
    console.log('🔗 MCP Inspector Configuration:')
    console.log(`   • Inspector URL:    ${inspectorUrl}`)
    console.log(`   • MCP Server URL:   http://localhost:${this.options.port}/mcp`)
    console.log(`   • Transport Type:   streamable-http`)
    


    console.log('')
    console.log('📋 Inspector will be auto-configured with:')
    console.log('   - Transport: Streamable HTTP')
    console.log(`   - Server URL: http://localhost:${this.options.port}/mcp`)

  }

  /**
   * 自动打开浏览器
   */
  private openBrowser(url: string) {
    try {
      const { spawn } = require('node:child_process')
      const platform = process.platform
      
      let command: string
      let args: string[]

      if (platform === 'darwin') {
        command = 'open'
        args = [url]
      } else if (platform === 'win32') {
        command = 'start'
        args = ['', url]
      } else {
        command = 'xdg-open'
        args = [url]
      }

      spawn(command, args, { detached: true, stdio: 'ignore' }).unref()
      console.log(`🌐 Opening Inspector in browser: ${url}`)
    } catch (error) {
      console.log(`⚠️  Could not auto-open browser. Please manually visit: ${url}`)
    }
  }

  /**
   * 停止 MCP Inspector
   */
  private stopInspector(): void {
    if (this.inspectorProcess) {
      console.log('🔍 Stopping MCP Inspector...')
      
      try {
        // 优雅关闭
        this.inspectorProcess.kill('SIGTERM')
        
        // 如果 2 秒后还没关闭，强制杀死
        setTimeout(() => {
          if (this.inspectorProcess && !this.inspectorProcess.killed) {
            console.log('🔍 Force killing Inspector process...')
            this.inspectorProcess.kill('SIGKILL')
          }
        }, 2000)
        
      } catch (error) {
        console.error('Error stopping Inspector:', error)
      }
      
      this.inspectorProcess = undefined
    }
  }

  private setupMiddleware() {
    // CORS支持
    if (this.options.cors !== false) {
      this.app.use(cors({
        origin: this.options.allowedOrigins?.length ? this.options.allowedOrigins : '*',
        credentials: true,
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'mcp-session-id', 'Authorization'],
        exposedHeaders: ['Mcp-Session-Id'],
      }))
    }

    // JSON解析
    this.app.use(express.json({ limit: '10mb' }))

    // 日志中间件
    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`[MCP HTTP] ${req.method} ${req.url} - Session: ${req.headers['mcp-session-id'] || 'none'}`)
      next()
    })
  }

  private setupMcpEndpoints() {
    // 主要的 MCP 端点
    this.app.post('/mcp', async (req: express.Request, res: express.Response) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined
        let transport: StreamableHTTPServerTransport

        if (sessionId && this.transports[sessionId]) {
          transport = this.transports[sessionId]
          console.log(`[MCP] Reusing existing session: ${sessionId}`)
        } else if (!sessionId && isInitializeRequest(req.body)) {
          console.log('[MCP] Creating new session for initialize request')
          
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
              this.transports[sessionId] = transport
              console.log(`[MCP] Session initialized: ${sessionId}`)
            },
            enableDnsRebindingProtection: this.options.enableDnsRebindingProtection,
            allowedHosts: this.options.allowedHosts,
          })

          transport.onclose = () => {
            if (transport.sessionId) {
              delete this.transports[transport.sessionId]
              console.log(`[MCP] Session closed: ${transport.sessionId}`)
            }
          }

          await this.mcpServer.connect(transport)
        } else {
          console.log('[MCP] Creating new session for request (development mode)')
          
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
              this.transports[sessionId] = transport
              console.log(`[MCP] Session initialized (dev mode): ${sessionId}`)
            },
            enableDnsRebindingProtection: this.options.enableDnsRebindingProtection,
            allowedHosts: this.options.allowedHosts,
          })

          transport.onclose = () => {
            if (transport.sessionId) {
              delete this.transports[transport.sessionId]
              console.log(`[MCP] Session closed: ${transport.sessionId}`)
            }
          }

          await this.mcpServer.connect(transport)
        }

        await transport.handleRequest(req, res, req.body)
      } catch (error: any) {
        console.error('[MCP] Error handling POST request:', error)
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          })
        }
      }
    })

    // GET 和 DELETE 请求处理
    this.app.get('/mcp', async (req: express.Request, res: express.Response) => {
      await this.handleSessionRequest(req, res)
    })

    this.app.delete('/mcp', async (req: express.Request, res: express.Response) => {
      await this.handleSessionRequest(req, res)
    })
  }

  private setupInspectorEndpoints() {
    // Health check endpoint
    this.app.get('/health', (_req: express.Request, res: express.Response) => {
      res.json({
        status: 'ok',
        server: this.serverInfo,
        activeSessions: this.getActiveSessionCount(),
        inspector: {
          enabled: this.options.inspector?.enabled,
          autoStarted: !!this.inspectorProcess,
          processId: this.inspectorProcess?.pid
        },
        timestamp: new Date().toISOString()
      })
    })

    // Server info endpoint
    this.app.get('/info', (_req: express.Request, res: express.Response) => {
      res.json({
        server: this.serverInfo,
        protocol: 'MCP Streamable HTTP',
        endpoints: {
          mcp: '/mcp',
          health: '/health',
          info: '/info',
          debugSessions: '/debug/sessions'
        },
        capabilities: {
          authentication:false,
          dnsRebindingProtection: this.options.enableDnsRebindingProtection,
          inspectorAutoStart: this.options.inspector?.autoStart
        }
      })
    })

    // Debug sessions endpoint
    this.app.get('/debug/sessions', (req: express.Request, res: express.Response) => {
      res.json({
        activeSessions: this.getActiveSessions().map(sessionId => ({
          sessionId,
          createdAt: new Date().toISOString()
        })),
        totalCount: this.getActiveSessionCount()
      })
    })
  }

  private async handleSessionRequest(req: express.Request, res: express.Response) {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined
      
      if (!sessionId || !this.transports[sessionId]) {
        console.log(`[MCP] Invalid or missing session ID: ${sessionId}`)
        res.status(400).send('Invalid or missing session ID')
        return
      }
      
      const transport = this.transports[sessionId]
      console.log(`[MCP] Handling ${req.method} request for session: ${sessionId}`)
      
      await transport.handleRequest(req, res)
    } catch (error: any) {
      console.error(`[MCP] Error handling ${req.method} request:`, error)
      if (!res.headersSent) {
        res.status(500).send('Internal server error')
      }
    }
  }

  async start(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        this.httpServer = this.app.listen(this.options.port, async () => {
          console.log(`🚀 Vue MCP HTTP Server listening on port ${this.options.port}`)
          console.log(`   • MCP endpoint:     http://localhost:${this.options.port}/mcp`)
          console.log(`   • Health check:     http://localhost:${this.options.port}/health`)
          console.log(`   • Server info:      http://localhost:${this.options.port}/info`)
          console.log(`   • Debug sessions:   http://localhost:${this.options.port}/debug/sessions`)
          console.log(`   • Protocol:         MCP Streamable HTTP`)
          console.log(`   • DNS Protection:   ${this.options.enableDnsRebindingProtection}`)
          
          if (this.options.allowedHosts?.length) {
            console.log(`   • Allowed hosts:    ${this.options.allowedHosts.join(', ')}`)
          }

          // 启动 Inspector（如果启用）
          try {
            await this.startInspector()
          } catch (error) {
            console.error('⚠️  Failed to start Inspector, but server will continue:', error)
          }

          resolve()
        })

        this.httpServer.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`❌ Port ${this.options.port} is already in use`)
          } else {
            console.error('❌ HTTP Server error:', error)
          }
          reject(error)
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // 停止 Inspector
      this.stopInspector()

      // 关闭所有活跃的传输连接
      Object.values(this.transports).forEach(transport => {
        try {
          transport.close()
        } catch (error) {
          console.error('Error closing transport:', error)
        }
      })
      this.transports = {}

      if (this.httpServer) {
        this.httpServer.close(() => {
          console.log('Vue MCP HTTP Server stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  getApp() {
    return this.app
  }

  getActiveSessionCount(): number {
    return Object.keys(this.transports).length
  }

  getActiveSessions(): string[] {
    return Object.keys(this.transports)
  }

  closeSession(sessionId: string): boolean {
    const transport = this.transports[sessionId]
    if (transport) {
      try {
        transport.close()
        delete this.transports[sessionId]
        console.log(`[MCP] Manually closed session: ${sessionId}`)
        return true
      } catch (error) {
        console.error(`[MCP] Error closing session ${sessionId}:`, error)
        return false
      }
    }
    return false
  }

  /**
   * 获取 Inspector 进程状态
   */
  getInspectorStatus() {
    return {
      enabled: this.options.inspector?.enabled,
      autoStart: this.options.inspector?.autoStart,
      running: !!this.inspectorProcess,
      processId: this.inspectorProcess?.pid
    }
  }

  /**
   * 手动启动 Inspector（如果未自动启动）
   */
  async startInspectorManually(): Promise<void> {
    if (this.inspectorProcess) {
      console.log('Inspector is already running')
      return
    }
    
    await this.startInspector()
  }

  /**
   * 手动停止 Inspector
   */
  stopInspectorManually(): void {
    this.stopInspector()
  }
}