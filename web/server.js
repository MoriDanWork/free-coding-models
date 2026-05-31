/**
 * @file web/server.js
 * @description HTTP server for the free-coding-models Web Dashboard V2.
 *
 * Reuses the existing ping engine, model sources, and utility functions
 * from the CLI tool. Serves the dashboard HTML/CSS/JS and provides
 * API endpoints + SSE for real-time ping data.
 *
 * Endpoints:
 *   GET /              → Dashboard HTML
 *   GET /styles.css    → Dashboard styles
 *   GET /app.js        → Dashboard client JS
 *   GET /api/models    → All model metadata (JSON)
 *   GET /api/health    → Lightweight dashboard health probe
 *   GET /api/config    → Current config (sanitized — masked keys)
 *   GET /api/key/:prov → Reveal a provider's full API key
 *   GET /api/events    → SSE stream of live ping results
 *   POST /api/settings → Update API keys / provider toggles
 */

import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec } from 'node:child_process'
import { Server } from 'socket.io'

import { sources, MODELS } from '../sources.js'
import { loadConfig, getApiKey, saveConfig, isProviderEnabled } from '../src/core/config.js'
import { ping } from '../src/core/ping.js'
import {
  getAvg, getVerdict, getUptime, getP95, getJitter,
  getStabilityScore, TIER_ORDER
} from '../src/core/utils.js'
import { benchmarkModel } from '../src/core/benchmark.js'

// 📖 Benchmark constants (mirrors src/core/benchmark.js BENCHMARK_TIMEOUT_MS)
const BENCHMARK_TIMEOUT_MS = 20_000

// ─── Ping cadence (matches CLI src/tui/tui-state.js) ────────────────────────
const PING_MODE_INTERVALS = { speed: 2000, normal: 10000, slow: 30000, forced: 4000 }
const SPEED_MODE_DURATION_MS = 60_000
const IDLE_SLOW_AFTER_MS = 5 * 60_000
const PING_MODE_CYCLE = ['speed', 'normal', 'slow', 'forced']

let pingMode = 'speed'
let speedModeUntil = Date.now() + SPEED_MODE_DURATION_MS
let lastUserActivity = Date.now()
let activePingInterval = PING_MODE_INTERVALS.speed

function refreshPingMode() {
  const now = Date.now()
  // Speed → normal fallback
  if (pingMode === 'speed' && now >= speedModeUntil) {
    pingMode = 'normal'
    activePingInterval = PING_MODE_INTERVALS.normal
  }
  // Idle → slow
  if (pingMode !== 'slow' && (now - lastUserActivity) >= IDLE_SLOW_AFTER_MS) {
    pingMode = 'slow'
    activePingInterval = PING_MODE_INTERVALS.slow
  }
}

function noteUserActivity() { lastUserActivity = Date.now() }

