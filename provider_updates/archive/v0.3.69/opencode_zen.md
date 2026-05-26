# OpenCode Zen — Model Validity Audit

**Verification date:** 2026-05-26
**Source:** opencode.ai/docs/zen + API /zen/v1/models + pi.dev/models

---

## Summary
| Stat | Count | Details |
|------|-------|---------|
| ✅ Confirmed existing | 2 | `big-pickle`, `minimax-m2.5-free` |
| ⚠️ Config to fix | 1 | `nematron-3-super-free` (1M → 200k) |
| ⚠️ Not free (ultra-cheap paid) | 1 | `gpt-5-nano` ($0.05/$0.40 per 1M tokens) |
| 🗑️ Removed — to be deleted | 4 | `hy3-preview-free`, `ling-2.6-flash-free`, `trinity-mini-free`, `trinity-large-preview-free` |
| ➕ New — to be added | 2 | `deepseek-v4-flash-free`, `qwen3.6-plus-free` |

---

## 🗑️ REMOVED Models — to be DELETED

These 4 models no longer exist on OpenCode Zen (absent from the `/zen/v1/models` API):

```javascript
['hy3-preview-free',                'HY3 Preview Free',    'A+', '-',     '128k'],
['ling-2.6-flash-free',             'Ling 2.6 Flash Free',  'S',  '-',     '128k'],
['trinity-mini-free',               'Trinity Mini Preview', 'A',  '-',     '128k'],
['trinity-large-preview-free',      'Trinity Large Preview','S',  '-',     '128k'],
```

---

## ✅ CONFIRMED Existing Models

### `big-pickle` — Big Pickle ✅
- **Context:** 200k (confirmed)
- **Price:** Free
- **Reasoning:** Yes
- **No changes needed**

### `minimax-m2.5-free` — MiniMax M2.5 Free ✅
- **Context:** 200k (confirmed)
- **SWE-bench:** 80.2%
- **Price:** Free
- **No changes needed**

---

## ⚠️ Config to Fix

### `nemotron-3-super-free` — Nemotron 3 Super Free
- **sources.js Context:** 1M
- **Actual Zen Context:** **204,800 (~200k)** — Zen caps the native NVIDIA model (1M) to ~200k
- **Action:** Fix `'1M'` → `'200k'`

### `gpt-5-nano` — GPT 5 Nano
- **Context:** 400k (confirmed)
- **⚠️ Price:** **$0.05/$0.40 per 1M tokens** — NOT FREE
- **Action:** Maintainer decision — keep or remove

---

## ➕ New Models to Add

### `deepseek-v4-flash-free` — DeepSeek V4 Flash Free
- **Context:** 200k
- **Max Output:** 128k
- **Reasoning:** Yes (DeepSeek format)
- **Price:** Free (limited time)
- **Estimated SWE-bench:** ~79.0%
- **Suggested tier:** S+

```javascript
['deepseek-v4-flash-free', 'DeepSeek V4 Flash Free', 'S+', '79.0%', '200k'],
```

### `qwen3.6-plus-free` — Qwen3.6 Plus Free
- **Context:** 1M
- **Max Output:** 64k
- **Reasoning:** Yes
- **Price:** Free
- **Estimated SWE-bench:** ~78.8%
- **Suggested tier:** S+

```javascript
['qwen3.6-plus-free', 'Qwen3.6 Plus Free', 'S+', '78.8%', '1M'],
```

---

## 📝 Changes to Apply in sources.js

### DELETE (4 models)

```javascript
['hy3-preview-free',                'HY3 Preview Free',    'A+', '-',     '128k'],
['ling-2.6-flash-free',             'Ling 2.6 Flash Free',  'S',  '-',     '128k'],
['trinity-mini-free',               'Trinity Mini Preview', 'A',  '-',     '128k'],
['trinity-large-preview-free',      'Trinity Large Preview','S',  '-',     '128k'],
```

### FIX (1 model)

```javascript
// BEFORE
['nemotron-3-super-free',           'Nemotron 3 Super Free','A+', '52.0%', '1M'],
// AFTER
['nemotron-3-super-free',           'Nemotron 3 Super Free','A+', '52.0%', '200k'],
```

### ADD (2 models)

```javascript
['deepseek-v4-flash-free',          'DeepSeek V4 Flash Free', 'S+', '79.0%', '200k'],
['qwen3.6-plus-free',              'Qwen3.6 Plus Free',      'S+', '78.8%', '1M'],
```

### Proposed Final List

```javascript
export const opencodeZen = [
  ['big-pickle',                       'Big Pickle',              'S+', '72.0%', '200k'],
  ['minimax-m2.5-free',                'MiniMax M2.5 Free',      'S+', '80.2%', '200k'],
  ['deepseek-v4-flash-free',           'DeepSeek V4 Flash Free',  'S+', '79.0%', '200k'],
  ['qwen3.6-plus-free',                'Qwen3.6 Plus Free',       'S+', '78.8%', '1M'],
  ['nemotron-3-super-free',            'Nemotron 3 Super Free',   'A+', '52.0%', '200k'],
  ['gpt-5-nano',                       'GPT 5 Nano',              'S',  '65.0%', '400k'],  // ⚠️ not free
]
```

---

## Sources

- [OpenCode Zen Docs](https://opencode.ai/docs/zen/)
- [Zen API /v1/models](https://opencode.ai/zen/v1/models) — 42 active models
- [pi.dev/models/opencode/](https://pi.dev/models/opencode) — Detailed specs