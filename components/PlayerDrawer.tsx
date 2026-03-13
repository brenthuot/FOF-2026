'use client'
import type { ScoredPlayer, ModelSettings } from '@/lib/types'
import { edgeColor } from './PlayerRow'

interface Props {
  player: ScoredPlayer
  settings: ModelSettings
  onClose: () => void
  onToggleDraft: (id: string) => void
}

function StatRow({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="text-right">
        <span className="text-xs font-mono text-white">{value}</span>
        {note && <span className="text-[10px] text-slate-600 ml-1.5">{note}</span>}
      </div>
    </div>
  )
}

function BreakdownBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={`font-mono font-medium ${color}`}>{value >= 0 ? '+' : ''}{value.toFixed(4)}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
        <div className={`h-full rounded transition-all ${color.replace('text-', 'bg-')}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function PlayerDrawer({ player: p, settings, onClose, onToggleDraft }: Props) {
  const isHitter = p.type === 'H'
  const hw = settings.hitterWeight
  const pw = 1 - hw
  const totalForPct = Math.abs(p.finalScore) || 1

  // Compression effect for pitchers
  const compressionEffect = !isHitter
    ? p.zBlnd * pw * (settings.pitcherCompression - 1)
    : 0

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#0d1c30] border-l border-slate-700/60 shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-start justify-between p-5 border-b border-slate-700/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              isHitter
                ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700'
                : 'bg-red-900/60 text-red-300 border-red-700'
            }`}>
              {isHitter ? 'HITTER' : 'PITCHER'}
            </span>
            {p.drafted && (
              <span className="text-[10px] bg-amber-900/60 text-amber-300 border border-amber-700 px-1.5 py-0.5 rounded">
                DRAFTED
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white leading-tight">{p.name}</h2>
          <div className="text-sm text-slate-500 mt-0.5">{p.team} · {p.position}</div>
        </div>
        <button onClick={onClose}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Hero stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Model Rank</div>
            <div className="text-3xl font-bold text-white font-mono">#{p.rank}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">Tier {p.tier}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Final Score</div>
            <div className="text-2xl font-bold text-blue-300 font-mono">{p.finalScore.toFixed(3)}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">BLND</div>
            <div className="text-2xl font-bold text-slate-200 font-mono">{p.blnd.toFixed(2)}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">Z={p.zBlnd.toFixed(3)}</div>
          </div>
        </div>

        {/* ESPN comparison */}
        <div className="bg-slate-800/40 rounded-lg p-4">
          <div className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wide">vs ESPN</div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-xs text-slate-600 mb-1">My Rank</div>
              <div className="text-2xl font-bold text-white font-mono">#{p.rank}</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold font-mono ${edgeColor(p.edge)}`}>
                {p.edge != null
                  ? (p.edge > 0 ? `+${p.edge}` : p.edge)
                  : '—'}
              </div>
              <div className="text-[10px] text-slate-600">edge</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-600 mb-1">ESPN Rank</div>
              <div className="text-2xl font-bold text-slate-400 font-mono">
                {p.espnRank != null ? `#${p.espnRank}` : '—'}
              </div>
            </div>
          </div>
          {p.edge != null && (
            <div className={`mt-3 text-xs text-center ${
              p.edge >= 20 ? 'text-emerald-400' :
              p.edge <= -20 ? 'text-red-400' :
              'text-slate-600'
            }`}>
              {p.edge >= 20 && '📈 Model values this player significantly more than ESPN.'}
              {p.edge <= -20 && '📉 ESPN values this player significantly more than the model.'}
              {Math.abs(p.edge) < 20 && p.edge > 0 && 'Slightly higher than ESPN consensus.'}
              {Math.abs(p.edge) < 20 && p.edge < 0 && 'Slightly lower than ESPN consensus.'}
              {p.edge === 0 && 'Model and ESPN agree exactly.'}
            </div>
          )}
        </div>

        {/* Score breakdown */}
        <div>
          <div className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wide">
            Score Breakdown
          </div>
          <div className="space-y-3 bg-slate-800/30 rounded-lg p-4">
            <BreakdownBar
              label={`Base score (Z×${isHitter ? `HW ${Math.round(hw*100)}%` : `PW ${Math.round(pw*100)}%×comp`})`}
              value={p.baseScore}
              total={totalForPct}
              color="text-blue-400"
            />
            {!isHitter && (
              <BreakdownBar
                label={`Pitcher compression effect (×${settings.pitcherCompression.toFixed(2)})`}
                value={compressionEffect}
                total={totalForPct}
                color="text-rose-400"
              />
            )}
            <BreakdownBar
              label={`Replacement layer ${settings.replacementOn ? `(×${settings.replacementStrength.toFixed(1)})` : '(OFF)'}`}
              value={settings.replacementOn ? p.replBase * settings.replacementStrength : 0}
              total={totalForPct}
              color="text-purple-400"
            />
            <BreakdownBar
              label={`SB scarcity ${settings.sbScarcityOn && isHitter ? `(×${settings.sbStrength.toFixed(1)})` : '(N/A)'}`}
              value={settings.sbScarcityOn && isHitter ? p.sbBase * settings.sbStrength : 0}
              total={totalForPct}
              color="text-amber-400"
            />
            <div className="flex justify-between pt-2 border-t border-slate-700">
              <span className="text-xs font-semibold text-slate-400">Final Score</span>
              <span className="font-mono font-bold text-blue-300">{p.finalScore.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Raw stats */}
        <div>
          <div className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wide">
            {isHitter ? 'Projected Batting Stats' : 'Projected Pitching Stats'}
          </div>
          <div className="bg-slate-800/30 rounded-lg px-3">
            {isHitter ? (
              <>
                <StatRow label="Runs (R)" value={p.stats.r?.toFixed(1) ?? '—'} />
                <StatRow label="Home Runs (HR)" value={p.stats.hr?.toFixed(1) ?? '—'} />
                <StatRow label="RBI" value={p.stats.rbi?.toFixed(1) ?? '—'} />
                <StatRow label="Stolen Bases (SB)" value={p.stats.sb?.toFixed(1) ?? '—'} note="scarcity scored" />
                <StatRow label="OPS" value={p.stats.ops?.toFixed(3) ?? '—'} />
              </>
            ) : (
              <>
                <StatRow label="Strikeouts (K)" value={p.stats.k?.toFixed(0) ?? '—'} />
                <StatRow label="Quality Starts (QS)" value={p.stats.qs?.toFixed(0) ?? '—'} />
                <StatRow label="ERA" value={p.stats.era?.toFixed(2) ?? '—'} />
                <StatRow label="WHIP" value={p.stats.whip?.toFixed(2) ?? '—'} />
                <StatRow label="Saves (SV)" value={p.stats.sv?.toFixed(0) ?? '—'} />
                <StatRow label="IP" value={p.stats.ip?.toFixed(0) ?? '—'} />
              </>
            )}
          </div>
        </div>

        {/* Methodology note */}
        <div className="bg-slate-800/20 rounded-lg p-3 text-[10px] text-slate-600 leading-relaxed">
          <div className="text-slate-500 font-medium mb-1">BLND methodology</div>
          BLND is preserved unchanged from BH {isHitter ? 'Batting' : 'Pitching'}.
          Z-score normalised separately within {isHitter ? 'hitters' : 'pitchers'}.
          Score layers applied on top of BLND — never replacing it.
        </div>
      </div>

      {/* Footer: draft toggle */}
      <div className="flex-shrink-0 p-4 border-t border-slate-700/50">
        <button
          onClick={() => onToggleDraft(p.id)}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
            p.drafted
              ? 'bg-amber-900/50 text-amber-300 border border-amber-700 hover:bg-amber-800/50'
              : 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600'
          }`}
        >
          {p.drafted ? '↩ Mark undrafted' : '✓ Mark as drafted'}
        </button>
      </div>
    </div>
  )
}
