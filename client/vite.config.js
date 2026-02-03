import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Check if certificates exist (try both naming conventions)
const certPath = path.resolve(__dirname, '../certs/server.crt')
const keyPath = path.resolve(__dirname, '../certs/server.key')
const certPathAlt = path.resolve(__dirname, '../certs/cert.pem')
const keyPathAlt = path.resolve(__dirname, '../certs/key.pem')

let sslCert = null
let sslKey = null
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    sslCert = certPath
    sslKey = keyPath
} else if (fs.existsSync(certPathAlt) && fs.existsSync(keyPathAlt)) {
    sslCert = certPathAlt
    sslKey = keyPathAlt
}

const certsExist = sslCert && sslKey

// Backend runs HTTPS when certs exist (required for iOS)
// Port 4000 matches server/.env configuration
const backendPort = process.env.VITE_BACKEND_PORT || 4000
const backendProtocol = certsExist ? 'https' : 'http'
const backendTarget = `${backendProtocol}://localhost:${backendPort}`

if (certsExist) {
    console.log('🔒 HTTPS enabled - both client and backend use SSL certificates')
    console.log(`   Backend: ${backendTarget}`)
} else {
    console.warn('⚠️  No SSL certificates found in ../certs/')
    console.warn('   iOS accelerometer will NOT work without HTTPS')
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
        // Enable HTTPS if certificates exist (required for iOS accelerometer)
        https: certsExist ? {
            key: fs.readFileSync(sslKey),
            cert: fs.readFileSync(sslCert),
        } : undefined,
        proxy: {
            // Proxy API requests to backend
            '/api': {
                target: backendTarget,
                changeOrigin: true,
                secure: false, // Allow self-signed certificates
            },
            // Proxy Socket.IO
            '/socket.io': {
                target: backendTarget,
                changeOrigin: true,
                ws: true,
                secure: false, // Allow self-signed certificates
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