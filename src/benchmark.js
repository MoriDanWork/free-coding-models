/**
 * @file benchmark.js
 * @description Real-answer benchmark for measuring model response speed and throughput.
 *
 * @details
 *   This module sends a single small chat completion to a model and measures:
 *   - Total wall-clock response time (ms)
 *   - Output tokens generated
 *   - Tokens per second (TPS)
 *
 *   🎯 Key features:
 *   - Provider-specific request building (reuses buildPingRequest from ping.js)
 *   - Async benchmark with timeout and abort controller
 *   - Prefers `usage.completion_tokens` from the API response
 *   - Falls back to character-length estimate when usage is missing
 *   - Returns structured success/failure objects for TUI consumption
 *
 *   → Functions:
 *   - `buildBenchmarkRequest`: Build provider-specific benchmark request
 *   - `benchmarkModel`: Run a single benchmark and return timing + token metrics
 *   - `formatBenchmarkLatency`: Format benchmark latency for the AI Latency TUI column
 *   - `formatBenchmarkTps`: Format benchmark throughput for the TPS TUI column
 *   - `formatBenchmarkResult`: Legacy combined formatter for compatibility
 *   - `estimateTokensFromText`: Fallback token estimator (clearly labeled)
 *
 *   📦 Dependencies:
 *   - ./ping.js: buildPingRequest, resolveCloudflareUrl
 *
 *   @see {@link ./ping.js} Provider-specific request building
 *   @see {@link ./render-table.js} AI Latency + TPS column rendering
 */

import { buildPingRequest, resolveCloudflareUrl } from './ping.js'

// 📖 BENCHMARK_PROMPT: A deterministic one-paragraph task that any model can answer.
// 📖 The longer target gives latency + TPS measurements enough generated tokens to be reliable.
export const BENCHMARK_PROMPT = 'Why is the sky blue? Answer in exactly one cohesive paragraph of 80 to 100 words. Do not use bullet points, headings, or multiple paragraphs.'

// 📖 BENCHMARK_MAX_TOKENS: Hard cap high enough for a real paragraph, but low enough
// 📖 to avoid accidental essays when benchmarking many models at once.
export const BENCHMARK_MAX_TOKENS = 140

// 📖 BENCHMARK_TEMPERATURE: Zero temperature for deterministic, reproducible results.
export const BENCHMARK_TEMPERATURE = 0

// 📖 BENCHMARK_TIMEOUT_MS: How long to wait before treating a benchmark as failed.
export const BENCHMARK_TIMEOUT_MS = 20_000

// 📖 estimateTokensFromText: Fallback token counter when the API does not return usage.
// 📖 Uses a simple heuristic: avg English token ≈ 4 chars. This is explicitly an ESTIMATE
// 📖 and is labeled as such everywhere it surfaces. Do not use for billing.
export function estimateTokensFromText(text) {
  if (!text || typeof text !== 'string') return 0
  return Math.ceil(text.length / 4)
}

// 📖 benchmarkSpinner: Shared tiny spinner for benchmark columns while a request runs.
function benchmarkSpinner(frame) {
  const spinIdx = frame % 10
  return ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'][spinIdx]
}

// 📖 formatBenchmarkLatency: Turn a raw benchmark result into the AI Latency column value.
// 📖 Success: "4.3s" / "12s". Error: compact error code. Empty: "—".
export function formatBenchmarkLatency(result, { running = false, frame = 0 } = {}) {
  if (running) return benchmarkSpinner(frame)
  if (!result) return '—'
  if (!result.ok) return result.code || 'ERR'

  const totalSeconds = result.totalMs / 1000
  return totalSeconds >= 10
    ? totalSeconds.toFixed(0) + 's'
    : totalSeconds.toFixed(1) + 's'
}

// 📖 formatBenchmarkTps: Turn a raw benchmark result into the TPS column value.
// 📖 Success is the rounded tokens/second number only because the header carries "TPS".
// 📖 Errors and empty state stay as a dim dash in the table to avoid duplicating codes.
export function formatBenchmarkTps(result, { running = false, frame = 0 } = {}) {
  if (running) return benchmarkSpinner(frame)
  if (!result || !result.ok) return '—'
  return String(Math.round(result.tokensPerSecond ?? 0))
}

// 📖 formatBenchmarkResult: legacy combined formatter retained for integrations/tests
// 📖 that still expect the old single-column "latency / TPS" string.
export function formatBenchmarkResult(result, options = {}) {
  if (options.running) return benchmarkSpinner(options.frame ?? 0)
  if (!result) return '—'
  if (!result.ok) return result.code || 'ERR'
  return `${formatBenchmarkLatency(result)} / ${formatBenchmarkTps(result)} TPS`
}

