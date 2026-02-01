import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Check if HTTPS is enabled and certificates exist
const certPath = path.resolve(__dirname, '../certs/server.crt')
const keyPath = path.resolve(__dirname, '../certs/server.key')
const certsExist = fs.existsSync(certPath) && fs.existsSync(keyPath)
const useHttps = process.env.USE_HTTPS === 'true' && certsExist

// Backend always runs HTTP - Vite proxy bridges HTTPS client to HTTP backend
// Port 4000 matches server/.env configuration
const backendTarget = 'http://localhost:4000'

if (useHttps) {
    console.log('🔒 HTTPS enabled for client - using self-signed certificates')
    console.log('   Backend runs HTTP, Vite proxy handles the bridge')
} else if (process.env.USE_HTTPS === 'true' && !certsExist) {
    console.warn('⚠️  USE_HTTPS=true but certificates not found in ../certs/')
}

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
        // Enable HTTPS if certificates exist
        https: useHttps ? {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        } : undefined,
        proxy: {
            // Proxy API requests to backend (HTTP)
            '/api': {
                target: backendTarget,
                changeOrigin: true,
            },
            // Proxy Socket.IO (HTTP)
            '/socket.io': {
                target: backendTarget,
                changeOrigin: true,
                ws: true,
                // Suppress expected proxy errors (EPIPE/ECONNRESET) when
                // sockets close during normal page teardown or reconnection
                configure: (proxy) => {
                    proxy.on('error', (err, _req, _res) => {
                        if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return;
                        console.error('[vite] ws proxy error:', err.message);
                    });
                },
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