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

const EARLY_ROUND_END = 5
const MID_ROUND_END   = 12

type BatCat = 'R' | 'HR' | 'RBI' | 'SB' | 'OPS'
type PitCat = 'K' | 'QS' | 'ERA' | 'WHIP' | 'SV'

interface Props {
  myTeam: ScoredPlayer[]
  ranked: ScoredPlayer[]
  onSelect: (p: ScoredPlayer) => void
  onToggleMyRoster: (id: string) => void
  draftPick: number
}

function getRoundPhase(pick: number): 'early' | 'mid' | 'late' {
  if (pick <= EARLY_ROUND_END) return 'early'
  if (pick <= MID_ROUND_END)   return 'mid'
  return 'late'
}

function computeScarcity(available: ScoredPlayer[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of available) {
    p.position.split('/').map(s => s.trim()).forEach(pos => {
      counts[pos] = (counts[pos] ?? 0) + 1
    })
  }
  return counts
}

function positionScarcityBoost(pos: string, scarcity: Record<string, number>): number {
  const r = scarcity[pos] ?? 0
  if (pos === 'C'  && r <= 8)  return 0.20
  if (pos === 'SS' && r <= 10) return 0.15
  if (pos === 'C'  && r <= 12) return 0.10
  if (pos === 'SS' && r <= 15) return 0.10
  if (pos === '2B' && r <= 10) return 0.10
  if (pos === 'SP' && r <= 20) return 0.08
  if (pos === 'RP' && r <= 12) return 0.08
  return 0
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
        filledSlots[slot.label]++; break
      }
    }
  }
  const openSlots = ROSTER_SLOTS
    .filter(s => filledSlots[s.label] < s.count)
    .map(s => ({ label: s.label, urgent: s.label !== 'BN' && s.label !== 'UTIL' }))
  const weakBatCats: BatCat[] = []
  const weakPitCats: PitCat[] = []
  if (hitters.length >= 2) {
    const hScale = 8 / hitters.length
    if (hitters.reduce((s,p)=>s+(p.stats.sb??0),0)*hScale < 80)   weakBatCats.push('SB')
    if (hitters.reduce((s,p)=>s+(p.stats.hr??0),0)*hScale < 160)  weakBatCats.push('HR')
    if (hitters.reduce((s,p)=>s+(p.stats.rbi??0),0)*hScale < 500) weakBatCats.push('RBI')
    if (hitters.reduce((s,p)=>s+(p.stats.ops??0),0)/hitters.length < 0.820) weakBatCats.push('OPS')
  }
  if (pitchers.length >= 1) {
    const pScale = 5 / pitchers.length
    if (pitchers.reduce((s,p)=>s+(p.stats.sv??0),0)*pScale < 30)  weakPitCats.push('SV')
    if (pitchers.reduce((s,p)=>s+(p.stats.qs??0),0)*pScale < 50)  weakPitCats.push('QS')
    if (pitchers.reduce((s,p)=>s+(p.stats.era??0),0)/pitchers.length > 3.80)  weakPitCats.push('ERA')
    if (pitchers.reduce((s,p)=>s+(p.stats.whip??0),0)/pitchers.length > 1.22) weakPitCats.push('WHIP')
  }
  return { needsHitter: hitters.length < 8, needsPitcher: pitchers.length < 5, weakBatCats, weakPitCats, filledSlots, openSlots }
}

