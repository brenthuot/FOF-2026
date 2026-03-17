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

  const [draftedIds, setDraftedIds] = useState<Set<string>>(
    () => new Set(preDraftedIds)
  )
  const [myRosterIds, setMyRosterIds] = useState<Set<string>>(new Set())

  const ranked = useMemo(
    () => computeRankings(players, meta, settings, draftedIds),
    [players, meta, settings, draftedIds],
  )
  const diagnostics = useMemo(() => computeDiagnostics(ranked), [ranked])

  const toggleDrafted = useCallback((id: string) => {
    setDraftedIds(prev => {
      const next = new Set(prev)
      if (preDraftedIds.includes(id) && next.has(id)) return next
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [preDraftedIds])

  const toggleMyRoster = useCallback((id: string) => {
    setMyRosterIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        setDraftedIds(d => { const s = new Set(d); s.add(id); return s })
      }
      return next
    })
  }, [])

  const handleImport = useCallback((draftedList: string[], myPickList: string[]) => {
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
  }, [])

  const handleReset = useCallback(() => {
    if (confirm('Reset draft? Clears your roster and all imported picks. Pre-drafted players stay off the board.')) {
      setDraftedIds(new Set(preDraftedIds))
      setMyRosterIds(new Set())
      setSelectedPlayer(null)
    }
  }, [preDraftedIds])

  // draftedCount excludes the pre-drafted keepers — reflects actual picks made in the live draft
  const draftedCount  = draftedIds.size - preDraftedIds.length
  const myRosterCount = myRosterIds.size
  const myTeam = useMemo(() => ranked.filter(p => myRosterIds.has(p.id)), [ranked, myRosterIds])

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a1628]">
      <aside className={`flex-shrink-0 border-r border-slate-700/50 bg-[#0f1b2d] overflow-y-auto transition-all duration-200 ${controlsOpen ? 'w-72' : 'w-0 border-none overflow-hidden'}`}>
        <ControlsPanel settings={settings} onChange={setSettings} diagnostics={diagnostics} />
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-[#0f1b2d]">
          <button onClick={() => setControlsOpen(o => !o)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <div className="flex items-center gap-2 mr-2">
            <span className="text-lg">⚾</span>
            <span className="font-semibold text-white text-sm tracking-wide">Draft 2026</span>
            <span className="text-xs text-slate-500 font-mono">H2H · 10-Team · BLND</span>
          </div>
          <nav className="flex gap-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                {t.icon} {t.label}
                {t.id === 'team' && myRosterCount > 0 && (
                  <span className="ml-1 bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">{myRosterCount}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-emerald-700 text-white hover:bg-emerald-600 transition-colors">
              📥 Import Round
            </button>
            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-red-900/60 hover:text-red-300 transition-colors border border-slate-600">
              ↺ Reset Draft
            </button>
            {myRosterCount > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-900/40 border border-blue-700 rounded px-2 py-1 text-xs text-blue-300">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                {myRosterCount} my picks
              </div>
            )}
            {draftedCount > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-800 rounded px-2 py-1 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {draftedCount} off board
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {activeTab === 'draft' && (
            <DraftBoard ranked={ranked} onSelect={setSelectedPlayer}
              onToggleDraft={toggleDrafted} onToggleMyRoster={toggleMyRoster}
              draftedIds={draftedIds} myRosterIds={myRosterIds} />
          )}
          {activeTab === 'team' && (
            <TeamTracker myTeam={myTeam} ranked={ranked} onSelect={setSelectedPlayer}
              onToggleMyRoster={toggleMyRoster} draftPick={draftedCount + 1} />
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
