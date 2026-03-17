'use client'
import { useMemo, useState } from 'react'
import type { ScoredPlayer } from '@/lib/types'
import { TypeBadge, edgeColor } from './PlayerRow'

interface TargetDef {
  id: string
  roundMin: number
  roundMax: number
  note: string
  priority: 'high' | 'med' | 'low'
}

// Pre-defined draft targets with round ranges
// Focused on SB + positional value to complement punt-saves strategy
const TARGETS: TargetDef[] = [
  // Elite — watch for falls
  { id: 'elly-de-la-cruz',       roundMin: 2,  roundMax: 4,  note: 'Elite SB + SS, 55+ steals', priority: 'high' },
  { id: 'corbin-carroll',        roundMin: 2,  roundMax: 5,  note: '35+ SB, OF speed', priority: 'high' },
  { id: 'bobby-witt-jr-',        roundMin: 1,  roundMax: 2,  note: 'Elite everything + 30 SB', priority: 'high' },
  // Primary R4-7
  { id: 'jazz-chisholm-jr-',     roundMin: 4,  roundMax: 7,  note: '2B/OF, 25+ SB, fills 2B need ⭐', priority: 'high' },
  { id: 'jackson-chourio',       roundMin: 4,  roundMax: 7,  note: '30+ SB + HR upside', priority: 'high' },
  { id: 'cj-abrams',             roundMin: 6,  roundMax: 9,  note: 'SS, 30+ SB, positional value', priority: 'med' },
  // Secondary R8-12
  { id: 'wyatt-langford',        roundMin: 7,  roundMax: 11, note: '20+ SB, OF', priority: 'med' },
  { id: 'jarren-duran',          roundMin: 8,  roundMax: 12, note: '25+ SB, contact OF', priority: 'med' },
  { id: 'pete-crow-armstrong',   roundMin: 9,  roundMax: 13, note: '20+ SB, low power', priority: 'med' },
  { id: 'michael-harris-ii',     roundMin: 9,  roundMax: 13, note: '15+ SB, contact OF', priority: 'med' },
  // Late fliers R15-20
  { id: 'ceddanne-rafaela',      roundMin: 15, roundMax: 20, note: '15+ SB late flier', priority: 'low' },
  { id: 'steven-kwan',           roundMin: 15, roundMax: 20, note: '15+ SB, on-base', priority: 'low' },
  { id: 'geraldo-perdomo',       roundMin: 16, roundMax: 22, note: 'SS, 15+ SB, weak bat', priority: 'low' },
  { id: 'lane-thomas',           roundMin: 17, roundMax: 23, note: '15+ SB deep flier', priority: 'low' },
]

interface Props {
  ranked: ScoredPlayer[]
  draftedIds: Set<string>
  myRosterIds: Set<string>
  currentRound: number
  onSelect: (p: ScoredPlayer) => void
  onClose: () => void
}

