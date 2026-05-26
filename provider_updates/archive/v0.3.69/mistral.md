# Mistral La Plateforme + Codestral — Model Validity Audit

**Verification date:** 2026-05-26
**Source:** docs.mistral.ai / Mistral API / Model Cards / SWE-bench

---

## Summary
| Stat | Count | Details |
|------|-------|---------|
| ✅ Confirmed existing (with updates) | 4 | All have evolved to new versions |
| 🗑️ Deprecated — to remove | 3 | `devstral-medium-latest`, `devstral-small-latest`, `magistral-small-latest` |
| ❌ Removed — to remove | 0 | No models entirely deleted |
| ➕ New — to add | 4 | Mistral Large 3, Medium 3.5, Small 4, Devstral 2 |
| ⚠️ To update (Codestral) | 1 | `codestral-latest` — context reduced 256k→128k |

---

## 🗑️ DEPRECATED Models

### 1. `devstral-medium-latest` — Devstral Medium
| Field | Value |
|-------|-------|
| Current tier | S+ |
| SWE-bench | 72.2% |
| **Status** | 🗑️ **DEPRECATED** — removal on 31/05/2026 |
| Replacement | **Devstral 2** (API: `devstral-2512`, 256k ctx) |
| Action | REMOVE and REPLACE with Devstral 2 |

### 2. `devstral-small-latest` — Devstral Small
| Field | Value |
|-------|-------|
| Current tier | A+ |
| **Status** | 🗑️ **DEPRECATED** — removal on 31/05/2026 |
| Replacement | **Devstral 2** (API: `devstral-2512`) — unified, replaces both sizes |
| Action | REMOVE and REPLACE with Devstral 2 |

### 3. `magistral-small-latest` — Magistral Small
| Field | Value |
|-------|-------|
| Current tier | A |
| **Status** | 🗑️ **DEPRECATED** — removal on 31/07/2026 |
| Replacement | **Mistral Small 4** (API: `mistral-small-2603`) |
| Action | REMOVE |

---

## ➕ New models to add

### 1. Mistral Medium 3.5
| Field | Value |
|-------|-------|
| API ID | `mistral-medium-3-5` |
| Context | **256k** |
| SWE-bench Verified | **77.6%** |
| Specialty | Optimized for agentic & coding |
| Suggested tier | **S+** (77.6% SWE-bench > Devstral 2) |
| Action | REPLACE `mistral-medium-latest` |

### 2. Devstral 2
| Field | Value |
|-------|-------|
| API ID | `devstral-2512` |
| Context | **256k** |
| SWE-bench Verified | **72.2%** |
| Architecture | 123B dense |
| Suggested tier | **S+** |
| Action | REPLACE both `devstral-medium-latest` AND `devstral-small-latest` entries |

### 3. Mistral Large 3
| Field | Value |
|-------|-------|
| API ID | `mistral-large-2512` |
| Context | 256k |
| Architecture | MoE 675B total, 41B active |
| Suggested tier | **S+** |
| Action | Update name + ID from `mistral-large-latest` |

### 4. Mistral Small 4
| Field | Value |
|-------|-------|
| API ID | `mistral-small-2603` |
| Context | **256k** |
| Architecture | 119B total, 6.5B active (hybrid MoE) |
| Suggested tier | **A** |
| Action | Update name + ID + ctx from `mistral-small-latest` |

---

## ⚠️ Codestral — REDUCED context window

| Field | Old | New |
|-------|-----|-----|
| API ID | `codestral-latest` | `codestral-2508` |
| Context | **256k** | **128k** ⬇️ |
| Action | UPDATE | ctx → 128k |

---

## ✅ CONFIRMED operational models

| Model (in sources.js) | Current API ID | Actual context | Status | Action |
|---|---|---|---|---|
| mistral-large-latest | `mistral-large-2512` | 256k ✅ | ✅ Active (Large 3) | update name + ID |
| mistral-medium-latest | `mistral-medium-3-5` | **256k** ⬆️ | ✅ Active (Medium 3.5) | update name + ID + ctx |
| mistral-small-latest | `mistral-small-2603` | **256k** ⬆️ | ✅ Active (Small 4) | update name + ID + ctx |
| magistral-medium-latest | `magistral-medium-2509` | 128k ✅ | ✅ Active (Medium 1.2) | update name + ID |
| codestral-latest | `codestral-2508` | **128k** ⬇️ | ⚠️ Active, ctx changed | update ID + ctx |

---

## 📝 Changes to apply in sources.js

### Mistral provider — FINAL RESULT

```javascript
export const mistral = [
  // ── S+ tier ──
  ['mistral-large-2512',        'Mistral Large 3',     'S+', '70.0%', '256k'],
  ['mistral-medium-3-5',        'Mistral Medium 3.5',  'S+', '77.6%', '256k'],
  ['devstral-2512',             'Devstral 2',          'S+', '72.2%', '256k'],
  ['magistral-medium-2509',     'Magistral Medium 1.2','A+', '52.0%', '128k'],
  // ── A tier ──
  ['mistral-small-2603',        'Mistral Small 4',     'A',  '48.0%', '256k'],
  // 🗑️ Removed 2026-05-26 (Mistral deprecation):
  // ['devstral-medium-latest',  'Devstral Medium',     'S+', '72.2%', '128k'],
  // ['devstral-small-latest',   'Devstral Small',      'A+', '55.0%', '128k'],
  // ['magistral-small-latest',  'Magistral Small',     'A',  '45.0%', '128k'],
]
```

### Codestral provider — FINAL RESULT

```javascript
export const codestral = [
  ['codestral-2508',            'Codestral',           'B+', '34.0%', '128k'],
]
```

---

## 🔑 Key points

1. **Unified Devstral**: Devstral Medium and Small merged into **Devstral 2** (123B dense, 256k, SWE-bench 72.2%)
2. **Mistral Medium 3.5 = new coding king**: 77.6% SWE-bench, surpasses Devstral 2
3. **Context windows increasing**: All new models now at **256k** (except Magistral Medium 128k)
4. **Codestral context reduced**: 256k → 128k for the v25.08 version
5. **API IDs changing**: Mistral no longer uses `-latest` aliases, versioned IDs with date codes

---

## Sources

- [Mistral Models Overview](https://docs.mistral.ai/models/overview)
- [Devstral 2 Model Card](https://docs.mistral.ai/models/model-cards/devstral-2-25-12)
- [Mistral Medium 3.5 Model Card](https://docs.mistral.ai/models/model-cards/mistral-medium-3-5-26-04)
- [Mistral Small 4 Model Card](https://docs.mistral.ai/models/model-cards/mistral-small-4-0-26-03)
- [Codestral Model Card](https://docs.mistral.ai/models/model-cards/codestral-25-08)