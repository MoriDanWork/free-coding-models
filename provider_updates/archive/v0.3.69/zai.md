# ZAI (Z.ai) — Model Validity Audit

**Verification date:** 2026-05-26
**Source:** docs.z.ai (pricing, model docs, release notes), OpenLM SWE-bench leaderboard

---

## Summary
| Stat | Count | Details |
|------|-------|---------|
| ✅ Confirmed existing | 2 | GLM-4.7-Flash, GLM-4.5-Flash |
| 🗑️ Deprecated — to remove | 0 | No deprecated models |
| ➕ New — to add | 0 | No new free models |
| ⚠️ To verify | 2 | SWE-bench scores not officially confirmed |

---

## ✅ CONFIRMED operational models

### `zai/glm-4.7-flash` — GLM-4.7-Flash

| Attribute | sources.js | Official (2026-05-26) | Status |
|----------|-----------|----------------------|--------|
| Model ID | `zai/glm-4.7-flash` | `glm-4.7-flash` | ✅ Correct |
| Display Name | GLM-4.7-Flash | GLM-4.7-Flash | ✅ Correct |
| Tier | S | — | ✅ Justified |
| SWE-bench | 59.2% | ~59.2% (community) | ⚠️ Approximate |
| Context | 200k | 200K | ✅ Correct |
| Price | — | **Free** | ✅ Confirmed free |

### `zai/glm-4.5-flash` — GLM-4.5-Flash

| Attribute | sources.js | Official (2026-05-26) | Status |
|----------|-----------|----------------------|--------|
| Model ID | `zai/glm-4.5-flash` | `glm-4.5-flash` | ✅ Correct |
| Display Name | GLM-4.5-Flash | GLM-4.5-Flash | ✅ Correct |
| Tier | S | — | ⚠️ Potentially overrated (older model) |
| SWE-bench | 59.2% | Unconfirmed | ⚠️ Unverified |
| Context | 128k | 128K | ✅ Correct |
| Price | — | **Free** | ✅ Confirmed free |

---

## ➕ New models (paid — do not add)

| Model | Input/Output Price | Context | SWE-bench |
|-------|-------------------|---------|-----------|
| GLM-5.1 | $1.40/$4.40 | 200K | 74.4% |
| GLM-5 | $1.00/$3.20 | 200K | 72.8% |
| GLM-4.7 | $0.60/$2.20 | 200K | 73.8% |
| GLM-4.7-FlashX | $0.07/$0.40 | 200K | — |
| GLM-4.5 | $0.60/$2.20 | 128K | 64.2% |
| GLM-4.5-Air | $0.20/$1.10 | 128K | 57.6% |

**Verdict:** ❌ All paid, do not add.

---

## 📝 Changes to apply in sources.js

**No changes needed.** Both models are still active and free.

### Optional recommendations:
- **GLM-4.5-Flash**: The `S` tier could be downgraded to `A+` since it's less performant than GLM-4.7-Flash
- **SWE-bench**: The 59.2% scores are not officially confirmed by Z.ai

---

## Sources

- **Z.ai Pricing**: [docs.z.ai/guides/overview/pricing](https://docs.z.ai/guides/overview/pricing)
- **Z.ai GLM-4.7 Docs**: [docs.z.ai/guides/llm/glm-4.7](https://docs.z.ai/guides/llm/glm-4.7)
- **Z.ai GLM-4.5 Docs**: [docs.z.ai/guides/llm/glm-4.5](https://docs.z.ai/guides/llm/glm-4.5)
- **OpenLM SWE-bench**: [openlm.ai/swe-bench](https://openlm.ai/swe-bench)