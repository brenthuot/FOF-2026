import AppShell from '@/components/AppShell'
import playersData from '@/data/players.json'
import type { RawPlayer, DataMeta } from '@/lib/types'

// Other teams' keepers — always off the board from pick 1
// Includes Team Huot keepers so draftedCount is never inflated
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
  // Team Huot keepers (also pre-loaded into myRosterIds)
  'vinnie-pasquantino',
  'cristopher-s-nchez',
]

export default function Home() {
  const { players, meta } = playersData as { players: RawPlayer[]; meta: DataMeta }
  return <AppShell players={players} meta={meta} preDraftedIds={PRE_DRAFTED_IDS} />
}
