import AppShell from '@/components/AppShell'
import playersData from '@/data/players.json'
import type { RawPlayer, DataMeta } from '@/lib/types'

const PRE_DRAFTED_IDS = [
  'pete-alonso',
  'roman-anthony',
  'cal-raleigh',
  'josh-naylor',
  'kyle-schwarber',
  'hunter-greene',
  'george-springer',
  'nick-pivetta',
  'brent-rooker',
  'jes-s-luzardo',
  'junior-caminero',
  'randy-arozarena',
  'jeremy-pe-a',
  'george-kirby',
  // Team Huot keepers
  'vinnie-pasquantino',
  'cristopher-s-nchez',
]

export default function Home() {
  const { players, meta } = playersData as { players: RawPlayer[]; meta: DataMeta }
  return <AppShell players={players} meta={meta} preDraftedIds={PRE_DRAFTED_IDS} />
}
