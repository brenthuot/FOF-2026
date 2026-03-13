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

type Tab = 'draft' | 'team' | 'pool' | 'diagnostics' | 'edges'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'draft',       label: 'Draft Board',  icon: '🎯' },
  { id: 'team',        label: 'My Team',      icon: '⚾' },
  { id: 'pool',        label: 'Full Pool',    icon: '📋' },
  { id: 'diagnostics', label: 'Diagnostics',  icon: '🔬' },
  { id: 'edges',       label: 'ESPN Edges',   icon: '📊' },
]

export default function AppShell({ players, meta }: { players: RawPlayer[]; meta: DataMeta }) {
  const [settings, setSettings] = useState<ModelSettings>(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab] = useState<Tab>('draft')
  const [draftedIds, setDraftedIds] = useState<Set<string>>(new Set())
  const [selectedPlayer, setSelectedPlayer] = useState<ScoredPlayer | null>(null)
  const [controlsOpen, setControlsOpen] = useState(true)

  const ranked = useMemo(
    () => computeRankings(players, meta, settings, draftedIds),
    [players, meta, settings, draftedIds],
  )

  const diagnostics = useMemo(() => computeDiagnostics(ranked), [ranked])

  const toggleDrafted = useCallback((id: string) => {
    setDraftedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const draftedCount = draftedIds.size

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a1628]">
      {/* ── Sidebar: controls ── */}
      <aside
        className={`flex-shrink-0 border-r border-slate-700/50 bg-[#0f1b2d] overflow-y-auto transition-all duration-200 ${
          controlsOpen ? 'w-72' : 'w-0 border-none overflow-hidden'
        }`}
      >
        <ControlsPanel
          settings={settings}
          onChange={setSettings}
          diagnostics={diagnostics}
        />
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top nav */}
        <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/50 bg-[#0f1b2d]">
          {/* Toggle sidebar */}
          <button
            onClick={() => setControlsOpen(o => !o)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Toggle controls"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 mr-2">
            <span className="text-lg">⚾</span>
            <span className="font-semibold text-white text-sm tracking-wide">
              Draft 2026
            </span>
            <span className="text-xs text-slate-500 font-mono">H2H · 10-Team · BLND</span>
          </div>

          {/* Tabs */}
          <nav className="flex gap-0.5 ml-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === t.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </nav>

          {/* Draft counter */}
          {draftedCount > 0 && (
            <div className="ml-2 flex items-center gap-2 bg-slate-800 rounded px-2 py-1 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {draftedCount} drafted
              <button
                onClick={() => setDraftedIds(new Set())}
                className="text-slate-500 hover:text-white ml-1"
              >
                ✕
              </button>
            </div>
          )}
        </header>

        {/* View */}
        <main className="flex-1 overflow-hidden">
          {activeTab === 'draft' && (
            <DraftBoard
              ranked={ranked}
              onSelect={setSelectedPlayer}
              onToggleDraft={toggleDrafted}
              draftedIds={draftedIds}
            />
          )}
          {activeTab === 'pool' && (
            <FullPool
              ranked={ranked}
              onSelect={setSelectedPlayer}
              onToggleDraft={toggleDrafted}
              draftedIds={draftedIds}
            />
          )}
          {activeTab === 'team' && (
            <TeamTracker
              myTeam={ranked.filter(p => p.drafted)}
              ranked={ranked}
              onSelect={setSelectedPlayer}
              draftPick={draftedCount + 1}
            />
          )}
          {activeTab === 'diagnostics' && (
            <DiagnosticsView diagnostics={diagnostics} settings={settings} ranked={ranked} />
          )}
          {activeTab === 'edges' && (
            <ESPNEdgeView ranked={ranked} onSelect={setSelectedPlayer} />
          )}
        </main>
      </div>

      {/* ── Player detail drawer ── */}
      {selectedPlayer && (
        <PlayerDrawer
          player={selectedPlayer}
          settings={settings}
          onClose={() => setSelectedPlayer(null)}
          onToggleDraft={toggleDrafted}
        />
      )}
    </div>
  )
}
