'use client'
import { DEFAULT_SETTINGS } from '@/lib/types'
import type { ModelSettings, Diagnostics } from '@/lib/types'

interface Props {
  settings: ModelSettings
  onChange: (s: ModelSettings) => void
  diagnostics: Diagnostics
}

function Slider({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; format?: (v: number) => string
}) {
  const pct = ((value - min) / (max - min)) * 100
  const fmt = format ?? ((v: number) => v.toFixed(2))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-blue-300 font-semibold">{fmt(value)}</span>
      </div>
      <div className="relative h-2 bg-slate-700 rounded">
        <div
          className="absolute left-0 top-0 h-full bg-blue-500 rounded transition-all"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{fmt(min)}</span><span>{fmt(max)}</span>
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange, desc }: {
  label: string; value: boolean; onChange: (v: boolean) => void; desc?: string
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        {desc && <div className="text-[10px] text-slate-600 mt-0.5">{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`flex-shrink-0 w-9 h-5 rounded-full transition-colors relative mt-0.5 ${
          value ? 'bg-blue-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

type Health = 'ok' | 'warn' | 'bad'
function statusBadge(v: number, lo: number, hi: number): Health {
  if (v >= lo && v <= hi) return 'ok'
  if (v < lo - 2 || v > hi + 4) return 'bad'
  return 'warn'
}
const badgeClass: Record<Health, string> = {
  ok:   'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
  warn: 'bg-amber-900/60  text-amber-300  border border-amber-700',
  bad:  'bg-red-900/60    text-red-300    border border-red-700',
}
const badgeLabel: Record<Health, string> = { ok: '✓', warn: '~', bad: '✗' }

export default function ControlsPanel({ settings, onChange, diagnostics }: Props) {
  const set = <K extends keyof ModelSettings>(k: K, v: ModelSettings[K]) =>
    onChange({ ...settings, [k]: v })

  const pitcherWeight = parseFloat((1 - settings.hitterWeight).toFixed(2))

  const d20  = statusBadge(diagnostics.pitchersTop20,  4,  6)
  const d50  = statusBadge(diagnostics.pitchersTop50,  12, 16)
  const d100 = statusBadge(diagnostics.pitchersTop100, 25, 32)

  return (
    <div className="p-4 space-y-5 text-sm">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
          Model Controls
        </div>
        <p className="text-[11px] text-slate-600">
          All rankings update instantly as you adjust settings.
        </p>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Live diagnostics</div>
        {([
          ['P in Top 20',  diagnostics.pitchersTop20,  4,  6,  d20],
          ['P in Top 50',  diagnostics.pitchersTop50,  12, 16, d50],
          ['P in Top 100', diagnostics.pitchersTop100, 25, 32, d100],
        ] as [string, number, number, number, Health][]).map(([label, val, lo, hi, health]) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">{label}</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-white text-xs">{val}</span>
              <span className="text-[10px] text-slate-600">/ {lo}–{hi}</span>
              <span className={`text-[10px] px-1 rounded ${badgeClass[health]}`}>
                {badgeLabel[health]}
              </span>
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Weights</div>
        <Slider
          label="Hitter weight"
          value={settings.hitterWeight}
          min={0.45} max={0.70} step={0.01}
          onChange={v => set('hitterWeight', v)}
          format={v => `${Math.round(v * 100)}%`}
        />
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Pitcher weight (auto)</span>
          <span className="font-mono text-slate-400">{Math.round(pitcherWeight * 100)}%</span>
        </div>
        <Slider
          label="Pitcher compression"
          value={settings.pitcherCompression}
          min={0.70} max={1.10} step={0.01}
          onChange={v => set('pitcherCompression', v)}
        />
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Lower compression = fewer long pitcher streaks. Raise pitcher weight
          to push pitchers higher in the board.
        </p>
      </section>

      <section className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Adjustments</div>
        <Toggle
          label="Replacement value layer"
          desc="Modest boost to elite players at thin positions."
          value={settings.replacementOn}
          onChange={v => set('replacementOn', v)}
        />
        {settings.replacementOn && (
          <Slider
            label="Replacement strength"
            value={settings.replacementStrength}
            min={0.5} max={2.0} step={0.1}
            onChange={v => set('replacementStrength', v)}
          />
        )}
        <Toggle
          label="SB scarcity boost"
          desc="Minor bump for elite base-stealers. Keeps speed on the radar."
          value={settings.sbScarcityOn}
          onChange={v => set('sbScarcityOn', v)}
        />
        {settings.sbScarcityOn && (
          <Slider
            label="SB boost strength"
            value={settings.sbStrength}
            min={0.5} max={2.0} step={0.1}
            onChange={v => set('sbStrength', v)}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Tiers</div>
        <Slider
          label="Tier gap threshold"
          value={settings.tierGapThreshold}
          min={0.01} max={0.20} step={0.005}
          onChange={v => set('tierGapThreshold', v)}
        />
        <div className="text-[10px] text-slate-600">
          {diagnostics.totalTiers} tiers detected in top 300
        </div>
      </section>

      <button
        onClick={() => onChange(DEFAULT_SETTINGS)}
        className="w-full py-2 rounded-lg text-xs font-medium text-slate-400 border border-slate-700
                   hover:border-blue-600 hover:text-blue-400 transition-colors"
      >
        Reset to defaults
      </button>

      <div className="bg-slate-800/30 rounded-lg p-3 text-[10px] text-slate-600 space-y-1 leading-relaxed">
        <div className="text-slate-500 font-semibold">Methodology</div>
        <div>BLND → separate H/P normalization → weights → pitcher compression → optional replacement layer → optional SB scarcity → tier detection</div>
        <div className="text-amber-600/80 mt-1">BLND formulas from BH Batting / BH Pitching are never modified.</div>
      </div>
    </div>
  )
}
