/**
 * @file web/src/components/layout/Header.jsx
 * @description Top header bar with search, AI Latency benchmark button, export, settings, and theme toggle.
 * 📖 AI Latency button is always visible — benchmarks the fastest online model when no row is selected.
 */
import { IconBolt, IconSearch, IconDownload, IconSettings, IconMoon, IconSun, IconPlayerPlay } from '@tabler/icons-react'
import styles from './Header.module.css'

export default function Header({
  searchQuery, onSearchChange,
  onToggleTheme, onOpenSettings, onOpenExport,
  onBenchmark, benchmarkRunning, modelsCount, theme,
}) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>&gt;</span>
          <span className={styles.logoText}>
            <span className={styles.logoTextHighlight}>free</span>
            <span>-coding-models</span>
            <span className={styles.logoTextHighlight}>_</span>
          </span>
        </div>
        <span className={styles.version}>v{__APP_VERSION__}</span>
      </div>
      <div className={styles.center}>
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}><IconSearch size={16} stroke={1.5} /></span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search models, providers, tiers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            autoComplete="off"
          />
          <kbd className={styles.kbd}>Ctrl+K</kbd>
        </div>
      </div>
      <div className={styles.right}>
        {/* AI Latency Benchmark — always visible, shows model count when idle */}
        <button
          className={`${styles.benchmarkBtn} ${benchmarkRunning ? styles.benchmarkActive : ''}`}
          onClick={onBenchmark}
          disabled={benchmarkRunning}
          title={benchmarkRunning ? 'AI Latency test running…' : `Run AI Latency benchmark on ${modelsCount} models`}
        >
          <IconPlayerPlay size={14} stroke={1.5} />
          {benchmarkRunning ? (
            <span className={styles.benchmarkRunning}>
              <span className={styles.spinner} />
              AI Latency Test…
            </span>
          ) : (
            <span>AI Latency</span>
          )}
        </button>

        <button className={styles.iconBtn} onClick={onToggleTheme} title="Toggle theme">
          {theme === 'light' ? <IconMoon size={16} stroke={1.5} /> : <IconSun size={16} stroke={1.5} />}
        </button>
        <button className={styles.iconBtn} onClick={onOpenExport} title="Export Data">
          <IconDownload size={16} stroke={1.5} />
        </button>
        <button className={styles.primaryBtn} onClick={onOpenSettings}>
          <IconSettings size={16} stroke={1.5} /> Settings
        </button>
      </div>
    </header>
  )
}