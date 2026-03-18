'use client'
import { useState, useMemo, useCallback } from 'react'
import { computeRankings, computeDiagnostics } from '@/lib/scoring'
import type { RawPlayer, DataMeta, ModelSettings, ScoredPlayer } from '@/lib/types'
import { DEFAULT_SETTINGS } from '@/lib/types'
import ControlsPanel from './ControlsPanel'
import DraftBoard from './DraftBoard'
import FullPool from './FullPool'
import DiagnosticsView from './DiagnosticsView'
import ESPNEdgeView from './ESPNEdgeView'
import PlayerDrawer from './PlayerDrawer'
import TeamTracker from './TeamTracker'
import DraftImport from './DraftImport'

const MY_KEEPER_IDS = ['vinnie-pasquantino', 'cristopher-s-nchez']

type Tab = 'draft' | 'team' | 'pool' | 'diagnostics' | 'edges'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'draft',       label: 'Draft Board', icon: '🎯' },
  { id: 'team',        label: 'My Team',     icon: '⚾' },
  { id: 'pool',        label: 'Full Pool',   icon: '📋' },
  { id: 'diagnostics', label: 'Diagnostics', icon: '🔬' },
  { id: 'edges',       label: 'ESPN Edges',  icon: '📊' },
]

interface Props {
  players: RawPlayer[]
  meta: DataMeta
  preDraftedIds: string[]
}

