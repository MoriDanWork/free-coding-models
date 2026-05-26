# Groq — Model Validity Audit

**Verification date:** 2026-05-26
**Source:** console.groq.com / Groq API

---

## Summary
| Stat | Count | Details |
|------|--------|---------|
| ✅ Confirmed active | 8 | All listed models are still active |
| 🗑️ Deprecated — to remove | 0 | No models in the list are deprecated |
| ❌ 404 / Removed — to remove | 0 | No models in the list have been removed |
| ➕ New — to add | 0 | No relevant new chat LLM models |
| ⚠️ Config corrections | 4 | Context window changes (128k → 131k) |
| 📊 Score corrections | 1-2 | SWE-bench scores to verify/update |

---

## ✅ CONFIRMED operational models

| Model (sources.js) | Groq ID | Groq Status | Current Tier | Current Score | Current CTX | Actual CTX | Note |
|---|---|---|---|---|---|---|---|
| `llama-3.3-70b-versatile` | llama-3.3-70b-versatile | ✅ Production | A- | 39.5% | 128k | **131,072** | ⚠️ CTX to correct |
| `meta-llama/llama-4-scout-17b-16e-instruct` | meta-llama/llama-4-scout-17b-16e-instruct | ✅ **Preview** | A | 44.0% | 131k | 131,072 | Still in Preview |
| `llama-3.1-8b-instant` | llama-3.1-8b-instant | ✅ Production | B | 28.8% | 128k | **131,072** | ⚠️ CTX to correct |
| `openai/gpt-oss-120b` | openai/gpt-oss-120b | ✅ Production | S | 60.0% | 128k | **131,072** | ⚠️ CTX to correct; SWE-bench = 62.4% |
| `openai/gpt-oss-20b` | openai/gpt-oss-20b | ✅ Production | A | 42.0% | 128k | **131,072** | ⚠️ CTX to correct; SWE-bench = 60.7% |
| `qwen/qwen3-32b` | qwen/qwen3-32b | ✅ **Preview** | A+ | 50.0% | 131k | 131,072 | Still in Preview |
| `groq/compound` | groq/compound | ✅ Production System | A | 45.0% | 131k | 131,072 | GPT-OSS 120B + Llama 4 Scout |
| `groq/compound-mini` | groq/compound-mini | ✅ Production System | B+ | 32.0% | 131k | 131,072 | GPT-OSS 120B + Llama 3.3 70B |

---

## 🗑️ DEPRECATED / ❌ REMOVED models

**No models in the list are deprecated or removed.** All 8 models remain active on the Groq platform.

### Recently deprecated models (NOT in our list — for reference)

| Deprecated model | Shutdown date | Recommended replacement | Was in our list? |
|---|---|---|---|
| `moonshotai/kimi-k2-instruct-0905` | 2026-04-15 | `openai/gpt-oss-120b` | ❌ No |
| `meta-llama/llama-4-maverick-17b-128e-instruct` | 2026-03-09 | `openai/gpt-oss-120b` | ❌ No |
| `meta-llama/llama-guard-4-12b` | 2026-03-05 | `openai/gpt-oss-safeguard-20b` | ❌ No |
| `gemma2-9b-it` | 2025-10-08 | `llama-3.1-8b-instant` | ❌ No |
| `deepseek-r1-distill-llama-70b` | 2025-10-02 | `llama-3.3-70b-versatile` | ❌ No |
| `qwen-qwq-32b` | 2025-07-14 | `qwen/qwen3-32b` | ❌ No |

---

## ➕ New models to add

**No relevant new chat/coding LLM models.** The following models are available on Groq but are not relevant for free-coding-models:

| Model | Type | Relevance for coding | Note |
|---|---|---|---|
| `openai/gpt-oss-safeguard-20b` | Preview — Moderation/Safety | ❌ Not relevant | Safety model, not for coding |
| `meta-llama/llama-prompt-guard-2-22m` | Preview — Safety | ❌ Not relevant | 512 ctx, guard model |
| `meta-llama/llama-prompt-guard-2-86m` | Preview — Safety | ❌ Not relevant | 512 ctx, guard model |
| `canopylabs/orpheus-v1-english` | Production — TTS | ❌ Not relevant | Text-to-speech |
| `canopylabs/orpheus-arabic-saudi` | Preview — TTS | ❌ Not relevant | Arabic text-to-speech |
| `whisper-large-v3` | Production — ASR | ❌ Not relevant | Speech transcription |
| `whisper-large-v3-turbo` | Production — ASR | ❌ Not relevant | Speech transcription |

### Enterprise-only models (not available on the free plan)

| Model | Note |
|---|---|
| `minimax-m2.5` | Enterprise only, not on free tier |
| `qwen3-vl-32b` | Enterprise only, not on free tier |

