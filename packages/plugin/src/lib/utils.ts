import { NETWORK_CONSTANTS, LOG_PREFIXES, ERROR_MESSAGES } from './constants.js'

/**
 * 生成唯一请求ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 创建带超时的Promise
 */
export function createTimeoutPromise<T>(
  promise: Promise<T>,
  timeoutMs: number = NETWORK_CONSTANTS.REQUEST_TIMEOUT,
  errorMessage: string = ERROR_MESSAGES.REQUEST_TIMEOUT
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`${errorMessage} after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

/**
 * 清理循环引用的工具函数
 */
export function cleanCircularReferences(obj: any, seen = new WeakSet()): any {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (seen.has(obj)) {
    return '[Circular Reference]'
  }
  
  seen.add(obj)
  
  if (Array.isArray(obj)) {
    const result = obj.map(item => cleanCircularReferences(item, seen))
    seen.delete(obj)
    return result
  }
  
  const cleaned: any = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // 跳过已知的循环引用属性
      if (['vnode', 'component', 'parent', 'root', '__v_skip'].includes(key)) {
        cleaned[key] = '[Skipped Circular]'
      } else {
        cleaned[key] = cleanCircularReferences(obj[key], seen)
      }
    }
  }
  
  seen.delete(obj)
  return cleaned
}

/**
 * 安全的JSON字符串化，处理循环引用
 */
export function safeStringify(obj: any, space?: number): string {
  try {
    return JSON.stringify(cleanCircularReferences(obj), null, space)
  } catch (error) {
    console.warn('Failed to stringify object, using fallback:', error)
    return JSON.stringify({ error: 'Failed to serialize object', type: typeof obj })
  }
}

/**
 * 创建一个可取消的定时器
 */
export class CancellableTimer {
  private timerId: NodeJS.Timeout | null = null
  private isActive = false

  start(callback: () => void, delay: number): void {
    this.clear()
    this.isActive = true
    this.timerId = setTimeout(() => {
      if (this.isActive) {
        callback()
        this.isActive = false
      }
    }, delay)
  }

  clear(): void {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
    this.isActive = false
  }

  get active(): boolean {
    return this.isActive
  }
}

/**
 * 资源管理器 - 管理需要清理的资源
 */
export class ResourceManager {
  private resources: Array<() => void> = []

  /**
   * 添加需要清理的资源
   */
  add(cleanup: () => void): void {
    this.resources.push(cleanup)
  }

  /**
   * 添加定时器资源
   */
  addTimer(timer: NodeJS.Timeout): void {
    this.add(() => clearTimeout(timer))
  }

  /**
   * 添加间隔定时器资源
   */
  addInterval(interval: NodeJS.Timeout): void {
    this.add(() => clearInterval(interval))
  }

  /**
   * 添加事件监听器资源
   */
  addEventListener<T extends EventTarget>(
    target: T,
    event: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(event, listener, options)
    this.add(() => target.removeEventListener(event, listener, options))
  }

  /**
   * 清理所有资源
   */
  cleanup(): void {
    this.resources.forEach(cleanup => {
      try {
        cleanup()
      } catch (error) {
        console.warn('Error during resource cleanup:', error)
      }
    })
    this.resources = []
  }

  /**
   * 获取管理的资源数量
   */
  get count(): number {
    return this.resources.length
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = NETWORK_CONSTANTS.MAX_RETRY_ATTEMPTS,
  delay: number = NETWORK_CONSTANTS.WEBSOCKET_RETRY_INTERVAL
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxAttempts) {
        throw lastError
      }
      
      console.warn(`${LOG_PREFIXES.BASE_PLUGIN} Attempt ${attempt} failed, retrying in ${delay}ms...`, error)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * 创建标准化的错误响应
 */
export function createErrorResponse(requestId: string, error: string | Error): any {
  return {
    requestId,
    error: error instanceof Error ? error.message : error,
    timestamp: Date.now()
  }
}

/**
 * 创建标准化的成功响应
 */
export function createSuccessResponse(requestId: string, result: any): any {
  return {
    requestId,
    result: cleanCircularReferences(result),
    timestamp: Date.now()
  }
}

/**
 * 检查对象是否为空
 */
export function isEmpty(obj: any): boolean {
  if (obj == null) return true
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  return false
}

/**
 * 深度合并对象
 */
export function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target

  const source = sources.shift()
  if (!source) return target

  for (const key in source) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {} as any
      deepMerge(target[key], source[key])
    } else {
      target[key] = source[key] as any
    }
  }

  return deepMerge(target, ...sources)
}