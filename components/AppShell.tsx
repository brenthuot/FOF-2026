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

// ── Team Huot keepers — pre-loaded into roster, excluded from draftedCount ──
const MY_KEEPER_IDS = ['vinnie-pasquantino', 'cristopher-s-nchez']

type Tab = 'draft' | 'team' | 'pool' | 'diagnostics' | 'edges'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'draft',       label: 'Draft Board', icon: '🎯' },
  { id: 'team',        label: 'My Team',     icon: '⚾' },
  { id: 'pool',        label: 'Full Pool',   icon: '📋' },
  { id: 'diagnostics', label: 'Diagnostics', icon: '🔬' },
  { id: 'edges',       label: 'ESPN Edges',  icon: '📊' },
]

// ── Inline Import Modal ────────────────────────────────────────────────────
function ImportModal({
  players,
  onImport,
  onClose,
  totalDrafted,
}: {
  players: ScoredPlayer[]
  onImport: (drafted: string[], mine: string[]) => void
  onClose: () => void
  totalDrafted: number
}) {
  const [text, setText] = useState('')
  const [myPicksText, setMyPicksText] = useState('')
  const [preview, setPreview] = useState<{ matched: string[]; unmatched: string[] } | null>(null)

  function normalize(s: string) {
    return s.toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function match(name: string): ScoredPlayer | null {
    const n = normalize(name)
    // Exact match first
    let found = players.find(p => normalize(p.name) === n)
    if (found) return found
    // Last name match
    const lastName = n.split(' ').slice(-1)[0]
    if (lastName.length > 3) {
      const candidates = players.filter(p => normalize(p.name).endsWith(lastName))
      if (candidates.length === 1) return candidates[0]
    }
    // Partial — name contains search token
    const parts = n.split(' ').filter(x => x.length > 2)
    if (parts.length >= 2) {
      found = players.find(p => {
        const pn = normalize(p.name)
        return parts.every(part => pn.includes(part))
      })
      if (found) return found
    }
    return null
  }

  function runPreview() {
    const lines = text.split(/[\n,]+/).map(l => l.trim()).filter(Boolean)
    const matched: string[] = []
    const unmatched: string[] = []
    lines.forEach(line => {
      // Strip pick notation like "1.01" or "R1" from the start
      const clean = line.replace(/^\d+\.\d+\s*/, '').replace(/^R\d+\s*/i, '').trim()
      const p = match(clean)
      if (p) matched.push(p.id)
      else if (clean.length > 2) unmatched.push(clean)
    })
    setPreview({ matched, unmatched })
  }

  function handleImport() {
    if (!preview) return
    const mineLines = myPicksText.split(/[\n,]+/).map(l => l.trim()).filter(Boolean)
    const mineIds: string[] = []
    mineLines.forEach(line => {
      const clean = line.replace(/^\d+\.\d+\s*/, '').replace(/^R\d+\s*/i, '').trim()
      const p = match(clean)
      if (p) mineIds.push(p.id)
    })
    onImport(preview.matched, mineIds)
    onClose()
  }

  const round = Math.floor(totalDrafted / 10) + 1

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1b2d] border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-white font-semibold">Import Round</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Currently at pick #{totalDrafted + 1} · Round {round}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg px-2">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              All picks this round — paste names, one per line
            </label>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setPreview(null) }}
              placeholder={"Fernando Tatis Jr.\nGunnar Henderson\nJackson Chourio\n..."}
              className="w-full h-36 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              My picks this round (subset of above)
            </label>
            <textarea
              value={myPicksText}
              onChange={e => setMyPicksText(e.target.value)}
              placeholder={"Fernando Tatis Jr."}
              className="w-full h-16 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>

          {preview && (
            <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-semibold">✓ {preview.matched.length} matched</span>
                {preview.unmatched.length > 0 && (
                  <span className="text-amber-400">{preview.unmatched.length} unmatched</span>
                )}
              </div>
              {preview.matched.length > 0 && (
                <div className="text-[10px] text-slate-400 max-h-24 overflow-y-auto">
                  {preview.matched.map(id => {
                    const p = players.find(x => x.id === id)
                    return p ? (
                      <span key={id} className="inline-block bg-emerald-900/30 text-emerald-300 border border-emerald-800 rounded px-1 py-0.5 mr-1 mb-1">{p.name}</span>
                    ) : null
                  })}
                </div>
              )}
              {preview.unmatched.length > 0 && (
                <div className="text-[10px] text-amber-600">
                  Not found: {preview.unmatched.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          {!preview ? (
            <button
              onClick={runPreview}
              disabled={!text.trim()}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors disabled:opacity-40"
            >
              Preview matches
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={preview.matched.length === 0}
              className="flex-1 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded transition-colors disabled:opacity-40"
            >
              Import {preview.matched.length} picks
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AppShell ───────────────────────────────────────────────────────────────
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

  // All 20 keepers (18 others + 2 mine) pre-marked drafted so they're gray on board
  const [draftedIds, setDraftedIds] = useState<Set<string>>(
    () => new Set(preDraftedIds)
  )

  // My roster pre-loaded with Team Huot keepers so they appear without inflating draftedCount
  const [myRosterIds, setMyRosterIds] = useState<Set<string>>(
    () => new Set(MY_KEEPER_IDS)
  )

  const ranked = useMemo(
    () => computeRankings(players, meta, settings, draftedIds),
    [players, meta, settings, draftedIds],
  )

  const diagnostics = useMemo(() => computeDiagnostics(ranked), [ranked])

  // Excludes all pre-drafted keepers — reflects actual live picks only
  // Used for draftPick and phase detection in TeamTracker + DraftBoard HUD
  const draftedCount  = draftedIds.size - preDraftedIds.length
  const myRosterCount = myRosterIds.size
  const draftPick     = draftedCount + 1

  const myTeam = useMemo(
    () => ranked.filter(p => myRosterIds.has(p.id)),
    [ranked, myRosterIds],
  )

  // Mark D (off board — other team's pick)
  const toggleDrafted = useCallback((id: string) => {
    setDraftedIds(prev => {
      // Keepers can't be un-drafted
      if (preDraftedIds.includes(id) && prev.has(id)) return prev
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [preDraftedIds])

  // Mark M (my pick)
  const toggleMyRoster = useCallback((id: string) => {
    setMyRosterIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        // Keepers can't be removed
        if (MY_KEEPER_IDS.includes(id)) return prev
        next.delete(id)
        // Also un-draft if it was only on roster (not a D pick)
        setDraftedIds(d => {
          const nd = new Set(d)
          nd.delete(id)
          return nd
        })
      } else {
        next.add(id)
        // Auto-mark drafted when added to roster
        setDraftedIds(d => { const nd = new Set(d); nd.add(id); return nd })
      }
      return next
    })
  }, [])

  // Round import — merges picks into existing drafted/roster sets
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

  // Reset to clean state — keepers always restored
  const handleReset = useCallback(() => {
    if (!confirm('Reset draft? All imported picks will be cleared. Keepers will remain.')) return
    setDraftedIds(new Set(preDraftedIds))
    setMyRosterIds(new Set(MY_KEEPER_IDS))
    setSelectedPlayer(null)
  }, [preDraftedIds])

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a1628]">

      {/* ── Controls sidebar ── */}
      <aside className={`flex-shrink-0 border-r border-slate-700/50 bg-[#0f1b2d] overflow-y-auto transition-all duration-200 ${
        controlsOpen ? 'w-72' : 'w-0 border-none overflow-hidden'
      }`}>
        <ControlsPanel settings={settings} onChange={setSettings} diagnostics={diagnostics} />
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Header */}
        <header className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-[#0f1b2d]">

          {/* Sidebar toggle */}
          <button
            onClick={() => setControlsOpen(o => !o)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex-shrink-0"
            title="Toggle controls"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 mr-1 flex-shrink-0">
            <span className="text-lg">⚾</span>
            <span className="font-semibold text-white text-sm tracking-wide">Draft 2026</span>
            <span className="text-xs text-slate-500 font-mono hidden xl:inline">H2H · 10-Team · BLND</span>
          </div>

          {/* Tabs */}
          <nav className="flex gap-0.5">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  activeTab === t.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
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

          {/* Right side actions */}
          <div className="flex items-center gap-2 ml-auto">

            {/* Import Round */}
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white transition-colors flex-shrink-0"
            >
              📥 <span className="hidden sm:inline">Import Round</span>
            </button>

            {/* Reset Draft */}
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-700 hover:bg-red-900/60 text-slate-300 hover:text-red-300 border border-slate-600 transition-colors flex-shrink-0"
              title="Reset all picks (keepers remain)"
            >
              ↺ <span className="hidden sm:inline">Reset</span>
            </button>

            {/* My picks counter */}
            {myRosterCount > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-900/40 border border-blue-800 rounded px-2 py-1 text-xs text-blue-300 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="font-mono font-semibold">{myRosterCount}</span>
                <span className="hidden md:inline text-blue-400">my picks</span>
              </div>
            )}

            {/* Off board counter */}
            {draftedCount > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded px-2 py-1 text-xs text-slate-400 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <span className="font-mono">{draftedIds.size - myRosterIds.size}</span>
                <span className="hidden md:inline">off board</span>
              </div>
            )}

          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {activeTab === 'draft' && (
            <DraftBoard
              ranked={ranked}
              onSelect={setSelectedPlayer}
              onToggleDraft={toggleDrafted}
              onToggleMyRoster={toggleMyRoster}
              draftedIds={draftedIds}
              myRosterIds={myRosterIds}
              draftPick={draftPick}
            />
          )}
          {activeTab === 'team' && (
            <TeamTracker
              myTeam={myTeam}
              ranked={ranked}
              onSelect={setSelectedPlayer}
              onToggleMyRoster={toggleMyRoster}
              draftPick={draftPick}
            />
          )}
          {activeTab === 'pool' && (
            <FullPool
              ranked={ranked}
              onSelect={setSelectedPlayer}
              onToggleDraft={toggleDrafted}
              onToggleMyRoster={toggleMyRoster}
              draftedIds={draftedIds}
              myRosterIds={myRosterIds}
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

      {/* Player detail drawer */}
      {selectedPlayer && (
        <PlayerDrawer
          player={selectedPlayer}
          settings={settings}
          onClose={() => setSelectedPlayer(null)}
          onToggleDraft={toggleDrafted}
          onToggleMyRoster={toggleMyRoster}
          myRosterIds={myRosterIds}
        />
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModal
          players={ranked}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
          totalDrafted={draftedCount}
        />
      )}
    </div>
  )
}
