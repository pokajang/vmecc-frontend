import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import autoprefixer from 'autoprefixer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'))

const readGitSha = () => {
  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

const createBuildMetadata = () => {
  const version = String(packageJson.version || '').trim() || '0.0.0'
  const builtAt = new Date().toISOString()
  const revision = readGitSha() || version
  const generatedBuildId = `${revision}-${builtAt.replace(/\D/g, '').slice(0, 14)}`
  const buildId = String(process.env.VITE_BUILD_ID || '').trim() || generatedBuildId

  return {
    app: 'vmecc-frontend',
    version,
    buildId,
    builtAt,
  }
}

const appVersionPlugin = (metadata) => ({
  name: 'vmecc-app-version',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const pathname = String(req.url || '').split('?')[0]
      if (pathname !== '/version.json') {
        next()
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
      res.end(`${JSON.stringify(metadata, null, 2)}\n`)
    })
  },
  generateBundle(_options, bundle) {
    const precacheAssets = new Set()
    const visitedChunks = new Set()
    const collectChunkAssets = (fileName) => {
      if (visitedChunks.has(fileName)) return
      visitedChunks.add(fileName)
      const output = bundle[fileName]
      if (!output) return
      precacheAssets.add(`/${fileName}`)
      if (output.type !== 'chunk') return
      output.imports.forEach(collectChunkAssets)
      output.viteMetadata?.importedCss?.forEach((asset) => precacheAssets.add(`/${asset}`))
      output.viteMetadata?.importedAssets?.forEach((asset) => precacheAssets.add(`/${asset}`))
    }
    Object.values(bundle)
      .filter((output) => output.type === 'chunk' && output.isEntry)
      .forEach((output) => collectChunkAssets(output.fileName))

    const serviceWorkerTemplate = readFileSync(
      path.resolve(__dirname, 'src/service-worker/service-worker.template.js'),
      'utf8',
    )
    const serviceWorkerSource = serviceWorkerTemplate
      .replaceAll('__VMECC_SW_BUILD_ID__', () => JSON.stringify(metadata.buildId))
      .replaceAll('__VMECC_SW_PRECACHE_ASSETS__', () => JSON.stringify([...precacheAssets].sort()))
    if (
      serviceWorkerSource.includes('__VMECC_SW_BUILD_ID__') ||
      serviceWorkerSource.includes('__VMECC_SW_PRECACHE_ASSETS__')
    ) {
      this.error('Unable to inject the VMECC build metadata into service-worker.js.')
    }
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: `${JSON.stringify(metadata, null, 2)}\n`,
    })
    this.emitFile({
      type: 'asset',
      fileName: 'service-worker.js',
      source: serviceWorkerSource,
    })
  },
})

export default defineConfig(() => {
  const buildMetadata = createBuildMetadata()

  return {
    base: '/',
    define: {
      __VMECC_APP_VERSION__: JSON.stringify(buildMetadata.version),
      __VMECC_BUILD_ID__: JSON.stringify(buildMetadata.buildId),
    },
    build: {
      outDir: String(process.env.VITE_OUT_DIR || '').trim() || 'build',
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    plugins: [react(), appVersionPlugin(buildMetadata)],
    test: {
      exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', 'tests/e2e/**'],
      fileParallelism: false,
      setupFiles: ['src/test/setupTests.js'],
      testTimeout: 15000,
    },
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3000,
      proxy: {
        // https://vitejs.dev/config/server-options.html
      },
    },
  }
})
