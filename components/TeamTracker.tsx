'use client'
import { useMemo, useState } from 'react'
import type { ScoredPlayer } from '@/lib/types'
import { TypeBadge, edgeColor } from './PlayerRow'

const DISPLAY_SLOTS: { label: string; slotPos: string[]; type: 'H'|'P'|'ANY'; count: number }[] = [
  { label: 'C',    slotPos: ['C'],                         type: 'H', count: 1 },
  { label: '1B',   slotPos: ['1B'],                        type: 'H', count: 1 },
  { label: '2B',   slotPos: ['2B'],                        type: 'H', count: 1 },
  { label: '3B',   slotPos: ['3B'],                        type: 'H', count: 1 },
  { label: 'SS',   slotPos: ['SS'],                        type: 'H', count: 1 },
  { label: 'OF',   slotPos: ['OF'],                        type: 'H', count: 5 },
  { label: 'UT',   slotPos: ['C','1B','2B','3B','SS','OF'],type: 'H', count: 2 },
  { label: 'RP',   slotPos: ['RP'],                        type: 'P', count: 2 },
  { label: 'P',    slotPos: ['SP','RP'],                   type: 'P', count: 7 },
  { label: 'BN',   slotPos: ['SP','RP'],                   type: 'P', count: 2 },
]

const ROSTER_SLOTS = DISPLAY_SLOTS
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

interface AssignedSlot {
  label: string
  player: ScoredPlayer | null
}

function assignToSlots(myTeam: ScoredPlayer[]): AssignedSlot[] {
  const assigned: AssignedSlot[] = []
  const used = new Set<string>()
  for (const slotDef of DISPLAY_SLOTS) {
    for (let i = 0; i < slotDef.count; i++) {
      const candidate = myTeam.find(p => {
        if (used.has(p.id)) return false
        if (slotDef.type === 'H' && p.type !== 'H') return false
        if (slotDef.type === 'P' && p.type !== 'P') return false
        const positions = p.position.split('/').map(s => s.trim())
        return positions.some(pos => slotDef.slotPos.includes(pos))
      }) ?? null
      if (candidate) used.add(candidate.id)
      assigned.push({ label: slotDef.label, player: candidate })
    }
  }
  return assigned
}

function getRoundPhase(pick: number): 'early' | 'mid' | 'late' {
  if (pick <= EARLY_ROUND_END * 10) return 'early'
  if (pick <= MID_ROUND_END * 10)   return 'mid'
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
      if (filledSlots[slot.label] < slot.count &&
          (slot.type === 'ANY' || slot.type === p.type) &&
          positions.some(pos => slot.slotPos.includes(pos))) {
        filledSlots[slot.label]++; break
      }
    }
  }

  const openSlots = ROSTER_SLOTS
    .filter(s => filledSlots[s.label] < s.count)
    .map(s => ({ label: s.label, urgent: s.label !== 'BN' && s.label !== 'UT' }))

  const hitterSlotsFull  = !openSlots.some(s => ['C','1B','2B','3B','SS','OF','UT'].includes(s.label))
  const pitcherSlotsFull = !openSlots.some(s => ['RP','P','BN'].includes(s.label))
  const utilOpen = filledSlots['UT'] < 2

  const positionsStillNeeded = new Set<string>()
  for (const slot of ROSTER_SLOTS) {
    if (filledSlots[slot.label] < slot.count) {
      slot.slotPos.forEach(pos => positionsStillNeeded.add(pos))
    }
  }

  const weakBatCats: BatCat[] = []
  const weakPitCats: PitCat[] = []

  if (hitters.length >= 2) {
    const hScale = 10 / hitters.length
    if (hitters.reduce((s,p)=>s+(p.stats.sb??0),0)*hScale < 80)   weakBatCats.push('SB')
    if (hitters.reduce((s,p)=>s+(p.stats.hr??0),0)*hScale < 160)  weakBatCats.push('HR')
    if (hitters.reduce((s,p)=>s+(p.stats.rbi??0),0)*hScale < 500) weakBatCats.push('RBI')
    if (hitters.reduce((s,p)=>s+(p.stats.ops??0),0)/hitters.length < 0.820) weakBatCats.push('OPS')
  }
  if (pitchers.length >= 1) {
    const pScale = 11 / pitchers.length
    if (pitchers.reduce((s,p)=>s+(p.stats.sv??0),0)*pScale < 30)  weakPitCats.push('SV')
    if (pitchers.reduce((s,p)=>s+(p.stats.qs??0),0)*pScale < 50)  weakPitCats.push('QS')
    if (pitchers.reduce((s,p)=>s+(p.stats.era??0),0)/pitchers.length > 3.80)  weakPitCats.push('ERA')
    if (pitchers.reduce((s,p)=>s+(p.stats.whip??0),0)/pitchers.length > 1.22) weakPitCats.push('WHIP')
  }

  return {
    needsHitter: hitters.length < 10, needsPitcher: pitchers.length < 11,
    hitterSlotsFull, pitcherSlotsFull, utilOpen, positionsStillNeeded,
    weakBatCats, weakPitCats, filledSlots, openSlots,
  }
}

