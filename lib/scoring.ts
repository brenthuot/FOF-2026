import type { RawPlayer, ModelSettings, ScoredPlayer, DataMeta } from './types'

export function computeRankings(
  players: RawPlayer[],
  meta: DataMeta,
  settings: ModelSettings,
  draftedIds: Set<string> = new Set(),
): ScoredPlayer[] {
  const pw = 1 - settings.hitterWeight

  const scored = players.map(p => {
    const z = p.zBlnd
    const baseScore = p.type === 'H'
      ? z * settings.hitterWeight
      : z * pw * settings.pitcherCompression

    const replZ = meta.replZ[p.primaryPos] ?? 0
    const replBase = meta.replScale * Math.max(0, z - replZ)

    const sb = p.stats.sb ?? 0
    const sbBase = p.type === 'H'
      ? meta.sbScale * Math.max(0, sb - meta.hSbMean)
      : 0

    const finalScore =
      baseScore +
      (settings.replacementOn ? replBase * settings.replacementStrength : 0) +
      (settings.sbScarcityOn  ? sbBase   * settings.sbStrength           : 0)

    return { ...p, baseScore, replBase, sbBase, finalScore, drafted: draftedIds.has(p.id) }
  })

  scored.sort((a, b) => b.finalScore - a.finalScore)

  let tier = 1
  return scored.map((p, i) => {
    const prev = i > 0 ? scored[i - 1] : null
    const gap = prev ? Math.abs(p.finalScore - prev.finalScore) : 0
    if (i > 0 && gap > settings.tierGapThreshold) tier++
    return {
      ...p,
      rank:        i + 1,
      tier,
      gapFromPrev: gap,
      edge:        p.espnRank != null ? p.espnRank - (i + 1) : null,
    }
  })
}

export interface Diagnostics {
  pitchersTop20:  number
  pitchersTop50:  number
  pitchersTop100: number
  longestPitcherStreak: number
  longestHitterStreak:  number
  totalTiers:     number
  posEdge20Plus:  number
  negEdge20Plus:  number
}

export function computeDiagnostics(ranked: ScoredPlayer[]): Diagnostics {
  const available = ranked.filter(p => !p.drafted)
  const top300 = available.slice(0, 300)

  const pitchersTop20  = available.slice(0, 20).filter(p => p.type === 'P').length
  const pitchersTop50  = available.slice(0, 50).filter(p => p.type === 'P').length
  const pitchersTop100 = available.slice(0, 100).filter(p => p.type === 'P').length
  const totalTiers = top300.length > 0 ? top300[top300.length - 1].tier : 1

  let maxP = 0, maxH = 0, curP = 0, curH = 0
  for (const p of top300) {
    if (p.type === 'P') { curP++; curH = 0 } else { curH++; curP = 0 }
    maxP = Math.max(maxP, curP); maxH = Math.max(maxH, curH)
  }

  const posEdge20Plus = top300.filter(p => p.edge != null && p.edge >= 20).length
  const negEdge20Plus = top300.filter(p => p.edge != null && p.edge <= -20).length

  return { pitchersTop20, pitchersTop50, pitchersTop100,
           longestPitcherStreak: maxP, longestHitterStreak: maxH,
           totalTiers, posEdge20Plus, negEdge20Plus }
}
