# ⚾ Fantasy Baseball Draft App 2026

A Vercel-ready Next.js draft board built around your custom **BLND** player-strength formulas.  
Rankings are layered **on top** of BLND — the source formulas are never modified.

---

## Quick start (local)  

```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev  

# 3. Open http://localhost:3000
```

---

## Deploy to Vercel

```bash
# Install Vercel CLI (once)
npm i -g vercel

# Deploy
vercel
```

Or push to GitHub and connect the repo at [vercel.com](https://vercel.com) — zero config needed.

---

## Updating player data

Player data lives in `data/players.json` (492 players, extracted from your workbook).

To regenerate from a new workbook:

```bash
# Install dependencies (one-time)
pip install pandas openpyxl

# Run the extractor
python scripts/extract_players.py path/to/your_workbook.xlsx
```

This overwrites `data/players.json` and preserves BLND exactly as computed in your workbook.

---

## Architecture

```
fantasy-baseball-app/
├── app/
│   ├── layout.tsx          # Root layout (Next.js App Router)
│   ├── page.tsx            # Entry point — loads data, mounts AppShell
│   └── globals.css         # Tailwind base + custom scroll styles
├── components/
│   ├── AppShell.tsx        # Top-level state: settings, drafted, selected player
│   ├── ControlsPanel.tsx   # Sliders/toggles + live diagnostic mini-panel
│   ├── DraftBoard.tsx      # Top 300 draft table (main view)
│   ├── FullPool.tsx        # All 492 players, analysis view
│   ├── DiagnosticsView.tsx # Health checks, type-sequence visual, edge summary
│   ├── ESPNEdgeView.tsx    # Buy/fade analysis vs ESPN baseline
│   ├── PlayerDrawer.tsx    # Side panel: score breakdown, stats, draft toggle
│   └── PlayerRow.tsx       # Shared display utilities (badges, colors, formatters)
├── lib/
│   ├── types.ts            # All TypeScript interfaces + DEFAULT_SETTINGS
│   └── scoring.ts          # Pure ranking engine (computeRankings + computeDiagnostics)
├── data/
│   └── players.json        # Pre-processed player data (BLND + stats + ESPN ranks)
└── scripts/
    └── extract_players.py  # Workbook → JSON extractor
```

---

## Ranking methodology

```
BLND (from BH Batting / BH Pitching — untouched)
  → Separate Z-score normalisation for hitters and pitchers
  → Apply hitter/pitcher weights (default 55% / 45%)
  → Apply pitcher compression (default 0.95)
  → [Optional] Replacement value layer
  → [Optional] Minor SB scarcity adjustment
  → Sort → assign ranks
  → Detect tiers via score gaps
  → Compute ESPN edge (ESPN Rank − Model Rank)
```

All parameters are adjustable in the Controls panel. Rankings update instantly.

---

## Default settings

| Setting | Default | Notes |
|---|---|---|
| Hitter weight | 55% | Puts top SPs at ranks 14–18 |
| Pitcher weight | 45% | Auto = 1 − hitter weight |
| Pitcher compression | 0.95 | Slight downward compression prevents SP streaks |
| Replacement layer | ON | Modest; strength = 1.0 |
| SB scarcity | ON | Minor; strength = 1.0 |
| Tier gap threshold | 0.12 | Score gap that triggers a new tier |

### Why 55/45 and not 60/40?

The original 60/40 default produced **0 pitchers in the Top 20** with this player pool — Skubal, Crochet, and Skenes only appeared at ranks 35–37. At 55/45 they slot to ranks 14–18, matching realistic draft behavior for a 10-team H2H format. The Controls panel makes it trivial to tune this.

---

## League format

- **10-team H2H Categories**
- **Batting:** R · HR · RBI · SB · OPS  
- **Pitching:** K · QS · ERA · WHIP · SV

---

## Draft tracker (session state)

Click the circle button on any row (or the "Mark as drafted" button in the player drawer) to mark players as drafted. State is held in memory for the session — refresh to reset. A "clear all" button appears in the header when any players are marked.

Future: persistent draft state, best-available-by-need recommendations, team build tracking.
