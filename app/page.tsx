import AppShell from '@/components/AppShell'
import playersData from '@/data/players.json'
import type { RawPlayer, DataMeta } from '@/lib/types'

export default function Home() {
  const { players, meta } = playersData as {
    players: RawPlayer[]
    meta: DataMeta & { preDraftedIds?: string[] }
  }
  return (
    <AppShell
      players={players}
      meta={meta}
      preDraftedIds={meta.preDraftedIds ?? []}
    />
  )
}
