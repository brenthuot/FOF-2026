'use client'
import { useMemo } from 'react'
import type { ScoredPlayer } from '@/lib/types'
import { TypeBadge, edgeColor } from './PlayerRow'

const ROSTER_SLOTS: { label: string; pos: string[]; count: number }[] = [
  { label: 'C',    pos: ['C'],                         count: 1 },
  { label: '1B',   pos: ['1B'],                        count: 1 },
  { label: '2B',   pos: ['2B'],                        count: 1 },
  { label: '3B',   pos: ['3B'],                        count: 1 },
  { label: 'SS',   pos: ['SS'],                        count: 1 },
  { label: 'OF',   pos: ['OF'],                        count: 3 },
  { label: 'UTIL', pos: ['1B','2B','3B','SS','OF','C'],count: 1 },
  { label: 'SP',   pos: ['SP'],                        count: 3 },
  { label: 'RP',   pos: ['RP'],                        count: 2 },
  { label: 'P',    pos: ['SP','RP'],                   count: 2 },
  { label: 'BN',   pos: ['C','1B','2B','3B','SS','OF','SP','RP'], count: 3 },
]

type BatCat = 'R'|'HR'|'RBI'|'SB'|'OPS'
type PitCat = 'K'|'QS'|'ERA'|'WHIP'|'SV'

interface Props {
  myTeam: ScoredPlayer[]
  ranked: ScoredPlayer[]
  onSelect: (p: ScoredPlayer) => void
  draftPick: number
}

function analyzeNeeds(myTeam: ScoredPlayer[]) {
  const hitters  = myTeam.filter(p => p.type === 'H')
  const pitchers = myTeam.filter(p => p.type === 'P')
  const filledSlots: Record<string, number> = {}
  for (const slot of ROSTER_SLOTS) filledSlots[slot.label] = 0
  for (const p of myTeam) {
    const positions = p.position.split('/').map(s => s.trim())
    for (const slot of ROSTER_SLOTS) {
      if (filledSlots[slot.label] < slot.count && positions.some(pos => slot.pos.includes(pos))) {
        filledSlots[slot.label]++
        break
      }
    }
  }
  const openSlots = ROSTER_SLOTS
    .filter(s => filledSlots[s.label] < s.count)
    .map(s => ({ label: s.label, urgent: s.label !== 'BN' && s.label !== 'UTIL' }))
  const weakBatCats: BatCat[] = []
  const weakPitCats: PitCat[] = []
  if (hitters.length >= 2) {
    const sbAvg = hitters.reduce((s,p) => s + (p.stats.sb ?? 0), 0) / hitters.length
    const hrAvg = hitters.reduce((s,p) => s + (p.stats.hr ?? 0), 0) / hitters.length
    if (sbAvg < 8)  weakBatCats.push('SB')
    if (hrAvg < 18) weakBatCats.push('HR')
  }
  if (pitchers.length >= 1) {
    const svAvg = pitchers.reduce((s,p) => s + (p.stats.sv ?? 0), 0) / pitchers.length
    const qsAvg = pitchers.reduce((s,p) => s + (p.stats.qs ?? 0), 0) / pitchers.length
    if (svAvg < 10) weakPitCats.push('SV')
    if (qsAvg < 8)  weakPitCats.push('QS')
  }
  return {
    needsHitter: hitters.length < 8,
    needsPitcher: pitchers.length < 5,
    weakBatCats, weakPitCats, filledSlots, openSlots,
  }
}

