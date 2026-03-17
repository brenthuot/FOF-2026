'use client'
import { useState } from 'react'
import type { ScoredPlayer } from '@/lib/types'

interface Props {
  players: ScoredPlayer[]
  onImport: (draftedIds: string[], myPickIds: string[]) => void
  onClose: () => void
  totalDrafted: number
}

const MY_TEAM = 'Team Huot'

// Known MLB team codes for validation
const MLB_TEAMS = new Set([
  'ATL','BOS','NYY','NYM','PHI','WSN','MIA','ATH','HOU','TEX',
  'LAD','SFG','SDP','ARI','COL','CHC','STL','MIL','CIN','PIT',
  'CLE','MIN','CHW','DET','KCR','TBR','BAL','TOR','BOS','SEA',
  'LAA','OAK','ATH','LAN','SLN','CHA','DET','MIN','CLE','MIA',
])

// Known fantasy positions
const POSITIONS = new Set(['SP','RP','P','C','1B','2B','3B','SS','OF','DH','UTIL','IF','OF'])

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Parse "F. LastName" → { initial, lastName }
function parseAbbrev(abbrev: string): { initial: string; lastName: string } {
  const trimmed = abbrev.trim()
  // Pattern: "X. Something" or "X.Y. Something"
  const m = trimmed.match(/^([A-Z])\.(?:[A-Z]\.)?\s+(.+)$/i)
  if (m) {
    return { initial: m[1].toUpperCase(), lastName: m[2].trim() }
  }
  // No initial — just a last name fragment
  return { initial: '', lastName: trimmed }
}

// Match abbreviated name to a player — strict initial matching when ambiguous
function matchPlayer(abbrev: string, players: ScoredPlayer[]): ScoredPlayer | null {
  const { initial, lastName } = parseAbbrev(abbrev)
  if (!lastName) return null

  const lowerLast = stripAccents(lastName)

  // Find all players whose last name matches
  const candidates = players.filter(p => {
    const parts = p.name.trim().split(/\s+/)
    // Remove suffixes
    const suffixes = ['jr.','sr.','ii','iii','iv']
    let lastIdx = parts.length - 1
    while (lastIdx > 0 && suffixes.includes(parts[lastIdx].toLowerCase())) lastIdx--
    const pLast = stripAccents(parts[lastIdx] ?? '')
    return pLast === lowerLast || pLast.startsWith(lowerLast) || lowerLast.startsWith(pLast)
  })

  if (candidates.length === 0) return null

  // If only one candidate, return it (even without initial match)
  if (candidates.length === 1) return candidates[0]

  // Multiple candidates — initial MUST match
  if (initial) {
    const initialMatches = candidates.filter(p => {
      const firstName = p.name.trim().split(/\s+/)[0] ?? ''
      return firstName.toUpperCase().startsWith(initial)
    })
    if (initialMatches.length === 1) return initialMatches[0]
    if (initialMatches.length > 1) {
      // Still ambiguous — return highest ranked (lowest rank number)
      return initialMatches.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0]
    }
  }

  // No initial or no initial match — return best by rank
  return candidates.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0]
}

interface ParsedPick {
  roundPick: string
  teamName: string
  abbrevName: string
  position: string
  mlbTeam: string
  isMyPick: boolean
  matched: ScoredPlayer | null
}

function parseRound(text: string, players: ScoredPlayer[]): ParsedPick[] {
  const blocks = text.split(/\bEdit\b/gi).map(b => b.trim()).filter(Boolean)
  const picks: ParsedPick[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 3) continue

    // Find round.pick pattern
    let roundPickIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^\d+\.\d+$/.test(lines[i])) { roundPickIdx = i; break }
    }
    if (roundPickIdx < 0) continue

    const teamName = lines.slice(0, roundPickIdx).join(' ').trim()
    const roundPick = lines[roundPickIdx]

    // After round.pick, find the abbreviated player name by looking for "X. LastName" pattern
    // Then find position and MLB team using known sets
    let abbrevName = ''
    let position = ''
    let mlbTeam = ''

    const remaining = lines.slice(roundPickIdx + 1)

    for (let i = 0; i < remaining.length; i++) {
      const line = remaining[i]
      // If it looks like an abbreviated name (has a period and space, or is a name-like string)
      if (!abbrevName && /^[A-Z]\.\s+\S/.test(line)) {
        abbrevName = line
        continue
      }
      // If it looks like a position
      if (!position && POSITIONS.has(line.toUpperCase())) {
        position = line.toUpperCase()
        continue
      }
      // If it looks like an MLB team (2-3 uppercase letters)
      if (!mlbTeam && /^[A-Z]{2,3}$/.test(line)) {
        mlbTeam = line
        continue
      }
    }

    // Fallback: if we didn't find abbrevName via pattern, use first remaining line
    if (!abbrevName && remaining.length > 0) {
      abbrevName = remaining[0]
    }

    const isMyPick = teamName.toLowerCase().includes(MY_TEAM.toLowerCase())
    const matched = abbrevName ? matchPlayer(abbrevName, players) : null

    picks.push({ roundPick, teamName, abbrevName, position, mlbTeam, isMyPick, matched })
  }

  return picks
}