function cyclePingMode() {
  const idx = PING_MODE_CYCLE.indexOf(pingMode)
  pingMode = PING_MODE_CYCLE[(idx + 1) % PING_MODE_CYCLE.length]
  activePingInterval = PING_MODE_INTERVALS[pingMode]
  if (pingMode === 'speed') speedModeUntil = Date.now() + SPEED_MODE_DURATION_MS
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const SERVER_SIGNATURE = 'free-coding-models-web'

// ─── State ───────────────────────────────────────────────────────────────────

let config = loadConfig()

// Build results array from MODELS (same shape as the TUI)
const results = MODELS.map(([modelId, label, tier, sweScore, ctx, providerKey], idx) => ({
  idx: idx + 1,
  modelId,
  label,
  tier,
  sweScore,
  ctx,
  providerKey,
  status: 'pending',
  pings: [],
  httpCode: null,
  origin: sources[providerKey]?.name || providerKey,
  url: sources[providerKey]?.url || null,
  cliOnly: sources[providerKey]?.cliOnly || false,
  zenOnly: sources[providerKey]?.zenOnly || false,
}))

// ─── Benchmark state ───────────────────────────────────────────────────────────
const benchmarkRunning = new Set()      // modelIds currently being benchmarked
const benchmarkResults = new Map()        // modelId → benchmark result object

// ─── Global benchmark state (Ctrl+U equivalent) ─────────────────────────────────
let globalBenchmarkRunning = false
let globalBenchmarkTotal = 0
let globalBenchmarkCompleted = 0

// ─── Socket.io clients ──────────────────────────────────────────────────────
let io = null

function broadcastUpdate() {
  if (!io) return
  io.emit('models:update', getModelsPayload())
}

let pingRound = 0
let pingLoopRunning = false
let nextPingAt = Date.now() + activePingInterval   // absolute timestamp of next ping

async function pingAllModels() {
  if (pingLoopRunning) return
  pingLoopRunning = true
  pingRound++
  const batchSize = 30
  // P2 fix: honor provider enabled flags — skip disabled providers
  const modelsToPing = results.filter(r =>
    !r.cliOnly && r.url && isProviderEnabled(config, r.providerKey)
  )

  for (let i = 0; i < modelsToPing.length; i += batchSize) {
    const batch = modelsToPing.slice(i, i + batchSize)
    const promises = batch.map(async (r) => {
      const apiKey = getApiKey(config, r.providerKey)
      try {
        const result = await ping(apiKey, r.modelId, r.providerKey, r.url)
        r.httpCode = result.code
        if (result.code === '200') {
          r.status = 'up'
          r.pings.push({ ms: result.ms, code: result.code })
        } else if (result.code === '401') {
          r.status = 'up'
          r.pings.push({ ms: result.ms, code: result.code })
        } else if (result.code === '429') {
          r.status = 'up'
          r.pings.push({ ms: result.ms, code: result.code })
        } else if (result.code === '000') {
          r.status = 'timeout'
        } else {
          r.status = 'down'
          r.pings.push({ ms: result.ms, code: result.code })
        }
        // Keep only last 60 pings
        if (r.pings.length > 60) r.pings = r.pings.slice(-60)
      } catch {
        r.status = 'timeout'
      }
    })
    await Promise.all(promises)
  }

  // Broadcast via Socket.IO
  broadcastUpdate()
  pingLoopRunning = false
}

function getModelsPayload() {
  return {
    pingMode,
    nextPingAt,
    isPinging: pingLoopRunning,
    globalBenchmarkRunning,
    globalBenchmarkTotal,
    globalBenchmarkCompleted,
    models: results.map(r => ({
    idx: r.idx,
    modelId: r.modelId,
    label: r.label,
    tier: r.tier,
    sweScore: r.sweScore,
    ctx: r.ctx,
    providerKey: r.providerKey,
    origin: r.origin,
    status: r.status,
    httpCode: r.httpCode,
    cliOnly: r.cliOnly,
    zenOnly: r.zenOnly,
    avg: getAvg(r),
    verdict: getVerdict(r),
    uptime: getUptime(r),
    p95: getP95(r),
    jitter: getJitter(r),
    stability: getStabilityScore(r),
    latestPing: r.pings.length > 0 ? r.pings[r.pings.length - 1].ms : null,
    latestCode: r.pings.length > 0 ? r.pings[r.pings.length - 1].code : null,
    pingHistory: r.pings.slice(-20).map(p => ({ ms: p.ms, code: p.code })),
    pingCount: r.pings.length,
    hasApiKey: !!getApiKey(config, r.providerKey),
    isBenchmarking: benchmarkRunning.has(r.modelId),
    benchmark: benchmarkResults.get(r.modelId) || null,
  }))}   // ← closes models array + wrapper object
}

function getConfigPayload() {
  // Sanitize — show which providers have keys, but not the actual keys
  const providers = {}
  for (const [key, src] of Object.entries(sources)) {
    const rawKey = getApiKey(config, key)
    providers[key] = {
      name: src.name,
      hasKey: !!rawKey,
      maskedKey: rawKey ? maskApiKey(rawKey) : null,
      enabled: isProviderEnabled(config, key),
      modelCount: src.models?.length || 0,
      cliOnly: src.cliOnly || false,
    }
  }
  return { providers, totalModels: MODELS.length }
}

function maskApiKey(key) {
  if (!key || typeof key !== 'string') return ''
  if (key.length <= 8) return '••••••••'
  return '••••••••' + key.slice(-4)
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

function serveFile(res, filename, contentType) {
  try {
    const content = readFileSync(join(__dirname, filename), 'utf8')
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' })
    res.end(content)
  } catch {
    res.writeHead(404)
    res.end('Not Found')
  }
}

function serveDistFile(res, pathname) {
  const filePath = join(__dirname, 'dist', pathname === '/' ? 'index.html' : pathname)
  if (!existsSync(filePath)) {
    serveFile(res, 'dist/index.html', 'text/html; charset=utf-8')
    return
  }
  const ext = extname(filePath)
  const ct = MIME_TYPES[ext] || 'application/octet-stream'
  try {
    const content = readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable' })
    res.end(content)
  } catch {
    res.writeHead(404)
    res.end('Not Found')
  }
}

function handleRequest(req, res) {
  res.setHeader('X-FCM-Server', SERVER_SIGNATURE)

  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  // ─── API: Reveal full key for a provider ───
  const keyMatch = url.pathname.match(/^\/api\/key\/(.+)$/)
  if (keyMatch) {
    const providerKey = decodeURIComponent(keyMatch[1])
    const rawKey = getApiKey(config, providerKey)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ key: rawKey || null }))
    return
  }

  switch (url.pathname) {
    case '/':
      serveDistFile(res, '/')
      break

    case '/styles.css':
    case '/app.js':
      serveDistFile(res, url.pathname)
      break

    case '/api/ping-mode':
      {
        const url = new URL(req.url, `http://${req.headers.host}`)
        const action = url.searchParams.get('action')
        if (action === 'cycle') cyclePingMode()
        else if (action === 'speed') { pingMode = 'speed'; speedModeUntil = Date.now() + SPEED_MODE_DURATION_MS; activePingInterval = PING_MODE_INTERVALS.speed }
        else if (action === 'normal') { pingMode = 'normal'; activePingInterval = PING_MODE_INTERVALS.normal }
        else if (action === 'slow') { pingMode = 'slow'; activePingInterval = PING_MODE_INTERVALS.slow }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ pingMode, interval: activePingInterval, nextPingAt }))
      }
      break

    case '/api/ping-timer':
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ nextPingAt, isPinging: pingLoopRunning }))
      break

    default:
      if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
        serveDistFile(res, url.pathname)
        break
      }

      if (!url.pathname.startsWith('/api/')) {
        res.writeHead(404)
        res.end('Not Found')
        break
      }

    case '/api/models':
      // Flat array for REST clients (legacy)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(getModelsPayload().models))
      break

    case '/api/health':
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, app: SERVER_SIGNATURE }))
      break

    case '/api/config':
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(getConfigPayload()))
      break

    case '/api/events':
      // SSE kept for /api/events (backward compat)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
      res.write(`data: ${JSON.stringify(getModelsPayload())}\n\n`)
      res.on('close', () => {})
      break

    case '/api/settings':
      if (req.method === 'POST') {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', () => {
          try {
            const settings = JSON.parse(body)
            if (settings.apiKeys) {
              for (const [key, value] of Object.entries(settings.apiKeys)) {
                if (value) config.apiKeys[key] = value
                else delete config.apiKeys[key]
              }
            }
            if (settings.providers) {
              for (const [key, value] of Object.entries(settings.providers)) {
                if (!config.providers[key]) config.providers[key] = {}
                config.providers[key].enabled = value.enabled !== false
              }
            }
            // P2 fix: catch saveConfig failures and report to client
            try {
              // Save config → activity
            noteUserActivity()
            saveConfig(config)
            } catch (saveErr) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: false, error: 'Failed to save config: ' + saveErr.message }))
              return
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true }))
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      } else {
        res.writeHead(405)
        res.end('Method Not Allowed')
      }
      break

    // ─── Benchmark a single model ───
    case '/api/benchmark':
      if (req.method === 'POST') {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', async () => {
          try {
            const { modelId, providerKey } = JSON.parse(body)
            const model = results.find(r => r.modelId === modelId && r.providerKey === providerKey)
            if (!model) {
              res.writeHead(404, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Model not found' }))
              return
            }
            if (benchmarkRunning.has(modelId)) {
              res.writeHead(409, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Benchmark already in progress for this model' }))
              return
            }
            const apiKey = getApiKey(config, providerKey)
            benchmarkRunning.add(modelId)
            // Broadcast running state
            broadcastUpdate()
            try {
              const result = await benchmarkModel({
                apiKey,
                modelId,
                providerKey,
                url: model.url,
                timeoutMs: BENCHMARK_TIMEOUT_MS,
              })
              benchmarkResults.set(modelId, result)
              broadcastUpdate()
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(result))
            } finally {
              benchmarkRunning.delete(modelId)
              broadcastUpdate()
            }
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      } else {
        res.writeHead(405)
        res.end('Method Not Allowed')
      }
      break

    // ─── Global AI Speed Benchmark (Ctrl+U equivalent) ───
    case '/api/global-benchmark':
      {
        // GET → return current status
        if (req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            running: globalBenchmarkRunning,
            total: globalBenchmarkTotal,
            completed: globalBenchmarkCompleted,
          }))
          break
        }
        // POST → start global benchmark
        if (req.method === 'POST') {
          if (globalBenchmarkRunning) {
            res.writeHead(409, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Global benchmark already running' }))
            break
          }
          // Use health priority to sort: up first (fast), timeout/down last (slow)
          const healthPriority = { up: 0, pending: 1, timeout: 2, noauth: 3, auth_error: 4, down: 5 }
          const modelsToBenchmark = [...results]
            .filter(r => !r.cliOnly && r.url)
            .sort((a, b) => {
              const hpA = healthPriority[a.status] ?? 6
              const hpB = healthPriority[b.status] ?? 6
              if (hpA !== hpB) return hpA - hpB
              const pingA = typeof a.pings?.[a.pings.length - 1]?.ms === 'number' ? a.pings[a.pings.length - 1].ms : 99999
              const pingB = typeof b.pings?.[b.pings.length - 1]?.ms === 'number' ? b.pings[b.pings.length - 1].ms : 99999
              return pingA - pingB
            })

          globalBenchmarkRunning = true
          globalBenchmarkTotal = modelsToBenchmark.length
          globalBenchmarkCompleted = 0
          broadcastUpdate()

          const tasks = modelsToBenchmark.map(model => async () => {
            const benchmarkKey = `${model.providerKey}/${model.modelId}`
            if (benchmarkRunning.has(benchmarkKey)) {
              globalBenchmarkCompleted++
              broadcastUpdate()
              return { skipped: true }
            }
            const apiKey = getApiKey(config, model.providerKey)
            benchmarkRunning.add(benchmarkKey)
            try {
              const result = await benchmarkModel({
                apiKey,
                modelId: model.modelId,
                providerKey: model.providerKey,
                url: model.url,
                timeoutMs: BENCHMARK_TIMEOUT_MS,
              })
              benchmarkResults.set(benchmarkKey, result)
            } catch (err) {
              benchmarkResults.set(benchmarkKey, {
                ok: false,
                code: 'ERR',
                totalMs: 0,
                error: err?.message || 'Benchmark failed',
              })
            } finally {
              benchmarkRunning.delete(benchmarkKey)
              globalBenchmarkCompleted++
              broadcastUpdate()
            }
          })

          // Run with concurrency=5 (same as TUI)
          runWithConcurrency(tasks, 5).then(() => {
            globalBenchmarkRunning = false
            globalBenchmarkTotal = 0
            globalBenchmarkCompleted = 0
            broadcastUpdate()
          })

          res.writeHead(202, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ started: true, total: globalBenchmarkTotal }))
          break
        }

        res.writeHead(405)
        res.end('Method Not Allowed')
        break
      }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function runWithConcurrency(tasks, concurrency) {
  return new Promise((resolve) => {
    let index = 0
    let active = 0
    let completed = 0
    const total = tasks.length

    function startNext() {
      if (index >= total) return
      const task = tasks[index++]
      active++
      task().then(() => {
        active--
        completed++
        if (completed === total) resolve()
        else startNext()
      })
      if (active < concurrency && index < total) startNext()
    }

    for (let i = 0; i < Math.min(concurrency, total); i++) startNext()
  })
}