export default function AppShell({ players, meta, preDraftedIds }: Props) {
  const [settings, setSettings]             = useState<ModelSettings>(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab]           = useState<Tab>('draft')
  const [selectedPlayer, setSelectedPlayer] = useState<ScoredPlayer | null>(null)
  const [controlsOpen, setControlsOpen]     = useState(true)
  const [showImport, setShowImport]         = useState(false)

  // All 20 keepers pre-marked — never available, never recommended
  const [draftedIds, setDraftedIds] = useState<Set<string>>(
    () => new Set(preDraftedIds)
  )

  // My roster pre-loaded with Team Huot keepers
  const [myRosterIds, setMyRosterIds] = useState<Set<string>>(
    () => new Set(MY_KEEPER_IDS)
  )

  // Tracks how many pre-drafted keepers have been "imported" in rounds
  // Each time a round import contains a pre-drafted player (other team's keeper),
  // that pick was real but didn't grow draftedIds — so we count it separately
  const [keeperPickCount, setKeeperPickCount] = useState(0)

  const ranked = useMemo(
    () => computeRankings(players, meta, settings, draftedIds),
    [players, meta, settings, draftedIds],
  )

  const diagnostics = useMemo(() => computeDiagnostics(ranked), [ranked])

  // Accurate live pick count:
  // (draftedIds - all 20 pre-loaded keepers) + keepers that have shown up in imports
  const draftedCount  = draftedIds.size - preDraftedIds.length + keeperPickCount + pickOffset
  const myRosterCount = myRosterIds.size
  const draftPick     = draftedCount + 1

  const myTeam = useMemo(
    () => ranked.filter(p => myRosterIds.has(p.id)),
    [ranked, myRosterIds],
  )

  const toggleDrafted = useCallback((id: string) => {
    setDraftedIds(prev => {
      if (preDraftedIds.includes(id) && prev.has(id)) return prev
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [preDraftedIds])

  const toggleMyRoster = useCallback((id: string) => {
    setMyRosterIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (MY_KEEPER_IDS.includes(id)) return prev
        next.delete(id)
        setDraftedIds(d => {
          const nd = new Set(d)
          nd.delete(id)
          return nd
        })
      } else {
        next.add(id)
        setDraftedIds(d => { const nd = new Set(d); nd.add(id); return nd })
      }
      return next
    })
  }, [])

  const handleImport = useCallback((draftedList: string[], myPickList: string[]) => {
    // Count how many players in this import were already pre-drafted (other teams' keepers)
    // These picks are real but won't grow draftedIds, so track them separately
    const keepersInThisRound = draftedList.filter(id =>
      preDraftedIds.includes(id) && !MY_KEEPER_IDS.includes(id)
    ).length
    setKeeperPickCount(prev => prev + keepersInThisRound)

    setDraftedIds(prev => {
      const next = new Set(prev)
      draftedList.forEach(id => next.add(id))
      myPickList.forEach(id => next.add(id))
      return next
    })
    setMyRosterIds(prev => {
      const next = new Set(prev)
      myPickList.forEach(id => next.add(id))
      return next
    })
  }, [preDraftedIds])

  const handleReset = useCallback(() => {
    if (!confirm('Reset draft? All imported picks will be cleared. Keepers will remain.')) return
    setDraftedIds(new Set(preDraftedIds))
    setMyRosterIds(new Set(MY_KEEPER_IDS))
    setKeeperPickCount(0)
    setSelectedPlayer(null)
  }, [preDraftedIds])

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a1628]">

      <aside className={`flex-shrink-0 border-r border-slate-700/50 bg-[#0f1b2d] overflow-y-auto transition-all duration-200 ${
        controlsOpen ? 'w-72' : 'w-0 border-none overflow-hidden'
      }`}>
        <ControlsPanel settings={settings} onChange={setSettings} diagnostics={diagnostics} />
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-[#0f1b2d]">

          <button onClick={() => setControlsOpen(o => !o)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <div className="flex items-center gap-2 mr-1 flex-shrink-0">
            <span className="text-lg">⚾</span>
            <span className="font-semibold text-white text-sm tracking-wide">Draft 2026</span>
            <span className="text-xs text-slate-500 font-mono hidden xl:inline">H2H · 10-Team · BLND</span>
          </div>

          <nav className="flex gap-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  activeTab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}>
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
                {t.id === 'team' && myRosterCount > 0 && (
                  <span className="bg-blue-500 text-white rounded-full px-1.5 text-[10px] font-bold ml-0.5">
                    {myRosterCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white transition-colors flex-shrink-0">
              📥 <span className="hidden sm:inline">Import Round</span>
            </button>

            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-700 hover:bg-red-900/60 text-slate-300 hover:text-red-300 border border-slate-600 transition-colors flex-shrink-0">
              ↺ <span className="hidden sm:inline">Reset Draft</span>
            </button>

            {myRosterCount > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-900/40 border border-blue-800 rounded px-2 py-1 text-xs text-blue-300 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="font-mono font-semibold">{myRosterCount}</span>
                <span className="hidden md:inline text-blue-400">my picks</span>
              </div>
            )}

            {draftedCount > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded px-2 py-1 text-xs text-slate-400 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <span className="font-mono">{draftedIds.size - myRosterIds.size}</span>
                <span className="hidden md:inline">off board</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {activeTab === 'draft' && (
            <DraftBoard ranked={ranked} onSelect={setSelectedPlayer}
              onToggleDraft={toggleDrafted} onToggleMyRoster={toggleMyRoster}
              draftedIds={draftedIds} myRosterIds={myRosterIds} draftPick={draftPick} />
          )}
          {activeTab === 'team' && (
            <TeamTracker myTeam={myTeam} ranked={ranked} onSelect={setSelectedPlayer}
              onToggleMyRoster={toggleMyRoster} draftPick={draftPick} />
          )}
          {activeTab === 'pool' && (
            <FullPool ranked={ranked} onSelect={setSelectedPlayer}
              onToggleDraft={toggleDrafted} onToggleMyRoster={toggleMyRoster}
              draftedIds={draftedIds} myRosterIds={myRosterIds} />
          )}
          {activeTab === 'diagnostics' && (
            <DiagnosticsView diagnostics={diagnostics} settings={settings} ranked={ranked} />
          )}
          {activeTab === 'edges' && (
            <ESPNEdgeView ranked={ranked} onSelect={setSelectedPlayer} />
          )}
        </main>
      </div>

      {selectedPlayer && (
        <PlayerDrawer player={selectedPlayer} settings={settings}
          onClose={() => setSelectedPlayer(null)}
          onToggleDraft={toggleDrafted} onToggleMyRoster={toggleMyRoster}
          myRosterIds={myRosterIds} />
      )}

      {showImport && (
        <DraftImport players={ranked} onImport={handleImport}
          onClose={() => setShowImport(false)} totalDrafted={draftedCount} />
      )}
    </div>
  )
}
