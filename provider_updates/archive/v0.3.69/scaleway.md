# Scaleway — Model Validity Audit

**Verification date:** 2026-05-26
**Source:** https://www.scaleway.com/en/docs/generative-apis/reference-content/supported-models/

---

## Summary
| Stat | Count | Details |
|------|-------|---------|
| ✅ Confirmed active | 10 | All models are still in the catalog |
| 🗑️ Deprecated — to remove | 0 | None of the 10 models are EOL |
| ❌ Removed — to remove | 0 | No models removed |
| ⚠️ Non-Serverless | 1 | `mistral-large-3-675b` — Dedicated only |
| ➕ New — to add | 1 | `pixtral-12b-2409` (Vision, Serverless) |
| 📝 Context window errors | 7 | Half of the context windows are incorrect |

---

## ✅ CONFIRMED operational models (Serverless)

| # | Model ID | Display Name | Tier | ctx sources.js | ctx Scaleway | Serverless? | Note |
|---|---|---|---|---|---|---|---|
| 1 | `devstral-2-123b-instruct-2512` | Devstral 2 123B | S+ | 256k | **200k** | ✅ | ⚠️ ctx |
| 2 | `qwen3.5-397b-a17b` | Qwen3.5 400B VLM | S | 250k | 250k | ✅ | ✅ OK |
| 3 | `mistral/mistral-large-3-675b-instruct-2512` | Mistral Large 675B | A+ | 250k | 250k | ❌ Dedicated | ⚠️ |
| 4 | `qwen3-235b-a22b-instruct-2507` | Qwen3 235B | S+ | 128k | **250k** | ✅ | ⚠️ ctx |
| 5 | `gpt-oss-120b` | GPT OSS 120B | S | 131k | **128k** | ✅ | ⚠️ ctx |
| 6 | `qwen3-coder-30b-a3b-instruct` | Qwen3 Coder 30B | A+ | 32k | **128k** | ✅ | ⚠️ ctx |
| 7 | `holo2-30b-a3b` | Holo2 30B | A+ | 131k | **22k** | ✅ | ⚠️ ctx |
| 8 | `llama-3.3-70b-instruct` | Llama 3.3 70B | A- | 128k | **100k** | ✅ | ⚠️ ctx |
| 9 | `mistral-small-3.2-24b-instruct-2506` | Mistral Small 3.2 | B+ | 128k | 128k | ✅ | ✅ OK |
| 10 | `gemma-3-27b-it` | Gemma 3 27B | B | 128k | **40k** | ✅ | ⚠️ ctx |

---

## 📝 Context window corrections

| Model ID | sources.js | Scaleway doc | Correct value |
|---|---|---|---|
| `devstral-2-123b-instruct-2512` | 256k | 200k | **200k** |
| `qwen3-235b-a22b-instruct-2507` | 128k | 250k | **250k** |
| `gpt-oss-120b` | 131k | 128k | **128k** |
| `qwen3-coder-30b-a3b-instruct` | 32k | 128k | **128k** |
| `holo2-30b-a3b` | 131k | 22k | **22k** |
| `llama-3.3-70b-instruct` | 128k | 100k | **100k** |
| `gemma-3-27b-it` | 128k | 40k | **40k** |

---

## ➕ New models to add (Serverless)

| Model ID | Display Name | Type | Context | Suggested tier | Note |
|---|---|---|---|---|---|
| `pixtral-12b-2409` | Pixtral 12B | Vision-Language | 128k | B | Vision model, marginally relevant for coding |

---

## ⚠️ Model NOT available in Serverless

| Model ID | Status | Recommended action |
|---|---|---|
| `mistral/mistral-large-3-675b-instruct-2512` | **Dedicated only** | Consider removing from Scaleway provider or annotating `dedicated: true` |

---

## 📝 Changes to apply in sources.js

### Context window CORRECTIONS

```javascript
// BEFORE
['devstral-2-123b-instruct-2512',   'Devstral 2 123B',   'S+', '72.2%', '256k'],
['qwen3-235b-a22b-instruct-2507',   'Qwen3 235B',        'S+', '70.0%', '128k'],
['gpt-oss-120b',                    'GPT OSS 120B',      'S',  '60.0%', '131k'],
['qwen3-coder-30b-a3b-instruct',    'Qwen3 Coder 30B',   'A+', '55.0%', '32k'],
['holo2-30b-a3b',                   'Holo2 30B',         'A+', '52.0%', '131k'],
['llama-3.3-70b-instruct',          'Llama 3.3 70B',     'A-', '39.5%', '128k'],
['gemma-3-27b-it',                  'Gemma 3 27B',       'B',  '22.0%', '128k'],

// AFTER
['devstral-2-123b-instruct-2512',   'Devstral 2 123B',   'S+', '72.2%', '200k'],
['qwen3-235b-a22b-instruct-2507',   'Qwen3 235B',        'S+', '70.0%', '250k'],
['gpt-oss-120b',                    'GPT OSS 120B',      'S',  '60.0%', '128k'],
['qwen3-coder-30b-a3b-instruct',    'Qwen3 Coder 30B',   'A+', '55.0%', '128k'],
['holo2-30b-a3b',                   'Holo2 30B',         'A+', '52.0%', '22k'],
['llama-3.3-70b-instruct',          'Llama 3.3 70B',     'A-', '39.5%', '100k'],
['gemma-3-27b-it',                  'Gemma 3 27B',       'B',  '22.0%', '40k'],
```

### ADDITION

```javascript
['pixtral-12b-2409',                'Pixtral 12B',        'B',  '~20%',  '128k'],
```

---

## Sources

- [Scaleway Supported Models](https://www.scaleway.com/en/docs/generative-apis/reference-content/supported-models/)
- [Scaleway Model Lifecycle](https://www.scaleway.com/en/docs/generative-apis/reference-content/model-lifecycle/)
- [Scaleway Rate Limits](https://www.scaleway.com/en/docs/generative-apis/reference-content/rate-limits/)