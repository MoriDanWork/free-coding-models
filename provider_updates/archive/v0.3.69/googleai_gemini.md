# Google AI Studio + Gemini CLI — Model Validity Audit

**Verification date:** 2026-05-26
**Source:** ai.google.dev/gemini-api/docs/models + ai.google.dev/gemini-api/docs/deprecations

---

## Summary
| Stat | Count | Details |
|------|-------|---------|
| ✅ Confirmed active | 4 | gemini-3.1-pro-preview, gemini-3-flash-preview, gemini-2.5-pro, gemini-2.5-flash |
| 🗑️ Deprecated — to be marked | 3 | gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite (shutdown Oct 16, 2026) |
| ❌ Removed — to be removed | 1 | gemini-3.1-flash-lite-preview (shut down May 25, 2026) |
| ➕ New — to be added | 2 | gemini-3.5-flash (Stable), gemini-3.1-flash-lite (Stable) |
| 🔄 Preview → GA | 1 | gemini-3.1-flash-lite-preview → gemini-3.1-flash-lite (May 7, 2026) |

---

## ❌ REMOVED Models (dead endpoint)

### 1. `gemini-3.1-flash-lite-preview`
| Field | Value |
|-------|-------|
| Current Tier | A+ |
| Shutdown Date | **May 25, 2026** |
| Official Replacement | `gemini-3.1-flash-lite` (Stable) |
| Action | **REMOVE** from sources.js — endpoint no longer responds |

---

## 🗑️ DEPRECATED Models (still active, scheduled shutdown Oct 16, 2026)

| Model ID | Official Replacement | Action |
|----------|---------------------|--------|
| `gemini-2.5-pro` | `gemini-3.1-pro-preview` | ⚠️ Keep with deprecated marker |
| `gemini-2.5-flash` | `gemini-3.5-flash` | ⚠️ Keep with deprecated marker |
| `gemini-2.5-flash-lite` | `gemini-3.1-flash-lite` | ⚠️ Keep with deprecated marker |

---

## ➕ New Models to Add

### 1. `gemini-3.5-flash` 🆕
| Field | Value |
|-------|-------|
| Status | **Stable** (GA since May 19, 2026 — Google I/O 2026) |
| Context | 1M |
| Benchmarks | 76.2% Terminal-Bench 2.1, 83.6% MCP Atlas |
| Capabilities | Text, Image, Video, Audio, PDF. Thinking, Code Execution, Function Calling, Search Grounding |
| Suggested Tier | **S+** — Beats 3.1 Pro on 11/15 coding/agent benchmarks |
| Action | **ADD** to both providers (googleai + gemini) |

### 2. `gemini-3.1-flash-lite` 🆕 (graduated from Preview)
| Field | Value |
|-------|-------|
| Status | **Stable** (GA since May 7, 2026) |
| Context | 1M |
| Price | $0.15 input / $0.75 output per M tokens |
| Suggested Tier | **A+** (same tier as the preview version) |
| Action | **ADD** — replaces the defunct preview |

---

## ✅ CONFIRMED Operational Models

| Model ID | Display Name | Type | Context | Status | Notes |
|----------|-------------|------|---------|--------|-------|
| `gemini-3.5-flash` | Gemini 3.5 Flash | **Stable** | 1M | ✅ 🆕 | Beats 3.1 Pro on coding |
| `gemini-3.1-pro-preview` | Gemini 3.1 Pro Preview | Preview | 1M | ✅ Active | 80.6% SWE-bench |
| `gemini-3-flash-preview` | Gemini 3 Flash Preview | Preview | 1M | ✅ Active | Recommended replacement: 3.5-flash |
| `gemini-3.1-flash-lite` | Gemini 3.1 Flash Lite | **Stable** | 1M | ✅ 🆕 | Graduated from preview |
| `gemini-2.5-pro` | Gemini 2.5 Pro | Stable | 1M | ⚠️ Deprecated | Shutdown Oct 16, 2026 |
| `gemini-2.5-flash` | Gemini 2.5 Flash | Stable | 1M | ⚠️ Deprecated | Shutdown Oct 16, 2026 |
| `gemini-2.5-flash-lite` | Gemini 2.5 Flash Lite | Stable | 1M | ⚠️ Deprecated | Shutdown Oct 16, 2026 |

---

## 📝 Changes to Apply in sources.js

### REMOVE (dead endpoint) — googleai AND gemini

```javascript
// REMOVE (shutdown May 25, 2026):
['gemini-3.1-flash-lite-preview',             'Gemini 3.1 Flash Lite Preview','A+', '55.0%', '1M'],
```

### ADD — googleai AND gemini

```javascript
// Tier S+ — new model
['gemini-3.5-flash',                          'Gemini 3.5 Flash',             'S+', '—',     '1M'],
// Tier A+ — graduated from preview
['gemini-3.1-flash-lite',                     'Gemini 3.1 Flash Lite',        'A+', '55.0%', '1M'],
```

### MARK as deprecated (still active, shutdown Oct 2026)

```javascript
// ⚠️ DEPRECATED — shutdown Oct 16, 2026
['gemini-2.5-pro',                            'Gemini 2.5 Pro',               'S+', '63.2%', '1M'],
['gemini-2.5-flash',                          'Gemini 2.5 Flash',             'A+', '50.0%', '1M'],
['gemini-2.5-flash-lite',                     'Gemini 2.5 Flash Lite',        'A',  '42.0%', '1M'],
```

### PROPOSED FINAL RESULT (googleai and gemini)

```javascript
// === Tier S+ — Frontier ===
['gemini-3.5-flash',                          'Gemini 3.5 Flash',             'S+', '—',     '1M'],  // 🆕 May 2026, Stable
['gemini-3.1-pro-preview',                    'Gemini 3.1 Pro Preview',      'S+', '78.0%', '1M'],
// === Tier S ===
['gemini-3-flash-preview',                    'Gemini 3 Flash Preview',      'S',  '65.0%', '1M'],
// === Tier A+ ===
['gemini-3.1-flash-lite',                     'Gemini 3.1 Flash Lite',        'A+', '55.0%', '1M'],  // 🆕 Stable May 2026
// ⚠️ DEPRECATED — shutdown Oct 16, 2026
['gemini-2.5-pro',                            'Gemini 2.5 Pro',               'S+', '63.2%', '1M'],
['gemini-2.5-flash',                          'Gemini 2.5 Flash',             'A+', '50.0%', '1M'],
['gemini-2.5-flash-lite',                     'Gemini 2.5 Flash Lite',        'A',  '42.0%', '1M'],
```

---

## Sources

- [Google AI Models](https://ai.google.dev/gemini-api/docs/models)
- [Google AI Deprecations](https://ai.google.dev/gemini-api/docs/deprecations)
- [Gemini 3.5 Flash Model Card](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash)