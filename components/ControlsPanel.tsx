'use client'
import { useState, useMemo } from 'react'
import type { ScoredPlayer } from '@/lib/types'
import { TypeBadge, edgeColor, fmt } from './PlayerRow'

interface Props {
  ranked: ScoredPlayer[]
  onSelect: (p: ScoredPlayer) => void
}

type EdgeFilter = 'all' | 'strong-pos' | 'strong-neg' | 'H' | 'P'

export default function ESPNEdgeView({ ranked, onSelect }: Props) {
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>('all')
  const [posFilter, setPosFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [minAbs, setMinAbs] = useState(0)

  const withEdge = useMemo(() => ranked.filter(p => p.espnRank != null), [ranked])

  const positions = useMemo(() => {
    const s = new Set<string>()
    withEdge.forEach(p => p.position.split('/').forEach(pos => s.add(pos.trim())))
    return ['ALL', ...Array.from(s).sort()]
  }, [withEdge])

  const filtered = useMemo(() => {
    let r = withEdge
    if (edgeFilter === 'strong-pos') r = r.filter(p => (p.edge ?? 0) >= 20)
    else if (edgeFilter === 'strong-neg') r = r.filter(p => (p.edge ?? 0) <= -20)
    else if (edgeFilter === 'H' || edgeFilter === 'P') r = r.filter(p => p.type === edgeFilter)
    if (posFilter !== 'ALL') r = r.filter(p => p.position.includes(posFilter))
    if (minAbs > 0) r = r.filter(p => Math.abs(p.edge ?? 0) >= minAbs)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))
    }
    return [...r].sort((a, b) => (b.edge ?? 0) - (a.edge ?? 0))
  }, [withEdge, edgeFilter, posFilter, minAbs, search])

  const bigPos = withEdge.filter(p => (p.edge ?? 0) >= 20).length
  const bigNeg = withEdge.filter(p => (p.edge ?? 0) <= -20).length
  const avg = withEdge.length
    ? (withEdge.reduce((s, p) => s + (p.edge ?? 0), 0) / withEdge.length).toFixed(1)
    : '—'

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 grid grid-cols-4 gap-3 p-4 border-b border-slate-700/50">
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Sleepers (+20)</div>
          <div className="text-2xl font-bold text-emerald-300 font-mono">{bigPos}</div>
          <div className="text-[10px] text-slate-600">Model likes more than ESPN</div>
        </div>
        <div className="bg-red-950/40 border border-red-800/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Strong fades (−20)</div>
          <div className="text-2xl font-bold text-red-300 font-mono">{bigNeg}</div>
          <div className="text-[10px] text-slate-600">ESPN likes more than model</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
          <div className="text-xs text-slate-500">ESPN-matched players</div>
          <div className="text-2xl font-bold text-white font-mono">{withEdge.length}</div>
          <div className="text-[10px] text-slate-600">of {ranked.length} in pool</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
          <div className="text-xs text-slate-500">Avg edge</div>
          <div className="text-2xl font-bold text-white font-mono">{avg}</div>
          <div className="text-[10px] text-slate-600">Positive = model bullish</div>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-2 bg-slate-900/50 border-b border-slate-700/30 text-xs text-slate-600">
        <span className="text-slate-500 font-medium">Edge formula: </span>
        ESPN Rank − Model Rank.
        <span className="text-emerald-600 ml-2">Positive = model likes this player more than ESPN (sleeper).</span>
        <span className="text-red-600 ml-2">Negative = ESPN likes more (fade).</span>
      </div>

      <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-[#0f1b2d]">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-40 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <div className="flex rounded overflow-hidden border border-slate-700 text-xs">
          {([
            ['all', 'All'],
            ['strong-pos', '🟢 +20+'],
            ['strong-neg', '🔴 −20+'],
            ['H', 'Hitters'],
            ['P', 'Pitchers'],
          ] as [EdgeFilter, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setEdgeFilter(k)}
              className={`px-2.5 py-1.5 font-medium transition-colors ${
                edgeFilter === k ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <select value={posFilter} onChange={e => setPosFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none">
          {positions.map(p => <option key={p}>{p}</option>)}
        </select>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>|Edge| ≥</span>
          <input type="number" min={0} max={100} value={minAbs}
            onChange={e => setMinAbs(parseInt(e.target.value) || 0)}
            className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none text-xs text-center" />
        </div>
        <span className="ml-auto text-xs text-slate-600">{filtered.length} players</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0d1c30]">
            <tr className="text-slate-500 uppercase tracking-wide text-[10px]">
              <th className="text-left px-3 py-2">Player</th>
              <th className="text-center px-2 py-2">Type</th>
              <th className="text-center px-2 py-2">Pos</th>
              <th className="text-center px-2 py-2">Team</th>
              <th className="text-right px-2 py-2">BLND</th>
              <th className="text-right px-2 py-2">Score</th>
              <th className="text-center px-2 py-2">My Rank</th>
              <th className="text-center px-2 py-2">ESPN Rank</th>
              <th className="text-center px-3 py-2">Edge</th>
              <th className="text-center px-2 py-2">Signal</th>
              <th className="text-right px-2 py-2 text-emerald-700">SB</th>
              <th className="text-right px-2 py-2 text-emerald-700">HR</th>
              <th className="text-right px-2 py-2 text-emerald-700">OPS</th>
              <th className="text-right px-2 py-2 text-red-700">K</th>
              <th className="text-right px-2 py-2 text-red-700">ERA</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const edge = p.edge ?? 0
              const isStrongBuy  = edge >= 20
              const isStrongFade = edge <= -20
              return (
                <tr key={p.id} onClick={() => onSelect(p)}
                  className={`cursor-pointer border-b border-slate-800/50 transition-colors hover:bg-slate-800/40
                    ${isStrongBuy  ? 'bg-emerald-950/10' : ''}
                    ${isStrongFade ? 'bg-red-950/10' : ''}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-white">{p.name}</div>
                  </td>
                  <td className="px-2 py-2 text-center"><TypeBadge type={p.type} /></td>
                  <td className="px-2 py-2 text-center text-slate-400">{p.position}</td>
                  <td className="px-2 py-2 text-center text-slate-500">{p.team}</td>
                  <td className="px-2 py-2 text-right font-mono text-slate-300">{p.blnd.toFixed(1)}</td>
                  <td className="px-2 py-2 text-right font-mono text-blue-300">{p.finalScore.toFixed(3)}</td>
                  <td className="px-2 py-2 text-center font-mono font-bold text-white">{p.rank}</td>
                  <td className="px-2 py-2 text-center font-mono text-slate-400">{p.espnRank}</td>
                  <td className={`px-3 py-2 text-center font-mono text-base font-bold ${edgeColor(p.edge)}`}>
                    {edge > 0 ? `+${edge}` : edge}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {isStrongBuy  && <span className="text-xs bg-emerald-900/80 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded">SLEEPER</span>}
                    {isStrongFade && <span className="text-xs bg-red-900/80 text-red-300 border border-red-700 px-1.5 py-0.5 rounded">FADE</span>}
                    {!isStrongBuy && !isStrongFade && edge > 0 && <span className="text-xs text-emerald-700">↑</span>}
                    {!isStrongBuy && !isStrongFade && edge < 0 && <span className="text-xs text-red-700">↓</span>}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.sb)}</td>
                  <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.hr)}</td>
                  <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.ops, 3)}</td>
                  <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.k)}</td>
                  <td className="px-2 py-2 text-right text-slate-500 font-mono">{fmt(p.stats.era, 2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
