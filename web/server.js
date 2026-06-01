/**
 * @file web/server.js
 * @description HTTP + Socket.IO/SSE server for the free-coding-models realtime Web Dashboard.
 *
 * @details
 *   📖 This server intentionally mirrors the TUI health loop instead of exposing a
 *   slow request/response snapshot. The browser gets per-model ping state, frequent
 *   updates while probes complete, and the same startup speed burst → normal → idle
 *   slow cadence used by the terminal UI.
 *
 *   Realtime transport strategy:
 *   - Socket.IO is the primary channel for the local web app.
 *   - `/api/events` keeps an SSE stream alive as a zero-dependency fallback.
 *   - `/api/models` remains a plain JSON endpoint for polling/fallback clients.
 *
 * @functions
 *   → startWebServer(port, options) — Start the dashboard server and realtime loops
 *   → inspectExistingWebServer(port) — Detect if a port already hosts this dashboard
 *   → findAvailablePort(startPort, maxAttempts) — Find a local fallback port
 *
 * @exports startWebServer, inspectExistingWebServer, findAvailablePort
 */

import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec } from 'node:child_process'
import { createRequire } from 'node:module'
import { Server } from 'socket.io'

// 📖 Resolve the local package version for /api/version — same trick the TUI uses.
const require = createRequire(import.meta.url)
const { version: LOCAL_VERSION } = require('../package.json')

import { sources, MODELS } from '../sources.js'
import { loadConfig, getApiKey, saveConfig, isProviderEnabled } from '../src/core/config.js'
import { ensureFavoritesConfig } from '../src/core/favorites.js'
import { ping } from '../src/core/ping.js'
import { loadChangelog } from '../src/core/changelog-loader.js'
import { checkForUpdateDetailed, checkForUpdate, runUpdate, fetchLastReleaseDate } from '../src/core/updater.js'
import { syncShellEnv, ensureShellRcSource, removeShellEnv } from '../src/core/shell-env.js'
import { cleanupLegacyProxyArtifacts } from '../src/core/legacy-proxy-cleanup.js'
import {
  getAvg, getVerdict, getUptime, getP95, getJitter,
  getStabilityScore,
} from '../src/core/utils.js'
import { benchmarkModel, BENCHMARK_TIMEOUT_MS } from '../src/core/benchmark.js'
import { getInstallTargetModes, installProviderEndpoints } from '../src/core/endpoint-installer.js'
import { isModelCompatibleWithTool } from '../src/core/tool-metadata.js'
import { sendUsageTelemetry } from '../src/core/telemetry.js'
import {
  TASK_TYPES,
  PRIORITY_TYPES,
  CONTEXT_BUDGETS,
  getTopRecommendations,
} from '../src/core/utils.js'
import {
  PING_MODE_INTERVALS,
  PING_MODE_CYCLE,
  SPEED_MODE_DURATION_MS,
  IDLE_SLOW_AFTER_MS,
} from '../src/tui/tui-state.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SERVER_SIGNATURE = 'free-coding-models-web'
const BROADCAST_THROTTLE_MS = 80
const MAX_PING_HISTORY = 60
const GLOBAL_BENCHMARK_CONCURRENCY = 5
const DEFAULT_WEB_PORT = 3333
const BODY_LIMIT_BYTES = 1024 * 1024

// ─── Mutable server state ───────────────────────────────────────────────────

let config = loadConfig()
let io = null
let pingLoopTimer = null
let broadcastTimer = null
let heartbeatTimer = null
let startedServer = null

const sseClients = new Set()

const runtime = {
  pingMode: 'speed',
  pingModeSource: 'startup',
  activePingInterval: PING_MODE_INTERVALS.speed,
  speedModeUntil: Date.now() + SPEED_MODE_DURATION_MS,
  lastUserActivityAt: Date.now(),
  resumeSpeedOnActivity: false,
  lastPingTime: Date.now(),
  nextPingAt: Date.now(),
  pendingPings: 0,
  pingRound: 0,
  globalBenchmarkRunning: false,
  globalBenchmarkTotal: 0,
  globalBenchmarkCompleted: 0,
  updateStatus: null,
}

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
  isPinging: false,
}))

const benchmarkRunning = new Set()
const benchmarkResults = new Map()

// ─── Shared state helpers ───────────────────────────────────────────────────

function benchmarkKey(providerKey, modelId) {
  return `${providerKey}/${modelId}`
}

function getResultKey(result) {
  return benchmarkKey(result.providerKey, result.modelId)
}

function getResult(providerKey, modelId) {
  return results.find((r) => r.providerKey === providerKey && r.modelId === modelId) || null
}

function noteUserActivity() {
  runtime.lastUserActivityAt = Date.now()
  if (runtime.pingMode === 'forced') return
  if (runtime.resumeSpeedOnActivity) setPingMode('speed', 'activity')
}

