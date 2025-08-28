import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { vueMcpVitePlugin } from "vue-mcp-next"
import DevTools from 'vite-plugin-vue-devtools'



// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5174  // Vite 使用 5174 端口
  },
  plugins: [
    vue(),
    DevTools(),
    vueMcpVitePlugin({
      port: 8890,
      inspector: {
        enabled: true,        // 启用 MCP Inspector
        autoStart: true,      // 🚀 自动启动
        openBrowser: false,   // 是否自动打开浏览器 (可选，默认false)
      }
    }) as any
  ],
})
