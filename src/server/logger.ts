/**
 * Vue MCP 日志系统
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, any>
  module?: string
}

export type LogHandler = (entry: LogEntry) => void

/**
 * 日志记录器
 */
class Logger {
  private level: LogLevel = LogLevel.INFO
  private handlers: Set<LogHandler> = new Set()
  private module?: string

  constructor(module?: string) {
    this.module = module
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * 添加日志处理器
   */
  addHandler(handler: LogHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (level < this.level) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      module: this.module
    }

    this.handlers.forEach(handler => {
      try {
        handler(entry)
      } catch (error) {
        console.error('[Logger] Handler error:', error)
      }
    })
  }

  /**
   * Debug 日志
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * Info 日志
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Warning 日志
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Error 日志
   */
  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context)
  }

  /**
   * 创建子日志记录器
   */
  child(module: string): Logger {
    const childLogger = new Logger(this.module ? `${this.module}:${module}` : module)
    childLogger.level = this.level
    // 创建新的处理器集合，避免共享引用
    this.handlers.forEach(handler => childLogger.handlers.add(handler))
    return childLogger
  }
}

/**
 * 控制台日志处理器
 */
export const consoleHandler: LogHandler = (entry) => {
  const prefix = `[Vue MCP${entry.module ? `:${entry.module}` : ''}]`
  const timestamp = entry.timestamp.toISOString().split('T')[1].split('.')[0]
  const message = `${timestamp} ${prefix} ${entry.message}`

  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(message, entry.context || '')
      break
    case LogLevel.INFO:
      console.log(message, entry.context || '')
      break
    case LogLevel.WARN:
      console.warn(message, entry.context || '')
      break
    case LogLevel.ERROR:
      console.error(message, entry.context || '')
      break
  }
}

/**
 * 彩色控制台处理器
 */
export const colorConsoleHandler: LogHandler = (entry) => {
  const colors:any = {
    [LogLevel.DEBUG]: '\x1b[36m', // 青色
    [LogLevel.INFO]: '\x1b[32m',  // 绿色
    [LogLevel.WARN]: '\x1b[33m',  // 黄色
    [LogLevel.ERROR]: '\x1b[31m'  // 红色
  }
  const reset = '\x1b[0m'
  
  const color = colors[entry.level]  || ''
  const prefix = `${color}[Vue MCP${entry.module ? `:${entry.module}` : ''}]${reset}`
  const timestamp = entry.timestamp.toISOString().split('T')[1].split('.')[0]
  const message = `${timestamp} ${prefix} ${entry.message}`

  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(message, entry.context || '')
      break
    case LogLevel.INFO:
      console.log(message, entry.context || '')
      break
    case LogLevel.WARN:
      console.warn(message, entry.context || '')
      break
    case LogLevel.ERROR:
      console.error(message, entry.context || '')
      break
  }
}

// 创建全局日志记录器
export const logger = new Logger()

// 根据环境选择处理器
const isDev = process.env.NODE_ENV === 'development'
logger.addHandler(isDev ? colorConsoleHandler : consoleHandler)

// 根据环境设置日志级别
if (process.env.VUE_MCP_LOG_LEVEL) {
  const level = LogLevel[process.env.VUE_MCP_LOG_LEVEL as keyof typeof LogLevel]
  if (level !== undefined) {
    logger.setLevel(level)
  }
} else {
  logger.setLevel(isDev ? LogLevel.DEBUG : LogLevel.INFO)
}