function playerCanFit(p: ScoredPlayer, needs: ReturnType<typeof analyzeNeeds>): boolean {
  const positions = p.position.split('/').map(s => s.trim())
  if (p.type === 'P') return !needs.pitcherSlotsFull
  const hasOpenDedicated = positions.some(pos =>
    needs.positionsStillNeeded.has(pos) && ['C','1B','2B','3B','SS','OF'].includes(pos)
  )
  if (hasOpenDedicated) return true
  if (needs.utilOpen) return true
  return false
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

  const openHitterSlots  = needs.openSlots.filter(s => ['C','1B','2B','3B','SS','OF','UT'].includes(s.label)).length
  const openPitcherSlots = needs.openSlots.filter(s => ['SP/RP','RP','P','BN'].includes(s.label)).length
  const hitterUrgency    = openHitterSlots > openPitcherSlots
  const pitcherUrgency   = openPitcherSlots > openHitterSlots

  for (const p of available.slice(0, 300)) {
    if (!playerCanFit(p, needs)) continue

    let priority: 'high'|'med'|'low' = 'low'
    let boost = 0
    const tags: string[] = []
    const positions = p.position.split('/').map(s => s.trim())

    // ESPN edge — very high edge players suppressed regardless of urgency
    if (p.edge != null) {
      if (p.edge <= -40) {
        boost += 0.18; tags.push('🎯 ESPN target')
      } else if (p.edge <= -20) {
        boost += 0.10; tags.push('⚡ Draft soon')
      } else if (p.edge >= 40) {
        const hasUrgency = (p.type === 'P' && pitcherUrgency) || (p.type === 'H' && hitterUrgency)
        const veryHighEdge = p.edge >= 75
        if (!hasUrgency || veryHighEdge) {
          const edgePenalty = p.edge >= 100 ? -0.20 : p.edge >= 75 ? -0.12 : -0.05
          boost += edgePenalty
          tags.push('⏳ Can wait')
        }
      }
    }

    // Slot filling — dampened by type urgency AND ESPN buffer
    const fillsUrgent = needs.openSlots.some(
      s => s.urgent && ROSTER_SLOTS.find(r => r.label === s.label)?.slotPos.some(pos => positions.includes(pos))
    )
    if (fillsUrgent) {
      const slotBoost = phase === 'early' ? 0.15 : phase === 'mid' ? 0.25 : 0.20

      // Dampen if other type is more urgently needed
      const typeDampened = (p.type === 'P' && hitterUrgency) ? slotBoost * 0.3
                         : (p.type === 'H' && pitcherUrgency) ? slotBoost * 0.3
                         : slotBoost

      // Dampen further if ESPN won't take this player for many picks
      const espnBuffer = p.espnRank != null ? p.espnRank - draftPick : 0
      const espnDampened = espnBuffer > 30 ? typeDampened * 0.4
                         : espnBuffer > 15 ? typeDampened * 0.7
                         : typeDampened

      boost += espnDampened

      // Priority reflects genuine urgency — if ESPN won't take them for 30 picks, it's not urgent
      if (espnBuffer > 30)      priority = 'low'
      else if (espnBuffer > 15) priority = 'med'
      else                      priority = 'high'

      tags.push(`📋 Fills ${positions[0]} slot`)
    }
    if (p.type === 'H' && !fillsUrgent && needs.utilOpen) tags.push('🔀 UT only')

    // Type balance with urgency
    if (p.type === 'H' && needs.needsHitter && phase !== 'early') {
      const hBoost = hitterUrgency ? 0.30 : 0.08
      boost += hBoost
      if (priority === 'low') priority = hitterUrgency ? 'high' : 'med'
      if (pitcherUrgency) boost -= 0.20
    }
    if (p.type === 'P' && needs.needsPitcher && phase !== 'early') {
      const pBoost = pitcherUrgency ? 0.30 : 0.08
      boost += pBoost
      if (priority === 'low') priority = pitcherUrgency ? 'high' : 'med'
      if (hitterUrgency) boost -= 0.20
    }

    // Category needs
    const catScale = phase === 'late' ? 1.5 : phase === 'mid' ? 1.0 : 0.3
    if (p.type === 'H') {
      if (needs.weakBatCats.includes('SB')  && (p.stats.sb??0)  > (phase==='late'?15:18)) { boost += 0.12*catScale; tags.push('💨 SB'); if (priority==='low') priority='med' }
      if (needs.weakBatCats.includes('HR')  && (p.stats.hr??0)  > (phase==='late'?20:22)) { boost += 0.08*catScale; tags.push('💪 HR') }
      if (needs.weakBatCats.includes('RBI') && (p.stats.rbi??0) > 70)                    { boost += 0.06*catScale; tags.push('🏃 RBI') }
      if (needs.weakBatCats.includes('OPS') && (p.stats.ops??0) > 0.830)                 { boost += 0.06*catScale; tags.push('📊 OPS') }
    }
    if (p.type === 'P') {
      if (needs.weakPitCats.includes('SV')   && (p.stats.sv??0)   > (phase==='late'?10:12))     { boost += 0.12*catScale; tags.push('🔒 SV'); if (priority==='low') priority='med' }
      if (needs.weakPitCats.includes('QS')   && (p.stats.qs??0)   > (phase==='late'?8:10))      { boost += 0.08*catScale; tags.push('✅ QS') }
      if (needs.weakPitCats.includes('ERA')  && (p.stats.era??0)  < (phase==='late'?3.70:3.50)) { boost += 0.06*catScale; tags.push('📉 ERA') }
      if (needs.weakPitCats.includes('WHIP') && (p.stats.whip??0) < (phase==='late'?1.20:1.15)) { boost += 0.06*catScale; tags.push('📉 WHIP') }
    }

    // Positional scarcity
    for (const pos of positions) {
      const sb = positionScarcityBoost(pos, scarcity)
      if (sb > 0) { boost += sb; tags.push(`⚠️ ${pos} scarce (${scarcity[pos]??0} left)`); if (priority==='low') priority='med' }
    }

    // Entry gate — lowered threshold + elite players always visible in early rounds
    if (boost > 0.04 || (p.rank <= 30 && phase === 'early') || (p.rank <= 15 && phase !== 'late')) {
      recs.push({ player: p, priority, score: p.finalScore + boost, tags })
    }
  }

  return recs.sort((a, b) => {
    const scoreDiff = b.score - a.score
    if (Math.abs(scoreDiff) < 0.02) {
      const aEdge = a.player.edge ?? 999
      const bEdge = b.player.edge ?? 999
      return aEdge - bEdge
    }
    return scoreDiff
  }).slice(0, topN)
    .map(({ player, priority, tags }) => ({ player, priority, tags }))
}