export default function DraftTargets({ ranked, draftedIds, myRosterIds, currentRound, onSelect, onClose }: Props) {
  const [filter, setFilter] = useState<'all' | 'available' | 'reached' | 'gone'>('all')

  const playerMap = useMemo(() => {
    const m: Record<string, ScoredPlayer> = {}
    for (const p of ranked) m[p.id] = p
    return m
  }, [ranked])

  const enriched = useMemo(() => {
    return TARGETS.map(t => {
      const player = playerMap[t.id]
      const drafted = draftedIds.has(t.id)
      const onMyRoster = myRosterIds.has(t.id)
      const available = !drafted
      const inWindow = currentRound >= t.roundMin && currentRound <= t.roundMax
      const pastWindow = currentRound > t.roundMax
      const beforeWindow = currentRound < t.roundMin

      let status: 'on-roster' | 'gone' | 'available-now' | 'available-soon' | 'available-late' | 'reached'
      if (onMyRoster)         status = 'on-roster'
      else if (drafted)       status = 'gone'
      else if (inWindow)      status = 'available-now'
      else if (beforeWindow)  status = 'available-soon'
      else if (pastWindow && available) status = 'reached'  // still available past ideal window
      else                    status = 'available-late'

      return { ...t, player, drafted, onMyRoster, available, inWindow, pastWindow, beforeWindow, status }
    })
  }, [playerMap, draftedIds, myRosterIds, currentRound])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'available': return enriched.filter(t => t.available && !t.onMyRoster)
      case 'reached':   return enriched.filter(t => t.status === 'reached')
      case 'gone':      return enriched.filter(t => t.drafted && !t.onMyRoster)
      default:          return enriched
    }
  }, [enriched, filter])

  const nowCount      = enriched.filter(t => t.status === 'available-now').length
  const reachedCount  = enriched.filter(t => t.status === 'reached').length
  const goneCount     = enriched.filter(t => t.drafted && !t.onMyRoster).length
  const myCount       = enriched.filter(t => t.onMyRoster).length

  const statusStyle: Record<string, string> = {
    'on-roster':     'bg-blue-950/30 border-blue-700/50',
    'gone':          'bg-slate-900/50 border-slate-800 opacity-50',
    'available-now': 'bg-emerald-950/30 border-emerald-700/50',
    'available-soon':'bg-slate-800/30 border-slate-700/50',
    'available-late':'bg-slate-800/20 border-slate-800/50',
    'reached':       'bg-amber-950/30 border-amber-700/50',
  }

  const statusLabel: Record<string, { text: string; color: string }> = {
    'on-roster':      { text: '✓ My roster', color: 'text-blue-300' },
    'gone':           { text: '✗ Drafted', color: 'text-slate-600' },
    'available-now':  { text: '🎯 Target now', color: 'text-emerald-300' },
    'available-soon': { text: '⏳ Coming up', color: 'text-slate-400' },
    'available-late': { text: '📋 Later', color: 'text-slate-500' },
    'reached':        { text: '⚠️ Still available!', color: 'text-amber-300' },
  }

  const priorityBadge: Record<string, string> = {
    high: 'bg-red-900/60 text-red-300 border-red-800',
    med:  'bg-amber-900/60 text-amber-300 border-amber-800',
    low:  'bg-slate-800 text-slate-500 border-slate-700',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#0f1b2d] border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Draft Targets</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Speed + position value · Round {currentRound} · Punt saves strategy
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-lg">✕</button>
        </div>

        {/* Summary cards */}
        <div className="flex-shrink-0 grid grid-cols-4 gap-2 p-4 border-b border-slate-700/50">
          <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold text-emerald-300 font-mono">{nowCount}</div>
            <div className="text-[10px] text-slate-500">Target now</div>
          </div>
          <div className="bg-amber-950/40 border border-amber-800/50 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold text-amber-300 font-mono">{reachedCount}</div>
            <div className="text-[10px] text-slate-500">Still available!</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold text-slate-400 font-mono">{goneCount}</div>
            <div className="text-[10px] text-slate-500">Drafted</div>
          </div>
          <div className="bg-blue-950/40 border border-blue-800/50 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold text-blue-300 font-mono">{myCount}</div>
            <div className="text-[10px] text-slate-500">On my roster</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex-shrink-0 flex gap-1 px-4 py-2 border-b border-slate-700/50">
          {([
            ['all', 'All'],
            ['available', 'Available'],
            ['reached', '⚠️ Still on board'],
            ['gone', 'Drafted'],
          ] as [typeof filter, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filter === k ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Target list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-600 text-sm">No targets in this filter.</div>
          )}
          {filtered.map((t, i) => (
            <div key={t.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${statusStyle[t.status]} ${t.player && !t.drafted ? 'cursor-pointer hover:brightness-110' : ''}`}
              onClick={() => t.player && !t.drafted && onSelect(t.player)}>

              {/* Round range */}
              <div className="flex-shrink-0 text-center w-12">
                <div className="text-[10px] text-slate-600">R{t.roundMin}–{t.roundMax}</div>
                <div className={`text-[9px] px-1 py-0.5 rounded border mt-0.5 ${priorityBadge[t.priority]}`}>
                  {t.priority}
                </div>
              </div>

              {/* Player info */}
              <div className="flex-1 min-w-0">
                {t.player ? (
                  <>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <TypeBadge type={t.player.type} />
                      <span className={`font-medium text-sm ${t.drafted ? 'text-slate-500 line-through' : 'text-white'}`}>
                        {t.player.name}
                      </span>
                      <span className="text-slate-500 text-xs">{t.player.position}</span>
                      {t.onMyRoster && <span className="text-[9px] bg-blue-800 text-blue-200 px-1 py-0.5 rounded">MY PICK</span>}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{t.note}</div>
                  </>
                ) : (
                  <div className="text-slate-500 text-sm">Player not found</div>
                )}
              </div>

              {/* Status + rank */}
              <div className="flex-shrink-0 text-right">
                {t.player && (
                  <>
                    <div className="text-xs font-mono text-blue-300 font-bold">#{t.player.rank}</div>
                    <div className={`text-[10px] font-mono ${edgeColor(t.player.edge)}`}>
                      {t.player.edge != null ? (t.player.edge > 0 ? `+${t.player.edge}` : t.player.edge) : '—'} edge
                    </div>
                  </>
                )}
                <div className={`text-[10px] mt-0.5 ${statusLabel[t.status].color}`}>
                  {statusLabel[t.status].text}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-700 text-[10px] text-slate-600">
          Strategy: Punt SV · Target SB in R4–8 · Fill 2B with speed · Let SP handle ERA/WHIP/K/QS
        </div>
      </div>
    </div>
  )
}
