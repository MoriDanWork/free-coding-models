/**
 * @file web/src/components/atoms/AILatencyCell.jsx
 * @description Benchmark AI latency column — shows spinner when running, result when done.
 * 📖 Shows: 4.3s, 12s, ERR, TIMEOUT. Retry badge ↻N in blue.
 */
import styles from './AILatencyCell.module.css'

const WEB_SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

function formatLatency(result, isRunning, frame) {
  if (isRunning) {
    return { text: WEB_SPINNER_FRAMES[frame % WEB_SPINNER_FRAMES.length], badge: '' }
  }
  if (!result || !result.ok) return { text: result?.code || '—', badge: '' }
  const totalSec = result.totalMs / 1000
  const badge = result.retries > 0 ? `↻${result.retries}` : ''
  const text = totalSec >= 10 ? `${totalSec.toFixed(0)}s` : `${totalSec.toFixed(1)}s`
  return { text, badge }
}

export default function AILatencyCell({ result, isRunning, frame = 0 }) {
  const { text, badge } = formatLatency(result, isRunning, frame)
  const ok = result?.ok
  const colorCls = ok ? styles.fast : (result ? styles.slow : styles.dim)

  if (isRunning) {
    return (
      <span className={styles.cell}>
        <span className={`${styles.value} ${styles.running}`}>
          <span className={styles.webSpinner} />
        </span>
      </span>
    )
  }

  return (
    <span className={styles.cell}>
      <span className={`${styles.value} ${colorCls}`}>{text}</span>
      {badge && <span className={styles.badge}>{badge}</span>}
    </span>
  )
}