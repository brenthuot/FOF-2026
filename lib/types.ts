// ─── Raw data shape (from players.json) ───────────────────────────────────────

export interface PlayerStats {
  r:    number | null
  hr:   number | null
  rbi:  number | null
  sb:   number | null
  ops:  number | null
  qs:   number | null
  k:    number | null
  sv:   number | null
  era:  number | null
  whip: number | null
  ip:   number | null
}

export interface RawPlayer {
  id:         string
  name:       string
  team:       string
  position:   string   // e.g. "1B/OF"
  primaryPos: string   // e.g. "1B"
  type:       'H' | 'P'
  blnd:       number
  zBlnd:      number   // pre-computed at default normalization
  espnRank:   number | null
  stats:      PlayerStats
}

export interface DataMeta {
  hBlndMean: number; hBlndStd: number
  pBlndMean: number; pBlndStd: number
  hSbMean:   number
  sbScale:   number
  replScale: number
  replZ:     Record<string, number>
  totalPlayers: number
  hitters: number
  pitchers: number
}

// ─── Model settings (Controls) ────────────────────────────────────────────────

export interface ModelSettings {
  hitterWeight:       number    // 0.55
  pitcherCompression: number    // 0.95
  replacementOn:      boolean   // true
  replacementStrength:number    // 1.0
  sbScarcityOn:       boolean   // true
  sbStrength:         number    // 1.0
  tierGapThreshold:   number    // 0.12
}

export const DEFAULT_SETTINGS: ModelSettings = {
  hitterWeight:        0.55,   // 55/45 split — puts top SPs at ranks 14-18
  pitcherCompression:  0.95,   // slight compression prevents pitcher streaks
  replacementOn:       true,
  replacementStrength: 1.0,
  sbScarcityOn:        true,
  sbStrength:          1.0,
  tierGapThreshold:    0.12,
}

// Re-export Diagnostics type so components can import from one place
export type { Diagnostics } from './scoring'

export interface ScoredPlayer extends RawPlayer {
  // scoring breakdown
  baseScore:   number
  replBase:    number
  sbBase:      number
  finalScore:  number
  // ranking
  rank:        number
  tier:        number
  gapFromPrev: number
  edge:        number | null   // ESPN rank − model rank (positive = model likes more)
  drafted:     boolean
}
