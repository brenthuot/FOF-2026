'use client'
import { useState, useMemo } from 'react'
import type { ScoredPlayer } from '@/lib/types'
import { TypeBadge, TierBadge, edgeColor, fmt } from './PlayerRow'

interface Props {
  ranked: ScoredPlayer[]
  onSelect: (p: ScoredPlayer) => void
  onToggleDraft: (id: string) => void
  draftedIds: Set<string>
}

type SortKey = 'rank' | 'blnd' | 'finalScore' | 'espnRank' | 'edge' | 'name'

export default function FullPool({ ranked, onSelect, onToggleDraft, draftedIds }: Props) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'H' | 'P'>('ALL')
  const [filterPos, setFilterPos] = useState('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortAsc, setSortAsc] = useState(true)

  const positions = useMemo(() => {
    const s = new Set<string>()
    ranked.forEach(p => p.position.split('/').forEach(pos => s.add(pos.trim())))
    return ['ALL', ...Array.from(s).sort()]
  }, [ranked])

  const filtered = useMemo(() => {
    let r = [...ranked]
    if (filterType !== 'ALL') r = r.filter(p => p.type === filterType)
    if (filterPos !== 'ALL') r = r.filter(p => p.position.includes(filterPos))
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))
    }
    r.sort((a, b) => {
      const av: number =
        sortKey === 'name' ? 0 :
        sortKey === 'edge' ? (a.edge ?? -999) :
        sortKey === 'espnRank' ? (a.espnRank ?? 9999) :
        (a[sortKey] as number)
      const bv: number =
        sortKey === 'name' ? 0 :
        sortKey === 'edge' ? (b.edge ?? -999) :
        sortKey === 'espnRank' ? (b.espnRank ?? 9999) :
        (b[sortKey] as number)
      if (sortKey === 'name') return sortAsc
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
      return sortAsc ? av - bv : bv - av
    })
    return r
  }, [ranked, filterType, filterPos, search, sortKey, sortAsc])

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc(a => !a)
    else { setSortKey(k); setSortAsc(true) }
  }
  const S = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <span className="text-slate-700">↕</span> :
    <span className="text-blue-400">{sortAsc ? '↑' : '↓'}</span>

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-[#0f1b2d]">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-44 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <div className="flex rounded overflow-hidden border border-slate-700">
          {(['ALL','H','P'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                filterType === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
              {t === 'ALL' ? 'All' : t === 'H' ? 'Hitters' : 'Pitchers'}
            </button>
          ))}
        </div>
        <select value={filterPos} onChange={e => setFilterPos(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500">
          {positions.map(p => <option key={p}>{p}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-600">{filtered.length} players</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0d1c30]">
            <tr className="text-slate-500 uppercase tracking-wide text-[10px]">
              <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('rank')}># <S k="rank"/></th>
              <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('name')}>Player <S k="name"/></th>
              <th className="text-center px-2 py-2">Pos</th>
              <th className="text-center px-2 py-2">Team</th>
              <th className="text-right px-2 py-2 cursor-pointer" onClick={() => toggleSort('blnd')}>BLND <S k="blnd"/></th>
              <th className="text-right px-2 py-2 cursor-pointer" onClick={() => toggleSort('finalScore')}>Score <S k="finalScore"/></th>
              <th className="text-center px-2 py-2">Tier</th>
              <th className="text-center px-2 py-2 cursor-pointer" onClick={() => toggleSort('espnRank')}>ESPN <S k="espnRank"/></th>
              <th className="text-center px-2 py-2 cursor-pointer" onClick={() => toggleSort('edge')}>Edge <S k="edge"/></th>
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
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} onClick={() => onSelect(p)}
                className={`cursor-pointer border-b border-slate-800/50 transition-colors
                  ${p.drafted ? 'opacity-30' : 'hover:bg-slate-800/40'}`}>
                <td className="px-3 py-1.5 font-mono text-slate-400">{p.rank}</td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <TypeBadge type={p.type}/>
                    <span className={`font-medium ${p.drafted ? 'line-through text-slate-600' : 'text-white'}`}>{p.name}</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-center text-slate-400">{p.position}</td>
                <td className="px-2 py-1.5 text-center text-slate-500">{p.team}</td>
                <td className="px-2 py-1.5 text-right font-mono text-slate-300">{p.blnd.toFixed(1)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-blue-300 font-semibold">{p.finalScore.toFixed(3)}</td>
                <td className="px-2 py-1.5 text-center"><TierBadge tier={p.tier}/></td>
                <td className="px-2 py-1.5 text-center text-slate-500 font-mono">{p.espnRank ?? '—'}</td>
                <td className={`px-2 py-1.5 text-center font-mono ${edgeColor(p.edge)}`}>
                  {p.edge != null ? (p.edge > 0 ? `+${p.edge}` : p.edge) : '—'}
                </td>
                <td className="px-2 py-1.5 text-right text-slate-500 font-mono">{fmt(p.stats.r)}</td>
                <td className="px-2 py-1.5 text-right text-slate-500 font-mono">{fmt(p.stats.hr)}</td>
                <td className="px-2 py-1.5 text-right text-slate-500 font-mono">{fmt(p.stats.rbi)}</td>
                <td className="px-2 py-1.5 text-right text-slate-500 font-mono">{fmt(p.stats.sb)}</td>
                <td className="px-2 py-1.5 text-right text-slate-500 font-mono">{fmt(p.stats.ops, 3)}</td>
                <td className="px-2 py-1.5 text-right text-slate-500 font-mono">{fmt(p.stats.k)}</td>
                <td className="px-2 py-1.5 text-right text-slate-500 font-mono">{fmt(p.stats.qs)}</td>
                <td className="px-2 py-1.5 text-right text-slate-500 font-mono">{fmt(p.stats.era, 2)}</td>
                <td className="px-2 py-1.5 text-right text-slate-500 font-mono">{fmt(p.stats.whip, 2)}</td>
                <td className="px-2 py-1.5 text-right text-slate-500 font-mono">{fmt(p.stats.sv)}</td>
                <td className="px-2 py-1.5 text-center" onClick={e => { e.stopPropagation(); onToggleDraft(p.id) }}>
                  <button className={`w-4 h-4 rounded-full border transition-colors ${
                    p.drafted ? 'bg-amber-500 border-amber-400' : 'border-slate-600 hover:border-amber-500'}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
