# Payout

A round-based slot service: Hono and Postgres, with a queue-driven settlement worker and a React + PixiJS client.

## Setup

Requirements: Node 20.19+ and Docker.

```bash
npm install
npm run db:up        # Postgres 16 on localhost:54329 (creates payout + payout_test)
npm run db:reset     # apply migrations
npm test             # server tests (uses payout_test)
```

## Running

```bash
npm run start                 # API on :3000
npm run worker                # settlement worker (run more than one if you like)
POD=pod-b PORT=3001 npm start # a second API "pod"
npm run client                # Vite dev server on :5173, proxies /api and /ws to :3000
```

Create a wallet and play a round:

```bash
curl -XPOST localhost:3000/admin/wallets -H 'content-type: application/json' -d '{"playerId":"demo-player","balance":100000}'
curl -XPOST localhost:3000/bets -H 'content-type: application/json' -d '{"playerId":"demo-player","stake":100}'
```

Then open http://localhost:5173/?player=demo-player.

## Chaos harness

```bash
npm run harness
```

The harness resets the database, starts the API and two workers itself (stop your own first, or set `PORT`), and fires concurrent bets. While that runs it injects duplicate queue deliveries and kills a worker. Afterwards it checks the invariants listed in `ASSIGNMENT.md`.

## Layout

| Path | What |
|---|---|
| `server/src/routes` | HTTP and WebSocket routes |
| `server/src/rounds` | bet placement, spin engine, payline evaluation |
| `server/src/wallet` | wallet repository and loss limits |
| `server/src/queue` | Postgres-backed at-least-once queue |
| `server/src/settlement` | settlement worker |
| `config/` | reel strips and paytable |
| `docs/GAME_SPEC.md` | the certified game spec |
| `data/` | incident event dump (NDJSON) |
| `harness/` | public chaos harness |
| `client/` | React + Pixi v8 client (half-wired) |

## Logs

Every process writes NDJSON to stdout with `ts`, `pod`, `proc`, `seq` and `event`. The incident dump in `data/` uses the same format, merged from both pods and the finance snapshot job.