function getRecommendations(available: ScoredPlayer[], needs: ReturnType<typeof analyzeNeeds>, topN = 5) {
  const recs: { player: ScoredPlayer; reason: string; priority: 'high'|'med'|'low'; score: number }[] = []
  for (const p of available.slice(0, 100)) {
    let reason = '', priority: 'high'|'med'|'low' = 'low', boost = 0
    const positions = p.position.split('/').map(s => s.trim())
    const fillsUrgent = needs.openSlots.some(
      s => s.urgent && ROSTER_SLOTS.find(r => r.label === s.label)?.pos.some(pos => positions.includes(pos))
    )
    if (fillsUrgent) { boost += 0.3; priority = 'high' }
    if (p.type === 'H' && needs.needsHitter)  { boost += 0.1; if (priority === 'low') priority = 'med' }
    if (p.type === 'P' && needs.needsPitcher) { boost += 0.1; if (priority === 'low') priority = 'med' }
    if (p.type === 'H' && needs.weakBatCats.includes('SB') && (p.stats.sb ?? 0) > 20) { boost += 0.15; reason = 'Fills SB need'; priority = 'high' }
    if (p.type === 'H' && needs.weakBatCats.includes('HR') && (p.stats.hr ?? 0) > 25) { boost += 0.1;  if (!reason) reason = 'Fills HR need' }
    if (p.type === 'P' && needs.weakPitCats.includes('SV') && (p.stats.sv ?? 0) > 15) { boost += 0.15; reason = 'Fills SV need'; priority = 'high' }
    if (p.type === 'P' && needs.weakPitCats.includes('QS') && (p.stats.qs ?? 0) > 10) { boost += 0.1;  if (!reason) reason = 'Fills QS need' }
    if (!reason) {
      if (fillsUrgent) reason = `Fills open ${positions[0]} slot`
      else if (p.type === 'H' && needs.needsHitter) reason = 'Best available hitter'
      else if (p.type === 'P' && needs.needsPitcher) reason = 'Best available pitcher'
      else reason = 'Best available'
    }
    if (boost > 0 || p.rank <= 30) recs.push({ player: p, reason, priority, score: p.finalScore + boost })
  }
  return recs.sort((a,b) => b.score - a.score).slice(0, topN).map(({ player, reason, priority }) => ({ player, reason, priority }))
}

function CatBar({ label, value, maxVal, lowerBetter }: { label: string; value: number; maxVal: number; lowerBetter?: boolean }) {
  const pct = maxVal > 0 ? Math.min(100, (value / maxVal) * 100) : 0
  const good = lowerBetter ? pct < 60 : pct > 40
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-500">{label}</span>
        <span className={`font-mono ${good ? 'text-emerald-400' : 'text-amber-400'}`}>{lowerBetter ? value.toFixed(2) : value.toFixed(1)}</span>
      </div>
      <div className="h-1 bg-slate-800 rounded overflow-hidden">
        <div className={`h-full rounded transition-all ${good ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${lowerBetter ? 100 - pct : pct}%` }} />
      </div>
    </div>
  )
}

