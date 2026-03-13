'use client'
import { DEFAULT_SETTINGS } from '@/lib/types'
import type { ModelSettings, Diagnostics } from '@/lib/types'

interface Props {
  settings: ModelSettings
  onChange: (s: ModelSettings) => void
  diagnostics: Diagnostics
}

function Slider({ label, value, min, max, step, onChange, format }: {
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
        <div className="absolute left-0 top-0 h-full bg-blue-500 rounded transition-all" style={{ width: `${pct}%` }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
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
      <div className="flex-1">
        <div className="text-xs text-slate-400">{label}</div>
        {desc && <div className="text-[10px] text-slate-600 mt-0.5">{desc}</div>}
      </div>
      <button onClick={() => onChange(!value)}
        className={`flex-shrink-0 w-9 h-5 rounded-full transition-colors relative mt-0.5 ${value ? 'bg-blue-500' : 'bg-slate-700'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
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
  warn: 'bg-amber-900/60 text-amber-300 border border-amber-700',
  bad:  'bg-red-900/60 text-red-300 border border-red-700',
}
const badgeLabel: Record<Health, string> = { ok: '✓', warn: '~', bad: '✗' }

export default function ControlsPanel({ settings, onChange, diagnostics }: Props) {
  const
