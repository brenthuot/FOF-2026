"""
extract_players.py — regenerate data/players.json from source workbook.

Usage:
    python scripts/extract_players.py path/to/workbook.xlsx

Output:
    data/players.json   (overwrites)
"""
import sys, json, re, unicodedata
import pandas as pd
import numpy as np
from pathlib import Path

def strip_accents(s: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    )

def clean(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    if isinstance(v, (np.integer,)):  return int(v)
    if isinstance(v, (np.floating,)): return round(float(v), 6)
    return v

def compute_blnd_batting(row) -> float:
    r_pts   = row.get('R_pts',   0) or 0
    hr_pts  = row.get('HR_pts',  0) or 0
    rbi_pts = row.get('RBI_pts', 0) or 0
    sb_pts  = row.get('SB_pts',  0) or 0
    ops_pts = row.get('OPS_pts', 0) or 0
    bmh  = (r_pts + hr_pts + rbi_pts + sb_pts + ops_pts) * 0.6
    cat6 = ops_pts + hr_pts + rbi_pts
    return (bmh * 0.1) + (cat6 * 0.9)

def compute_blnd_pitching(row) -> float:
    qs_pts   = row.get('QS_pts',   0) or 0
    k_pts    = row.get('K_pts',    0) or 0
    sv_pts   = row.get('SV_pts',   0) or 0
    era_pts  = row.get('ERA_pts',  0) or 0
    whip_pts = row.get('WHIP_pts', 0) or 0
    bmh  = qs_pts + k_pts + sv_pts + era_pts + whip_pts
    cat6 = (qs_pts + k_pts + whip_pts) * (5 / 3)
    return (bmh * 0.1) + (cat6 * 0.9)

def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('Fantasy_Baseball_2026.xlsx')
    out = Path(__file__).parent.parent / 'data' / 'players.json'

    print(f'Reading {src}...')
    xl = pd.ExcelFile(src)

    # ── BH Batting ──────────────────────────────────────────────────────────
    df_bat = pd.read_excel(src, sheet_name='BH Batting')
    # Column layout: Name, Team, Position, BMH, CAT6, BLND,
    #                R_stat, R_pts, HR_stat, HR_pts, RBI_stat, RBI_pts,
    #                SB_stat, SB_pts, OPS_stat, OPS_pts
    df_bat.columns = [
        'Name','Team','Position','BMH','CAT6','BLND_raw',
        'R','R_pts','HR','HR_pts','RBI','RBI_pts',
        'SB','SB_pts','OPS','OPS_pts',
        *[f'_extra_{i}' for i in range(max(0, len(df_bat.columns)-16))]
    ]
    df_bat = df_bat[df_bat['Name'].notna()].copy()
    df_bat['BLND'] = df_bat.apply(compute_blnd_batting, axis=1)
    df_bat['type'] = 'H'

    # ── BH Pitching ─────────────────────────────────────────────────────────
    df_pit = pd.read_excel(src, sheet_name='BH Pitching')
    # Name, Team, BMH, CAT6, BLND, QS_stat, QS_pts, K_stat, K_pts,
    # SV_stat, SV_pts, ERA_stat, ERA_pts, WHIP_stat, WHIP_pts, IP
    df_pit.columns = [
        'Name','Team','BMH','CAT6','BLND_raw',
        'QS','QS_pts','K','K_pts','SV','SV_pts',
        'ERA','ERA_pts','WHIP','WHIP_pts','IP',
        *[f'_extra_{i}' for i in range(max(0, len(df_pit.columns)-16))]
    ]
    df_pit = df_pit[df_pit['Name'].notna()].copy()
    df_pit['BLND'] = df_pit.apply(compute_blnd_pitching, axis=1)
    df_pit['type'] = 'P'
    df_pit['Position'] = df_pit.apply(
        lambda r: 'RP' if (r.get('SV') or 0) > 5 else 'SP', axis=1
    )

    # ── ESPN baseline ────────────────────────────────────────────────────────
    df_espn = pd.read_excel(src, sheet_name='ESPN_Baseline')
    espn_map = {}
    for _, row in df_espn.iterrows():
        if pd.notna(row.get('Player')):
            espn_map[str(row['Player']).strip()] = int(row['ESPN Rank'])

    # ── Z-score normalisation ────────────────────────────────────────────────
    h_blnd = df_bat['BLND']
    p_blnd = df_pit['BLND']
    H_MEAN, H_STD = float(h_blnd.mean()), float(h_blnd.std())
    P_MEAN, P_STD = float(p_blnd.mean()), float(p_blnd.std())
    H_SB_MEAN = float(df_bat['SB'].dropna().mean())

    # ── Primary position from full position string ───────────────────────────
    def primary_pos(row):
        pos_str = str(row.get('Position', '') or '').strip()
        if not pos_str or pos_str == 'nan':
            return row.get('type', 'H') == 'P' and (
                'RP' if (row.get('SV') or 0) > 5 else 'SP'
            ) or 'UTIL'
        return pos_str.split('/')[0].strip()

    # ── Build player list ────────────────────────────────────────────────────
    players = []
    seen_names = {}

    for df, ptype in [(df_bat, 'H'), (df_pit, 'P')]:
        for _, row in df.iterrows():
            name = str(row['Name']).strip()
            blnd = float(row['BLND'])
            if blnd == 0 and ptype == 'H':
                continue  # skip genuinely empty rows

            z = (blnd - H_MEAN) / H_STD if ptype == 'H' else (blnd - P_MEAN) / P_STD

            # Dedup: keep first occurrence (hitters preferred over duplicates)
            pid = re.sub(r'[^a-z0-9]', '-', name.lower())
            if pid in seen_names:
                continue
            seen_names[pid] = True

            # ESPN lookup with accent-strip fallback
            espn_rank = espn_map.get(name)
            if espn_rank is None:
                for en, er in espn_map.items():
                    if strip_accents(en.lower()) == strip_accents(name.lower()):
                        espn_rank = er
                        break

            pos_str = str(row.get('Position', '') or '').strip()
            if pos_str == 'nan': pos_str = 'SP' if ptype == 'P' else 'UTIL'
            pri_pos = pos_str.split('/')[0].strip()

            players.append({
                'id':         pid,
                'name':       name,
                'team':       str(row.get('Team', '') or '').strip(),
                'position':   pos_str,
                'primaryPos': pri_pos,
                'type':       ptype,
                'blnd':       round(blnd, 4),
                'zBlnd':      round(z, 6),
                'espnRank':   espn_rank,
                'stats': {
                    'r':    clean(row.get('R')),
                    'hr':   clean(row.get('HR')),
                    'rbi':  clean(row.get('RBI')),
                    'sb':   clean(row.get('SB')),
                    'ops':  clean(row.get('OPS')),
                    'qs':   clean(row.get('QS')),
                    'k':    clean(row.get('K')),
                    'sv':   clean(row.get('SV')),
                    'era':  clean(row.get('ERA')),
                    'whip': clean(row.get('WHIP')),
                    'ip':   clean(row.get('IP')),
                }
            })

    # ── Replacement Z-scores ─────────────────────────────────────────────────
    REPL_RANKS = {'C':10,'1B':12,'2B':12,'3B':12,'SS':12,'OF':50,'SP':65,'RP':20}
    repl_z = {}
    all_players_df = pd.DataFrame(players)
    for pos, rank in REPL_RANKS.items():
        ptype = 'P' if pos in ('SP','RP') else 'H'
        sub = all_players_df[(all_players_df['primaryPos']==pos) &
                              (all_players_df['type']==ptype)].sort_values('zBlnd', ascending=False)
        repl_z[pos] = round(float(sub.iloc[rank-1]['zBlnd']), 8) if len(sub) >= rank else (
            round(float(sub.iloc[-1]['zBlnd']), 8) if len(sub) else 0.0
        )

    output = {
        'meta': {
            'hBlndMean': round(H_MEAN, 6), 'hBlndStd': round(H_STD, 6),
            'pBlndMean': round(P_MEAN, 6), 'pBlndStd': round(P_STD, 6),
            'hSbMean':   round(H_SB_MEAN, 6),
            'sbScale':   0.004662,
            'replScale': 0.08,
            'replZ':     repl_z,
            'totalPlayers': len(players),
            'hitters':  sum(1 for p in players if p['type']=='H'),
            'pitchers': sum(1 for p in players if p['type']=='P'),
        },
        'players': players,
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w') as fh:
        json.dump(output, fh, indent=2)
    print(f'✅ Wrote {len(players)} players → {out}')
    print(f'   Hitters: {output["meta"]["hitters"]}  Pitchers: {output["meta"]["pitchers"]}')
    print(f'   ESPN matched: {sum(1 for p in players if p["espnRank"])}')

if __name__ == '__main__':
    main()