function setPingMode(nextMode, source = 'manual') {
  const mode = PING_MODE_INTERVALS[nextMode] ? nextMode : 'normal'
  runtime.pingMode = mode
  runtime.pingModeSource = source
  runtime.activePingInterval = PING_MODE_INTERVALS[mode]
  runtime.speedModeUntil = mode === 'speed' ? Date.now() + SPEED_MODE_DURATION_MS : null
  runtime.resumeSpeedOnActivity = source === 'idle'
  scheduleNextPing()
  broadcastUpdate({ immediate: true })
}

function cyclePingMode() {
  const idx = PING_MODE_CYCLE.indexOf(runtime.pingMode)
  setPingMode(PING_MODE_CYCLE[(idx + 1) % PING_MODE_CYCLE.length] || 'normal')
}

function refreshPingMode() {
  const now = Date.now()
  if (runtime.pingMode === 'forced') return

  if (runtime.speedModeUntil && now >= runtime.speedModeUntil) {
    setPingMode('normal', 'auto')
    return
  }

  if (now - runtime.lastUserActivityAt >= IDLE_SLOW_AFTER_MS) {
    if (runtime.pingMode !== 'slow' || runtime.pingModeSource !== 'idle') {
      setPingMode('slow', 'idle')
    } else {
      runtime.resumeSpeedOnActivity = true
    }
  }
}

function scheduleNextPing() {
  if (!startedServer?.listening) return
  clearTimeout(pingLoopTimer)
  refreshPingMode()
  const elapsed = Date.now() - runtime.lastPingTime
  const delay = Math.max(0, runtime.activePingInterval - elapsed)
  runtime.nextPingAt = Date.now() + delay
  pingLoopTimer = setTimeout(startPingCycle, delay)
}

function trimPingHistory(result) {
  if (result.pings.length > MAX_PING_HISTORY) result.pings = result.pings.slice(-MAX_PING_HISTORY)
}

function updateHealthFromPing(result, pingResult, hasApiKey) {
  const code = String(pingResult.code || 'ERR')
  result.httpCode = code

  // 📖 Match the TUI: every probe contributes to availability history. Average,
  // 📖 p95, and jitter still ignore non-measurable codes through src/core/utils.js.
  result.pings.push({ ms: pingResult.ms, code })
  trimPingHistory(result)

  if (code === '200') result.status = 'up'
  else if (code === '000') result.status = 'timeout'
  else if (code === '401' || code === '403') result.status = hasApiKey ? 'auth_error' : 'noauth'
  else result.status = 'down'
}

function updateHealthFromBenchmark(result, benchmarkResult) {
  if (!result || !benchmarkResult) return
  if (benchmarkResult.ok) {
    result.status = 'up'
    result.httpCode = '200'
    return
  }

  const code = String(benchmarkResult.code || 'ERR')
  if (code === 'TIMEOUT') result.status = 'timeout'
  else if (code === '401' || code === '403') result.status = getApiKey(config, result.providerKey) ? 'auth_error' : 'noauth'
  else if (code !== 'ERR' && code !== 'UNSUPPORTED') result.status = 'down'
  result.httpCode = code
}

async function pingModel(result) {
  if (!result || result.isPinging || result.cliOnly || !result.url || !isProviderEnabled(config, result.providerKey)) return

  result.isPinging = true
  runtime.pendingPings += 1
  broadcastUpdate()

  const apiKey = getApiKey(config, result.providerKey) ?? null
  try {
    const pingResult = await ping(apiKey, result.modelId, result.providerKey, result.url)
    updateHealthFromPing(result, pingResult, !!apiKey)
  } catch (err) {
    updateHealthFromPing(result, { code: '000', ms: null, error: err?.message || 'Ping failed' }, !!apiKey)
  } finally {
    result.isPinging = false
    runtime.pendingPings = Math.max(0, runtime.pendingPings - 1)
    broadcastUpdate()
  }
}

function startPingCycle() {
  if (!startedServer?.listening) return
  refreshPingMode()

  runtime.lastPingTime = Date.now()
  runtime.pingRound += 1
  runtime.nextPingAt = runtime.lastPingTime + runtime.activePingInterval

  const modelsToPing = results.filter((r) => !r.cliOnly && r.url && isProviderEnabled(config, r.providerKey))
  for (const result of modelsToPing) {
    void pingModel(result)
  }

  broadcastUpdate({ immediate: true })
  scheduleNextPing()
}

