import { defineConfig, loadEnv } from 'vite'
import mkcert from 'vite-plugin-mkcert'

const port = 5173

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  let publicDir = 'dev-public'

  if (isProduction) {
    publicDir = 'public'
  }

  const env = loadEnv(mode, process.cwd())

  const { VITE_INFINITY_URL: infinityUrl } = env

  if (!infinityUrl) {
    throw new Error(
      'VITE_INFINITY_URL is not defined in the environment variables'
    )
  }

  return {
    base: './',
    build: {
      target: 'esnext'
    },
    publicDir,
    server: {
      open: '/webapp3/',
      port,
      cors: true,
      proxy: {
        '/webapp3/branding/manifest.json': {
          target: 'https://localhost:' + port,
          secure: false,
          rewrite: (path) =>
            path.replace(
              /^\/webapp3\/branding\/manifest.json$/,
              '/manifest.json'
            )
        },
        '/webapp3': {
          target: infinityUrl,
          secure: false,
          rewrite: (path) => path.replace(/^\/webapp3\/(.*)$/, '/webapp3/$1')
        },
        '/api': {
          target: infinityUrl,
          secure: false
        }
      }
    },
    plugins: [mkcert()]
  }
})
