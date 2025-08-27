import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'main-entry.ts',
    plugin: 'packages/plugin/src/adapters/vite.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  external: [
    'vite',
    'vue',
    '@vue/devtools-kit',
    'vite-hot-client',
    'vite-dev-rpc',
    '@modelcontextprotocol/sdk',
    'zod',
    'express',
    'cors',
    'http',
    'path',
    'fs',
    'url',
    'child_process',
    'os',
    'util',
    'events',
    'stream',
    'net',
    'tty',
    'crypto'
  ],
  esbuildOptions: (options) => {
    options.banner = {
      js: '"use client"'
    }
  },
  bundle: true,
  splitting: false,
  onSuccess: async () => {
    console.log('✅ Build completed successfully!')
  }
})