function serializeModel(result) {
  const key = getResultKey(result)
  const avg = getAvg(result)
  const p95 = getP95(result)
  const jitter = getJitter(result)
  const stability = getStabilityScore(result)
  const latest = result.pings.length > 0 ? result.pings[result.pings.length - 1] : null

  return {
    idx: result.idx,
    modelId: result.modelId,
    label: result.label,
    tier: result.tier,
    sweScore: result.sweScore,
    ctx: result.ctx,
    providerKey: result.providerKey,
    origin: result.origin,
    status: result.status,
    httpCode: result.httpCode,
    cliOnly: result.cliOnly,
    zenOnly: result.zenOnly,
    isPinging: result.isPinging,
    avg: Number.isFinite(avg) ? avg : null,
    verdict: getVerdict(result),
    uptime: getUptime(result),
    p95: Number.isFinite(p95) ? p95 : null,
    jitter: Number.isFinite(jitter) ? jitter : null,
    stability,
    latestPing: latest?.ms ?? null,
    latestCode: latest?.code ?? null,
    pingHistory: result.pings.slice(-20).map((p) => ({ ms: p.ms, code: p.code })),
    pingCount: result.pings.length,
    hasApiKey: !!getApiKey(config, result.providerKey),
    benchmarkKey: key,
    isBenchmarking: benchmarkRunning.has(key),
    benchmark: benchmarkResults.get(key) || null,
  }
}

function getModelsPayload() {
  return {
    pingMode: runtime.pingMode,
    pingModeSource: runtime.pingModeSource,
    pingInterval: runtime.activePingInterval,
    nextPingAt: runtime.nextPingAt,
    pendingPings: runtime.pendingPings,
    isPinging: runtime.pendingPings > 0,
    pingRound: runtime.pingRound,
    globalBenchmarkRunning: runtime.globalBenchmarkRunning,
    globalBenchmarkTotal: runtime.globalBenchmarkTotal,
    globalBenchmarkCompleted: runtime.globalBenchmarkCompleted,
    updateStatus: runtime.updateStatus,
    models: results.map(serializeModel),
  }
}

function getConfigPayload() {
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

function writeSsePayload(res, payload) {
  try {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  } catch {
    sseClients.delete(res)
  }
}

function broadcastNow() {
  const payload = getModelsPayload()
  if (io) io.emit('models:update', payload)
  for (const res of [...sseClients]) writeSsePayload(res, payload)
}

function broadcastUpdate({ immediate = false } = {}) {
  if (immediate) {
    clearTimeout(broadcastTimer)
    broadcastTimer = null
    broadcastNow()
    return
  }

  if (broadcastTimer) return
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null
    broadcastNow()
  }, BROADCAST_THROTTLE_MS)
}

// ─── HTTP helpers ───────────────────────────────────────────────────────────

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
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
    // 📖 SPA fallback: GETs to non-asset paths return index.html so the React
    // 📖 router can take over. Static assets (favicons, /assets/*, anything
    // 📖 with a known extension) must 404 — never serve HTML for a missing PNG.
    const hasExt = extname(pathname) !== ''
    if (hasExt || pathname.startsWith('/assets/') || pathname.startsWith('/favicons/')) {
      res.writeHead(404)
      res.end('Not Found')
      return
    }
    serveFile(res, 'dist/index.html', 'text/html; charset=utf-8')
    return
  }
  const ext = extname(filePath)
  const ct = MIME_TYPES[ext] || 'application/octet-stream'
  try {
    const content = readFileSync(filePath)
    res.writeHead(200, {
      'Content-Type': ct,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    })
    res.end(content)
  } catch {
    res.writeHead(404)
    res.end('Not Found')
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > BODY_LIMIT_BYTES) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!body.trim()) {
        resolve({})
        return
      }
      try { resolve(JSON.parse(body)) }
      catch (err) { reject(err) }
    })
    req.on('error', reject)
  })
}

function parseVisibleBenchmarkModels(body) {
  const rawModels = Array.isArray(body?.models) ? body.models : null
  if (!rawModels) return results.filter((r) => !r.cliOnly && r.url)

  const unique = new Map()
  for (const item of rawModels) {
    if (!item || typeof item !== 'object') continue
    const providerKey = typeof item.providerKey === 'string' ? item.providerKey : ''
    const modelId = typeof item.modelId === 'string' ? item.modelId : ''
    const result = getResult(providerKey, modelId)
    if (result && !result.cliOnly && result.url) unique.set(getResultKey(result), result)
  }
  return [...unique.values()]
}

async function runSingleBenchmark(result) {
  const key = getResultKey(result)
  if (benchmarkRunning.has(key)) return { skipped: true }

  benchmarkRunning.add(key)
  broadcastUpdate({ immediate: true })
  try {
    const benchmarkResult = await benchmarkModel({
      apiKey: getApiKey(config, result.providerKey) ?? null,
      modelId: result.modelId,
      providerKey: result.providerKey,
      url: result.url,
      timeoutMs: BENCHMARK_TIMEOUT_MS,
    })
    benchmarkResults.set(key, benchmarkResult)
    updateHealthFromBenchmark(result, benchmarkResult)
    return benchmarkResult
  } catch (err) {
    const fallback = {
      ok: false,
      code: 'ERR',
      totalMs: 0,
      error: err?.message || 'Benchmark failed',
      retries: 0,
    }
    benchmarkResults.set(key, fallback)
    updateHealthFromBenchmark(result, fallback)
    return fallback
  } finally {
    benchmarkRunning.delete(key)
    broadcastUpdate({ immediate: true })
  }
}

