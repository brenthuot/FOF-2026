'use client'
import { useState, useMemo } from 'react'
import type { ScoredPlayer } from '@/lib/types'
import { TypeBadge, TierBadge, RankBadge, edgeColor, fmt } from './PlayerRow'

// ── Watchlist ─────────────────────────────────────────────────────────────
const WATCHLIST_HIGH = new Set([
  'maikel-garcia',
  'geraldo-perdomo',
])

const WATCHLIST_NORMAL = new Set([
  'kyle-stowers', 'emmet-sheehan', 'jarren-duran', 'jonathan-aranda',
  'sal-stewart', 'addison-barger', 'trevor-rogers', 'bubba-chandler',
  'agust-n-ram-rez', 'alejandro-kirk', 'cam-schlittler', 'brice-turang',
  'max-muncy', 'andrew-vaughn', 'jac-caglianone', 'jacob-misiorowski',
  'brendan-donovan', 'konnor-griffin', 'kevin-mcgonigle', 'trey-yesavage',
])

const ALL_WATCHLIST = new Set([
  ...Array.from(WATCHLIST_HIGH),
  ...Array.from(WATCHLIST_NORMAL),
])

// Target windows from 5 mock drafts — [pickMin, pickMax]
const TARGET_WINDOWS: Record<string, [number, number]> = {
  'brice-turang':      [40,  60],
  'jarren-duran':      [40,  65],
  'maikel-garcia':     [58,  85],
  'geraldo-perdomo':   [55,  80],
  'trey-yesavage':     [83,  98],
  'kyle-stowers':      [80, 110],
  'jacob-misiorowski': [98, 130],
  'agust-n-ram-rez':   [118, 145],
  'cam-schlittler':    [120, 150],
  'emmet-sheehan':     [120, 155],
  'trevor-rogers':     [80,  165],
  'bubba-chandler':    [145, 165],
  'alejandro-kirk':    [182, 200],
  'jac-caglianone':    [180, 225],
  'addison-barger':    [190, 228],
  'jonathan-aranda':   [208, 225],
  'sal-stewart':       [210, 228],
  'brendan-donovan':   [218, 230],
  'max-muncy':         [225, 230],
  'konnor-griffin':    [130, 190],
  'kevin-mcgonigle':   [140, 200],
  'andrew-vaughn':     [160, 215],
}

// Display label for HUD
const WATCHLIST_LABELS: Record<string, { short: string; pos: string }> = {
  'brice-turang':      { short: 'Turang',      pos: '2B' },
  'jarren-duran':      { short: 'Duran',        pos: 'OF' },
  'maikel-garcia':     { short: 'M.Garcia',     pos: '2B/3B' },
  'geraldo-perdomo':   { short: 'Perdomo',      pos: 'SS' },
  'trey-yesavage':     { short: 'Yesavage',     pos: 'SP' },
  'kyle-stowers':      { short: 'Stowers',      pos: 'OF' },
  'jacob-misiorowski': { short: 'Misiorowski',  pos: 'SP' },
  'agust-n-ram-rez':   { short: 'A.Ramirez',    pos: 'C' },
  'cam-schlittler':    { short: 'Schlittler',   pos: 'SP' },
  'emmet-sheehan':     { short: 'Sheehan',      pos: 'SP' },
  'trevor-rogers':     { short: 'T.Rogers',     pos: 'SP' },
  'bubba-chandler':    { short: 'Chandler',     pos: 'SP' },
  'alejandro-kirk':    { short: 'Kirk',         pos: 'C' },
  'jac-caglianone':    { short: 'Caglianone',   pos: '1B/OF' },
  'addison-barger':    { short: 'Barger',       pos: '3B/OF' },
  'jonathan-aranda':   { short: 'Aranda',       pos: '1B' },
  'sal-stewart':       { short: 'Sal Stewart',  pos: '1B' },
  'brendan-donovan':   { short: 'Donovan',      pos: '2B' },
  'max-muncy':         { short: 'Muncy',        pos: '3B' },
  'konnor-griffin':    { short: 'Griffin',      pos: 'SS' },
  'kevin-mcgonigle':   { short: 'McGonigle',    pos: 'SS' },
  'andrew-vaughn':     { short: 'Vaughn',       pos: '1B' },
}

