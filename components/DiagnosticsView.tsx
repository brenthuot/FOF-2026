'use client'
import type { Diagnostics, ModelSettings, ScoredPlayer } from '@/lib/types'

interface Props {
  diagnostics: Diagnostics
  settings: ModelSettings
  ranked: ScoredPlayer[]
}

type Health = 'ok' | 'warn' | 'bad'

function health(v: number, lo: number, hi: number, loWarn = 2, hiWarn = 4): Health {
  if (v >= lo && v <= hi) return 'ok'
  if (v < lo - loWarn || v > hi + hiWarn) return 'bad'
  return 'warn'
}

const healthStyles: Record<Health, { row: string; badge: string; label: string; dot: string }> = {
  ok:   { row: 'border-emerald-800/40 bg-emerald-950/20', badge: 'bg-emerald-900/80 text-emerald-300 border border-emerald-700', label: 'Healthy', dot: 'bg-emerald-400' },
  warn: { row: 'border-amber-800/40  bg-amber-950/20',  badge: 'bg-amber-900/80  text-amber-300  border border-amber-700',  label: 'Off-target', dot: 'bg-amber-400'  },
  bad:  { row: 'border-red-800/40    bg-red-950/20',    badge: 'bg-red-900/80    text-red-300    border border-red-700',    label: 'Flag', dot: 'bg-red-400'    },
}

