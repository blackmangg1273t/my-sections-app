import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // يوجّه طلبات الأداة إلى سيرفر yt-dlp المحلي (npm run server)
      '/api': {
        target: `http://localhost:${process.env.YTDLP_PORT ?? 8787}`,
        changeOrigin: true,
        // مهم لبثّ التقدّم (SSE) بدون تخزين مؤقت
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache, no-transform'
          })
        },
      },
    },
  },
})