---

## 📝 Changes to apply in sources.js

### 1. Context window corrections (128k → 131k)

All Groq models have a context window of 131,072 tokens (i.e. 131K). Four entries incorrectly show '128k'.

```javascript
// ❌ BEFORE (current)
['llama-3.3-70b-versatile',              'Llama 3.3 70B',      'A-', '39.5%', '128k'],
['llama-3.1-8b-instant',                 'Llama 3.1 8B',       'B',  '28.8%', '128k'],
['openai/gpt-oss-120b',                  'GPT OSS 120B',       'S',  '60.0%', '128k'],
['openai/gpt-oss-20b',                   'GPT OSS 20B',        'A',  '42.0%', '128k'],

// ✅ AFTER (corrected)
['llama-3.3-70b-versatile',              'Llama 3.3 70B',      'A-', '39.5%', '131k'],
['llama-3.1-8b-instant',                 'Llama 3.1 8B',       'B',  '28.8%', '131k'],
['openai/gpt-oss-120b',                  'GPT OSS 120B',       'S',  '60.0%', '131k'],
['openai/gpt-oss-20b',                   'GPT OSS 20B',        'A',  '42.0%', '131k'],
```

### 2. SWE-bench scores — Recommended verification

Official SWE-bench Verified scores from Groq model pages:

| Model | Current score (sources.js) | Official Groq score | Recommended action |
|---|---|---|---|
| `openai/gpt-oss-120b` | 60.0% | **62.4%** (SWE-Bench Verified) | ⚠️ Verify and potentially update to 62.4% |
| `openai/gpt-oss-20b` | 42.0% | **60.7%** (SWE-Bench Verified) | ⚠️ Significant gap — investigate and update |
| `qwen/qwen3-32b` | 50.0% | **65.7%** (LiveCodeBench, not SWE-bench) | Note: different benchmark |

> **⚠️ Important note on scores**: Scores in `sources.js` may come from different benchmarks or have been measured at different times. The project must decide whether these scores should be updated with Groq's official benchmarks. The gap for GPT-OSS 20B (42.0% vs 60.7%) is particularly notable.

### 3. No deletions needed

No models in the list have been deprecated or removed. **No rows to remove.**

### 4. No additions needed

No new free coding/chat LLM models have been added to the Groq platform since the last update.

---

## 📋 Technical details per model (from console.groq.com)

### Production Models

| Model ID | Speed | Price (in/out per 1M) | CTX | Max Output | Status |
|---|---|---|---|---|---|
| `llama-3.1-8b-instant` | 560 tps | $0.05 / $0.08 | 131,072 | 131,072 | Production |
| `llama-3.3-70b-versatile` | 280 tps | $0.59 / $0.79 | 131,072 | 32,768 | Production |
| `openai/gpt-oss-120b` | 500 tps | $0.15 / $0.60 | 131,072 | 65,536 | Production |
| `openai/gpt-oss-20b` | 1000 tps | $0.075 / $0.30 | 131,072 | 65,536 | Production |

### Production Systems

| Model ID | Speed | CTX | Max Output | Underlying Models | Status |
|---|---|---|---|---|---|
| `groq/compound` | ~450 tps | 131,072 | 8,192 | GPT-OSS 120B + Llama 4 Scout | Production System |
| `groq/compound-mini` | ~450 tps | 131,072 | 8,192 | GPT-OSS 120B + Llama 3.3 70B | Production System |

### Preview Models (text LLM)

| Model ID | Speed | Price (in/out per 1M) | CTX | Max Output | Status |
|---|---|---|---|---|---|
| `meta-llama/llama-4-scout-17b-16e-instruct` | 750 tps | $0.11 / $0.34 | 131,072 | 8,192 | ⚠️ Preview |
| `qwen/qwen3-32b` | 400 tps | $0.29 / $0.59 | 131,072 | 40,960 | ⚠️ Preview |

---

## 🔗 Notable changes on the Groq platform

1. **Kimi K2 deprecated** — `moonshotai/kimi-k2-instruct-0905` shut down on April 15, 2026
2. **Llama 4 Maverick deprecated** — `meta-llama/llama-4-maverick-17b-128e-instruct` shut down on March 9, 2026
3. **Groq Compound** is now a production system — GPT-OSS 120B + Llama 4 Scout with web search, code execution, browser automation
4. **Groq Compound Mini** — GPT-OSS 120B + Llama 3.3 70B, 3× faster than Compound

---

## Sources

- **Supported Groq models**: [console.groq.com/docs/models](https://console.groq.com/docs/models)
- **Groq deprecations**: [console.groq.com/docs/deprecations](https://console.groq.com/docs/deprecations)
- **Groq pricing**: [groq.com/pricing](https://groq.com/pricing)