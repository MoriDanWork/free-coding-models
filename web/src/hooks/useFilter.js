/**
 * @file web/src/hooks/useFilter.js
 * @description React hook for model filtering and sorting state.
 * 📖 Manages tier/status/provider/text filters + sort column/direction.
 * Supports all CLI columns: verdict, idx, tier, sweScore, ctx, label, origin,
 * latestPing, avg, condition (health), stability, uptime, aiLatency, tps.
 * 📖 Default sort: avg asc, with null/Infinity values pushed to bottom.
 * → useFilter
 */
import { useState, useMemo, useCallback } from 'react'
import { tierRank, verdictRank, parseSwe } from '../utils/ranks.js'
import { formatCtx } from '../utils/format.js'

export function useFilter(models) {
  const [filterTier, setFilterTier] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterProvider, setFilterProvider] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  // ── Default sort: avg ascending, null/Infinity → bottom ──
  const [sortColumn, setSortColumn] = useState('avg')
  const [sortDirection, setSortDirection] = useState('asc')

  const toggleSort = useCallback((col) => {
    setSortColumn((prevCol) => {
      if (prevCol === col) {
        setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortDirection('asc')
      }
      return col
    })
  }, [])

  const filtered = useMemo(() => {
    let result = [...models]

    if (filterTier !== 'all') result = result.filter((m) => m.tier === filterTier)
    if (filterStatus !== 'all') {
      result = result.filter((m) => {
        if (filterStatus === 'up') return m.status === 'up'
        if (filterStatus === 'down') return m.status === 'down' || m.status === 'timeout'
        if (filterStatus === 'pending') return m.status === 'pending'
        return true
      })
    }
    if (filterProvider !== 'all') result = result.filter((m) => m.providerKey === filterProvider)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          m.modelId.toLowerCase().includes(q) ||
          m.origin.toLowerCase().includes(q) ||
          m.tier.toLowerCase().includes(q) ||
          (m.verdict || '').toLowerCase().includes(q)
      )
    }

    // ─── Sort ───────────────────────────────────────────────────────────────
    result.sort((a, b) => {
      let cmp = 0
      const col = sortColumn

      if (col === 'idx') {
        cmp = (a.idx ?? 9999) - (b.idx ?? 9999)
      } else if (col === 'tier') {
        cmp = tierRank(a.tier) - tierRank(b.tier)
      } else if (col === 'label') {
        cmp = a.label.localeCompare(b.label)
      } else if (col === 'origin') {
        cmp = a.origin.localeCompare(b.origin)
      } else if (col === 'sweScore') {
        cmp = parseSwe(a.sweScore) - parseSwe(b.sweScore)
      } else if (col === 'ctx') {
        cmp = formatCtx(a.ctx) - formatCtx(b.ctx)
      } else if (col === 'latestPing') {
        const aPings = a.pingHistory || a.pings || []
        const bPings = b.pingHistory || b.pings || []
        const aLast = aPings.length > 0 ? aPings[aPings.length - 1] : null
        const bLast = bPings.length > 0 ? bPings[bPings.length - 1] : null
        const aMs = aLast?.ms ?? Infinity
        const bMs = bLast?.ms ?? Infinity
        cmp = aMs - bMs
      } else if (col === 'avg') {
        // Null / Infinity / >99000 → push to bottom regardless of direction
        const aNo = a.avg == null || a.avg === Infinity || a.avg > 99000
        const bNo = b.avg == null || b.avg === Infinity || b.avg > 99000
        if (aNo && bNo) cmp = 0
        else if (aNo) cmp = 1
        else if (bNo) cmp = -1
        else cmp = a.avg - b.avg
      } else if (col === 'condition') {
        const healthOrder = { up: 0, timeout: 1, down: 2, pending: 3, noauth: 4, auth_error: 5 }
        cmp = (healthOrder[a.status] ?? 9) - (healthOrder[b.status] ?? 9)
      } else if (col === 'verdict') {
        cmp = verdictRank(a.verdict) - verdictRank(b.verdict)
      } else if (col === 'stability') {
        cmp = (a.stability ?? -1) - (b.stability ?? -1)
      } else if (col === 'uptime') {
        cmp = (a.uptime ?? 0) - (b.uptime ?? 0)
      } else if (col === 'aiLatency') {
        // Null/Infinity → push to bottom regardless of direction
        const aNo = !a.benchmark?.ok
        const bNo = !b.benchmark?.ok
        if (aNo && bNo) cmp = 0
        else if (aNo) cmp = 1
        else if (bNo) cmp = -1
        else cmp = a.benchmark.totalMs - b.benchmark.totalMs
      } else if (col === 'tps') {
        // Null → push to bottom regardless of direction
        const aNo = !a.benchmark?.ok
        const bNo = !b.benchmark?.ok
        if (aNo && bNo) cmp = 0
        else if (aNo) cmp = 1
        else if (bNo) cmp = -1
        else cmp = (a.benchmark.tokensPerSecond ?? 0) - (b.benchmark.tokensPerSecond ?? 0)
      } else {
        cmp = (a.avg === Infinity ? 99999 : a.avg) - (b.avg === Infinity ? 99999 : b.avg)
      }

      return sortDirection === 'asc' ? cmp : -cmp
    })

    return result
  }, [models, filterTier, filterStatus, filterProvider, searchQuery, sortColumn, sortDirection])

  return {
    filtered,
    filterTier, setFilterTier,
    filterStatus, setFilterStatus,
    filterProvider, setFilterProvider,
    searchQuery, setSearchQuery,
    sortColumn, sortDirection, toggleSort,
  }
}