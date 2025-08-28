// Vue MCP Next - Main exports
// Server exports
export * from './server/index.js'

// Plugin exports  
export { vueMcpVitePlugin, vueMcpVitePlugin as default } from './plugins/vite/vite.js'

// Client exports (for advanced usage)
export { ClientScriptManager } from './client/client-script-manager.js'

// Base plugin utilities (for extending to other build tools)
export * from './plugins/base/index.js'

// Shared utilities and types
export * from './shared/index.js'