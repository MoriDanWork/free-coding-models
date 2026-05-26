# Cerebras — Model Validity Audit

**Verification date:** 2026-05-26
**Source:** https://inference-docs.cerebras.ai/models/overview + individual model pages

---

## Summary

| Stat | Count | Details |
|------|-------|---------|
| ✅ Confirmed existing | 2 | `gpt-oss-120b`, `zai-glm-4.7` |
| 🗑️ Deprecated — to remove | 2 | `qwen-3-235b-a22b-instruct-2507`, `llama3.1-8b` (May 27, 2026 = TOMORROW) |
| ❌ 404 / Removed | 0 | — |
| ➕ New — to add | 0 | No new public models |
| ⚠️ Config to fix | 3 | Incorrect context windows for 3 models |

### ⚠️ Critical note: imminent deprecation

> `llama3.1-8b` and `qwen-3-235b-a22b-instruct-2507` will be deprecated on **May 27, 2026**.

The audit date being 2026-05-26, these two models will be **deprecated tomorrow**. They must be removed immediately.

---

## 🗑️ DEPRECATED Models

### 1. `qwen-3-235b-a22b-instruct-2507` — Qwen3 235B

| Field | Value |
|-------|-------|
| Model ID | `qwen-3-235b-a22b-instruct-2507` |
| Display Name | Qwen3 235B |
| Tier in sources.js | `S+` |
| Status | 🗑️ **DEPRECATED — official deprecation on May 27, 2026** |
| Recommended replacement | No direct replacement on the free tier |
| Action | **Remove from sources.js** |

### 2. `llama3.1-8b` — Llama 3.1 8B

| Field | Value |
|-------|-------|
| Model ID | `llama3.1-8b` |
| Display Name | Llama 3.1 8B |
| Tier in sources.js | `B` |
| Status | 🗑️ **DEPRECATED — official deprecation on May 27, 2026** |
| Recommended replacement | No direct replacement on the free tier |
| Note | Actual context = 8k (free) / 32k (paid) — the `128k` in sources.js was **incorrect** |
| Action | **Remove from sources.js** |

---

## ➕ New models to add

**No new public models.** Additional models on Cerebras are exclusively available via **Dedicated Endpoints** (paid).

---

## ✅ CONFIRMED operational models

| Model ID | Display Name | Tier | Context (Free) | Context (Paid) | Max Output (Free) | Speed | Status |
|----------|-------------|------|-----------------|----------------|-------------------|-------|--------|
| `gpt-oss-120b` | GPT OSS 120B | S | 65k | 131k | 32k | ~3000 tok/s | ✅ Production, reduced rate limits |
| `zai-glm-4.7` | GLM 4.7 | S+ | 64k | 131k | 40k | ~1000 tok/s | ✅ Preview, reduced rate limits |

---

## 📝 Changes to apply in sources.js

### REMOVE these lines (models deprecated May 27, 2026):

```javascript
// ❌ REMOVE — deprecated May 27, 2026
['qwen-3-235b-a22b-instruct-2507',       'Qwen3 235B',         'S+', '70.0%', '128k'],
// ❌ REMOVE — deprecated May 27, 2026
['llama3.1-8b',                          'Llama 3.1 8B',       'B',  '28.8%', '128k'],
```

### FIX the context for these models:

```javascript
// BEFORE:
['gpt-oss-120b',                         'GPT OSS 120B',       'S',  '60.0%', '128k'],
['zai-glm-4.7',                          'GLM 4.7',            'S+', '73.8%', '200k'],

// AFTER:
['gpt-oss-120b',                         'GPT OSS 120B',       'S',  '60.0%', '131k'],
['zai-glm-4.7',                          'GLM 4.7',            'S+', '73.8%', '131k'],
```

### Final Cerebras block after changes:

```javascript
export const cerebras = [
  ['gpt-oss-120b',                         'GPT OSS 120B',       'S',  '60.0%', '131k'],
  ['zai-glm-4.7',                          'GLM 4.7',            'S+', '73.8%', '131k'],
  // 🗑️ Removed 2026-05-26 (Cerebras deprecation May 27, 2026):
  // ['llama3.1-8b',                       'Llama 3.1 8B',       'B',  '28.8%', '128k'],
  // ['qwen-3-235b-a22b-instruct-2507',    'Qwen3 235B',         'S+', '70.0%', '128k'],
]
```

---

## Sources

- **Cerebras Models Overview**: [inference-docs.cerebras.ai/models/overview](https://inference-docs.cerebras.ai/models/overview)
- **GLM 4.7 Migration Guide**: [inference-docs.cerebras.ai/resources/glm-47-migration](https://inference-docs.cerebras.ai/resources/glm-47-migration)