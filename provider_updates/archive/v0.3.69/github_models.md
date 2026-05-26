# GitHub Models — Model Validity Audit

**Verification date:** 2026-05-26
**Source:** models.github.ai/catalog/models (REST API)

---

## Summary
| Stat | Count | Details |
|------|-------|---------|
| ✅ Confirmed existing | 15 | All current models exist |
| 🗑️ Deprecated — to remove | 0 | None |
| ➕ New — to add | 11 | Free-tier models available (GPT-4o, Phi-4, Cohere, Jamba, etc.) |
| ⚠️ Config corrections | 1 | `ministral-3b` context 32k → 128k |

---

## ✅ CONFIRMED operational models

| # | Model ID | Display Name | Tier | SWE | CTX | Status |
|---|----------|-------------|------|-----|-----|--------|
| 1 | `openai/gpt-4.1` | GPT-4.1 | S+ | - | 1M | ✅ Free (high tier) |
| 2 | `openai/gpt-4.1-mini` | GPT-4.1 Mini | S | - | 1M | ✅ Free (low tier) |
| 3 | `openai/gpt-4.1-nano` | GPT-4.1 Nano | A | - | 1M | ✅ Free (low tier) |
| 4 | `deepseek/deepseek-v3-0324` | DeepSeek V3 0324 | S | 62.0% | 128k | ✅ Free (high tier) |
| 5 | `meta/meta-llama-3.1-405b-instruct` | Llama 3.1 405B | A | 44.0% | 128k | ✅ Free (high tier) |
| 6 | `meta/llama-4-maverick-17b-128e-instruct-fp8` | Llama 4 Maverick | S | 62.0% | 1M | ✅ Free (high tier) |
| 7 | `meta/llama-4-scout-17b-16e-instruct` | Llama 4 Scout | A | 44.0% | 10M | ✅ Free (high tier) |
| 8 | `meta/llama-3.3-70b-instruct` | Llama 3.3 70B | A- | 39.5% | 128k | ✅ Free (high tier) |
| 9 | `meta/llama-3.2-90b-vision-instruct` | Llama 3.2 90B Vision | A- | - | 128k | ✅ Free (high tier) |
| 10 | `meta/llama-3.2-11b-vision-instruct` | Llama 3.2 11B Vision | B | - | 128k | ✅ Free (low tier) |
| 11 | `meta/meta-llama-3.1-8b-instruct` | Llama 3.1 8B | B | 28.8% | 128k | ✅ Free (low tier) |
| 12 | `mistral-ai/codestral-2501` | Codestral 2501 | B+ | 34.0% | 256k | ✅ Free (high tier) |
| 13 | `mistral-ai/mistral-medium-2505` | Mistral Medium 2505 | A | 48.0% | 128k | ✅ Free (high tier) |
| 14 | `mistral-ai/mistral-small-2503` | Mistral Small 2503 | B+ | 30.0% | 128k | ✅ Free (high tier) |
| 15 | `mistral-ai/ministral-3b` | Ministral 3B | C | - | **128k** ⚠️ | ✅ Free (low tier) |

---

## ⚠️ Config corrections

| Model ID | Field | Old | New |
|----------|-------|-----|-----|
| `mistral-ai/ministral-3b` | context | 32k | **128k** (131,072 tokens) |

---

## ➕ New models to add (free-tier, relevant for coding)

### Free High Tier Models (8 new)

| Model ID | Display Name | Suggested Tier | CTX | Notes |
|----------|-------------|---------------|-----|-------|
| `openai/gpt-4o` | GPT-4o | S | 128k | Frontier multimodal, free on GitHub Models |
| `openai/gpt-4o-mini` | GPT-4o Mini | A | 128k | Economical version of GPT-4o |
| `microsoft/phi-4` | Phi-4 | A | 16k | 14B params, excellent reasoning |
| `microsoft/phi-4-mini` | Phi-4 Mini | B+ | 128k | Mini version of Phi-4 |
| `microsoft/phi-4-mini-reasoning` | Phi-4 Mini Reasoning | B+ | 128k | Reasoning variant |
| `cohere/command-r` | Cohere Command R | B+ | 128k | RAG-optimized |
| `cohere/command-r-plus` | Cohere Command R+ | A | 128k | Advanced version |
| `ai21/jamba-1.5-large` | Jamba 1.5 Large | B+ | 256k | MoE, long context |

### Free Low Tier Models (3 new)

| Model ID | Display Name | Suggested Tier | CTX | Notes |
|----------|-------------|---------------|-----|-------|
| `cohere/command-r7b` | Cohere Command R7B | B | 128k | Small RAG model |
| `mistral-ai/mistral-nemo` | Mistral Nemo | B+ | 128k | 12B params |
| `ai21/jamba-1.5-mini` | Jamba 1.5 Mini | B | 256k | Mini version |

### Premium Models (Copilot Pro+ required — not free)

15 premium models are available but require Copilot Pro+ (GPT-5 family, o1/o3/o4-mini, DeepSeek R1, Grok 3, etc.) — **not relevant for free-coding-models**.

---

## 📝 Changes to apply in sources.js

### FIX

```javascript
// BEFORE
['mistral-ai/ministral-3b',                     'Ministral 3B',        'C',  '-',     '32k'],
// AFTER
['mistral-ai/ministral-3b',                     'Ministral 3B',        'C',  '-',     '128k'],
```

### ADD (recommended)

```javascript
// ── S tier ──
['openai/gpt-4o',                               'GPT-4o',              'S',  '-',     '128k'],
// ── A tier ──
['openai/gpt-4o-mini',                          'GPT-4o Mini',         'A',  '-',     '128k'],
['cohere/command-r-plus',                       'Cohere Command R+',   'A',  '-',     '128k'],
// ── B+ tier ──
['microsoft/phi-4',                             'Phi-4',               'A',  '-',     '16k'],
['microsoft/phi-4-mini',                        'Phi-4 Mini',          'B+', '-',     '128k'],
['cohere/command-r',                            'Cohere Command R',    'B+', '-',     '128k'],
['ai21/jamba-1.5-large',                        'Jamba 1.5 Large',     'B+', '-',     '256k'],
['mistral-ai/mistral-nemo',                     'Mistral Nemo',        'B+', '-',     '128k'],
```

---

## Sources

- **GitHub Models API**: `https://models.github.ai/catalog/models` — 41 chat-completion models + 4 embedding models
- Accessed on 2026-05-26