function getRecommendations(
  available: ScoredPlayer[],
  needs: ReturnType<typeof analyzeNeeds>,
  draftPick: number,
  topN = 6,
): { player: ScoredPlayer; priority: 'high'|'med'|'low'; tags: string[] }[] {
  const phase    = getRoundPhase(draftPick)
  const scarcity = computeScarcity(available)
  const recs: { player: ScoredPlayer; priority: 'high'|'med'|'low'; score: number; tags: string[] }[] = []

  for (const p of available.slice(0, 300)) {
    let priority: 'high'|'med'|'low' = 'low'
    let boost = 0
    const tags: string[] = []
    const positions = p.position.split('/').map(s => s.trim())

    if (p.edge != null) {
      if (p.edge >= 40)       { boost += 0.18; tags.push('🔥 Big sleeper') }
      else if (p.edge >= 20)  { boost += 0.10; tags.push('📈 Sleeper') }
      else if (p.edge <= -30) { boost -= 0.10; tags.push('📉 ESPN fade') }
    }

    const fillsUrgent = needs.openSlots.some(
      s => s.urgent && ROSTER_SLOTS.find(r => r.label === s.label)?.pos.some(pos => positions.includes(pos))
    )
    if (fillsUrgent) {
      const slotBoost = phase === 'early' ? 0.15 : phase === 'mid' ? 0.25 : 0.20
      boost += slotBoost; priority = 'high'
      tags.push(`📋 Fills ${positions[0]} slot`)
    }

    if (p.type === 'H' && needs.needsHitter  && phase !== 'early') { boost += 0.08; if (priority === 'low') priority = 'med' }
    if (p.type === 'P' && needs.needsPitcher && phase !== 'early') { boost += 0.08; if (priority === 'low') priority = 'med' }

    const catScale = phase === 'late' ? 1.5 : phase === 'mid' ? 1.0 : 0.3
    if (p.type === 'H') {
      if (needs.weakBatCats.includes('SB')  && (p.stats.sb??0)  > (phase==='late'?15:18)) { boost += 0.12*catScale; tags.push('💨 SB'); if (priority==='low') priority='med' }
      if (needs.weakBatCats.includes('HR')  && (p.stats.hr??0)  > (phase==='late'?20:22)) { boost += 0.08*catScale; tags.push('💪 HR') }
      if (needs.weakBatCats.includes('RBI') && (p.stats.rbi??0) > 70)                    { boost += 0.06*catScale; tags.push('🏃 RBI') }
      if (needs.weakBatCats.includes('OPS') && (p.stats.ops??0) > 0.830)                 { boost += 0.06*catScale; tags.push('📊 OPS') }
    }
    if (p.type === 'P') {
      if (needs.weakPitCats.includes('SV')   && (p.stats.sv??0)   > (phase==='late'?10:12))   { boost += 0.12*catScale; tags.push('🔒 SV'); if (priority==='low') priority='med' }
      if (needs.weakPitCats.includes('QS')   && (p.stats.qs??0)   > (phase==='late'?8:10))    { boost += 0.08*catScale; tags.push('✅ QS') }
      if (needs.weakPitCats.includes('ERA')  && (p.stats.era??0)  < (phase==='late'?3.70:3.50)) { boost += 0.06*catScale; tags.push('📉 ERA') }
      if (needs.weakPitCats.includes('WHIP') && (p.stats.whip??0) < (phase==='late'?1.20:1.15)) { boost += 0.06*catScale; tags.push('📉 WHIP') }
    }

    for (const pos of positions) {
      const sb = positionScarcityBoost(pos, scarcity)
      if (sb > 0) {
        boost += sb
        tags.push(`⚠️ ${pos} scarce (${scarcity[pos]??0} left)`)
        if (priority === 'low') priority = 'med'
      }
    }

    if (boost > 0.05 || (p.rank <= 15 && phase !== 'late')) {
      recs.push({ player: p, priority, score: p.finalScore + boost, tags })
    }
  }

  return recs.sort((a,b) => b.score - a.score).slice(0, topN)
    .map(({ player, priority, tags }) => ({ player, priority, tags }))
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
        <div className={`h-full rounded transition-all ${good ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${lowerBetter ? 100-pct : pct}%` }} />
      </div>
    </div>
  )
}

function PhaseLabel({ pick }: { pick: number }) {
  const phase = getRoundPhase(pick)
  const styles = { early: 'bg-blue-900/60 text-blue-300 border-blue-700', mid: 'bg-amber-900/60 text-amber-300 border-amber-700', late: 'bg-purple-900/60 text-purple-300 border-purple-700' }
  const labels = { early: '🎯 Early — Best Player Available', mid: '⚖️ Mid — Balance needs & value', late: '🔍 Late — Cats, sleepers & scarcity' }
  return <span className={`text-[10px] px-2 py-0.5 rounded border ${styles[phase]}`}>{labels[phase]}</span>
}

