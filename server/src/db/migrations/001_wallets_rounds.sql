CREATE TABLE wallets (
  player_id text PRIMARY KEY,
  balance bigint NOT NULL CHECK (balance >= 0),
  daily_loss_limit bigint NOT NULL DEFAULT 100000000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id text NOT NULL REFERENCES wallets(player_id),
  stake bigint NOT NULL,
  client_seed text NOT NULL,
  nonce integer NOT NULL,
  server_seed text NOT NULL,
  stops integer[] NOT NULL,
  win bigint NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

CREATE INDEX rounds_player_created ON rounds (player_id, created_at);
