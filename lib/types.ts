import type { Diagnostics } from './scoring'
export type { Diagnostics }

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
  position:   string
  primaryPos: string
  type:       'H' | 'P'
  blnd:       number
  zBlnd:      number
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

export interface ModelSettings {
  hitterWeight:        number
  pitcherCompression:  number
  replacementOn:       boolean
  replacementStrength: number
  sbScarcityOn:        boolean
  sbStrength:          number
  tierGapThreshold:    number
}

export const DEFAULT_SETTINGS: ModelSettings = {
  hitterWeight:        0.55,
  pitcherCompression:  0.85,
  replacementOn:       true,
  replacementStrength: 1.0,
  sbScarcityOn:        true,
  sbStrength:          1.0,
  tierGapThreshold:    0.030,
}

export interface ScoredPlayer extends RawPlayer {
  baseScore:   number
  replBase:    number
  sbBase:      number
  finalScore:  number
  rank:        number
  tier:        number
  gapFromPrev: number
  edge:        number | null
  drafted:     boolean
}