export default function TeamTracker({ myTeam, ranked, onSelect, onToggleMyRoster, draftPick }: Props) {
  const available = useMemo(() => ranked.filter(p => !p.drafted), [ranked])
  const needs     = useMemo(() => analyzeNeeds(myTeam), [myTeam])
  const recs      = useMemo(() => getRecommendations(available, needs, draftPick), [available, needs, draftPick])
  const hitters   = myTeam.filter(p => p.type === 'H')
  const pitchers  = myTeam.filter(p => p.type === 'P')

  const batTotals = useMemo(() => ({
    R:   hitters.reduce((s,p)=>s+(p.stats.r??0),0),
    HR:  hitters.reduce((s,p)=>s+(p.stats.hr??0),0),
    RBI: hitters.reduce((s,p)=>s+(p.stats.rbi??0),0),
    SB:  hitters.reduce((s,p)=>s+(p.stats.sb??0),0),
    OPS: hitters.length ? hitters.reduce((s,p)=>s+(p.stats.ops??0),0)/hitters.length : 0,
  }), [hitters])

  const pitTotals = useMemo(() => ({
    K:    pitchers.reduce((s,p)=>s+(p.stats.k??0),0),
    QS:   pitchers.reduce((s,p)=>s+(p.stats.qs??0),0),
    SV:   pitchers.reduce((s,p)=>s+(p.stats.sv??0),0),
    ERA:  pitchers.length ? pitchers.reduce((s,p)=>s+(p.stats.era??0),0)/pitchers.length : 0,
    WHIP: pitchers.length ? pitchers.reduce((s,p)=>s+(p.stats.whip??0),0)/pitchers.length : 0,
  }), [pitchers])

  const priorityStyle = {
    high: 'border-l-2 border-emerald-500 bg-emerald-950/20',
    med:  'border-l-2 border-amber-500 bg-amber-950/20',
    low:  'border-l-2 border-slate-700 bg-slate-800/20',
  }

  return (
    <div className="h-full overflow-y-auto p-5 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">My Team</h1>
          <p className="text-sm text-slate-500 mb-2">Pick #{draftPick} · {myTeam.length} rostered · {available.length} available</p>
          <PhaseLabel pick={draftPick} />
        </div>
        <div className="flex gap-2 text-xs flex-shrink-0">
          <span className="px-2 py-1 bg-emerald-900/40 text-emerald-300 rounded border border-emerald-800">{hitters.length} H</span>
          <span className="px-2 py-1 bg-red-900/40 text-red-300 rounded border border-red-800">{pitchers.length} P</span>
        </div>
      </div>

      {myTeam.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <div className="text-4xl mb-3">⚾</div>
          <div className="text-sm">Mark players with the <strong className="text-slate-500">M</strong> button on the Draft Board to track your team here.</div>
          <div className="text-xs mt-2 text-slate-700">Recommendations update automatically as you draft.</div>
        </div>
      ) : (
        <>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">🎯 Recommended Next Picks</h2>
              <span className="text-[10px] text-slate-600">Top 300 · Edge-weighted · Scarcity-aware</span>
            </div>
            <div className="space-y-2">
              {recs.length === 0 ? (
                <div className="text-xs text-slate-600 py-4 text-center">No strong recommendations — check the Draft Board directly.</div>
              ) : recs.map(({ player: p, priority, tags }, i) => (
                <div key={p.id} onClick={() => onSelect(p)}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:brightness-110 transition-all ${priorityStyle[priority]}`}>
                  <span className="text-slate-600 font-mono text-xs w-4 mt-0.5">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <TypeBadge type={p.type} />
                      <span className="font-medium text-white text-sm">{p.name}</span>
                      <span className="text-slate-500 text-xs">{p.position}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tags.slice(0,3).map((t,ti) => (
                        <span key={ti} className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-mono text-blue-300 font-bold">#{p.rank}</div>
                    <div className={`text-[10px] font-mono ${edgeColor(p.edge)}`}>{p.edge!=null?(p.edge>0?`+${p.edge}`:p.edge):'—'} edge</div>
                    <div className="text-[9px] text-slate-600 mt-0.5">BLND {p.blnd.toFixed(1)}</div>
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

          {(needs.weakBatCats.length > 0 || needs.weakPitCats.length > 0) && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Category Needs</h2>
              <div className="flex flex-wrap gap-1.5">
                {needs.weakBatCats.map(cat => <span key={cat} className="text-xs px-2 py-1 rounded border bg-emerald-900/30 text-emerald-300 border-emerald-800">⬇ {cat}</span>)}
                {needs.weakPitCats.map(cat => <span key={cat} className="text-xs px-2 py-1 rounded border bg-red-900/30 text-red-300 border-red-800">⬇ {cat}</span>)}
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
                <div key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/40">
                  <span className="text-slate-600 font-mono text-xs w-5 text-right">{i+1}</span>
                  <div className="flex-1 cursor-pointer flex items-center gap-2" onClick={() => onSelect(p)}>
                    <TypeBadge type={p.type} />
                    <span className="text-white text-xs font-medium flex-1">{p.name}</span>
                    <span className="text-slate-500 text-xs">{p.position}</span>
                    <span className="text-slate-600 text-xs font-mono">{p.team}</span>
                    <span className="text-blue-400 font-mono text-xs">#{p.rank}</span>
                    {p.edge!=null && p.edge>=20 && <span className="text-[9px] text-emerald-500">+{p.edge}</span>}
                  </div>
                  <button onClick={() => onToggleMyRoster(p.id)} className="text-slate-600 hover:text-red-400 transition-colors text-xs px-1" title="Remove">✕</button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
