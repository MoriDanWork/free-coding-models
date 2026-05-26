# SambaNova — Model Validity Audit

**Verification date:** 2026-05-26
**Source:** https://docs.sambanova.ai/docs/en/models/sambacloud-models + https://docs.sambanova.ai/docs/en/models/deprecations + https://docs.sambanova.ai/docs/en/models/rate-limits

---

## Summary
| Stat | Count | Details |
|------|-------|---------|
| ✅ Confirmed active | 4 | DeepSeek-V3.1, DeepSeek-V3.2, gpt-oss-120b, Meta-Llama-3.3-70B-Instruct |
| 🗑️ Deprecated — to remove | 1 | MiniMax-M2.5 (replaced by MiniMax-M2.7) |
| ❌ 404 / Removed | 0 | — |
| ➕ New — to add | 2 | MiniMax-M2.7, gemma-3-12b-it |
| ⚠️ Config change | 1 | Llama-4-Maverick context window (1M → 128k) |

---

## 🗑️ DEPRECATED Models

| Model ID | Display Name | Current Tier | Status | Replacement | Removal Date | Action |
|-----------|-------------|-------------|--------|--------------|-------------------|--------|
| `MiniMax-M2.5` | MiniMax M2.5 | S+ | 🗑️ Deprecated, removed | `MiniMax-M2.7` | 2026-05-18 | REMOVE from sources.js |

---

## ➕ New models to add

| Model ID | Suggested Display Name | Suggested Tier | Context Window | Status | Action |
|-----------|---------------------|--------------|----------------|--------|--------|
| `MiniMax-M2.7` | MiniMax M2.7 | S+ | 192k | Production | ADD — Direct replacement for MiniMax-M2.5 |
| `gemma-3-12b-it` | Gemma 3 12B IT | B+ | 128k | Preview | ADD — New Google Gemma 3 multimodal model |

---

## ✅ CONFIRMED active models

| Model ID | Display Name | Tier | SWE Score | Context (sources.js) | Context (SambaNova) | Status |
|-----------|-------------|------|-----------|----------------------|---------------------|--------|
| `DeepSeek-V3.1` | DeepSeek V3.1 | S | 62.0% | 128k | 128k | ✅ Matching |
| `DeepSeek-V3.2` | DeepSeek V3.2 | S+ | 70.0% | 32k | 32k | ✅ Matching |
| `gpt-oss-120b` | GPT OSS 120B | S | 60.0% | 128k | 128k | ✅ Matching |
| `Meta-Llama-3.3-70B-Instruct` | Llama 3.3 70B | A- | 39.5% | 128k | 128k | ✅ Matching |
| `Llama-4-Maverick-17B-128E-Instruct` | Llama 4 Maverick | S | 62.0% | **1M** ⚠️ | **128k** ⚠️ | ⚠️ See config section |

---

## ⚠️ Configuration changes

### Context Window — Llama-4-Maverick-17B-128E-Instruct

| Field | Value in sources.js | Confirmed SambaNova value |
|-------|----------------------|---------------------------|
| Context Window | **1M** | **128k** |

**Explanation:** The Llama 4 Maverick model theoretically supports 1M tokens natively, but **SambaNova only offers 128k tokens of context** on SambaCloud.

**Recommended action:** Change `'1M'` → `'128k'` for this model.

---

## 📝 Changes to apply in sources.js

### Lines to REMOVE

```diff
-  ['MiniMax-M2.5',                         'MiniMax M2.5',       'S+', '74.0%', '160k'],
```

### Lines to ADD

```diff
+  ['MiniMax-M2.7',                         'MiniMax M2.7',       'S+', '56.2%', '192k'],
+  ['gemma-3-12b-it',                        'Gemma 3 12B IT',     'B+', '46.0%', '128k'],
```

### Lines to MODIFY

```diff
-  ['Llama-4-Maverick-17B-128E-Instruct',   'Llama 4 Maverick',   'S',  '62.0%', '1M'],
+  ['Llama-4-Maverick-17B-128E-Instruct',   'Llama 4 Maverick',   'S',  '62.0%', '128k'],
```

---

## 📋 Historical SambaNova deprecations (not in sources.js list — for reference)

| Model ID | Removal Date | Replacement |
|-----------|-------------------|--------------|
| `DeepSeek-V3-0324` | 2026-04-14 | DeepSeek-V3.1 |
| `DeepSeek-R1-0528` | 2026-04-14 | gpt-oss-120b |
| `Meta-Llama-3.1-8B-Instruct` | 2026-04-14 | Meta-Llama-3.3-70B-Instruct |
| `DeepSeek-V3.1-Terminus` | 2026-04-06 | DeepSeek-V3.1 |
| `Qwen3-235B-A22B-Instruct-2507` | 2026-04-06 | MiniMax-M2.5 (then M2.7) |
| `Qwen3-32B` | 2026-04-06 | MiniMax-M2.5 (then M2.7) |
| `DeepSeek-R1-Distill-Llama-70B` | 2026-03-20 | gpt-oss-120b |

---

## Sources

- **SambaCloud models**: https://docs.sambanova.ai/docs/en/models/sambacloud-models
- **Deprecations**: https://docs.sambanova.ai/docs/en/models/deprecations
- **Rate limits**: https://docs.sambanova.ai/docs/en/models/rate-limits