export default function TeamTracker({ myTeam, ranked, onSelect, draftPick }: Props) {
  const available = useMemo(() => ranked.filter(p => !p.drafted), [ranked])
  const needs = useMemo(() => analyzeNeeds(myTeam), [myTeam])
  const recs  = useMemo(() => getRecommendations(available, needs), [available, needs])
  const hitters  = myTeam.filter(p => p.type === 'H')
  const pitchers = myTeam.filter(p => p.type === 'P')
  const batTotals = useMemo(() => ({
    R: hitters.reduce((s,p) => s+(p.stats.r??0),0),
    HR: hitters.reduce((s,p) => s+(p.stats.hr??0),0),
    RBI: hitters.reduce((s,p) => s+(p.stats.rbi??0),0),
    SB: hitters.reduce((s,p) => s+(p.stats.sb??0),0),
    OPS: hitters.length ? hitters.reduce((s,p) => s+(p.stats.ops??0),0)/hitters.length : 0,
  }), [hitters])
  const pitTotals = useMemo(() => ({
    K: pitchers.reduce((s,p) => s+(p.stats.k??0),0),
    QS: pitchers.reduce((s,p) => s+(p.stats.qs??0),0),
    SV: pitchers.reduce((s,p) => s+(p.stats.sv??0),0),
    ERA: pitchers.length ? pitchers.reduce((s,p) => s+(p.stats.era??0),0)/pitchers.length : 0,
    WHIP: pitchers.length ? pitchers.reduce((s,p) => s+(p.stats.whip??0),0)/pitchers.length : 0,
  }), [pitchers])
  const priorityStyle = {
    high: 'border-l-2 border-emerald-500 bg-emerald-950/20',
    med:  'border-l-2 border-amber-500 bg-amber-950/20',
    low:  'border-l-2 border-slate-600',
  }
  return (
    <div className="h-full overflow-y-auto p-5 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">My Team</h1>
          <p className="text-sm text-slate-500">Pick {draftPick} · {myTeam.length} rostered</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-emerald-900/40 text-emerald-300 rounded border border-emerald-800">{hitters.length} H</span>
          <span className="px-2 py-1 bg-red-900/40 text-red-300 rounded border border-red-800">{pitchers.length} P</span>
        </div>
      </div>

      {myTeam.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <div className="text-4xl mb-3">⚾</div>
          <div className="text-sm">Mark players as drafted on the Draft Board to track your team here.</div>
          <div className="text-xs mt-2 text-slate-700">Click the circle button on any row to add them.</div>
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">🎯 Recommended Next Picks</h2>
            <div className="space-y-2">
              {recs.map(({ player: p, reason, priority }, i) => (
                <div key={p.id} onClick={() => onSelect(p)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:brightness-110 transition-all ${priorityStyle[priority]}`}>
                  <span className="text-slate-600 font-mono text-xs w-4">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <TypeBadge type={p.type} />
                      <span className="font-medium text-white text-sm truncate">{p.name}</span>
                      <span className="text-slate-500 text-xs">{p.position}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{reason}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-mono text-blue-300">#{p.rank}</div>
                    <div className={`text-[10px] font-mono ${edgeColor(p.edge)}`}>{p.edge != null ? (p.edge > 0 ? `+${p.edge}` : p.edge) : '—'} vs ESPN</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {needs.openSlots.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Open Roster Slots</h2>
              <div className="flex flex-wrap gap-1.5">
                {needs.openSlots.map(s => (
                  <span key={s.label} className={`text-xs px-2 py-1 rounded border ${s.urgent ? 'bg-amber-900/40 text-amber-300 border-amber-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{s.label}</span>
                ))}
              </div>
            </section>
          )}

          <section className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/30 rounded-lg p-3 space-y-2">
              <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-2">Batting</div>
              <CatBar label="Runs" value={batTotals.R}   maxVal={650} />
              <CatBar label="HR"   value={batTotals.HR}  maxVal={250} />
              <CatBar label="RBI"  value={batTotals.RBI} maxVal={600} />
              <CatBar label="SB"   value={batTotals.SB}  maxVal={150} />
              <CatBar label="OPS"  value={batTotals.OPS} maxVal={1.0} />
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3 space-y-2">
              <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-2">Pitching</div>
              <CatBar label="K"    value={pitTotals.K}    maxVal={1400} />
              <CatBar label="QS"   value={pitTotals.QS}   maxVal={120} />
              <CatBar label="SV"   value={pitTotals.SV}   maxVal={80} />
              <CatBar label="ERA"  value={pitTotals.ERA}  maxVal={5.5} lowerBetter />
              <CatBar label="WHIP" value={pitTotals.WHIP} maxVal={1.6} lowerBetter />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Drafted Players ({myTeam.length})</h2>
            <div className="space-y-1">
              {myTeam.map((p, i) => (
                <div key={p.id} onClick={() => onSelect(p)} className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/40 cursor-pointer">
                  <span className="text-slate-600 font-mono text-xs w-5 text-right">{i+1}</span>
                  <TypeBadge type={p.type} />
                  <span className="text-white text-xs font-medium flex-1">{p.name}</span>
                  <span className="text-slate-500 text-xs">{p.position}</span>
                  <span className="text-slate-600 text-xs font-mono">{p.team}</span>
                  <span className="text-blue-400 font-mono text-xs">#{p.rank}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
