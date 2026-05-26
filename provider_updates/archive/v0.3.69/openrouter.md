# OpenRouter — Validity Audit of :free Models

**Verification date:** 2026-05-26
**Source:** openrouter.ai/api/v1/models + openrouter.ai/models (free filter)

---

## Summary
| Stat | Count | Details |
|------|-------|---------|
| ✅ Confirmed live | 23 | Models still live as :free on OpenRouter |
| 🗑️ Deprecated — to remove | 8 | Free tiers removed (7) or never existed (1 Gemma typo) |
| ❌ Removed — to remove | 0 | (merged with deprecated) |
| ➕ New — to add | 3 | DeepSeek V4 Flash, Arcee Trinity, Baidu CoBuddy |
| 🔧 ID changed | 1 | Nemotron Nano 30B ID changed |
| 📏 Context changed | 7 | Multiple context length corrections |
| 📊 Score changed | 1 | MiniMax M2.5 SWE-bench: 74.0% → 80.2% |

---

## 🗑️ DEPRECATED Models / ❌ REMOVED

| # | Model ID | Display Name | Tier | Status | Action |
|---|----------|-------------|------|--------|--------|
| 1 | `tencent/hy3-preview:free` | Tencent HY3 Preview | S+ | 🗑️ Free tier removed | REMOVE |
| 2 | `inclusionai/ling-2.6-1t:free` | Ling 2.6 1T | S | 🗑️ Free tier removed | REMOVE |
| 3 | `google/gemma-3n-e2b-it:free` | Gemma 3n E2B | B+ | 🗑️ Free tier removed | REMOVE |
| 4 | `google/gemma-3-27b-it:free` | Gemma 3 27B | B | 🗑️ Free tier removed | REMOVE |
| 5 | `google/gemma-3-12b-it:free` | Gemma 3 12B | C | 🗑️ Free tier removed | REMOVE |
| 6 | `google/gemma-3n-e4b-it:free` | Gemma 3n E4B | C | 🗑️ Free tier removed | REMOVE |
| 7 | `google/gemma-3-4b-it:free` | Gemma 3 4B | C | 🗑️ Free tier removed | REMOVE |
| 8 | `google/gemma-4-31b-a4b-it:free` | Gemma 4 31B MoE | B | ❌ DOES NOT EXIST — data error | REMOVE |

**Important notes:**
- Google has removed all free tiers from the Gemma 3/3n series. Only Gemma 4 models remain free.
- `gemma-4-31b-a4b-it:free` never existed — the two free Gemma 4 models are `gemma-4-31b-it:free` (dense 31B) and `gemma-4-26b-a4b-it:free` (MoE 26B).

---

## ➕ New models to add

| # | Model ID | Display Name | Suggested Tier | SWE-bench | Context | Justification |
|---|----------|-------------|---------------|-----------|---------|---------------|
| 1 | `deepseek/deepseek-v4-flash:free` | DeepSeek V4 Flash | S | ~65%* | 1M | V4 MoE (284B/13B), 1M ctx, reasoning support |
| 2 | `arcee-ai/trinity-large-thinking:free` | Arcee Trinity Large | A | ~45%* | 262K | 106B MoE reasoning model |
| 3 | `baidu/cobuddy:free` | Baidu CoBuddy | B+ | ~40%* | 131K | Code generation, agentic workflows |

*SWE-bench scores estimated based on model size/architecture.*

---

## ✅ CONFIRMED live models

| # | Model ID | Display Name | Current Tier | API Context | Status | Notes |
|---|----------|-------------|-------------|-------------|--------|-------|
| 1 | `qwen/qwen3-coder:free` | Qwen3 Coder 480B | S+ | 262K | ✅ OK | |
| 2 | `minimax/minimax-m2.5:free` | MiniMax M2.5 | S+ | 205K | ✅ 📊 Score update | SWE-bench → 80.2% |
| 3 | `z-ai/glm-4.5-air:free` | GLM 4.5 Air | S+ | 131K | ✅ OK | |
| 4 | `poolside/laguna-m.1:free` | Poolside Laguna M.1 | S+ | **131K** ⚠️ | ✅ Context fix | Was 256K |
| 5 | `poolside/laguna-xs.2:free` | Poolside Laguna XS.2 | S+ | **131K** ⚠️ | ✅ Context fix | Was 256K |
| 6 | `qwen/qwen3-next-80b-a3b-instruct:free` | Qwen3 80B Instruct | S | **262K** ⚠️ | ✅ Context fix | Was 131K |
| 7 | `openai/gpt-oss-120b:free` | GPT OSS 120B | S | 131K | ✅ OK | |
| 8 | `nvidia/nemotron-3-super-120b-a12b:free` | Nemotron 3 Super | A+ | 262K | ✅ OK | |
| 9 | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | Nemotron 3 Omni | A+ | **256K** ⚠️ | ✅ Context fix | Was 128K |
| 10 | `nvidia/nemotron-nano-12b-v2-vl:free` | Nemotron Nano 12B VL | A | 128K | ✅ OK | |
| 11 | `openrouter/owl-alpha` | Owl Alpha | A+ | **1M** ⚠️ | ✅ Major upgrade | Was 128K |
| 12 | `nousresearch/hermes-3-llama-3.1-405b:free` | Hermes 3 405B | A | 131K | ✅ OK | |
| 13 | `openai/gpt-oss-20b:free` | GPT OSS 20B | A | 131K | ✅ OK | |
| 14 | `nvidia/nemotron-3-nano-30b-a3b:free` | Nemotron Nano 30B | A | **256K** ⚠️ | ✅ Context fix + ID change | See note |
| 15 | `cognitivecomputations/dolphin-mistral-24b-venice-edition:free` | Dolphin Mistral 24B | B+ | 33K | ✅ OK | |
| 16 | `google/gemma-4-31b-it:free` | Gemma 4 31B | A | 262K | ✅ OK | |
| 17 | `google/gemma-4-26b-a4b-it:free` | Gemma 4 26B MoE | A- | 262K | ✅ OK | |
| 18 | `meta-llama/llama-3.3-70b-instruct:free` | Llama 3.3 70B | A- | 131K | ✅ OK | |
| 19 | `meta-llama/llama-3.2-3b-instruct:free` | Llama 3.2 3B | B | 131K | ✅ OK | |
| 20 | `nvidia/nemotron-nano-9b-v2:free` | Nemotron Nano 9B | B+ | 128K | ✅ OK | |
| 21 | `openrouter/free` | OpenRouter Free | B | **200K** ⚠️ | ✅ Context upgrade | Was 128K |
| 22 | `liquid/lfm-2.5-1.2b-instruct:free` | LFM 2.5 1.2B | C | 32K | ✅ OK | |
| 23 | `liquid/lfm-2.5-1.2b-thinking:free` | LFM 2.5 Thinking | C | 32K | ✅ OK | |

