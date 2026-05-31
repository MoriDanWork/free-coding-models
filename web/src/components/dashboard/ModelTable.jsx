/**
 * @file web/src/components/dashboard/ModelTable.jsx
 * @description Main data table with ALL CLI columns powered by TanStack Table.
 * 📖 Full CLI column parity: ❔(mood) | # | Tier | SWE% | Ctx | Model | Provider | Last Ping | Avg | Health | Verdict | Stability | Up% | AI Lat. | TPS | Trend
 * 📖 Clickable headers for sorting, medal rankings for top 3, horizontal scroll.
 * 📖 Sorting is handled by useFilter hook which pushes null/Infinity values to bottom.
 */
import { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'

import MoodCell from '../atoms/MoodCell.jsx'
import TierBadge from '../atoms/TierBadge.jsx'
import StatusDot from '../atoms/StatusDot.jsx'
import LastPingCell from '../atoms/LastPingCell.jsx'
import HealthCell from '../atoms/HealthCell.jsx'
import StabilityCell from '../atoms/StabilityCell.jsx'
import VerdictBadge from '../atoms/VerdictBadge.jsx'
import Sparkline from '../atoms/Sparkline.jsx'
import AILatencyCell from '../atoms/AILatencyCell.jsx'
import TPSCell from '../atoms/TPSCell.jsx'

import { pingClass } from '../../utils/format.js'
import { sweClass } from '../../utils/ranks.js'
import styles from './ModelTable.module.css'

const colHelper = createColumnHelper()

// ─── Cell renderers ───────────────────────────────────────────────────────────
function MoodCellRenderer({ row }) {
  return <MoodCell verdict={row.original.verdict} />
}

function RankCellRenderer({ row }) {
  return <span className={styles.rankNum}>{row.original.idx ?? row.index + 1}</span>
}

function ModelCellRenderer({ row }) {
  const m = row.original
  return (
    <div className={styles.modelCell}>
      <StatusDot status={m.status} />
      <div className={styles.modelMeta}>
        <div className={styles.modelHeader}>
          <span className={styles.modelName}>{m.label}</span>
          {!m.hasApiKey && !m.cliOnly && <span className={styles.noKey}>NO KEY</span>}
        </div>
        <div className={styles.modelId}>{m.modelId}</div>
      </div>
    </div>
  )
}

function SWECellRenderer({ row }) {
  const m = row.original
  const cls = sweClass(m.sweScore)
  return <span className={`${styles.swe} ${styles[cls]}`}>{m.sweScore || '—'}</span>
}

function CtxCellRenderer({ row }) {
  return <span className={styles.ctx}>{row.original.ctx || '—'}</span>
}

function ProviderCellRenderer({ row }) {
  return <span className={styles.providerPill}>{row.original.origin}</span>
}

function LastPingCellRenderer({ row }) {
  const m = row.original
  const hist = m.pingHistory || m.pings || []
  const latest = hist.length > 0 ? hist[hist.length - 1] : null
  return <LastPingCell ms={latest?.ms ?? null} isPinging={m.isPinging || false} />
}

function AvgPingCellRenderer({ row }) {
  const m = row.original
  const cls = pingClass(m.avg)
  return (
    <span className={`${styles.ping} ${styles[cls]}`}>
      {m.avg == null || m.avg === Infinity || m.avg > 99000 ? '—' : `${m.avg}ms`}
    </span>
  )
}

function HealthCellRenderer({ row }) {
  const m = row.original
  return <HealthCell status={m.status} httpCode={m.httpCode} />
}

function VerdictCellRenderer({ row }) {
  const m = row.original
  return <VerdictBadge verdict={m.verdict} httpCode={m.httpCode} />
}

function StabilityCellRenderer({ row }) {
  return <StabilityCell score={row.original.stability} />
}

function UptimeCellRenderer({ row }) {
  const m = row.original
  return <span className={styles.uptime}>{m.uptime > 0 ? `${m.uptime}%` : '—'}</span>
}

function AILatencyCellRenderer({ row }) {
  const m = row.original
  return <AILatencyCell result={m.benchmark || null} isRunning={false} frame={0} />
}

function TPSCellRenderer({ row }) {
  const m = row.original
  return <TPSCell result={m.benchmark || null} isRunning={false} frame={0} />
}

function TrendCellRenderer({ row }) {
  return <Sparkline history={row.original.pingHistory} />
}

// ─── Column definitions ──────────────────────────────────────────────────────
const columns = [
  colHelper.display({
    id: 'mood',
    header: '❔',
    size: 28,
    cell: MoodCellRenderer,
    enableSorting: true,
  }),
  colHelper.accessor('idx', {
    header: '#',
    size: 36,
    cell: ({ getValue, row }) => (
      <span className={styles.rankNum}>{getValue() ?? row.index + 1}</span>
    ),
  }),
  colHelper.accessor('tier', {
    header: 'Tier',
    size: 48,
    cell: ({ getValue }) => <TierBadge tier={getValue()} />,
  }),
  colHelper.accessor('sweScore', {
    header: 'SWE%',
    size: 52,
    cell: SWECellRenderer,
  }),
  colHelper.accessor('ctx', {
    header: 'CTX',
    size: 48,
    cell: CtxCellRenderer,
  }),
  colHelper.accessor('label', {
    header: 'Model',
    size: 200,
    cell: ModelCellRenderer,
  }),
  colHelper.accessor('origin', {
    header: 'Provider',
    size: 110,
    cell: ProviderCellRenderer,
  }),
  colHelper.display({
    id: 'latestPing',
    header: 'Last Ping',
    size: 80,
    cell: LastPingCellRenderer,
    enableSorting: true,
  }),
  colHelper.accessor('avg', {
    header: 'Avg',
    size: 72,
    cell: AvgPingCellRenderer,
  }),
  colHelper.accessor('status', {
    id: 'condition',
    header: 'Health',
    size: 120,
    cell: HealthCellRenderer,
  }),
  colHelper.accessor('verdict', {
    header: 'Verdict',
    size: 100,
    cell: VerdictCellRenderer,
  }),
  colHelper.accessor('stability', {
    header: 'Stability',
    size: 90,
    cell: StabilityCellRenderer,
  }),
  colHelper.accessor('uptime', {
    header: 'Up%',
    size: 48,
    cell: UptimeCellRenderer,
  }),
  colHelper.display({
    id: 'aiLatency',
    header: 'AI Lat.',
    size: 80,
    cell: AILatencyCellRenderer,
    enableSorting: true,
  }),
  colHelper.display({
    id: 'tps',
    header: 'TPS',
    size: 48,
    cell: TPSCellRenderer,
    enableSorting: true,
  }),
  colHelper.display({
    id: 'trend',
    header: 'Trend',
    size: 96,
    cell: TrendCellRenderer,
  }),
]

// ─── Sort icon component ────────────────────────────────────────────────────
function SortIcon({ column }) {
  if (!column.getCanSort()) return null
  const sorted = column.getIsSorted()
  if (!sorted) return <span className={styles.sortIcon}>⇅</span>
  return <span className={styles.sortIconActive}>{sorted === 'asc' ? '↑' : '↓'}</span>
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ModelTable({ filtered, onSelectModel, sortColumn, sortDirection, onSort }) {
  // Compute top3 for medal rows
  const top3Ids = useMemo(() => {
    const online = filtered.filter(m => m.status === 'up' && m.avg != null && m.avg !== Infinity && m.avg < 99000)
    return new Set([...online].sort((a, b) => a.avg - b.avg).slice(0, 3).map(m => m.modelId))
  }, [filtered])

  // TanStack Table — no getSortedRowModel, sorting lives in useFilter
  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const rows = table.getRowModel().rows

  if (rows.length === 0) {
    return <div className={styles.empty}>No models match your filters</div>
  }

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const col = header.column
                const canSort = col.getCanSort()
                return (
                  <th
                    key={header.id}
                    className={styles.th}
                    onClick={canSort ? () => onSort(header.id) : undefined}
                    style={{ cursor: canSort ? 'pointer' : 'default' }}
                    title={col.columnDef.header}
                  >
                    {flexRender(col.columnDef.header, header.getContext())}
                    {canSort && (
                      <span className={
                        sortColumn === col.id
                          ? styles.sortIconActive
                          : styles.sortIcon
                      }>
                        {sortColumn === col.id
                          ? (sortDirection === 'asc' ? '↑' : '↓')
                          : '⇅'}
                      </span>
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const rankIdx = [...top3Ids].indexOf(row.original.modelId)
            const rowClass = rankIdx >= 0 ? styles[`rank${rankIdx + 1}`] : ''
            return (
              <tr
                key={row.id}
                className={rowClass}
                onClick={() => onSelectModel(row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className={styles.td}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}