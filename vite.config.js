import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
    // Reads .env files in the project root. API_URL has no VITE_ prefix, so it is only
    // used by this config and is never included in the browser code.
    const env = loadEnv(mode, process.cwd(), '')
    const apiUrl = env.API_URL || 'http://localhost:4000'
    const tenant = (env.TENANT ?? '').trim().toLowerCase()
    const tenantName = (env.TENANT_NAME ?? '').trim()

    if (!/^[a-z0-9-]{1,63}$/.test(tenant)) {
        throw new Error(
            `TENANT is missing or not a valid slug (lowercase letters, digits and dashes). Got "${env.TENANT ?? ''}". ` +
            'Set TENANT=<slug> in .env.<mode> and run vite with --mode <mode>, or set the TENANT environment variable.'
        )
    }
    return {
        plugins: [vue()],
        resolve: {
            alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
        },
        define: {
            __TENANT__: JSON.stringify(tenant),
            __TENANT_NAME__: JSON.stringify(tenantName),
        },
        server: {
            proxy: {
                // Any request to /api/... is forwarded to the Node server
                '/api': { target: apiUrl, changeOrigin: true },
            },
        },
    }
})
