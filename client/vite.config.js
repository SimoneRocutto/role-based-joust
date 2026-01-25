import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        port: 5173,
        host: true, // Listen on all addresses for mobile access
        proxy: {
            // Proxy API requests to backend
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            },
            // Proxy Socket.IO
            '/socket.io': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                ws: true
            }
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        // Optimize for mobile
        target: 'es2015',
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console.logs in production
                drop_debugger: true
            }
        }
    },
    // Optimize dependencies
    optimizeDeps: {
        include: ['react', 'react-dom', 'socket.io-client', 'zustand', 'howler']
    }
})