import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    root: '.',
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 3000,
        strictPort: true,
        allowedHosts: true,
        hmr: {
            clientPort: 443,
            protocol: 'wss',
        },
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8001',
                changeOrigin: true,
            },
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'framer-motion'],
    },
    build: {
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return
                    if (id.includes('framer-motion')) return 'motion'
                    if (id.includes('react-router-dom') || id.includes('@remix-run/router')) return 'router'
                    if (id.includes('lucide-react')) return 'icons'
                    if (id.includes('react') || id.includes('react-dom')) return 'react-core'
                    return 'vendor'
                },
            },
        },
    },
})