// 📖 buildBenchmarkRequest: Build provider-specific benchmark request.
// 📖 Reuses the ping module's request builder but swaps the payload for a real
// 📖 completion with temperature=0 and max_tokens=32.
export function buildBenchmarkRequest(apiKey, modelId, providerKey, url) {
  // 📖 ZAI models are stored as "zai/glm-..." in sources.js but the API expects just "glm-..."
  const apiModelId = providerKey === 'zai' ? modelId.replace(/^zai\//, '') : modelId

  if (providerKey === 'replicate') {
    const replicateHeaders = { 'Content-Type': 'application/json', Prefer: 'wait=4' }
    if (apiKey) replicateHeaders.Authorization = `Token ${apiKey}`
    return {
      url,
      headers: replicateHeaders,
      body: { version: modelId, input: { prompt: BENCHMARK_PROMPT, max_tokens: BENCHMARK_MAX_TOKENS } },
    }
  }

  if (providerKey === 'cloudflare') {
    const headers = { 'Content-Type': 'application/json' }
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`
    return {
      url: resolveCloudflareUrl(url),
      headers,
      body: {
        model: apiModelId,
        messages: [{ role: 'user', content: BENCHMARK_PROMPT }],
        max_tokens: BENCHMARK_MAX_TOKENS,
        temperature: BENCHMARK_TEMPERATURE,
      },
    }
  }

  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  if (providerKey === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/vava-nessa/free-coding-models'
    headers['X-Title'] = 'free-coding-models'
  }

  return {
    url,
    headers,
    body: {
      model: apiModelId,
      messages: [{ role: 'user', content: BENCHMARK_PROMPT }],
      max_tokens: BENCHMARK_MAX_TOKENS,
      temperature: BENCHMARK_TEMPERATURE,
    },
  }
}

// 📖 benchmarkModel: Send one real completion request and measure response speed.
// 📖
// 📖 Returns on success:
// 📖   {
// 📖     ok: true,
// 📖     totalMs: 4300,
// 📖     outputTokens: 56,
// 📖     tokensPerSecond: 13,
// 📖     answerPreview: "The sky is blue because..."
// 📖   }
// 📖
// 📖 Returns on failure:
// 📖   {
// 📖     ok: false,
// 📖     code: "TIMEOUT" | "ERR" | "401" | "429" | "UNSUPPORTED",
// 📖     totalMs: 15000,
// 📖     error: "Request timed out"
// 📖   }
export async function benchmarkModel({ apiKey, modelId, providerKey, url, timeoutMs = BENCHMARK_TIMEOUT_MS }) {
  // 📖 Guard: unsupported providers that don't do chat completions
  if (providerKey === 'rovo' || providerKey === 'gemini' || providerKey === 'opencode-zen') {
    return {
      ok: false,
      code: 'UNSUPPORTED',
      totalMs: 0,
      error: 'Provider does not support chat completions',
    }
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const t0 = performance.now()

  try {
    const req = buildBenchmarkRequest(apiKey, modelId, providerKey, url)
    const resp = await fetch(req.url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: req.headers,
      body: JSON.stringify(req.body),
    })

    const totalMs = Math.round(performance.now() - t0)

    // 📖 Parse response body regardless of HTTP status so we can extract partial data
    let bodyText = ''
    try {
      bodyText = await resp.text()
    } catch {}

    let data = null
    try {
      data = JSON.parse(bodyText)
    } catch {}

    // 📖 Non-2xx: return compact error code
    if (!resp.ok) {
      const code = String(resp.status)
      return {
        ok: false,
        code,
        totalMs,
        error: data?.error?.message || `HTTP ${resp.status}`,
      }
    }

    // 📖 Extract generated text from OpenAI-compatible response
    const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || ''
    const answerPreview = typeof content === 'string' ? content.slice(0, 60) : ''

    // 📖 Prefer usage.completion_tokens when available
    let outputTokens = 0
    if (data?.usage?.completion_tokens != null) {
      outputTokens = Number(data.usage.completion_tokens) || 0
    } else {
      // 📖 FALLBACK: estimate from character count when API omits usage
      outputTokens = estimateTokensFromText(content)
    }

    // 📖 Guard division by zero
    const seconds = totalMs / 1000
    const tokensPerSecond = seconds > 0 ? outputTokens / seconds : 0

    return {
      ok: true,
      totalMs,
      outputTokens,
      tokensPerSecond,
      answerPreview,
    }
  } catch (err) {
    const totalMs = Math.round(performance.now() - t0)
    const isTimeout = err.name === 'AbortError'
    return {
      ok: false,
      code: isTimeout ? 'TIMEOUT' : 'ERR',
      totalMs,
      error: isTimeout ? 'Request timed out' : (err.message || 'Network error'),
    }
  } finally {
    clearTimeout(timer)
  }
}