### ⚠️ ID Change Alert

**`nvidia/nemotron-3-nano-30b-a3b:free` → `nvidia/nemotron-nano-30b-a3b:free`** — The :free variant ID dropped the "3". Old ID may still work via aliasing.

---

## 📏 Context length changes

| Model ID | Old Context | New Context |
|----------|-------------|-------------|
| `poolside/laguna-m.1:free` | 256K | 131K |
| `poolside/laguna-xs.2:free` | 256K | 131K |
| `qwen/qwen3-next-80b-a3b-instruct:free` | 131K | 262K |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | 128K | 256K |
| `nvidia/nemotron-3-nano-30b-a3b:free` | 128K | 256K |
| `openrouter/owl-alpha` | 128K | 1M |
| `openrouter/free` | 128K | 200K |

---

## 📊 Score changes

| Model ID | Old Score | New Score |
|----------|-----------|-----------|
| `minimax/minimax-m2.5:free` | 74.0% | 80.2% |

---

## 📝 Changes to apply in sources.js

### REMOVE (8 models)

```javascript
['tencent/hy3-preview:free',                   'Tencent HY3 Preview','S+', '-',     '262k'],
['inclusionai/ling-2.6-1t:free',              'Ling 2.6 1T',        'S',  '-',     '128k'],
['google/gemma-3n-e2b-it:free',               'Gemma 3n E2B',       'B+', '-',     '8k'],
['google/gemma-3-27b-it:free',                'Gemma 3 27B',        'B',  '22.0%', '131k'],
['google/gemma-3-12b-it:free',                'Gemma 3 12B',        'C',  '15.0%', '131k'],
['google/gemma-3n-e4b-it:free',               'Gemma 3n E4B',       'C',  '10.0%', '8k'],
['google/gemma-3-4b-it:free',                 'Gemma 3 4B',         'C',  '10.0%', '33k'],
['google/gemma-4-31b-a4b-it:free',            'Gemma 4 31B MoE',    'B',  '-',     '256k'],
```

### ADD (3 new models)

```javascript
['deepseek/deepseek-v4-flash:free',           'DeepSeek V4 Flash',  'S',  '-',     '1M'],
['arcee-ai/trinity-large-thinking:free',      'Arcee Trinity Large', 'A',  '-',     '262k'],
['baidu/cobuddy:free',                        'Baidu CoBuddy',       'B+', '-',     '131k'],
```

### MODIFY (context + score + ID updates)

```javascript
['poolside/laguna-m.1:free',                  'Poolside Laguna M.1', 'S+', '-',     '131k'],    // was 256k
['poolside/laguna-xs.2:free',                 'Poolside Laguna XS.2','S+', '-',     '131k'],    // was 256k
['qwen/qwen3-next-80b-a3b-instruct:free',     'Qwen3 80B Instruct', 'S',  '65.0%', '262k'],     // was 131k
['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', 'Nemotron 3 Omni', 'A+', '52.0%', '256k'], // was 128k
['nvidia/nemotron-nano-30b-a3b:free',         'Nemotron Nano 30B',  'A',  '43.0%', '256k'],       // was 128k, ID changed
['openrouter/owl-alpha',                      'Owl Alpha',          'A+', '-',     '1M'],         // was 128k
['openrouter/free',                           'OpenRouter Free',    'B',  '-',     '200k'],       // was 128k
['minimax/minimax-m2.5:free',                 'MiniMax M2.5',       'S+', '80.2%', '197k'],       // was 74.0%
```

---

## Sources

- **OpenRouter API** (`/api/v1/models`) — Full model catalog pulled 2026-05-26
- **OpenRouter website** (models?q=free) — Free models page