interface CatBarProps {
  label: string
  value: number
  maxVal: number
  lowerBetter?: boolean
  threshold?: number
}

function CatBar({ label, value, maxVal, lowerBetter, threshold }: CatBarProps) {
  const pct = maxVal > 0 ? Math.min(100, (value / maxVal) * 100) : 0
  const threshPct = threshold != null ? Math.min(100, (threshold / maxVal) * 100) : null
  const good = threshold != null
    ? lowerBetter ? value <= threshold : value >= threshold
    : lowerBetter ? pct < 60 : pct > 40
  const barPct = lowerBetter ? 100 - pct : pct
  const markerPct = threshPct != null
    ? lowerBetter ? 100 - threshPct : threshPct
    : null

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-500">{label}</span>
        <span className={`font-mono ${good ? 'text-emerald-400' : 'text-amber-400'}`}>
          {lowerBetter ? value.toFixed(2) : value.toFixed(1)}
        </span>
      </div>
      <div className="relative h-1.5 bg-slate-800 rounded overflow-visible">
        <div
          className={`h-full rounded transition-all ${good ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${barPct}%` }}
        />
        {markerPct != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/60 rounded"
            style={{ left: `${markerPct}%` }}
          />
        )}
      </div>
    </div>
  )
}

function BarLegend() {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-[10px]">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-slate-600 hover:text-slate-400 transition-colors underline underline-offset-2">
        How to read these bars {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-2 bg-slate-800/60 border border-slate-700 rounded-lg p-3 space-y-1.5 text-slate-400 leading-relaxed">
          <p><span className="text-emerald-400">Green bar</span> = at or above target. <span className="text-amber-400">Amber bar</span> = below target.</p>
          <p>The <span className="text-white/60 font-semibold">white line marker</span> shows the minimum threshold for that category. If your bar hasn&apos;t reached the marker, the category is flagged as a need and recommendations will boost players who address it.</p>
          <p>For <span className="text-red-400">ERA and WHIP</span> the bar is inverted — a shorter bar means a lower (better) value. The marker shows the maximum acceptable value before it becomes a weakness.</p>
          <p className="text-slate-600">Thresholds are projected to a full roster using a scaling factor, so early in the draft the bars will fluctuate more than late.</p>
        </div>
      )}
    </div>
  )
}

