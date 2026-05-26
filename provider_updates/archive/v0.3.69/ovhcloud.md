# OVHcloud AI Endpoints — Model Validity Audit

**Verification date:** 2026-05-26
**Source:** endpoints.ai.cloud.ovh.net / OVHcloud AI docs

---

## Summary
| Stat | Count | Details |
|------|-------|---------|
| ✅ Confirmed existing | 5 | Qwen3-Coder-30B, gpt-oss-120b, gpt-oss-20b, Meta-Llama-3_3-70B, Qwen3-32B |
| 🗑️ Delisted from catalog | 1 | Llama-3.1-8B-Instruct (delisted) |
| ⚠️ Config corrected | 4 | Context window corrections |
| ➕ New — to add | 1 | Qwen3.5-397B-A17B (new, tagged "New") |

---

## ✅ CONFIRMED operational models

| Model ID | Display Name | ctx sources.js | ctx OVHcloud | Note |
|----------|-------------|---------------|-------------|------|
| `Qwen3-Coder-30B-A3B-Instruct` | Qwen3 Coder 30B MoE | 256k | 256k | ✅ OK |
| `gpt-oss-120b` | GPT OSS 120B | 131k | 131k | ✅ OK |
| `gpt-oss-20b` | GPT OSS 20B | 131k | 131k | ✅ OK |
| `Meta-Llama-3_3-70B-Instruct` | Llama 3.3 70B | 131k | 131k | ✅ OK |
| `Qwen3-32B` | Qwen3 32B | 32k | 32k | ✅ OK |

---

## 🗑️ DELETED from catalog model

### `Llama-3.1-8B-Instruct` — Llama 3.1 8B
- **Status:** Delisted from public catalog (detail page still accessible but model not listed)
- **Action:** REMOVE from sources.js

---

## ⚠️ Context window corrections

| Model ID | ctx sources.js | ctx OVHcloud | Correction |
|----------|---------------|-------------|------------|
| `Qwen3.5-9B` | 128k | **262k** | ⚠️ Fix → 262k |
| `Mistral-Small-3.2-24B-Instruct-2506` | 131k | **128k** | ⚠️ Fix → 128k |
| `Mistral-Nemo-Instruct-2407` | 128k | **118k** | ⚠️ Fix → 118k |
| `Mistral-7B-Instruct-v0.3` | 32k | **127k** (extended via RoPE) | ⚠️ Fix → 127k |

---

## ➕ New models to add

| Model ID | Display Name | Suggested tier | CTX | Notes |
|----------|-------------|---------------|-----|-------|
| `Qwen3.5-397B-A17B` | Qwen3.5 397B MoE | S | 262k | 🆕 Tagged "New", fp8, Function calling + Multimodal + Reasoning |

---

## 📝 Changes to apply in sources.js

### REMOVE

```javascript
['Llama-3.1-8B-Instruct', 'Llama 3.1 8B', 'B', '28.8%', '131k'],
```

### FIX

```javascript
// BEFORE → AFTER
['Qwen3.5-9B', 'Qwen3.5 9B', 'B+', '30.0%', '128k'],  → ['Qwen3.5-9B', 'Qwen3.5 9B', 'B+', '30.0%', '262k'],
['Mistral-Small-3.2-24B-Instruct-2506', 'Mistral Small 3.2', 'B+', '34.0%', '131k'], → ['Mistral-Small-3.2-24B-Instruct-2506', 'Mistral Small 3.2', 'B+', '34.0%', '128k'],
['Mistral-Nemo-Instruct-2407', 'Mistral Nemo', 'B+', '30.0%', '128k'], → ['Mistral-Nemo-Instruct-2407', 'Mistral Nemo', 'B+', '30.0%', '118k'],
['Mistral-7B-Instruct-v0.3', 'Mistral 7B Instruct', 'B', '25.0%', '32k'], → ['Mistral-7B-Instruct-v0.3', 'Mistral 7B Instruct', 'B', '25.0%', '127k'],
```

### ADD

```javascript
['Qwen3.5-397B-A17B', 'Qwen3.5 397B MoE', 'S', '-', '262k'],
```

---

## Sources

- **OVHcloud Supported Models** : [scaleway.com/en/docs/...](https://endpoints.ai.cloud.ovh.net)
- **OVHcloud AI Endpoints** : Public catalog scraped 2026-05-26