export default function DraftImport({ players, onImport, onClose, totalDrafted }: Props) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedPick[] | null>(null)
  const [error, setError] = useState('')

  function handleParse() {
    setError('')
    if (!text.trim()) { setError('Paste your FantasyPros round results first.'); return }
    const picks = parseRound(text, players)
    if (picks.length === 0) { setError('Could not parse any picks. Make sure you copied the full round text from FantasyPros.'); return }
    setParsed(picks)
  }

  function handleConfirm() {
    if (!parsed) return
    const draftedIds = parsed.filter(p => p.matched && !p.isMyPick).map(p => p.matched!.id)
    const myPickIds  = parsed.filter(p => p.matched &&  p.isMyPick).map(p => p.matched!.id)
    onImport(draftedIds, myPickIds)
    onClose()
  }

  const matchedCount   = parsed?.filter(p => p.matched).length ?? 0
  const unmatchedCount = parsed?.filter(p => !p.matched).length ?? 0
  const myPicks        = parsed?.filter(p => p.isMyPick) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#0f1b2d] border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Import Round</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalDrafted > 0 ? `${totalDrafted} picks already imported · ` : ''}
              Paste from FantasyPros · Your team: <span className="text-blue-300">{MY_TEAM}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!parsed ? (
            <>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-2">
                  Paste your FantasyPros round results below
                </label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={"Sandlot Warriors\n1.01\nS. Ohtani\nDH\nLAD\nEdit\nTeam Huot\n1.10\nR. Acuna\nOF\nATL\nEdit"}
                  className="w-full h-56 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono resize-none"
                />
              </div>
              {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-800 rounded p-2">{error}</div>}
              <div className="text-[10px] text-slate-600 leading-relaxed">
                After each round on FantasyPros, copy all picks from that round and paste here.
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-950/30 border border-emerald-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-300 font-mono">{matchedCount}</div>
                  <div className="text-xs text-slate-500">players matched</div>
                </div>
                <div className={`rounded-lg p-3 text-center border ${unmatchedCount > 0 ? 'bg-amber-950/30 border-amber-800' : 'bg-slate-800/30 border-slate-700'}`}>
                  <div className={`text-2xl font-bold font-mono ${unmatchedCount > 0 ? 'text-amber-300' : 'text-slate-500'}`}>{unmatchedCount}</div>
                  <div className="text-xs text-slate-500">unmatched</div>
                </div>
              </div>

              {myPicks.length > 0 && (
                <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-3">
                  <div className="text-xs font-semibold text-blue-300 mb-2">Your picks this round:</div>
                  {myPicks.map((pk, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                      <span className="text-slate-500 font-mono">{pk.roundPick}</span>
                      <span className="text-white font-medium">{pk.matched?.name ?? pk.abbrevName}</span>
                      {!pk.matched && <span className="text-amber-400 text-[10px]">⚠ not matched</span>}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {parsed.map((pk, i) => (
                  <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${pk.isMyPick ? 'bg-blue-900/20' : ''}`}>
                    <span className="text-slate-600 font-mono w-10">{pk.roundPick}</span>
                    <span className={`text-[10px] px-1 py-0.5 rounded ${pk.isMyPick ? 'bg-blue-800 text-blue-200' : 'bg-slate-800 text-slate-500'}`}>
                      {pk.isMyPick ? 'ME' : 'D'}
                    </span>
                    <span className={`flex-1 ${pk.matched ? 'text-white' : 'text-amber-400'}`}>
                      {pk.matched?.name ?? pk.abbrevName}
                    </span>
                    <span className="text-slate-600 text-[10px]">{pk.abbrevName} · {pk.position} · {pk.mlbTeam}</span>
                    {!pk.matched && <span className="text-[9px] text-amber-600">no match</span>}
                  </div>
                ))}
              </div>

              {unmatchedCount > 0 && (
                <div className="text-[10px] text-amber-600/80 bg-amber-950/20 border border-amber-900 rounded p-2">
                  {unmatchedCount} player{unmatchedCount > 1 ? 's' : ''} could not be matched. You can manually mark them on the Draft Board.
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-slate-700">
          {!parsed ? (
            <>
              <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-medium text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleParse} className="flex-1 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors">Parse Round</button>
            </>
          ) : (
            <>
              <button onClick={() => { setParsed(null); setText('') }} className="flex-1 py-2 rounded-lg text-xs font-medium text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors">← Re-paste</button>
              <button onClick={handleConfirm} className="flex-1 py-2 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
                ✓ Import {matchedCount} picks
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
