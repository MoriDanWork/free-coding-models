/**
 * @file web/src/App.jsx
 * @description Root application component — orchestrates all views, layout, Socket.IO connection, and global state.
 * 📖 Manages current view (dashboard/settings/analytics), theme toggle, search, filters,
 * selected model for detail panel, export modal, toast notifications, ping mode, and benchmark.
 * Uses useSocket for live data, useFilter for model filtering/sorting, useTheme for dark/light.
 * @functions App → root component with all state and layout composition
 */
import { useState, useCallback, useEffect } from 'react'
import { useSocket } from './hooks/useSocket.js'
import { useFilter } from './hooks/useFilter.js'
import { useTheme } from './hooks/useTheme.js'
import Header from './components/layout/Header.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import Footer from './components/layout/Footer.jsx'
import StatsBar from './components/dashboard/StatsBar.jsx'
import FilterBar from './components/dashboard/FilterBar.jsx'
import ModelTable from './components/dashboard/ModelTable.jsx'
import DetailPanel from './components/dashboard/DetailPanel.jsx'
import ExportModal from './components/dashboard/ExportModal.jsx'
import SettingsView from './components/settings/SettingsView.jsx'
import AnalyticsView from './components/analytics/AnalyticsView.jsx'
import MapView from './components/map/MapView.jsx'
import ToastContainer from './components/atoms/ToastContainer.jsx'

let toastIdCounter = 0

export default function App() {
  const { models, connected, nextPingAt, isPinging, pingMode, globalBenchmarkRunning, globalBenchmarkTotal, globalBenchmarkCompleted } = useSocket('http://localhost:3333')
  const { theme, toggle: toggleTheme } = useTheme()
  const [currentView, setCurrentView] = useState('dashboard')
  const [selectedModel, setSelectedModel] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [localPingMode, setLocalPingMode] = useState('speed')

  const {
    filtered,
    filterTier, setFilterTier,
    filterStatus, setFilterStatus,
    filterProvider, setFilterProvider,
    searchQuery, setSearchQuery,
    sortColumn, sortDirection, toggleSort,
  } = useFilter(models)

  const providers = (() => {
    const map = {}
    models.forEach((m) => {
      if (!map[m.providerKey]) map[m.providerKey] = { key: m.providerKey, name: m.origin, count: 0 }
      map[m.providerKey].count++
    })
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  })()

  // ── Global AI Speed Benchmark (Ctrl+U equivalent) ──
  const handleBenchmark = useCallback(async () => {
    if (globalBenchmarkRunning) {
      console.warn('[Benchmark] Global benchmark already in progress.')
      return
    }
    try {
      await fetch('http://localhost:3333/api/global-benchmark', { method: 'POST' })
    } catch (err) {
      console.error('[Benchmark] Failed to start global benchmark:', err.message)
    }
  }, [globalBenchmarkRunning])

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdCounter
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleSelectModel = useCallback((model) => {
    setSelectedModel(model)
  }, [])

  const handleCloseDetail = useCallback(() => setSelectedModel(null), [])

  // ── Ping mode: sync with backend ──
  const handlePingModeChange = useCallback(async (mode) => {
    setLocalPingMode(mode)
    try {
      await fetch(`http://localhost:3333/api/ping-mode?action=${mode}`, { method: 'POST' })
    } catch {}
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (currentView !== 'dashboard') setCurrentView('dashboard')
      }
      if (e.key === 'Escape') {
        setSelectedModel(null)
        setExportOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentView])

  return (
    <>
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        onToggleTheme={toggleTheme}
        theme={theme}
      />

      <div className="app-content">
        {currentView === 'dashboard' && (
          <div className="view">
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleTheme={toggleTheme}
              onOpenSettings={() => setCurrentView('settings')}
              onOpenExport={() => setExportOpen(true)}
              onBenchmark={handleBenchmark}
              benchmarkRunning={globalBenchmarkRunning}
              modelsCount={models.length}
              theme={theme}
            />
            <StatsBar models={models} />
            <FilterBar
              filterTier={filterTier}
              setFilterTier={setFilterTier}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterProvider={filterProvider}
              setFilterProvider={setFilterProvider}
              providers={providers}
              pingMode={localPingMode}
              setPingMode={handlePingModeChange}
              nextPingAt={nextPingAt}
              isPinging={isPinging}
            />
            <ModelTable
              filtered={filtered}
              onSelectModel={handleSelectModel}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={toggleSort}
              globalBenchmarkRunning={globalBenchmarkRunning}
              globalBenchmarkTotal={globalBenchmarkTotal}
              globalBenchmarkCompleted={globalBenchmarkCompleted}
            />
          </div>
        )}

        {currentView === 'settings' && (
          <div className="view">
            <SettingsView onToast={addToast} />
          </div>
        )}

        {currentView === 'analytics' && (
          <div className="view">
            <AnalyticsView models={models} />
          </div>
        )}

        {currentView === 'map' && (
          <div className="view">
            <MapView />
          </div>
        )}

        <Footer />
      </div>

      <DetailPanel
        model={selectedModel}
        onClose={handleCloseDetail}
      />

      {exportOpen && (
        <ExportModal
          models={filtered}
          onClose={() => setExportOpen(false)}
          onToast={addToast}
        />
      )}

      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </>
  )
}