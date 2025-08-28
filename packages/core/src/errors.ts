/**
 * Vue MCP 错误处理系统
 */

export enum ErrorCode {
  // 服务器错误
  SERVER_START_FAILED = 'SERVER_START_FAILED',
  SERVER_STOP_FAILED = 'SERVER_STOP_FAILED',
  
  // DevTools 错误  
  DEVTOOLS_INIT_FAILED = 'DEVTOOLS_INIT_FAILED',
  DEVTOOLS_BRIDGE_FAILED = 'DEVTOOLS_BRIDGE_FAILED',
  
  // 组件相关错误
  COMPONENT_NOT_FOUND = 'COMPONENT_NOT_FOUND',
  COMPONENT_STATE_INVALID = 'COMPONENT_STATE_INVALID',
  
  // 通信错误
  WEBSOCKET_CONNECTION_FAILED = 'WEBSOCKET_CONNECTION_FAILED',
  MESSAGE_PARSE_ERROR = 'MESSAGE_PARSE_ERROR',
  
  // 配置错误
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_DEPENDENCY = 'MISSING_DEPENDENCY'
}

export class VueMcpError extends Error {
  public readonly code: ErrorCode
  public readonly context?: Record<string, any>
  public readonly cause?: Error

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message)
    this.name = 'VueMcpError'
    this.code = code
    this.context = context
    this.cause = cause

    // 保持堆栈追踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VueMcpError)
    }
  }

  /**
   * 序列化错误为可传输的格式
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
      cause: this.cause?.message
    }
  }

  /**
   * 创建组件未找到错误
   */
  static componentNotFound(selector: any, cause?: Error): VueMcpError {
    return new VueMcpError(
      ErrorCode.COMPONENT_NOT_FOUND,
      'Component not found with the given selector',
      { selector },
      cause
    )
  }

  /**
   * 创建 DevTools 初始化失败错误
   */
  static devtoolsInitFailed(reason: string, cause?: Error): VueMcpError {
    return new VueMcpError(
      ErrorCode.DEVTOOLS_INIT_FAILED,
      `DevTools initialization failed: ${reason}`,
      { reason },
      cause
    )
  }

  /**
   * 创建服务器启动失败错误
   */
  static serverStartFailed(port: number, cause?: Error): VueMcpError {
    return new VueMcpError(
      ErrorCode.SERVER_START_FAILED,
      `Failed to start MCP server on port ${port}`,
      { port },
      cause
    )
  }
}

/**
 * 错误处理器类型
 */
export type ErrorHandler = (error: VueMcpError) => void

/**
 * 全局错误处理器
 */
class ErrorManager {
  private handlers: Set<ErrorHandler> = new Set()

  /**
   * 添加错误处理器
   */
  addHandler(handler: ErrorHandler): () => void {
    this.handlers.add(handler)
    
    // 返回移除函数
    return () => this.handlers.delete(handler)
  }

  /**
   * 处理错误
   */
  handle(error: VueMcpError | Error): void {
    const vueMcpError = error instanceof VueMcpError 
      ? error 
      : new VueMcpError(ErrorCode.SERVER_START_FAILED, error.message, {}, error)

    // 调用所有处理器
    this.handlers.forEach(handler => {
      try {
        handler(vueMcpError)
      } catch (handlerError) {
        console.error('[Vue MCP] Error in error handler:', handlerError)
      }
    })

    // 如果没有处理器，至少要在控制台显示
    if (this.handlers.size === 0) {
      console.error('[Vue MCP Error]', vueMcpError)
    }
  }
}

export const errorManager = new ErrorManager()

/**
 * 默认错误处理器
 */
export const defaultErrorHandler: ErrorHandler = (error) => {
  console.error(`[Vue MCP ${error.code}]`, error.message, error.context)
  
  if (error.cause) {
    console.error('Caused by:', error.cause)
  }
}

// 添加默认错误处理器
errorManager.addHandler(defaultErrorHandler)