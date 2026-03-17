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
