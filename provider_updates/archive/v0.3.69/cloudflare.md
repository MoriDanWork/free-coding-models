# Cloudflare Workers AI — Model Validity Audit

**Verification date:** 2026-05-26
**Source:** https://developers.cloudflare.com/workers-ai/models/

---

## Summary
| Stat | Count | Details |
|------|-------|---------|
| ✅ Confirmed existing | 13 | All active |
| 🗑️ Does not exist — to remove | 1 | `gemma-4-31b-it` (never existed on CF) |
| ⚠️ Imminent deprecation | 1 | `llama-3.1-8b-instruct` (30/05/2026) + real context = 8k |
| ➕ New — to add | 1 | `deepseek-r1-distill-qwen-32b` |
| 📝 Config to correct | 2 | kimi-k2.6 (256k→262k), llama-3.1-8b (128k→8k) |

---

## 🗑️ Models to REMOVE

### `@cf/google/gemma-4-31b-it` — Gemma 4 31B
- **Status:** 404 — This model **never existed** on Cloudflare
- **Note:** The only Gemma 4 model on CF is `gemma-4-26b-a4b-it`
- **Action:** REMOVE immediately

---

## ⚠️ Imminent deprecation

### `@cf/meta/llama-3.1-8b-instruct` — Llama 3.1 8B
- **Deprecation:** 30/05/2026 (in 4 days)
- **Real CF context:** **7,968 tokens (~8k)** — NOT 128k!
- **Double problem:** (1) imminent deprecation, (2) context is ONLY 8k on CF
- **Action:** REMOVE

---

## ✅ CONFIRMED operational models

| Model ID | Display Name | CTX sources.js | CTX Cloudflare | Note |
|----------|-------------|---------------|---------------|------|
| `@cf/moonshotai/kimi-k2.6` | Kimi K2.6 | 256k | **262,144** | ⚠️ Correct → 262k |
| `@cf/zai-org/glm-4.7-flash` | GLM-4.7-Flash | 131k | 131,072 | ✅ |
| `@cf/openai/gpt-oss-120b` | GPT OSS 120B | 128k | 128,000 | ✅ |
| `@cf/qwen/qwq-32b` | QwQ 32B | 131k | ~131k | ✅ |
| `@cf/nvidia/nemotron-3-120b-a12b` | Nemotron 3 Super | 128k | ~128k | ✅ |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | Llama 4 Scout | 131k | ~131k | ✅ |
| `@cf/qwen/qwen3-30b-a3b-fp8` | Qwen3 30B MoE | 128k | ~128k | ✅ |
| `@cf/qwen/qwen2.5-coder-32b-instruct` | Qwen2.5 Coder 32B | 32k | ~32k | ✅ |
| `@cf/openai/gpt-oss-20b` | GPT OSS 20B | 128k | 128,000 | ✅ |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Llama 3.3 70B | 128k | ~128k | ✅ |
| `@cf/google/gemma-4-26b-a4b-it` | Gemma 4 26B MoE | 256k | 256,000 | ✅ |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | Mistral Small 3.1 | 128k | ~128k | ✅ |
| `@cf/ibm/granite-4.0-h-micro` | Granite 4.0 Micro | 128k | ~128k | ✅ |

---

## ➕ New models to add

| Model ID | Display Name | Suggested tier | CTX | Notes |
|----------|-------------|---------------|-----|-------|
| `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b` | DeepSeek R1 Distill 32B | A- | 80k | Reasoning model, 80k context |

---

## 📝 Changes to apply in sources.js

### REMOVE

```javascript
['@cf/google/gemma-4-31b-it',               'Gemma 4 31B',       'A',  '45.0%', '256k'],  // Does not exist on CF
['@cf/meta/llama-3.1-8b-instruct',          'Llama 3.1 8B',      'B',  '28.8%', '128k'],  // Deprecation 30/05 + ctx = 8k
```

### CORRECT

```javascript
// BEFORE
['@cf/moonshotai/kimi-k2.6', 'Kimi K2.6', 'S+', '76.8%', '256k'],
// AFTER
['@cf/moonshotai/kimi-k2.6', 'Kimi K2.6', 'S+', '76.8%', '262k'],
```

### ADD

```javascript
['@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', 'DeepSeek R1 Distill 32B', 'A-', '45.0%', '80k'],
```

---

## Sources

- **Cloudflare Workers AI Models**: [developers.cloudflare.com/workers-ai/models](https://developers.cloudflare.com/workers-ai/models/)
- Individual pages verified: kimi-k2.6, glm-4.7-flash, gpt-oss-120b, gemma-4-26b-a4b-it, llama-3.1-8b-instruct