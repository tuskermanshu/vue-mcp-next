// 通用基础插件
export { VueMcpBasePlugin } from './lib/base-plugin.js'

// Vite适配器
export { vueMcpVitePlugin as vite } from './adapters/vite.js'
export { vueMcpVitePlugin } from './adapters/vite.js'

// 默认导出Vite插件
export { vueMcpVitePlugin as default } from './adapters/vite.js'

// TODO: 其他构建工具适配器
// - Webpack适配器 (webpack.ts)
// - Farm适配器 (farm.ts)  
// - Rollup适配器 (rollup.ts)
// - esbuild适配器 (esbuild.ts)