function pickToRound(pick: number) {
  return Math.ceil(pick / 10)
}

function getWindowStatus(id: string, draftPick: number): 'before' | 'now' | 'overdue' | 'unknown' {
  const w = TARGET_WINDOWS[id]
  if (!w) return 'unknown'
  if (draftPick < w[0]) return 'before'
  if (draftPick <= w[1]) return 'now'
  return 'overdue'
}

function windowLabel(id: string): string {
  const w = TARGET_WINDOWS[id]
  if (!w) return '?'
  const r1 = pickToRound(w[0])
  const r2 = pickToRound(w[1])
  return r1 === r2 ? `R${r1}` : `R${r1}–${r2}`
}

type SortKey = 'rank' | 'blnd' | 'finalScore' | 'espnRank' | 'edge'
type FilterType = 'ALL' | 'H' | 'P' | 'WATCH'

interface Props {
  ranked: ScoredPlayer[]
  onSelect: (p: ScoredPlayer) => void
  onToggleDraft: (id: string) => void
  onToggleMyRoster: (id: string) => void
  draftedIds: Set<string>
  myRosterIds: Set<string>
  draftPick: number
}

// ── Watchlist HUD ─────────────────────────────────────────────────────────
function WatchlistHUD({
  ranked,
  draftPick,
  myRosterIds,
  onSelect,
}: {
  ranked: ScoredPlayer[]
  draftPick: number
  myRosterIds: Set<string>
  onSelect: (p: ScoredPlayer) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  const playerMap = useMemo(() => {
    const m: Record<string, ScoredPlayer> = {}
    ranked.forEach(p => { m[p.id] = p })
    return m
  }, [ranked])

  // Sort watchlist by target window start — soonest first
  const watchlistOrdered = useMemo(() => {
    return Array.from(ALL_WATCHLIST).sort((a, b) => {
      const wa = TARGET_WINDOWS[a]?.[0] ?? 999
      const wb = TARGET_WINDOWS[b]?.[0] ?? 999
      return wa - wb
    })
  }, [])

  const items = watchlistOrdered.map(id => {
    const player = playerMap[id]
    const status = getWindowStatus(id, draftPick)
    const isDrafted = player?.drafted ?? false
    const isOnRoster = myRosterIds.has(id)
    const label = WATCHLIST_LABELS[id]
    const isHigh = WATCHLIST_HIGH.has(id)
    return { id, player, status, isDrafted, isOnRoster, label, isHigh }
  })

  // Count how many are actively in window
  const inWindowCount = items.filter(i => i.status === 'now' && !i.isDrafted && !i.isOnRoster).length
  const overdueCount  = items.filter(i => i.status === 'overdue' && !i.isDrafted && !i.isOnRoster).length

  return (
    <div className="flex-shrink-0 border-b border-slate-700/50 bg-[#0a1628]">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-1.5">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <span>🎯 Watchlist</span>
          <span className="text-slate-600">{collapsed ? '▼' : '▲'}</span>
        </button>
        {inWindowCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-600/50 animate-pulse font-semibold">
            {inWindowCount} in window now
          </span>
        )}
        {overdueCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-700/50 font-semibold">
            {overdueCount} overdue
          </span>
        )}
        <span className="ml-auto text-[10px] text-slate-600">Pick #{draftPick}</span>
      </div>

      {/* Cards strip */}
      {!collapsed && (
        <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-thin">
          {items.map(({ id, player, status, isDrafted, isOnRoster, label, isHigh }) => {
            if (!label) return null
            const gone = isDrafted || isOnRoster

            const cardStyle =
              isOnRoster ? 'border-blue-700/60 bg-blue-950/30 opacity-60' :
              isDrafted  ? 'border-slate-700/30 bg-slate-900/20 opacity-40' :
              status === 'now'     ? 'border-amber-500/70 bg-amber-950/30' :
              status === 'overdue' ? 'border-red-600/60 bg-red-950/20' :
              isHigh               ? 'border-yellow-700/50 bg-yellow-950/10' :
                                     'border-slate-700/40 bg-slate-900/20'

            const statusBadge =
              isOnRoster ? <span className="text-blue-400">✓ Mine</span> :
              isDrafted  ? <span className="text-slate-600 line-through">Gone</span> :
              status === 'now'     ? <span className="text-amber-300 font-bold animate-pulse">▶ NOW</span> :
              status === 'overdue' ? <span className="text-red-400 font-bold">!! LATE</span> :
              <span className="text-slate-500">{windowLabel(id)}</span>

            return (
              <button
                key={id}
                onClick={() => player && onSelect(player)}
                disabled={!player || gone}
                className={`flex-shrink-0 flex flex-col gap-0.5 px-2.5 py-1.5 rounded border text-left transition-all hover:brightness-125 ${cardStyle}`}
                style={{ minWidth: '80px' }}
              >
                <div className="flex items-center gap-1">
                  {isHigh && !gone && <span className="text-[8px] text-yellow-400">⭐⭐</span>}
                  {!isHigh && !gone && <span className="text-[8px] text-blue-400">⭐</span>}
                  <span className={`text-[11px] font-semibold truncate ${gone ? 'text-slate-600' : 'text-white'}`}>
                    {label.short}
                  </span>
                </div>
                <div className="text-[9px] text-slate-500">{label.pos}</div>
                <div className="text-[9px] mt-0.5">{statusBadge}</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main DraftBoard ───────────────────────────────────────────────────────
export default function DraftBoard({
  ranked, onSelect, onToggleDraft, onToggleMyRoster,
  draftedIds, myRosterIds, draftPick,
}: Props) {
  const [search, setSearch]         = useState('')
  const [filterType, setFilterType] = useState<FilterType>('ALL')
  const [filterPos, setFilterPos]   = useState('ALL')
  const [sortKey, setSortKey]       = useState<SortKey>('rank')
  const [sortAsc, setSortAsc]       = useState(true)
  const [hideDrafted, setHideDrafted] = useState(false)

  // Top 300 + watchlist players ranked beyond 300
  const visiblePool = useMemo(() => {
    const top300 = ranked.slice(0, 300)
    const watchlistExtras = ranked.slice(300).filter(p => ALL_WATCHLIST.has(p.id))
    return [...top300, ...watchlistExtras]
  }, [ranked])

  const positions = useMemo(() => {
    const s = new Set<string>()
    visiblePool.forEach(p => p.position.split('/').forEach(pos => s.add(pos.trim())))
    return ['ALL', ...Array.from(s).sort()]
  }, [visiblePool])

  const filtered = useMemo(() => {
    let r = visiblePool
    if (hideDrafted) r = r.filter(p => !p.drafted)
    if (filterType === 'WATCH') r = r.filter(p => ALL_WATCHLIST.has(p.id))
    else if (filterType !== 'ALL') r = r.filter(p => p.type === filterType)
    if (filterPos !== 'ALL') r = r.filter(p => p.position.includes(filterPos))
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q),
      )
    }
    if (sortKey !== 'rank') {
      r = [...r].sort((a, b) => {
        const av = sortKey === 'edge' ? (a.edge ?? 0) :
                   sortKey === 'espnRank' ? (a.espnRank ?? 999) :
                   (a[sortKey] as number)
        const bv = sortKey === 'edge' ? (b.edge ?? 0) :
                   sortKey === 'espnRank' ? (b.espnRank ?? 999) :
                   (b[sortKey] as number)
        return sortAsc ? av - bv : bv - av
      })
    }
    return r
  }, [visiblePool, hideDrafted, filterType, filterPos, search, sortKey, sortAsc])

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc(a => !a)
    else { setSortKey(k); setSortAsc(k === 'rank') }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-slate-700">↕</span>
    return <span className="text-blue-400">{sortAsc ? '↑' : '↓'}</span>
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Watchlist HUD ── */}
      <WatchlistHUD
        ranked={ranked}
        draftPick={draftPick}
        myRosterIds={myRosterIds}
        onSelect={onSelect}
      />

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-[#0f1b2d]">
        <div className="relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search player…"
            className="w-44 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">✕</button>
          )}
        </div>

        <div className="flex rounded overflow-hidden border border-slate-700">
          {(['ALL','H','P','WATCH'] as FilterType[]).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                filterType === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {t === 'ALL' ? 'All' : t === 'H' ? 'Hitters' : t === 'P' ? 'Pitchers' : '⭐ Watchlist'}
            </button>
          ))}
        </div>

        <select
          value={filterPos}
          onChange={e => setFilterPos(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
        >
          {positions.map(p => <option key={p}>{p}</option>)}
        </select>

        <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideDrafted}
            onChange={e => setHideDrafted(e.target.checked)}
            className="accent-blue-500"
          />
          Hide drafted
        </label>

        <span className="ml-auto text-xs text-slate-600">
          {filtered.length} / {visiblePool.length} shown
        </span>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0d1c30]">
            <tr className="text-slate-500 uppercase tracking-wide text-[10px]">
              <th className="text-left px-3 py-2 w-8 cursor-pointer" onClick={() => toggleSort('rank')}># <SortIcon k="rank" /></th>
              <th className="text-left px-3 py-2">Player</th>
              <th className="text-center px-2 py-2">Pos</th>
              <th className="text-center px-2 py-2">Team</th>
              <th className="text-center px-2 py-2">T</th>
              <th className="text-right px-2 py-2 cursor-pointer" onClick={() => toggleSort('blnd')}>BLND <SortIcon k="blnd" /></th>
              <th className="text-right px-2 py-2 cursor-pointer" onClick={() => toggleSort('finalScore')}>Score <SortIcon k="finalScore" /></th>
              <th className="text-center px-2 py-2">Tier</th>
              <th className="text-center px-2 py-2 cursor-pointer" onClick={() => toggleSort('espnRank')}>ESPN <SortIcon k="espnRank" /></th>
              <th className="text-center px-2 py-2 cursor-pointer" onClick={() => toggleSort('edge')}>Edge <SortIcon k="edge" /></th>
              <th className="text-right px-2 py-2 text-emerald-700">R</th>
              <th className="text-right px-2 py-2 text-emerald-700">HR</th>
              <th className="text-right px-2 py-2 text-emerald-700">RBI</th>
              <th className="text-right px-2 py-2 text-emerald-700">SB</th>
              <th className="text-right px-2 py-2 text-emerald-700">OPS</th>
              <th className="text-right px-2 py-2 text-red-700">K</th>
              <th className="text-right px-2 py-2 text-red-700">QS</th>
              <th className="text-right px-2 py-2 text-red-700">ERA</th>
              <th className="text-right px-2 py-2 text-red-700">WHIP</th>
              <th className="text-right px-2 py-2 text-red-700">SV</th>
              <th className="text-center px-2 py-2 w-16">M / D</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const isDrafted      = p.drafted
              const isNewTier      = i > 0 && filtered[i-1].tier !== p.tier
              const isWatchHigh    = WATCHLIST_HIGH.has(p.id)
              const isWatchNormal  = WATCHLIST_NORMAL.has(p.id)
              const isWatch        = isWatchHigh || isWatchNormal
              const windowStatus   = isWatch ? getWindowStatus(p.id, draftPick) : null
              const isInWindow     = windowStatus === 'now'
              const isOverdue      = windowStatus === 'overdue'

              // Row background priority: in-window > overdue > high > normal > default
              const rowBg =
                isDrafted   ? '' :
                isInWindow  ? 'bg-amber-950/30' :
                isOverdue   ? 'bg-red-950/20' :
                isWatchHigh ? 'bg-yellow-950/20' :
                isWatchNormal ? 'bg-blue-950/10' :
                ''

              // Left border for watchlist rows
              const rowBorder =
                !isDrafted && isInWindow  ? 'border-l-2 border-amber-400' :
                !isDrafted && isOverdue   ? 'border-l-2 border-red-500' :
                !isDrafted && isWatchHigh ? 'border-l-2 border-yellow-700' :
                !isDrafted && isWatchNormal ? 'border-l-2 border-blue-800' :
                ''

              return (
                <>
                  {isNewTier && (
                    <tr key={`tier-${p.tier}`}>
                      <td colSpan={21} className="py-0">
                        <div className="border-t border-dashed border-slate-700/50 my-0" />
                      </td>
                    </tr>
                  )}
                  <tr
                    key={p.id}
                    onClick={() => onSelect(p)}
                    className={`cursor-pointer transition-colors border-b border-slate-800/50 ${rowBg} ${rowBorder} ${isDrafted ? 'opacity-30' : 'hover:bg-slate-800/40'}`}
                  >
                    <td className="px-3 py-2"><RankBadge rank={p.rank} tier={p.tier} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <TypeBadge type={p.type} />
                        <span className={`font-medium ${isDrafted ? 'line-through text-slate-600' : 'text-white'}`}>
                          {p.name}
                        </span>
                        {/* Watchlist badge */}
                        {isWatchHigh && !isDrafted && (
                          <span className={`text-[9px] border px-1 py-0.5 rounded font-bold ${
                            isInWindow  ? 'bg-amber-500/30 text-amber-200 border-amber-500/60 animate-pulse' :
                            isOverdue   ? 'bg-red-500/20 text-red-300 border-red-600/50' :
                                          'bg-yellow-500/20 text-yellow-300 border-yellow-600/50'
                          }`}>
                            {isInWindow ? '⭐⭐ NOW' : isOverdue ? '⭐⭐ LATE' : '⭐⭐'}
                          </span>
                        )}
                        {isWatchNormal && !isDrafted && (
                          <span className={`text-[9px] border px-1 py-0.5 rounded ${
                            isInWindow ? 'bg-amber-500/20 text-amber-300 border-amber-600/50 animate-pulse' :
                            isOverdue  ? 'bg-red-500/20 text-red-300 border-red-600/50' :
                                         'bg-blue-500/20 text-blue-300 border-blue-600/50'
                          }`}>
                            {isInWindow ? '⭐ NOW' : isOverdue ? '⭐ LATE' : '⭐'}
                          </span>
                        )}
                        {/* Target window pill */}
                        {isWatch && !isDrafted && windowStatus && (
                          <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                            isInWindow ? 'text-amber-400' :
                            isOverdue  ? 'text-red-400' :
                            'text-slate-600'
                          }`}>
                            {windowLabel(p.id)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center text-slate-400">{p.position}</td>
                    <td className="px-2 py-2 text-center text-slate-500">{p.team}</td>
                    <td className="px-2 py-2 text-center text-slate-600">{p.type}</td>
                    <td className="px-2 py-2 text-right font-mono text-slate-300">{p.blnd.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right font-mono text-blue-300 font-semibold">{p.finalScore.toFixed(3)}</td>
                    <td className="px-2 py-2 text-center"><TierBadge tier={p.tier} /></td>
                    <td className="px-2 py-2 text-center text-slate-500 font-mono">{p.espnRank ?? '—'}</td>
                    <td className={`px-2 py-2 text-center font-mono ${edgeColor(p.edge)}`}>
                      {p.edge != null ? (p.edge > 0 ? `+${p.edge}` : p.edge) : '—'}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.r)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.hr)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.rbi)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.sb)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.ops, 3)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.k)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.qs)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.era, 2)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.whip, 2)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.sv)}</td>
                    <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          onClick={() => onToggleMyRoster(p.id)}
                          title="Add to my team"
                          className={`w-5 h-5 rounded-full border text-[9px] font-bold transition-colors ${
                            myRosterIds.has(p.id)
                              ? 'bg-blue-500 border-blue-400 text-white'
                              : 'border-blue-700 text-blue-700 hover:bg-blue-500 hover:border-blue-400 hover:text-white'
                          }`}
                        >M</button>
                        <button
                          onClick={() => onToggleDraft(p.id)}
                          title="Mark as drafted"
                          className={`w-5 h-5 rounded-full border text-[9px] font-bold transition-colors ${
                            isDrafted && !myRosterIds.has(p.id)
                              ? 'bg-amber-500 border-amber-400 text-white'
                              : 'border-slate-600 text-slate-600 hover:bg-amber-500 hover:border-amber-400 hover:text-white'
                          }`}
                        >D</button>
                      </div>
                    </td>
                  </tr>
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
