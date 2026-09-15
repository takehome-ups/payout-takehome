# Take-home: Double Payout

**Time budget:** 6–8 hours of focused work, spread over up to 7 days. It is paid. Stop at 8 hours and write down what you'd do next. We grade judgment, not volume.

**Where to work:** a public copy of this assignment exists so anyone can read it. If you are interviewing with us, we create a private repository for you with **your own incident data**, and the figures in your brief differ from the public copy. Work and submit only there. Please don't fork the public copy or publish your solution.

**AI tools are allowed and expected.** Use whatever you normally use. You may attach transcripts, and doing so is never penalised. Everything you submit has to be something you can explain, defend and change live in the follow-up session.

---

## The situation

"Payout" is a small slot-style game service: a 5×3 line slot with a wallet, a round engine and a settlement worker. It went live three weeks ago and runs as two pods (`pod-a`, `pod-b`). Each pod runs the API and one settlement worker against a shared Postgres.

You are on call. This lands in the incident channel at 08:40 on 2026-09-14:

> **Finance (Maya):** Overnight reconciliation for 00:00–06:00 UTC is off. Player wallet balances at 06:00 are **€463.00 higher** than the round records justify. Wallet movements put RTP at **101.3%**, and the game is certified at **96.0%**. Some players look like they were paid twice. Can engineering tell us what happened, who is affected and by how much?
>
> **SRE (Dev):** FWIW pod-b's clock was ~3s ahead most of the night (NTP sidecar was crash-looping, fixed at 07:10). Its logs show settlements *before* the bets they belong to. My money's on the skew making the worker process things out of order.
>
> **SRE (Dev):** Also worker-b got OOM-killed once around 02:31 during the Night Owl promo spike. It came back by itself.
>
> **Product (Sam):** Please don't just turn the game off; the promo runs all week.

You have the code (this repo), the structured logs from both pods plus finance's 00:00 and 06:00 wallet snapshots (`data/incident-2026-09-14.ndjson`, ~53k events), and a public chaos harness.

---

## What we want

### Part 1: Incident forensics (`POSTMORTEM.md`)
Use the event dump to establish **what happened, to whom, and how much**.
- A timeline of the night.
- The root cause or causes, each with evidence from the data. Include the queries or scripts you ran, committed to the repo, so we can re-run them.
- Totals that reconcile to finance's €463.00: how much each cause contributed, and the per-player figures, delivered as a CSV or similar. If some players were *under*-paid, say so.
- Explain whether the clock skew mattered.
- Separately, explain the gap between 96.0% and what the game actually paid, and how much of the overnight over-payment is due to that (see Part 3).
- A remediation plan covering short-term and long-term actions.

### Part 2: Make settlement correct
Make the service correct under at-least-once delivery, concurrency and crashes.
- Every accepted bet is debited exactly once and settled exactly once, whatever happens to the processes.
- Wallet balances must be explainable: we expect an append-only ledger from which a balance can be derived.
- **For each bug you fix, commit a failing test that reproduces it first, then the fix.** We read the git history.
- The public harness (`npm run harness`) must pass. It is deliberately weaker than the one we grade with (see the *Harness contract* below).

### Part 3: Game math & fairness
- Compute the game's **exact** RTP from `config/reels.json` and `config/paytable.json` by enumeration, not by simulation. Commit the script.
- Explain why production pays more than the spec says. Decide whether the spec or the code is "right", and argue it with numbers.
- Make outcomes **provably fair** with commit-reveal. Before a bet, the player can obtain a commitment (a hash) to the server seed that will be used. After the round, the seed is revealed and anyone can recompute the outcome.
- Add `GET /rounds/:id/verify`, which re-simulates the round from the revealed seed and its inputs and returns `{ "verified": boolean, ... }` with whatever else a player would need.

### Part 4: Judgment calls (`DECISIONS.md`)
These are written decisions. There's no single right answer; we grade the reasoning.
1. **Product:** "If a player disconnects mid-spin, let them re-spin, because they never saw the animation." **Compliance:** "The outcome is fixed at bet time and can never change." What do you build, and why?
2. **Remediation:** the over-paid players have been paid. Do we claw back, absorb the cost, or do something partial? What about players who were *under*-paid? Consider cost, regulation, player trust and support load.
3. Any other trade-off you made that a reviewer should know about.

### Bonus: client (React + PixiJS v8 + Spine, or R3F)
`client/` is half-wired. Pick any of these:
- The client must be **server-authoritative**: it only shows outcomes the server confirmed, and the reels land on what the server said.
- Handle duplicate and out-of-order WebSocket events, and **reconnect mid-round** to the correct state.
- Character states should run idle → anticipation (looping until the result arrives) → win/lose, with a big win at 20× stake or more. Placeholder art is fine; `PlaceholderAnimator` sits behind the same interface as the Spine one.
- No leaks: listeners and the Pixi app/ticker must be cleaned up on unmount. Try the "Unmount stage" button a few times.
- The "Verify this round" panel works against your endpoint.

3D-leaning? An R3F reel scene with correct disposal is an equally valid bonus.

---

## Harness contract

We grade Part 2 with a **private harness** that is stronger than `harness/public-chaos.ts`. It has more concurrency and more players per wallet, `SIGKILL`s **any** process (API or worker) at any moment, redelivers messages that were already acknowledged, and runs several workers at once. It also checks round wins against the game spec and samples `/verify`. It treats your service as a black box through this contract, so keep it intact:

| Interface | Contract |
|---|---|
| `npm run db:reset` | Drops and recreates the schema (`DATABASE_URL`). |
| `npm run start` | Starts the API on `PORT`. Several restarts per run are expected. |
| `npm run worker` | Starts one settlement worker. Several may run at once. |
| `POST /admin/wallets` | `{ playerId, balance }` creates or overwrites a wallet. |
| `POST /bets` | `{ playerId, stake, clientSeed? }` returns `201` with a round `{ id, playerId, stake, win, status, stops, ... }`, or `4xx` if rejected. |
| `GET /rounds/:id` | The round. `status` is `SETTLED` once its win has been credited. |
| `GET /players/:id/rounds` | All rounds for a player. |
| `GET /wallets/:id` | `{ balance, ... }` |
| `GET /rounds/:id/verify` | `{ verified: boolean, ... }` |
| `queue_messages` | The harness simulates broker redelivery by **inserting copies** of existing rows (`topic`, `payload`). Those inserts must keep working. Treat the table as a broker you don't control. |

Invariants checked after the chaos stops:
1. Every bet that got a `201` has a round.
2. Every round reaches `SETTLED` within 60s once the API and workers are up.
3. For every wallet: `balance = initial − Σ stake + Σ win` over its rounds.
4. Round wins match the game spec (private harness only).
5. Sampled settled rounds verify (private harness only).

---

## Submission
- Push to your private repository with its **full git history**, then tell us you're done. Don't squash. We want to see repro → red test → fix → green.
- Include `POSTMORTEM.md`, `DECISIONS.md`, the RTP script, your forensics queries/scripts and tests.
- Include a short `NOTES.md` covering what you did, what you'd do next with more time, and roughly how long you spent.

## The follow-up session (75 min)
1. You walk us through the postmortem. Expect "show me the query that proves X".
2. We run the private harness against your submission together and debug any failure live.
3. We give you a new requirement and you design it out loud, then code a slice.
4. Client demo, if you did the bonus.