function runWithConcurrency(tasks, concurrency) {
  return new Promise((resolve) => {
    const resultsOut = new Array(tasks.length)
    let nextIndex = 0
    let active = 0
    let completed = 0

    function startNext() {
      while (active < concurrency && nextIndex < tasks.length) {
        const index = nextIndex++
        active += 1
        Promise.resolve(tasks[index]())
          .then((value) => { resultsOut[index] = value })
          .catch((err) => { resultsOut[index] = { error: err } })
          .finally(() => {
            active -= 1
            completed += 1
            if (completed >= tasks.length) resolve(resultsOut)
            else startNext()
          })
      }
      if (tasks.length === 0) resolve(resultsOut)
    }

    startNext()
  })
}

const TOOL_MODE_ORDER = getInstallTargetModes()
const TOOL_MODES = new Set(TOOL_MODE_ORDER)

function normalizeToolMode(mode) {
  return typeof mode === 'string' && TOOL_MODES.has(mode) ? mode : 'opencode'
}

function getPreferredToolMode() {
  return normalizeToolMode(config.settings?.preferredToolMode)
}

function persistPreferredToolMode(mode) {
  const normalized = normalizeToolMode(mode)
  if (!config.settings || typeof config.settings !== 'object') config.settings = {}
  config.settings.preferredToolMode = normalized
  const saveResult = saveConfig(config)
  return { mode: normalized, saveResult }
}

function getEndpointModel(providerKey, modelId) {
  const result = getResult(providerKey, modelId)
  if (!result) return null
  return {
    providerKey: result.providerKey,
    modelId: result.modelId,
    label: result.label,
    tier: result.tier,
    sweScore: result.sweScore,
    ctx: result.ctx,
    status: result.status,
  }
}

async function readDaemonPort() {
  try {
    const raw = readFileSync(`${process.env.HOME}/.free-coding-models-daemon.port`, 'utf8').trim()
    if (/^\d+$/.test(raw)) return Number(raw)
  } catch {}
  return null
}

async function syncFavoritesToRouter(selected) {
  if (config?.router?.enabled !== true) return
  const selKey = `${selected.providerKey}/${selected.modelId}`
  const favorites = Array.isArray(config.favorites) ? config.favorites : []
  const chain = [selKey, ...favorites.filter((entry) => entry !== selKey)]
  const models = chain.map((entry, index) => {
    const slashIdx = entry.indexOf('/')
    const provider = slashIdx >= 0 ? entry.slice(0, slashIdx) : '?'
    const model = slashIdx >= 0 ? entry.slice(slashIdx + 1) : entry
    return { provider, model, priority: index + 1 }
  })
  try {
    const port = await readDaemonPort()
    if (!port) return
    const baseUrl = `http://127.0.0.1:${port}`
    const setPayload = { name: 'fast-coding', models, created: new Date().toISOString() }
    await fetch(`${baseUrl}/sets/fast-coding`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setPayload),
    })
    await fetch(`${baseUrl}/sets/fast-coding/activate`, { method: 'POST' })
  } catch {}
}

async function installEndpointForMode(mode, model) {
  return installProviderEndpoints(config, model.providerKey, mode, {
    scope: 'selected',
    modelIds: [model.modelId],
  })
}

function buildRecommendReason(result, answers) {
  const bits = []
  if (result.tier) bits.push(`${result.tier} tier`)
  if (result.sweScore && result.sweScore !== '—') bits.push(`${result.sweScore} SWE`)
  if (result.ctx) bits.push(`${result.ctx} context`)
  if (result.status === 'up') bits.push('currently up')
  const priority = PRIORITY_TYPES[answers.priority]?.label || 'balanced'
  return `${bits.join(' · ') || 'Strong catalog fit'} for ${priority.toLowerCase()} priority.`
}

