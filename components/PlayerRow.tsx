import type { ScoredPlayer } from '@/lib/types'

// ─── Tier colors ─────────────────────────────────────────────────────────────
const TIER_COLORS = [
  'bg-blue-900/40 border-l-2 border-blue-500',
  'bg-emerald-900/40 border-l-2 border-emerald-500',
  'bg-purple-900/40 border-l-2 border-purple-500',
  'bg-amber-900/40 border-l-2 border-amber-500',
  'bg-cyan-900/40 border-l-2 border-cyan-600',
  'bg-rose-900/40 border-l-2 border-rose-500',
  'bg-teal-900/40 border-l-2 border-teal-500',
  'bg-indigo-900/40 border-l-2 border-indigo-500',
  'bg-orange-900/40 border-l-2 border-orange-500',
  'bg-pink-900/40 border-l-2 border-pink-500',
]

export function tierColor(tier: number) {
  return TIER_COLORS[(tier - 1) % TIER_COLORS.length]
}

// ─── Type badge ───────────────────────────────────────────────────────────────
export function TypeBadge({ type }: { type: 'H' | 'P' }) {
  return (
    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${
      type === 'H'
        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
        : 'bg-red-900/60 text-red-300 border border-red-700'
    }`}>
      {type === 'H' ? 'BAT' : 'PIT'}
    </span>
  )
}

// ─── Edge color ───────────────────────────────────────────────────────────────
export function edgeColor(edge: number | null) {
  if (edge == null) return 'text-slate-600'
  if (edge >= 20)  return 'text-emerald-400 font-semibold'
  if (edge >= 10)  return 'text-emerald-600'
  if (edge <= -20) return 'text-red-400 font-semibold'
  if (edge <= -10) return 'text-red-600'
  return 'text-slate-500'
}

// ─── Stat display helper ─────────────────────────────────────────────────────
export function fmt(v: number | null | undefined, decimals = 1): string {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

// ─── Drafted overlay ─────────────────────────────────────────────────────────
export function DraftedOverlay() {
  return (
    <span className="text-[10px] font-medium text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
      DRAFTED
    </span>
  )
}

// ─── Compact rank badge ───────────────────────────────────────────────────────
export function RankBadge({ rank, tier }: { rank: number; tier: number }) {
  return (
    <span className={`text-xs font-mono font-bold w-7 text-center inline-block rounded ${
      rank <= 10 ? 'text-white' :
      rank <= 50 ? 'text-slate-300' :
      rank <= 100 ? 'text-slate-400' : 'text-slate-500'
    }`}>
      {rank}
    </span>
  )
}

// ─── Tier label ───────────────────────────────────────────────────────────────
export function TierBadge({ tier }: { tier: number }) {
  const colors = [
    'bg-blue-800 text-blue-200',
    'bg-emerald-800 text-emerald-200',
    'bg-purple-800 text-purple-200',
    'bg-amber-800 text-amber-200',
    'bg-cyan-800 text-cyan-200',
    'bg-rose-800 text-rose-200',
    'bg-teal-800 text-teal-200',
    'bg-indigo-800 text-indigo-200',
    'bg-orange-800 text-orange-200',
    'bg-pink-800 text-pink-200',
  ]
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[(tier - 1) % colors.length]}`}>
      T{tier}
    </span>
  )
}
