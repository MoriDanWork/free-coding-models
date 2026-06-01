/**
 * @file web/src/App.jsx
 * @description Root application component — orchestrates all views, header nav, Socket.IO
 * connection, toast notifications, and global state. M2 layout: no sidebar, header
 * menu + ⌘K palette, full Settings parity, Help + Changelog modals, UpdateChip,
 * URL write-back.
 *
 * 📖 M2 additions on top of M1:
 * 📖   - Full command palette (TUI registry via `buildCommandPaletteEntries`)
 * 📖   - HelpView modal (TUI parity help)
 * 📖   - ChangelogView modal (2-phase: index + details)
 * 📖   - UpdateChip in header (polls /api/version, popover with "Update now" + "What's new")
 * 📖   - URL write-back (every filter / sort / view / palette / toolMode change
 * 📖     updates the URL via history.replaceState, debounced at 80ms)
 * 📖   - New Settings rows: theme dropdown, favorites mode toggle, startup AI scan
 * 📖     toggle, shell-env toggle, legacy proxy cleanup button, open Changelog link,
 * 📖     update status row, per-provider test key button
 *
 * @functions App → root component with all state and layout composition
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useSocket } from './hooks/useSocket.js'
import { useFilter } from './hooks/useFilter.js'
import { useTheme } from './hooks/useTheme.js'
import { useFavorites } from './hooks/useFavorites.js'
import { useUrlState } from './hooks/useUrlState.js'
import { useUpdateChecker } from './hooks/useUpdateChecker.js'
import Header from './components/layout/Header.jsx'
import Footer from './components/layout/Footer.jsx'
import FilterBar from './components/dashboard/FilterBar.jsx'
import ModelTable from './components/dashboard/ModelTable.jsx'
import DetailPanel from './components/dashboard/DetailPanel.jsx'
import ExportModal from './components/dashboard/ExportModal.jsx'
import SettingsView from './components/settings/SettingsView.jsx'
import AnalyticsView from './components/analytics/AnalyticsView.jsx'
import CommandPalette from './components/palette/CommandPalette.jsx'
import HelpView from './components/help/HelpView.jsx'
import ChangelogView from './components/changelog/ChangelogView.jsx'
import UpdateChip from './components/update/UpdateChip.jsx'
import ToastContainer from './components/atoms/ToastContainer.jsx'

let toastIdCounter = 0

const VIEW_TO_NAV = {
  dashboard: 'dashboard',
  settings: 'settings',
  analytics: 'analytics',
  recommend: 'recommend',
  router: 'router',
}

export default function App() {
  const { models, connected, nextPingAt, isPinging, pingMode, globalBenchmarkRunning, globalBenchmarkTotal, globalBenchmarkCompleted } = useSocket()
  const { theme, cycle: cycleTheme } = useTheme()
  const [currentView, setCurrentView] = useState('dashboard')
  const [selectedModel, setSelectedModel] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [changelogDefaultVersion, setChangelogDefaultVersion] = useState(null)
  const [toolMode, setToolMode] = useState(null) // 📖 M3 will use this; the row highlighter already keys off it
  const [toasts, setToasts] = useState([])
  const lastActivityRef = useRef(Date.now())

  const {
    filtered,
    filterTier, setFilterTier,
    filterStatus, setFilterStatus,
    filterProvider, setFilterProvider,
    filterVerdict, setFilterVerdict,
    filterHealth, setFilterHealth,
    visibilityMode, setVisibilityMode,
    searchQuery, setSearchQuery,
    customTextFilter, setCustomTextFilter,
    sortColumn, sortDirection, setSortColumn, setSortDirection, toggleSort,
    resetView,
  } = useFilter(models)

  // 📖 URL deep-linking (M2 = read + write). Hydrates on mount, then pushes
  // 📖 every change back via history.replaceState (debounced 80ms).
  useUrlState({
    currentView, setCurrentView,
    filterState: {
      filterTier, setFilterTier,
      filterStatus, setFilterStatus,
      filterProvider, setFilterProvider,
      filterVerdict, setFilterVerdict,
      filterHealth, setFilterHealth,
      sortColumn, sortDirection, setSortColumn, setSortDirection, toggleSort,
      setSearchQuery,
      filterState: null, // sentinel; useFilter doesn't expose this name
      searchQuery,
    },
    paletteOpen, setPaletteOpen,
    toolMode, setToolMode,
  })

  // 📖 Favorites — single source of truth shared with the TUI.
  const favorites = useFavorites({ models })

  // 📖 Update checker (5-minute poll). Returns `updateAvailable` for the chip.
  const {
    localVersion, latestVersion, updateAvailable, runUpdate, checkNow, error: updateError,
  } = useUpdateChecker({ onToast: addToastInternal })

  // 📖 Build the provider list for the FilterBar dropdown.
  const providers = useMemo(() => {
    const map = {}
    models.forEach((m) => {
      if (!map[m.providerKey]) map[m.providerKey] = { key: m.providerKey, name: m.origin, count: 0 }
      map[m.providerKey].count++
    })
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }, [models])

  // ── Global benchmark (AI Speed Test) ─────────────────────────────────────
  const handleBenchmark = useCallback(async () => {
    if (globalBenchmarkRunning) return
    try {
      await fetch('/api/global-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models: filtered.map((model) => ({ providerKey: model.providerKey, modelId: model.modelId })),
        }),
      })
    } catch (err) {
      console.error('[Benchmark] Failed to start global benchmark:', err.message)
    }
  }, [filtered, globalBenchmarkRunning])

  // ── Per-model benchmark (M1 parity with TUI Ctrl+A) ──────────────────────
  const handleBenchmarkRow = useCallback(async (model) => {
    try {
      const resp = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerKey: model.providerKey, modelId: model.modelId }),
      })
      if (!resp.ok && resp.status !== 202) {
        const err = await resp.json().catch(() => ({}))
        addToastInternal?.(`Benchmark failed: ${err?.error || resp.statusText}`, 'error')
      }
    } catch (err) {
      console.error('[Benchmark] per-row failed:', err.message)
    }
  }, [])

  // ── Toast helpers ────────────────────────────────────────────────────────
  function addToastInternal(message, type = 'info') {
    const id = ++toastIdCounter
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }
  const addToast = useCallback(addToastInternal, [])
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ── Selection / detail panel ─────────────────────────────────────────────
  const handleSelectModel = useCallback((model) => {
    setSelectedModel(model)
    lastActivityRef.current = Date.now()
  }, [])
  const handleCloseDetail = useCallback(() => setSelectedModel(null), [])

  // ── Ping mode change → server → broadcast ─────────────────────────────
  const handlePingModeChange = useCallback(async (mode) => {
    try {
      await fetch(`/api/ping-mode?action=${mode}`, { method: 'POST' })
    } catch {}
  }, [])

  // ── Navigation handler (Header nav + overflow menu) ──────────────────────
  const handleNavigate = useCallback((viewId) => {
    // 📖 'help' / 'changelog' / 'recommend' / 'router' open modals (M2) or
    // 📖 toasts (M3/M4) — they don't switch the currentView.
    if (viewId === 'help') { setHelpOpen(true); return }
    if (viewId === 'changelog') { setChangelogOpen(true); setChangelogDefaultVersion(null); return }
    if (viewId === 'recommend') { addToast?.('Smart Recommend arrives in M3', 'info'); return }
    if (viewId === 'router') { addToast?.('Router dashboard arrives in M4', 'info'); return }
    if (viewId === 'install-endpoints') { addToast?.('Install Endpoints arrives in M4', 'info'); return }
    if (viewId === 'installed-models') { addToast?.('Installed Models arrives in M4', 'info'); return }
    setCurrentView(VIEW_TO_NAV[viewId] || viewId)
    lastActivityRef.current = Date.now()
  }, [addToast])

  // ── Reset view (N key equivalent) ────────────────────────────────────────
  const handleResetView = useCallback(() => {
    resetView()
    setSearchQuery('')
    addToastInternal('View reset to defaults.', 'info')
  }, [resetView, setSearchQuery])

  // ── Changelog open with optional version (e.g. from UpdateChip "What's new") ─
  const openChangelogAt = useCallback((version) => {
    setChangelogDefaultVersion(version)
    setChangelogOpen(true)
  }, [])

  // ── Keyboard shortcuts: only ⌘K / Ctrl+P for the palette, Esc for any modal ─
  useEffect(() => {
    const handler = (e) => {
      const cmdOrCtrl = e.metaKey || e.ctrlKey
      if (cmdOrCtrl && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setPaletteOpen((o) => !o)
        return
      }
      if (cmdOrCtrl && (e.key === 'p' || e.key === 'P') && !e.shiftKey) {
        e.preventDefault()
        setPaletteOpen((o) => !o)
        return
      }
      if (e.key === 'Escape') {
        if (paletteOpen) { setPaletteOpen(false); return }
        if (helpOpen) { setHelpOpen(false); return }
        if (changelogOpen) { setChangelogOpen(false); return }
        if (selectedModel) { setSelectedModel(null); return }
        if (exportOpen) { setExportOpen(false); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [paletteOpen, helpOpen, changelogOpen, selectedModel, exportOpen])

  return (
    <>
      <div className="app-shell">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentView={currentView}
          onNavigate={handleNavigate}
          onToggleTheme={cycleTheme}
          onOpenExport={() => setExportOpen(true)}
          onOpenCommandPalette={() => setPaletteOpen(true)}
          onBenchmark={handleBenchmark}
          benchmarkRunning={globalBenchmarkRunning}
          benchmarkTotal={globalBenchmarkTotal}
          benchmarkCompleted={globalBenchmarkCompleted}
          modelsCount={filtered.length}
          theme={theme}
          onToast={addToast}
          updateSlot={
            <UpdateChip
              updateAvailable={updateAvailable}
              latestVersion={latestVersion}
              onRunUpdate={runUpdate}
              onOpenChangelog={openChangelogAt}
            />
          }
        />

        <div className="app-content">
          {currentView === 'dashboard' && (
            <div className="view">
              <FilterBar
                filterTier={filterTier}
                setFilterTier={setFilterTier}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                filterProvider={filterProvider}
                setFilterProvider={setFilterProvider}
                filterVerdict={filterVerdict}
                setFilterVerdict={setFilterVerdict}
                filterHealth={filterHealth}
                setFilterHealth={setFilterHealth}
                visibilityMode={visibilityMode}
                setVisibilityMode={setVisibilityMode}
                customTextFilter={customTextFilter}
                setCustomTextFilter={setCustomTextFilter}
                searchQuery={searchQuery}
                onResetView={handleResetView}
                providers={providers}
                pingMode={pingMode}
                setPingMode={handlePingModeChange}
                nextPingAt={nextPingAt}
                isPinging={isPinging}
                globalBenchmarkRunning={globalBenchmarkRunning}
                globalBenchmarkTotal={globalBenchmarkTotal}
                globalBenchmarkCompleted={globalBenchmarkCompleted}
              />
              <ModelTable
                filtered={filtered}
                onSelectModel={handleSelectModel}
                onBenchmarkRow={handleBenchmarkRow}
                favorites={favorites}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                toolMode={toolMode}
              />
            </div>
          )}

          {currentView === 'settings' && (
            <div className="view">
              <SettingsView
                onToast={addToast}
                onOpenChangelog={(version) => { setChangelogDefaultVersion(version); setChangelogOpen(true) }}
                onCheckForUpdate={() => { checkNow(); addToast?.('Checking for updates…', 'info') }}
              />
            </div>
          )}

          {currentView === 'analytics' && (
            <div className="view">
              <AnalyticsView models={models} />
            </div>
          )}

          <Footer />
        </div>
      </div>

      <DetailPanel
        model={selectedModel}
        onClose={handleCloseDetail}
        favorites={favorites}
        onBenchmark={handleBenchmarkRow}
        onToast={addToast}
      />

      {exportOpen && (
        <ExportModal
          models={filtered}
          onClose={() => setExportOpen(false)}
          onToast={addToast}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onNavigate={handleNavigate}
          onCycleTheme={cycleTheme}
          onResetView={handleResetView}
          onSetPingMode={handlePingModeChange}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenChangelog={() => { setChangelogDefaultVersion(null); setChangelogOpen(true) }}
          onExport={() => setExportOpen(true)}
          onRunUpdate={runUpdate}
          currentView={currentView}
          theme={theme}
          pingMode={pingMode}
          models={models}
          updateAvailable={updateAvailable}
          latestVersion={latestVersion}
          onToast={addToast}
        />
      )}

      {helpOpen && <HelpView onClose={() => setHelpOpen(false)} />}
      {changelogOpen && (
        <ChangelogView
          onClose={() => setChangelogOpen(false)}
          defaultVersion={changelogDefaultVersion}
        />
      )}

      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </>
  )
}