function checkPortInUse(port) {
  return new Promise((resolve) => {
    const s = createServer()
    s.once('error', (err) => { if (err.code === 'EADDRINUSE') resolve(true); else resolve(false) })
    s.once('listening', () => { s.close(); resolve(false) })
    s.listen(port)
  })
}

export async function inspectExistingWebServer(port) {
  const inUse = await checkPortInUse(port)
  if (!inUse) return { inUse: false, isFcm: false }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 750)

  try {
    // 📖 Probe a tiny health route so we only reuse a port when the running
    // 📖 process is actually the free-coding-models dashboard, not any random app.
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    const payload = await response.json().catch(() => null)
    const signature = response.headers.get('x-fcm-server')
    return {
      inUse: true,
      isFcm: signature === SERVER_SIGNATURE || payload?.app === SERVER_SIGNATURE,
    }
  } catch {
    return { inUse: true, isFcm: false }
  } finally {
    clearTimeout(timeout)
  }
}

export async function findAvailablePort(startPort, maxAttempts = 20) {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (!(await checkPortInUse(port))) return port
  }
  throw new Error(`No free local port found between ${startPort} and ${startPort + maxAttempts - 1}`)
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start'
    : 'xdg-open'
  exec(`${cmd} "${url}"`, (err) => {
    if (err) console.log(`  💡 Open manually: ${url}`)
  })
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export async function startWebServer(port = 3333, { open = true, startPingLoop = true } = {}) {
  const portStatus = await inspectExistingWebServer(port)

  if (portStatus.inUse && portStatus.isFcm) {
    const url = `http://localhost:${port}`

    console.log()
    console.log(`  ⚡ free-coding-models Web Dashboard already running`)
    console.log(`  🌐 ${url}`)
    console.log()
    if (open) openBrowser(url)
    return null
  }

  let resolvedPort = port
  if (portStatus.inUse && !portStatus.isFcm) {
    resolvedPort = await findAvailablePort(port + 1)
    console.log()
    console.log(`  ⚠️ Port ${port} is already in use by another local app`)
    console.log(`  ↪ Starting free-coding-models Web Dashboard on port ${resolvedPort} instead`)
    console.log()
  }

  const url = `http://localhost:${resolvedPort}`

  const server = createServer(handleRequest)

  // Attach Socket.IO to the HTTP server
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })
  io.on('connection', (socket) => {
    // Send initial data immediately on connect
    socket.emit('models:update', getModelsPayload())
  })
  let pingLoopTimer = null

  server.listen(resolvedPort, () => {
    console.log()
    console.log(`  ⚡ free-coding-models Web Dashboard`)
    console.log(`  🌐 ${url}`)
    console.log(`  📊 Monitoring ${results.filter(r => !r.cliOnly).length} models across ${Object.keys(sources).length} providers`)
    console.log()
    console.log(`  Press Ctrl+C to stop`)
    console.log()
    if (open) openBrowser(url)
  })

  async function schedulePingLoop() {
    if (!server.listening) return
    refreshPingMode()
    noteUserActivity()
    // Set nextPingAt BEFORE the ping so the UI sees the deadline immediately
    nextPingAt = Date.now() + activePingInterval
    await pingAllModels()
    pingLoopTimer = setTimeout(schedulePingLoop, activePingInterval)
  }

  if (startPingLoop) schedulePingLoop()
  server.on('close', () => {
    if (pingLoopTimer) clearTimeout(pingLoopTimer)
  })

  return server
}
