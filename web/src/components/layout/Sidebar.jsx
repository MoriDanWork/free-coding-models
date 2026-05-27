/**
 * @file web/src/components/layout/Sidebar.jsx
 * @description Collapsible sidebar navigation with Dashboard / Settings / Analytics links + theme toggle.
 */
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { id: 'dashboard', icon: '▤', label: 'Dashboard' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
  { id: 'analytics', icon: '▌▌', label: 'Analytics' },
  { id: 'map', icon: '🌍', label: 'Map' },
]

export default function Sidebar({ currentView, onNavigate, onToggleTheme }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>⚡</span>
        <span className={styles.logoText}>FCM</span>
      </div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`${styles.navItem} ${currentView === id ? styles.active : ''}`}
            onClick={() => onNavigate(id)}
            title={label}
          >
            <span className={styles.navIcon}>{icon}</span>
            <span className={styles.navLabel}>{label}</span>
          </button>
        ))}
      </nav>
      <div className={styles.bottom}>
        <button className={styles.navItem} onClick={onToggleTheme} title="Toggle Theme">
          <span className={styles.navIcon}>☽</span>
          <span className={styles.navLabel}>Theme</span>
        </button>
      </div>
    </aside>
  )
}