async function handleRequest(req, res) {
  res.setHeader('X-FCM-Server', SERVER_SIGNATURE)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host || `localhost:${DEFAULT_WEB_PORT}`}`)

  // 📖 M2: /api/key/:provider/test — matched here (above the switch) so the
  // 📖 M2 path doesn't conflict with the single-segment key reveal below.
  // 📖 Mirrors the TUI Settings `T` key behavior: parallel auth probe + chat
  // 📖 ping through the existing ping() helper.
  const keyTestMatch = url.pathname.match(/^\/api\/key\/([^/]+)\/test$/)
  if (keyTestMatch) {
    if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return }
    const providerKey = decodeURIComponent(keyTestMatch[1])
    if (!sources[providerKey]) { sendJson(res, 404, { error: 'Unknown provider' }); return }
    const apiKey = getApiKey(config, providerKey)
    if (!apiKey) { sendJson(res, 200, { outcome: 'missing_key', detail: `${providerKey} has no saved API key.` }); return }
    try {
      const result = await ping(apiKey, '', providerKey, sources[providerKey].url, { silent: true })
      if (result?.code === 200 || result?.code === '200') { sendJson(res, 200, { outcome: 'ok', code: 200 }); return }
      if (result?.code === 401 || result?.code === '401' || result?.code === 403 || result?.code === '403') {
        sendJson(res, 200, { outcome: 'auth_error', code: result.code }); return
      }
      sendJson(res, 200, { outcome: 'fail', code: result?.code ?? 'ERR', detail: 'Probe did not return a 2xx' })
    } catch (err) {
      sendJson(res, 200, { outcome: 'fail', detail: err.message || 'Probe failed' })
    }
    return
  }

  // 📖 Single-provider key reveal endpoint. The M2 /api/key/:provider/test
  // 📖 route is matched above (above the switch) and uses a stricter regex
  // 📖 (one segment, not two) so the two routes coexist cleanly.
  const keyMatch = url.pathname.match(/^\/api\/key\/([^/]+)$/)
  if (keyMatch) {
    const providerKey = decodeURIComponent(keyMatch[1])
    if (!sources[providerKey]) {
      sendJson(res, 404, { error: 'Unknown provider' })
      return
    }
    sendJson(res, 200, { key: getApiKey(config, providerKey) || null })
    return
  }

  try {
    switch (url.pathname) {
      case '/':
        serveDistFile(res, '/')
        return

      case '/styles.css':
      case '/app.js':
        serveDistFile(res, url.pathname)
        return

      case '/api/activity':
        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end('Method Not Allowed')
          return
        }
        noteUserActivity()
        sendJson(res, 200, { ok: true, pingMode: runtime.pingMode })
        return

      case '/api/ping-mode': {
        if (req.method !== 'POST' && req.method !== 'GET') {
          res.writeHead(405)
          res.end('Method Not Allowed')
          return
        }
        noteUserActivity()
        const action = url.searchParams.get('action')
        if (action === 'cycle') cyclePingMode()
        else if (PING_MODE_INTERVALS[action]) setPingMode(action, 'manual')
        sendJson(res, 200, {
          pingMode: runtime.pingMode,
          pingModeSource: runtime.pingModeSource,
          interval: runtime.activePingInterval,
          nextPingAt: runtime.nextPingAt,
        })
        return
      }

      case '/api/ping-timer':
        sendJson(res, 200, {
          nextPingAt: runtime.nextPingAt,
          isPinging: runtime.pendingPings > 0,
          pendingPings: runtime.pendingPings,
        })
        return

      case '/api/models':
        // 📖 Legacy REST contract: keep returning the flat model array.
        sendJson(res, 200, getModelsPayload().models)
        return

      case '/api/state':
        sendJson(res, 200, getModelsPayload())
        return

      case '/api/health':
        sendJson(res, 200, { ok: true, app: SERVER_SIGNATURE })
        return

      case '/api/config':
        sendJson(res, 200, getConfigPayload())
        return

      // ── M3: shared tool mode — same preferredToolMode setting as the TUI Z cycle ──
      case '/api/tool-mode': {
        if (req.method === 'GET') {
          sendJson(res, 200, { mode: getPreferredToolMode(), tools: TOOL_MODE_ORDER })
          return
        }
        if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return }
        const body = await readJsonBody(req)
        if (!TOOL_MODES.has(body?.mode)) { sendJson(res, 422, { error: 'Invalid tool mode' }); return }
        const { mode, saveResult } = persistPreferredToolMode(body.mode)
        if (!saveResult.success) { sendJson(res, 500, { error: saveResult.error || 'Failed to save tool mode' }); return }
        noteUserActivity()
        sendJson(res, 200, { mode })
        return
      }

      // ── M3: install selected model endpoint into a tool config, no process spawn ──
      case '/api/install-endpoint':
      case '/api/launch': {
        if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return }
        const body = await readJsonBody(req)
        const mode = normalizeToolMode(body?.toolMode || body?.mode || getPreferredToolMode())
        const model = getEndpointModel(body?.providerKey, body?.modelId)
        if (!model) { sendJson(res, 404, { error: 'Model not found' }); return }
        if (!isModelCompatibleWithTool(model.providerKey, mode)) {
          sendJson(res, 422, { error: 'Model is incompatible with selected tool', code: 'incompatible_model', mode, model })
          return
        }

        const { saveResult } = persistPreferredToolMode(mode)
        if (!saveResult.success) { sendJson(res, 500, { error: saveResult.error || 'Failed to persist tool mode' }); return }
        noteUserActivity()
        try {
          const installResult = await installEndpointForMode(mode, model)
          void syncFavoritesToRouter(model)
          void sendUsageTelemetry(config, { noTelemetry: false }, {
            event: 'app_action',
            mode,
            properties: {
              source: 'web',
              action_type: 'install_endpoint',
              tool_mode: mode,
              provider: model.providerKey,
              model_id: model.modelId,
              model_label: model.label,
              model_tier: model.tier,
            },
          })
          sendJson(res, 200, { configured: true, mode, model, installResult })
        } catch (err) {
          sendJson(res, 422, {
            error: err?.message || 'Failed to install endpoint',
            code: 'endpoint_install_failed',
            mode,
            model,
          })
        }
        return
      }

      // ── M3: Smart Recommend — wraps the same core scoring engine as the TUI ──
      case '/api/recommend': {
        if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return }
        const body = await readJsonBody(req)
        const answers = body?.answers || {}
        const taskType = answers.taskType
        const priority = answers.priority
        const contextBudget = answers.contextBudget
        if (!TASK_TYPES[taskType] || !PRIORITY_TYPES[priority] || !CONTEXT_BUDGETS[contextBudget]) {
          sendJson(res, 422, { error: 'Invalid recommendation answers' })
          return
        }
        const top3 = getTopRecommendations(results, taskType, priority, contextBudget, 3)
          .map(({ result, score }) => ({
            result: serializeModel(result),
            score,
            reason: buildRecommendReason(result, answers),
          }))
        void sendUsageTelemetry(config, { noTelemetry: false }, {
          event: 'app_action',
          mode: getPreferredToolMode(),
          properties: { source: 'web', action_type: 'smart_recommend', taskType, priority, contextBudget },
        })
        sendJson(res, 200, { top3, answers: { taskType, priority, contextBudget } })
        return
      }

      // ── M3: web telemetry mirror — never blocks UX and never exposes secrets ──
      case '/api/telemetry/event': {
        if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return }
        const body = await readJsonBody(req)
        const event = typeof body?.event === 'string' && body.event.trim() ? body.event.trim() : 'app_action'
        const properties = body?.properties && typeof body.properties === 'object' && !Array.isArray(body.properties)
          ? body.properties
          : {}
        void sendUsageTelemetry(config, { noTelemetry: false }, {
          event,
          mode: getPreferredToolMode(),
          properties: { ...properties, source: 'web' },
        })
        sendJson(res, 200, { ok: true })
        return
      }

      case '/api/events':
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        })
        writeSsePayload(res, getModelsPayload())
        sseClients.add(res)
        req.on('close', () => sseClients.delete(res))
        return

      case '/api/settings': {
        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end('Method Not Allowed')
          return
        }
        const settings = await readJsonBody(req)
        noteUserActivity()
        if (settings.apiKeys) {
          if (!config.apiKeys) config.apiKeys = {}
          for (const [key, value] of Object.entries(settings.apiKeys)) {
            if (value) config.apiKeys[key] = value
            else delete config.apiKeys[key]
          }
        }
        if (settings.providers) {
          if (!config.providers) config.providers = {}
          for (const [key, value] of Object.entries(settings.providers)) {
            if (!config.providers[key]) config.providers[key] = {}
            config.providers[key].enabled = value?.enabled !== false
          }
        }
        saveConfig(config)
        broadcastUpdate({ immediate: true })
        sendJson(res, 200, { success: true })
        return
      }

      // ── M1: /api/favorites — single source of truth for favorites, shared
      // ── with the TUI through ~/.free-coding-models.json. Read on load,
      // ── write on toggle/reorder/pinnedAndSticky changes.
      case '/api/favorites': {
        ensureFavoritesConfig(config)
        if (req.method === 'GET') {
          sendJson(res, 200, {
            favorites: config.favorites,
            pinnedAndSticky: Boolean(config.settings?.favoritesPinnedAndSticky),
          })
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end('Method Not Allowed')
          return
        }
        const body = await readJsonBody(req)
        noteUserActivity()

        if (Array.isArray(body.favorites)) {
          // 📖 Validate each entry is a non-empty string. Anything else is dropped
          // 📖 silently so a partial / malformed payload never breaks the config.
          const cleaned = body.favorites.filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
          config.favorites = Array.from(new Set(cleaned))
        }
        if (typeof body.pinnedAndSticky === 'boolean') {
          if (!config.settings || typeof config.settings !== 'object') config.settings = {}
          config.settings.favoritesPinnedAndSticky = body.pinnedAndSticky
        }

        const saveResult = saveConfig(config, { replaceFavorites: true })
        if (!saveResult.success) {
          sendJson(res, 500, { success: false, error: saveResult.error || 'Failed to persist favorites' })
          return
        }
        sendJson(res, 200, {
          success: true,
          favorites: config.favorites,
          pinnedAndSticky: Boolean(config.settings?.favoritesPinnedAndSticky),
        })
        return
      }

      case '/api/benchmark': {
        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end('Method Not Allowed')
          return
        }
        const body = await readJsonBody(req)
        const result = getResult(body.providerKey, body.modelId)
        if (!result) {
          sendJson(res, 404, { error: 'Model not found' })
          return
        }
        const key = getResultKey(result)
        if (benchmarkRunning.has(key)) {
          sendJson(res, 409, { error: 'Benchmark already in progress for this model' })
          return
        }
        noteUserActivity()
        const benchmarkResult = await runSingleBenchmark(result)
        sendJson(res, 200, benchmarkResult)
        return
      }

      case '/api/global-benchmark': {
        if (req.method === 'GET') {
          sendJson(res, 200, {
            running: runtime.globalBenchmarkRunning,
            total: runtime.globalBenchmarkTotal,
            completed: runtime.globalBenchmarkCompleted,
          })
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end('Method Not Allowed')
          return
        }
        if (runtime.globalBenchmarkRunning) {
          sendJson(res, 409, { error: 'Global benchmark already running' })
          return
        }

        const body = await readJsonBody(req)
        noteUserActivity()
        const healthPriority = { up: 0, pending: 1, timeout: 2, noauth: 3, auth_error: 4, down: 5 }
        const modelsToBenchmark = parseVisibleBenchmarkModels(body)
          .sort((a, b) => {
            const hpA = healthPriority[a.status] ?? 6
            const hpB = healthPriority[b.status] ?? 6
            if (hpA !== hpB) return hpA - hpB
            const pingA = typeof a.pings?.[a.pings.length - 1]?.ms === 'number' ? a.pings[a.pings.length - 1].ms : 99999
            const pingB = typeof b.pings?.[b.pings.length - 1]?.ms === 'number' ? b.pings[b.pings.length - 1].ms : 99999
            return pingA - pingB
          })

        runtime.globalBenchmarkRunning = true
        runtime.globalBenchmarkTotal = modelsToBenchmark.length
        runtime.globalBenchmarkCompleted = 0
        broadcastUpdate({ immediate: true })

        const tasks = modelsToBenchmark.map((model) => async () => {
          try {
            return await runSingleBenchmark(model)
          } finally {
            runtime.globalBenchmarkCompleted += 1
            broadcastUpdate({ immediate: true })
          }
        })

        void runWithConcurrency(tasks, GLOBAL_BENCHMARK_CONCURRENCY).finally(() => {
          runtime.globalBenchmarkRunning = false
          runtime.globalBenchmarkTotal = 0
          runtime.globalBenchmarkCompleted = 0
          broadcastUpdate({ immediate: true })
        })

        sendJson(res, 202, { started: true, total: modelsToBenchmark.length })
        return
      }

      // ── M2: /api/version — local vs latest + lastRelease date ─────────────
      case '/api/version': {
        try {
          const { latestVersion, error } = await checkForUpdateDetailed()
          const lastReleaseDate = await fetchLastReleaseDate()
          sendJson(res, 200, {
            local: LOCAL_VERSION,
            latest: latestVersion,
            lastReleaseDate,
            error: error || null,
          })
        } catch (err) {
          sendJson(res, 200, { local: LOCAL_VERSION, latest: null, lastReleaseDate: null, error: err.message || 'update check failed' })
        }
        return
      }

      // ── M2: /api/update/check — force a fresh registry check ──────────────
      case '/api/update/check': {
        if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return }
        const { latestVersion, error } = await checkForUpdateDetailed()
        sendJson(res, 200, { latest: latestVersion, error: error || null })
        return
      }

      // ── M2: /api/update/run — spawn the package manager upgrade ──────────
      case '/api/update/run': {
        if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return }
        const body = await readJsonBody(req)
        const target = typeof body?.version === 'string' && body.version ? body.version : null
        // 📖 Mirrors the TUI's `Shift+U` behavior: install + tell the user to
        // 📖 restart the server. We don't kill the in-process server from
        // 📖 here because that would interrupt every connected client.
        if (target) {
          runUpdate(target)
          sendJson(res, 200, { started: true, version: target, message: 'Update initiated — restart the dashboard to apply.' })
        } else {
          const { latestVersion } = await checkForUpdateDetailed()
          if (!latestVersion) { sendJson(res, 404, { error: 'No update available' }); return }
          runUpdate(latestVersion)
          sendJson(res, 200, { started: true, version: latestVersion, message: 'Update initiated — restart the dashboard to apply.' })
        }
        return
      }

      // ── M2: /api/changelog — parsed changelog directory ─────────────────
      case '/api/changelog': {
        sendJson(res, 200, loadChangelog())
        return
      }

      // ── M2: /api/settings/feature — single-feature toggle endpoint ───────
      case '/api/settings/feature': {
        if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return }
        const body = await readJsonBody(req)
        if (!body || typeof body !== 'object' || !body.feature) {
          sendJson(res, 400, { error: 'Missing "feature" key' }); return
        }
        if (!config.settings || typeof config.settings !== 'object') config.settings = {}
        const before = config.settings[body.feature]
        // 📖 Boolean features are toggled unless the caller passes an explicit value.
        if (body.value !== undefined) {
          // 📖 Explicit value (string / boolean / number) always wins. Used for
          // 📖 things like theme='auto'|'dark'|'light' where a string payload
          // 📖 is the right shape.
          config.settings[body.feature] = body.value
        } else if (typeof before === 'boolean') {
          // 📖 No explicit value → toggle for boolean features
          // 📖 (e.g. favoritesPinnedAndSticky).
          config.settings[body.feature] = !before
        } else {
          config.settings[body.feature] = true
        }
        const result = saveConfig(config)
        if (!result.success) { sendJson(res, 500, { error: result.error || 'Save failed' }); return }
        sendJson(res, 200, { success: true, feature: body.feature, value: config.settings[body.feature] })
        return
      }

      // ── M2: /api/shell-env/toggle — flip shell env export for the user ──
      case '/api/shell-env/toggle': {
        if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return }
        const body = await readJsonBody(req)
        const enable = typeof body?.enabled === 'boolean' ? body.enabled : undefined
        if (!config.settings || typeof config.settings !== 'object') config.settings = {}
        if (enable === undefined) {
          config.settings.shellEnvEnabled = !config.settings.shellEnvEnabled
        } else {
          config.settings.shellEnvEnabled = enable
        }
        if (config.settings.shellEnvEnabled) {
          syncShellEnv(config)
          ensureShellRcSource()
        } else {
          removeShellEnv()
        }
        saveConfig(config)
        sendJson(res, 200, { success: true, enabled: config.settings.shellEnvEnabled })
        return
      }

      // ── M2: /api/legacy-cleanup — run the discontinued-proxy cleanup ─────
      case '/api/legacy-cleanup': {
        if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return }
        const summary = cleanupLegacyProxyArtifacts()
        sendJson(res, 200, summary)
        return
      }

      default:
        // 📖 Serve Vite's /assets/* bundle, and our static favicon set that
        // 📖 Vite copies verbatim from web/public/ into web/dist/. The legacy
        // 📖 /favicon.ico lives at web/public/favicon.ico (root of public/).
        if (
          url.pathname.startsWith('/assets/')
          || url.pathname.startsWith('/favicons/')
          || url.pathname === '/favicon.ico'
          || url.pathname.endsWith('.js')
          || url.pathname.endsWith('.css')
          || url.pathname.endsWith('.png')
          || url.pathname.endsWith('.svg')
          || url.pathname.endsWith('.webmanifest')
          || url.pathname.endsWith('.xml')
          || url.pathname.endsWith('.ico')
        ) {
          serveDistFile(res, url.pathname)
          return
        }
        res.writeHead(404)
        res.end('Not Found')
    }
  } catch (err) {
    if (!res.writableEnded) sendJson(res, 500, { error: err?.message || 'Internal server error' })
  }
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

export async function startWebServer(port = DEFAULT_WEB_PORT, { open = true, startPingLoop = true, updateStatus = null } = {}) {
  runtime.updateStatus = updateStatus && updateStatus.allowedOutdated
    ? {
      latestVersion: updateStatus.latestVersion || null,
      allowedOutdated: true,
      warningMessage: updateStatus.warningMessage || null,
      failures: updateStatus.failures || 0,
    }
    : null

  const portStatus = await inspectExistingWebServer(port)

  if (portStatus.inUse && portStatus.isFcm) {
    const url = `http://localhost:${port}`
    console.log()
    console.log('  ⚡ free-coding-models Web Dashboard already running')
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
  const server = createServer((req, res) => void handleRequest(req, res))
  startedServer = server

  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  })

  io.on('connection', (socket) => {
    noteUserActivity()
    socket.emit('models:update', getModelsPayload())
    socket.on('client:activity', () => noteUserActivity())
    socket.on('models:refresh', () => socket.emit('models:update', getModelsPayload()))
  })

  server.listen(resolvedPort, () => {
    console.log()
    console.log('  ⚡ free-coding-models Web Dashboard')
    console.log(`  🌐 ${url}`)
    console.log(`  📊 Monitoring ${results.filter((r) => !r.cliOnly).length} models across ${Object.keys(sources).length} providers`)
    console.log()
    console.log('  Press Ctrl+C to stop')
    console.log()
    if (startPingLoop && !pingLoopTimer) {
      runtime.lastPingTime = Date.now()
      runtime.nextPingAt = runtime.lastPingTime + runtime.activePingInterval
      startPingCycle()
    }
    if (open) openBrowser(url)
  })

  server.on('close', () => {
    clearTimeout(pingLoopTimer)
    clearTimeout(broadcastTimer)
    clearInterval(heartbeatTimer)
    for (const res of [...sseClients]) {
      try { res.end() } catch {}
    }
    sseClients.clear()
    io?.close()
    io = null
    if (startedServer === server) startedServer = null
  })

  heartbeatTimer = setInterval(() => {
    refreshPingMode()
    for (const res of [...sseClients]) {
      try { res.write(': heartbeat\n\n') } catch { sseClients.delete(res) }
    }
  }, 15_000)

  return server
}
