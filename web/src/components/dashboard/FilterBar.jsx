/**
 * @file web/src/components/dashboard/FilterBar.jsx
 * @description Filter controls for tier, status, provider, ping interval, and live indicator.
 * 📖 Shows "Next ping in Xs" countdown matching TUI behavior. Ping mode selector (Speed/Normal/Slow/Forced).
 */
import { useState, useEffect } from 'react'
import styles from './FilterBar.module.css'

const TIERS = ['All', 'S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'C']
const STATUSES = [
  { key: 'all', label: 'All' },
  { key: 'up', label: 'Online' },
  { key: 'down', label: 'Offline' },
  { key: 'pending', label: 'Pending' },
]

const PING_MODES = [
  { key: 'speed',  label: '⚡ Speed', interval: '2s',  color: '#00ff88' },
  { key: 'normal', label: '● Normal', interval: '10s', color: '#ffaa00' },
  { key: 'slow',   label: '🐢 Slow',  interval: '30s', color: '#ff6644' },
  { key: 'forced', label: '🔥 Forced', interval: '4s',  color: '#ff4466' },
]

function formatCountdown(ms) {
  if (ms == null) return null
  const s = Math.max(0, Math.ceil(ms / 1000))
  if (s === 1) return '1s'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m${rem > 0 ? rem + 's' : ''}`
}

export default function FilterBar({
  filterTier, setFilterTier,
  filterStatus, setFilterStatus,
  filterProvider, setFilterProvider,
  providers,
  pingMode, setPingMode,
  nextPingAt,
  isPinging,
  globalBenchmarkRunning,
  globalBenchmarkTotal,
  globalBenchmarkCompleted,
}) {
  const [countdown, setCountdown] = useState(null)

  // Update countdown every second when nextPingAt is set
  useEffect(() => {
    if (nextPingAt == null) return
    const tick = () => {
      const rem = nextPingAt - Date.now()
      setCountdown(rem > 0 ? rem : 0)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [nextPingAt])

  const countdownDisplay = countdown !== null ? formatCountdown(countdown) : null

  // Global benchmark progress percentage
  const benchmarkPct = globalBenchmarkRunning && globalBenchmarkTotal > 0
    ? Math.round((globalBenchmarkCompleted / globalBenchmarkTotal) * 100)
    : 0

  return (
    <section className={styles.filters}>
      {/* ── Global benchmark progress bar (Ctrl+U) ── */}
      {globalBenchmarkRunning && (
        <div className={styles.benchmarkBar}>
          <div className={styles.benchmarkLabel}>
            <span className={styles.benchmarkSpinner} />
            <span>AI Speed Test</span>
            <span className={styles.benchmarkCount}>{globalBenchmarkCompleted}/{globalBenchmarkTotal}</span>
          </div>
          <div className={styles.benchmarkTrack}>
            <div className={styles.benchmarkFill} style={{ width: `${benchmarkPct}%` }} />
          </div>
          <span className={styles.benchmarkPct}>{benchmarkPct}%</span>
        </div>
      )}
      <div className={styles.group}>
        <label className={styles.filterLabel}>Tier</label>
        <div className={styles.tierRow}>
          {TIERS.map(t => (
            <button
              key={t}
              className={`${styles.tierBtn} ${filterTier === t ? styles.active : ''}`}
              onClick={() => setFilterTier(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <label className={styles.filterLabel}>Status</label>
        <div className={styles.tierRow}>
          {STATUSES.map(s => (
            <button
              key={s.key}
              className={`${styles.tierBtn} ${filterStatus === s.key ? styles.active : ''}`}
              onClick={() => setFilterStatus(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <label className={styles.filterLabel}>Provider</label>
        <select
          className={styles.providerSelect}
          value={filterProvider}
          onChange={e => setFilterProvider(e.target.value)}
        >
          <option value="all">All Providers</option>
          {providers.map(p => (
            <option key={p.key} value={p.key}>{p.name} ({p.count})</option>
          ))}
        </select>
      </div>
      <div className={styles.spacer} />

      {/* ── Ping interval selector ── */}
      <div className={styles.group}>
        <label className={styles.filterLabel}>Ping</label>
        <div className={styles.pingRow}>
          {PING_MODES.map(m => (
            <button
              key={m.key}
              className={`${styles.pingBtn} ${pingMode === m.key ? styles.pingBtnActive : ''}`}
              style={pingMode === m.key ? { '--ping-active-color': m.color } : {}}
              onClick={() => setPingMode(m.key)}
              title={`${m.interval} interval`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Next ping countdown + LIVE ── */}
      <div className={styles.group}>
        {isPinging ? (
          <div className={styles.nextPing} title="Pinging now…">
            <span className={styles.pingingDot} />
            <span className={styles.pingingText}>Pinging…</span>
          </div>
        ) : countdownDisplay ? (
          <div className={styles.nextPing} title="Next ping countdown">
            <span className={styles.nextPingLabel}>Next</span>
            <span className={styles.nextPingTime}>{countdownDisplay}</span>
          </div>
        ) : (
          <div className={styles.live}>
            <span className={styles.liveDot} />
            <span>LIVE</span>
          </div>
        )}
      </div>
    </section>
  )
}