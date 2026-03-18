import AppShell from '@/components/AppShell'
import playersData from '@/data/players.json'
import type { RawPlayer, DataMeta } from '@/lib/types'

// All 18 keepers drafted by other teams — always off the board
// Vinnie Pasquantino and Cristopher Sánchez are Team Huot keepers
// and are initialized directly in AppShell's myRosterIds
const PRE_DRAFTED_IDS = [
  'pete-alonso',
  'roman-anthony',
  'tarik-skubal',
  'cal-raleigh',
  'josh-naylor',
  'kyle-schwarber',
  'hunter-greene',
  'george-springer',
  'paul-skenes',
  'nick-pivetta',
  'brent-rooker',
  'jes-s-luzardo',
  'ronald-acu-a-jr-',
  'junior-caminero',
  'randy-arozarena',
  'jeremy-pe-a',
  'julio-rodr-guez',
  'george-kirby',
  // Team Huot keepers — also in myRosterIds
  'vinnie-pasquantino',
  'cristopher-s-nchez',
]

export default function Home() {
  const { players, meta } = playersData as { players: RawPlayer[]; meta: DataMeta }
  return <AppShell players={players} meta={meta} preDraftedIds={PRE_DRAFTED_IDS} />
}