function PhaseLabel({ pick }: { pick: number }) {
  const phase = getRoundPhase(pick)
  const styles = { early: 'bg-blue-900/60 text-blue-300 border-blue-700', mid: 'bg-amber-900/60 text-amber-300 border-amber-700', late: 'bg-purple-900/60 text-purple-300 border-purple-700' }
  const labels = { early: '🎯 Early — Best Player Available', mid: '⚖️ Mid — Balance needs & value', late: '🔍 Late — Cats, sleepers & scarcity' }
  return <span className={`text-[10px] px-2 py-0.5 rounded border ${styles[phase]}`}>{labels[phase]}</span>
}

function slotLabelColor(label: string): string {
  if (['C','1B','2B','3B','SS'].includes(label)) return 'text-emerald-400'
  if (label === 'OF') return 'text-emerald-300'
  if (label === 'UT') return 'text-amber-400'
  if (label === 'RP') return 'text-red-400'
  if (label === 'P')  return 'text-red-300'
  if (label === 'BN') return 'text-slate-500'
  return 'text-slate-400'
}

export default function TeamTracker({ myTeam, ranked, onSelect, onToggleMyRoster, draftPick }: Props) {
  const available     = useMemo(() => ranked.filter(p => !p.drafted), [ranked])
  const needs         = useMemo(() => analyzeNeeds(myTeam), [myTeam])
  const recs          = useMemo(() => getRecommendations(available, needs, draftPick), [available, needs, draftPick])
  const assignedSlots = useMemo(() => assignToSlots(myTeam), [myTeam])
  const hitters       = myTeam.filter(p => p.type === 'H')
  const pitchers      = myTeam.filter(p => p.type === 'P')

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
          <p className="text-sm text-slate-500 mb-2">Pick #{draftPick} · {myTeam.length}/21 rostered · {available.length} available</p>
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
          <div className="text-sm">Mark players with the <strong className="text-slate-500">M</strong> button on the Draft Board.</div>
          <div className="text-xs mt-2 text-slate-700">Your roster will appear here by position.</div>
        </div>
      ) : (
        <>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">🎯 Recommended Next Picks</h2>
              <span className="text-[10px] text-slate-600">Roster-filtered · Edge-weighted</span>
            </div>
            <div className="space-y-2">
              {recs.length === 0 ? (
                <div className="text-xs text-slate-600 py-3 text-center">
                  {needs.hitterSlotsFull && needs.pitcherSlotsFull ? '✅ Roster is full!' : 'No strong recommendations — check the Draft Board.'}
                </div>
              ) : recs.map(({ player: p, priority, tags }, i) => {
                const visibleTags = tags.filter(t => !t.includes('Can wait'))
                return (
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
                        {visibleTags.slice(0, 3).map((t, ti) => (
                          <span key={ti} className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1 py-0.5 rounded">{t}</span>
                        ))}
                        {visibleTags.length === 0 && (
                          <span className="text-[9px] bg-slate-800 text-slate-500 border border-slate-700 px-1 py-0.5 rounded">
                            📊 Model pick #{p.rank}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-mono text-blue-300 font-bold">#{p.rank}</div>
                      <div className={`text-[10px] font-mono ${edgeColor(p.edge)}`}>{p.edge!=null?(p.edge>0?`+${p.edge}`:p.edge):'—'} edge</div>
                      <div className="text-[9px] text-slate-600 mt-0.5">BLND {p.blnd.toFixed(1)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

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
              <CatBar label="Runs" value={batTotals.R}   maxVal={750} />
              <CatBar label="HR"   value={batTotals.HR}  maxVal={300} threshold={160} />
              <CatBar label="RBI"  value={batTotals.RBI} maxVal={700} threshold={500} />
              <CatBar label="SB"   value={batTotals.SB}  maxVal={175} threshold={80} />
              <CatBar label="OPS"  value={batTotals.OPS} maxVal={1.0} threshold={0.820} />
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3 space-y-2">
              <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-2">Pitching</div>
              <CatBar label="K"    value={pitTotals.K}    maxVal={2000} />
              <CatBar label="QS"   value={pitTotals.QS}   maxVal={180}  threshold={50} />
              <CatBar label="SV"   value={pitTotals.SV}   maxVal={100}  threshold={30} />
              <CatBar label="ERA"  value={pitTotals.ERA}  maxVal={5.5}  threshold={3.80} lowerBetter />
              <CatBar label="WHIP" value={pitTotals.WHIP} maxVal={1.6}  threshold={1.22} lowerBetter />
            </div>
          </section>

          <BarLegend />

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Roster ({myTeam.length}/21)</h2>
            <div className="space-y-0.5">
              {assignedSlots.map((slot, i) => (
                <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded ${slot.player ? 'hover:bg-slate-800/40' : 'opacity-40'}`}>
                  <span className={`text-[10px] font-bold w-8 text-right flex-shrink-0 ${slotLabelColor(slot.label)}`}>
                    {slot.label}
                  </span>
                  <div className="w-px h-4 bg-slate-700 flex-shrink-0" />
                  {slot.player ? (
                    <div className="flex-1 flex items-center gap-2 cursor-pointer" onClick={() => onSelect(slot.player!)}>
                      <TypeBadge type={slot.player.type} />
                      <span className="text-white text-xs font-medium flex-1">{slot.player.name}</span>
                      <span className="text-slate-500 text-[10px]">{slot.player.position}</span>
                      <span className="text-slate-600 text-[10px] font-mono">{slot.player.team}</span>
                      <span className="text-blue-400 font-mono text-[10px]">#{slot.player.rank}</span>
                      {slot.player.edge != null && slot.player.edge >= 20 && (
                        <span className="text-[9px] text-emerald-500">+{slot.player.edge}</span>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); onToggleMyRoster(slot.player!.id) }}
                        className="text-slate-600 hover:text-red-400 transition-colors text-xs px-1 ml-1"
                        title="Remove">✕</button>
                    </div>
                  ) : (
                    <span className="text-slate-700 text-xs italic">— empty —</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