function DiagRow({
  label, value, target, h, interp, advice,
}: {
  label: string; value: string | number; target: string; h: Health; interp: string; advice: string
}) {
  const s = healthStyles[h]
  return (
    <div className={`flex items-start gap-4 p-4 rounded-lg border ${s.row}`}>
      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white text-sm">{label}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${s.badge}`}>{s.label}</span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{interp}</div>
        {h !== 'ok' && (
          <div className="text-xs text-amber-400/80 mt-1">💡 {advice}</div>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-2xl font-bold font-mono text-white">{value}</div>
        <div className="text-xs text-slate-500">target: {target}</div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/40">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-bold font-mono text-white">{value}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function DiagnosticsView({ diagnostics: d, settings, ranked }: Props) {
  const top300 = ranked.slice(0, 300)
  const top20Types  = ranked.slice(0, 20).map(p => p.type)
  const top50Types  = ranked.slice(0, 50).map(p => p.type)

  // Build a visual type sequence for top 30
  const typeSeq = ranked.slice(0, 60).map(p => p.type)

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Model Diagnostics</h1>
        <p className="text-sm text-slate-500">
          Auto-calculated from current settings. Adjust Controls to tune the board.
          Healthy targets reflect typical H2H 10-team formats.
        </p>
      </div>

      {/* ── Pitcher distribution checks ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Pitcher Distribution</h2>
        <DiagRow
          label="Pitchers in Top 20"
          value={d.pitchersTop20}
          target="4–6"
          h={health(d.pitchersTop20, 4, 6, 2, 2)}
          interp="Checks that elite pitchers appear early — not so many they crowd out top hitters."
          advice="Raise pitcher weight (e.g. 45%) or compression (e.g. 0.95–1.0) in Controls."
        />
        <DiagRow
          label="Pitchers in Top 50"
          value={d.pitchersTop50}
          target="12–16"
          h={health(d.pitchersTop50, 12, 16, 3, 4)}
          interp="Validates that first-round SP/RP targets arrive in the right draft range."
          advice="Adjust pitcher weight or compression to move pitchers up or down."
        />
        <DiagRow
          label="Pitchers in Top 100"
          value={d.pitchersTop100}
          target="25–32"
          h={health(d.pitchersTop100, 25, 32, 4, 8)}
          interp="Ensures mid-draft value pitchers are accessible without over-crowding."
          advice="If too high, lower pitcher weight slightly. If too low, raise it."
        />
      </section>

      {/* ── Streak checks ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Streak Analysis</h2>
        <DiagRow
          label="Longest pitcher run"
          value={d.longestPitcherStreak}
          target="≤ 5"
          h={d.longestPitcherStreak <= 5 ? 'ok' : d.longestPitcherStreak <= 8 ? 'warn' : 'bad'}
          interp="Long pitcher streaks create unrealistic 'pitcher windows' in the draft that don't match H2H dynamics."
          advice="Raise pitcher compression above 0.95, or reduce pitcher weight slightly."
        />
        <DiagRow
          label="Longest hitter run"
          value={d.longestHitterStreak}
          target="≤ 8"
          h={d.longestHitterStreak <= 8 ? 'ok' : d.longestHitterStreak <= 12 ? 'warn' : 'bad'}
          interp="Very long hitter runs suggest pitchers are being suppressed too aggressively."
          advice="Raise pitcher weight by 2–3% or reduce compression slightly."
        />
      </section>

      {/* ── Visual type sequence ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Type Sequence — Top 60
        </h2>
        <div className="flex flex-wrap gap-1">
          {typeSeq.map((t, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center ${
                t === 'P'
                  ? 'bg-red-900 text-red-300 border border-red-700'
                  : 'bg-emerald-900 text-emerald-300 border border-emerald-700'
              }`}>
                {t}
              </div>
              <div className="text-[8px] text-slate-700 mt-0.5">{i + 1}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 mt-2">
          Green = Hitter · Red = Pitcher. Look for alternation, not long runs of one type.
        </p>
      </section>

      {/* ── ESPN edge stats ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">ESPN Edge Summary</h2>
        <DiagRow
          label="Players with +20 edge (model likes more)"
          value={d.posEdge20Plus}
          target="≥ 10"
          h={d.posEdge20Plus >= 10 ? 'ok' : d.posEdge20Plus >= 6 ? 'warn' : 'bad'}
          interp="Draft targets: players your model values significantly higher than ESPN. These are your potential steals."
          advice="If too few, the model may be tracking too closely to ESPN consensus."
        />
        <DiagRow
          label="Players with −20 edge (ESPN likes more)"
          value={d.negEdge20Plus}
          target="≤ 15"
          h={d.negEdge20Plus <= 15 ? 'ok' : d.negEdge20Plus <= 22 ? 'warn' : 'bad'}
          interp="Fades: players ESPN ranks much higher than your model. Useful to know who to let pass."
          advice="If too many, check ESPN baseline currency or BLND input data."
        />
      </section>

      {/* ── Model stats grid ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Model Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label="Total tiers (top 300)" value={d.totalTiers} sub="Based on current gap threshold" />
          <StatCard label="Hitter weight" value={`${Math.round(settings.hitterWeight * 100)}%`} sub="Pitcher: auto" />
          <StatCard label="Pitcher compression" value={settings.pitcherCompression.toFixed(2)} sub="< 1.0 = compressed" />
          <StatCard label="Tier gap threshold" value={settings.tierGapThreshold.toFixed(2)} sub="Score gap for new tier" />
          <StatCard label="Replacement layer" value={settings.replacementOn ? 'ON' : 'OFF'} sub={`Strength: ${settings.replacementStrength.toFixed(1)}`} />
          <StatCard label="SB scarcity" value={settings.sbScarcityOn ? 'ON' : 'OFF'} sub={`Strength: ${settings.sbStrength.toFixed(1)}`} />
          <StatCard label="Players in pool" value={ranked.length} sub="492 total" />
          <StatCard label="Pitchers in pool" value={ranked.filter(p => p.type === 'P').length} sub={`${ranked.filter(p => p.type === 'H').length} hitters`} />
        </div>
      </section>

      {/* ── Note on target impossibility ── */}
      {(d.pitchersTop20 < 4 || d.pitchersTop50 < 12 || d.pitchersTop100 < 25 ||
        d.pitchersTop20 > 6 || d.pitchersTop50 > 16 || d.pitchersTop100 > 32) && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-4 text-sm text-amber-300/80">
          <div className="font-semibold text-amber-300 mb-1">📌 Note on targets</div>
          <p className="text-xs leading-relaxed">
            This player pool's BLND distribution makes it difficult to satisfy all three pitcher targets
            simultaneously with a single weight/compression setting. This is an honest characteristic of
            the data — top SPs have high Z-scores that require significant pitcher weighting to break into
            the Top 20, but that same weighting pushes too many pitchers into Top 50/100.
            The Diagnostics show the true state of the model. Use the Controls to tune to your preference.
          </p>
        </div>
      )}
    </div>
  )
}
