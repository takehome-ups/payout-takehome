# Game spec: "Payout" 5×3 line slot

Version 1.3, signed off by Product and Game Math on 2026-06-02.

## Layout
- 5 reels and 3 visible rows. The reel strips are in `config/reels.json`.
- Each reel stops independently and uniformly at random on one strip position. The visible window shows `strip[stop]`, `strip[stop+1]` and `strip[stop+2]` (wrapping) for rows 0, 1 and 2.
- 10 fixed paylines are listed in `config/paytable.json`. Each payline gives the row index used on each reel.

## Stake
- The stake is in minor units (cents) and must be a multiple of 10. The line bet is `stake / 10`.
- A line win pays `multiplier × line bet`. A round's win is the sum of its line wins.

## Line wins
- A line pays when 3, 4 or 5 matching symbols run consecutively from the leftmost reel (reel 1).
- `W` (Wild) substitutes for every other symbol.
- Three or more Wilds from reel 1 pay the Wild prize from the paytable.

## Paytable (line-bet multiples)

| Symbol | 3 | 4 | 5 |
|---|---|---|---|
| W  | 30 | 150 | 1000 |
| H1 | 25 | 100 | 400 |
| H2 | 20 | 75 | 250 |
| M1 | 10 | 30 | 120 |
| M2 | 8 | 25 | 100 |
| L1 | 5 | 15 | 60 |
| L2 | 4 | 12 | 50 |
| L3 | 3 | 10 | 40 |

## Return to player
- Theoretical RTP: **96.0%** (certified range 95.9% to 96.1%).
- Certification requires that the production build's theoretical RTP sits within the certified range.

## Fairness
Outcomes must be determined by the server and must be independently verifiable by the player after the round.
