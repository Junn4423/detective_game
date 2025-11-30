import { defineConfig } from 'vite'
import type { Connect, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs/promises'

const createArchiveMiddleware = (casesDir: string): Connect.NextHandleFunction => {
  return async (req, res, next) => {
    if (!req.url?.startsWith('/__case-archive__')) {
      next()
      return
    }

    const url = new URL(req.url, 'http://localhost')
    const code = url.searchParams.get('code')
    const listMode = url.searchParams.get('list') === '1'

    if (req.method === 'GET') {
      if (listMode) {
        try {
          await fs.mkdir(casesDir, { recursive: true })
          const entries = await fs.readdir(casesDir, { withFileTypes: true })
          const summaries = (
            await Promise.all(
              entries
                .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
                .map(async (entry) => {
                  const filePath = path.resolve(casesDir, entry.name)
                  try {
                    const parsed = JSON.parse(await fs.readFile(filePath, 'utf8')) as {
                      caseCode?: string
                      generatedAt?: string
                      title?: string
                      bundle?: { caseTitle?: string }
                    }
                    return {
                      caseCode: parsed.caseCode ?? entry.name.replace(/\.json$/, ''),
                      generatedAt: parsed.generatedAt,
                      title: parsed.title ?? parsed.bundle?.caseTitle ?? 'Hồ sơ vô danh',
                    }
                  } catch (error) {
                    console.error('[case-archive] Failed to parse case file for list', entry.name, error)
                    return null
                  }
                }),
            )
          )
            .filter(Boolean)
            .sort((a, b) => {
              const aTime = a?.generatedAt ? Date.parse(a.generatedAt) : 0
              const bTime = b?.generatedAt ? Date.parse(b.generatedAt) : 0
              return bTime - aTime
            })

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ cases: summaries }))
        } catch (error) {
          console.error('[case-archive] Failed to list cases', error)
          res.statusCode = 500
          res.end('Failed to list cases')
        }
        return
      }

      if (!code) {
        res.statusCode = 400
        res.end('Missing case code')
        return
      }

      try {
        const safeName = code.replace(/[^a-zA-Z0-9_-]/g, '_') || code
        const filePath = path.resolve(casesDir, `${safeName}.json`)
        const content = await fs.readFile(filePath, 'utf8')
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(content)
      } catch (error) {
        console.error('[case-archive] Failed to read case', error)
        res.statusCode = 404
        res.end('Case not found')
      }
      return
    }

    if (req.method !== 'POST') {
      res.statusCode = 405
      res.end('Method not allowed')
      return
    }

    try {
      const chunks: Uint8Array[] = []
      await new Promise<void>((resolve, reject) => {
        req.on('data', (chunk) => chunks.push(chunk))
        req.on('end', () => resolve())
        req.on('error', (err) => reject(err))
      })

      const payloadText = Buffer.concat(chunks).toString('utf8')
      const payload = JSON.parse(payloadText || '{}') as {
        caseCode?: string
        bundle?: unknown
        generatedAt?: string
        title?: string
      }

      if (!payload.caseCode || !payload.bundle) {
        res.statusCode = 400
        res.end('Missing case payload')
        return
      }

      const safeName = payload.caseCode.replace(/[^a-zA-Z0-9_-]/g, '_') || `case_${Date.now()}`
      const filePath = path.resolve(casesDir, `${safeName}.json`)
      await fs.mkdir(casesDir, { recursive: true })
      const content = JSON.stringify({ ...payload }, null, 2)
      await fs.writeFile(filePath, content, 'utf8')

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: true, filePath }))
    } catch (error) {
      console.error('[case-archive] Failed to persist case', error)
      res.statusCode = 500
      res.end('Failed to write case file')
    }
  }
}

const caseArchivePlugin = () => {
  const casesDir = path.resolve(__dirname, 'src', 'cases')
  return {
    name: 'case-archive-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(createArchiveMiddleware(casesDir))
    },
    configurePreviewServer(server: { middlewares: { use: (fn: Connect.NextHandleFunction) => void } }) {
      server.middlewares.use(createArchiveMiddleware(casesDir))
    },
  }
}

export default defineConfig({
  plugins: [react(), caseArchivePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
