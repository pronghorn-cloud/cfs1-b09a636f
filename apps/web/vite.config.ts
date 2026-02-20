import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Treat GoA web components as custom elements
          isCustomElement: (tag) => tag.startsWith('goab-') || tag.startsWith('goa-'),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Ensure session cookies are forwarded correctly through the proxy
        cookieDomainRewrite: '',
        // Forward all headers including Set-Cookie on redirect responses
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Ensure Set-Cookie headers pass through without domain restrictions
            const setCookie = proxyRes.headers['set-cookie']
            if (setCookie) {
              proxyRes.headers['set-cookie'] = setCookie.map((cookie: string) =>
                cookie.replace(/;\s*Domain=[^;]*/i, '')
              )
            }
          })
        },
      },
    },
  },
})
