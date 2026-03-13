'use client'
import { useState, useMemo } from 'react'
import type { ScoredPlayer } from '@/lib/types'
import { TypeBadge, TierBadge, RankBadge, edgeColor, fmt, tierColor } from './PlayerRow'

type SortKey = 'rank' | 'blnd' | 'finalScore' | 'espnRank' | 'edge'
type FilterType = 'ALL' | 'H' | 'P'

interface Props {
  ranked: ScoredPlayer[]
  onSelect: (p: ScoredPlayer) => void
  onToggleDraft: (id: string) => void
  onToggleMyRoster: (id: string) => void
  draftedIds: Set<string>
  myRosterIds: Set<string>
}

export default function DraftBoard({ ranked, onSelect, onToggleDraft, onToggleMyRoster, draftedIds, myRosterIds }: Props) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('ALL')
  const [filterPos, setFilterPos] = useState('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortAsc, setSortAsc] = useState(true)
  const [hideDrafted, setHideDrafted] = useState(false)

  const top300 = ranked.slice(0, 300)

  const positions = useMemo(() => {
    const s = new Set<string>()
    top300.forEach(p => p.position.split('/').forEach(pos => s.add(pos.trim())))
    return ['ALL', ...Array.from(s).sort()]
  }, [top300])

  const filtered = useMemo(() => {
    let r = top300
    if (hideDrafted) r = r.filter(p => !p.drafted)
    if (filterType !== 'ALL') r = r.filter(p => p.type === filterType)
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
  }, [top300, hideDrafted, filterType, filterPos, search, sortKey, sortAsc])

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
      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-[#0f1b2d]">
        {/* Search */}
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

        {/* Type filter */}
        <div className="flex rounded overflow-hidden border border-slate-700">
          {(['ALL','H','P'] as FilterType[]).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                filterType === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {t === 'ALL' ? 'All' : t === 'H' ? '⚾ Hitters' : '⚾ Pitchers'}
            </button>
          ))}
        </div>

        {/* Pos filter */}
        <select
          value={filterPos}
          onChange={e => setFilterPos(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
        >
          {positions.map(p => <option key={p}>{p}</option>)}
        </select>

        {/* Hide drafted */}
        <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideDrafted}
            onChange={e => setHideDrafted(e.target.checked)}
            className="accent-blue-500"
          />
          Hide drafted
        </label>

        {/* Results count */}
        <span className="ml-auto text-xs text-slate-600">
          {filtered.length} / {top300.length} shown
        </span>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0d1c30]">
            <tr className="text-slate-500 uppercase tracking-wide text-[10px]">
              <th className="text-left px-3 py-2 w-8 cursor-pointer" onClick={() => toggleSort('rank')}>
                # <SortIcon k="rank" />
              </th>
              <th className="text-left px-3 py-2">Player</th>
              <th className="text-center px-2 py-2">Pos</th>
              <th className="text-center px-2 py-2">Team</th>
              <th className="text-center px-2 py-2">T</th>
              <th className="text-right px-2 py-2 cursor-pointer" onClick={() => toggleSort('blnd')}>
                BLND <SortIcon k="blnd" />
              </th>
              <th className="text-right px-2 py-2 cursor-pointer" onClick={() => toggleSort('finalScore')}>
                Score <SortIcon k="finalScore" />
              </th>
              <th className="text-center px-2 py-2">Tier</th>
              <th className="text-center px-2 py-2 cursor-pointer" onClick={() => toggleSort('espnRank')}>
                ESPN <SortIcon k="espnRank" />
              </th>
              <th className="text-center px-2 py-2 cursor-pointer" onClick={() => toggleSort('edge')}>
                Edge <SortIcon k="edge" />
              </th>
              {/* Hitter stats */}
              <th className="text-right px-2 py-2 text-emerald-700">R</th>
              <th className="text-right px-2 py-2 text-emerald-700">HR</th>
              <th className="text-right px-2 py-2 text-emerald-700">RBI</th>
              <th className="text-right px-2 py-2 text-emerald-700">SB</th>
              <th className="text-right px-2 py-2 text-emerald-700">OPS</th>
              {/* Pitcher stats */}
              <th className="text-right px-2 py-2 text-red-700">K</th>
              <th className="text-right px-2 py-2 text-red-700">QS</th>
              <th className="text-right px-2 py-2 text-red-700">ERA</th>
              <th className="text-right px-2 py-2 text-red-700">WHIP</th>
              <th className="text-right px-2 py-2 text-red-700">SV</th>
              {/* Draft */}
              <th className="text-center px-2 py-2 w-16">M / D</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const isDrafted = p.drafted
              const isNewTier = i > 0 && filtered[i-1].tier !== p.tier
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
                    className={`cursor-pointer transition-colors border-b border-slate-800/50
                      ${isDrafted ? 'opacity-30' : 'hover:bg-slate-800/40'}
                    `}
                  >
                    {/* Rank */}
                    <td className="px-3 py-2">
                      <RankBadge rank={p.rank} tier={p.tier} />
                    </td>
                    {/* Name + type badge */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <TypeBadge type={p.type} />
                        <span className={`font-medium ${isDrafted ? 'line-through text-slate-600' : 'text-white'}`}>
                          {p.name}
                        </span>
                      </div>
                    </td>
                    {/* Position */}
                    <td className="px-2 py-2 text-center text-slate-400">{p.position}</td>
                    {/* Team */}
                    <td className="px-2 py-2 text-center text-slate-500">{p.team}</td>
                    {/* Type letter */}
                    <td className="px-2 py-2 text-center text-slate-600">{p.type}</td>
                    {/* BLND */}
                    <td className="px-2 py-2 text-right font-mono text-slate-300">{p.blnd.toFixed(1)}</td>
                    {/* Score */}
                    <td className="px-2 py-2 text-right font-mono text-blue-300 font-semibold">{p.finalScore.toFixed(3)}</td>
                    {/* Tier */}
                    <td className="px-2 py-2 text-center"><TierBadge tier={p.tier} /></td>
                    {/* ESPN */}
                    <td className="px-2 py-2 text-center text-slate-500 font-mono">{p.espnRank ?? '—'}</td>
                    {/* Edge */}
                    <td className={`px-2 py-2 text-center font-mono ${edgeColor(p.edge)}`}>
                      {p.edge != null ? (p.edge > 0 ? `+${p.edge}` : p.edge) : '—'}
                    </td>
                    {/* Hitter stats */}
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.r)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.hr)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.rbi)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.sb)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.ops, 3)}</td>
                    {/* Pitcher stats */}
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.k)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.qs)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.era, 2)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.whip, 2)}</td>
                    <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.sv)}</td>
                    {/* Two action buttons */}
                    <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-center">
                        {/* My pick (blue) */}
                        <button
                          onClick={() => onToggleMyRoster(p.id)}
                          title="Add to my team"
                          className={`w-5 h-5 rounded-full border text-[9px] font-bold transition-colors ${
                            myRosterIds.has(p.id)
                              ? 'bg-blue-500 border-blue-400 text-white'
                              : 'border-blue-700 text-blue-700 hover:bg-blue-500 hover:border-blue-400 hover:text-white'
                          }`}
                        >M</button>
                        {/* Drafted off board (amber) */}
                        <button
                          onClick={() => onToggleDraft(p.id)}
                          title="Mark as drafted (off board)"
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
