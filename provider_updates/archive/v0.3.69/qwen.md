# Alibaba DashScope (Qwen) — Model Validity Audit

**Verification date:** 2026-05-26
**Source:** dashscope-intl.aliyuncs.com / help.aliyun.com/zh/model-studio

---

## Summary
| Stat | Count | Details |
|------|-------|---------|
| ✅ Confirmed existing | 8 | All models exist |
| 🗑️ To remove / re-evaluate | 1 | qwen2.5-coder-32b-instruct (legacy) |
| ➕ New — to add | 3 | qwen3.7-max, qwen3.6-plus, qwen3.6-flash |
| ⚠️ Config corrected | 4 | Context window corrections |
| 🔀 ID to correct | 1 | qwen3-235b-a22b-instruct → qwen3-235b-a22b |

---

## ✅ CONFIRMED operational models

| Model ID | Display Name | ctx sources.js | ctx DashScope | Action |
|----------|-------------|---------------|--------------|--------|
| `qwen3-max` | Qwen3 Max | 1M | **256k** | ⚠️ Fix ctx |
| `qwen3-235b-a22b-instruct` | Qwen3 235B | 256k | 256k | ⚠️ ID to correct → `qwen3-235b-a22b` |
| `qwen3.5-plus` | Qwen3.5 Plus | 1M | 1M | ✅ OK |
| `qwen3-coder-plus` | Qwen3 Coder Plus | 256k | **1M** | ⚠️ Fix ctx |
| `qwen3-coder-next` | Qwen3 Coder Next | 256k | 256k | ✅ OK |
| `qwen3.5-flash` | Qwen3.5 Flash | 1M | 1M | ✅ OK |
| `qwen3-coder-flash` | Qwen3 Coder Flash | 256k | **1M** | ⚠️ Fix ctx |
| `qwen3-32b` | Qwen3 32B | 128k | **256k** | ⚠️ Fix ctx |

---

## 🗑️ Models to remove

### `qwen2.5-coder-32b-instruct` — Qwen2.5 Coder 32B
- **Status:** Legacy (listed under "旧版" / old versions), no longer in recommended models
- **Replacement:** `qwen3-coder-plus` or `qwen3-coder-flash`
- **Action:** REMOVE

---

## ➕ New models to add

| Model ID | Display Name | Suggested tier | Context | Notes |
|----------|-------------|----------------|---------|-------|
| `qwen3.7-max` | Qwen3.7 Max | S+ | 1M | 🆕 New flagship (May 2026) |
| `qwen3.6-plus` | Qwen3.6 Plus | S+ | 1M | 🆕 Recommended by Alibaba (April 2026) |
| `qwen3.6-flash` | Qwen3.6 Flash | A | 1M | 🆕 Budget version of 3.6-plus |

---

## 📝 Changes to apply in sources.js

### REMOVE

```javascript
['qwen2.5-coder-32b-instruct', 'Qwen2.5 Coder 32B', 'A', '46.0%', '32k'],
```

### CORRECT (context windows)

```javascript
// BEFORE → AFTER
['qwen3-max',          'Qwen3 Max',          'S+', '78.8%', '1M'],    → ['qwen3-max',          'Qwen3 Max',          'S+', '78.8%', '256k'],
['qwen3-coder-plus',   'Qwen3 Coder Plus',   'S',  '69.6%', '256k'], → ['qwen3-coder-plus',   'Qwen3 Coder Plus',   'S',  '69.6%', '1M'],
['qwen3-coder-flash',  'Qwen3 Coder Flash',  'A+', '55.0%', '256k'], → ['qwen3-coder-flash',  'Qwen3 Coder Flash',  'A+', '55.0%', '1M'],
['qwen3-32b',          'Qwen3 32B',           'A+', '50.0%', '128k'], → ['qwen3-32b',          'Qwen3 32B',           'A+', '50.0%', '256k'],
```

### CORRECT (model ID)

```javascript
// BEFORE
['qwen3-235b-a22b-instruct', 'Qwen3 235B', 'S+', '70.0%', '256k'],
// AFTER — use the hybrid thinking+instruct ID
['qwen3-235b-a22b', 'Qwen3 235B', 'S+', '70.0%', '256k'],
```

### ADD

```javascript
['qwen3.7-max',       'Qwen3.7 Max',       'S+', '~80%', '1M'],
['qwen3.6-plus',      'Qwen3.6 Plus',      'S+', '~72%', '1M'],
['qwen3.6-flash',     'Qwen3.6 Flash',     'A',  '~60%', '1M'],
```

---

## ⚠️ Availability by endpoint

| Endpoint | URL | Qwen-Coder | QwQ |
|---|---|---|---|
| **International (Singapore)** | dashscope-intl.aliyuncs.com | ❌ No | ❌ No |
| **China (Beijing)** | dashscope.aliyuncs.com | ✅ Yes | ✅ Yes |

The models `qwen3-coder-plus`, `qwen3-coder-flash`, `qwen3-coder-next` are only available on the Chinese endpoint.

---

## Sources

- [DashScope Text Generation Models](https://help.aliyun.com/zh/model-studio/text-generation-model)
- [DashScope OpenAI Compatibility](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope)
- [Alibaba Cloud Free Tier](https://www.alibabacloud.com/free)