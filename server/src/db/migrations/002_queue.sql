CREATE TABLE queue_messages (
  id bigserial PRIMARY KEY,
  topic text NOT NULL,
  payload jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  visible_at timestamptz NOT NULL DEFAULT now(),
  acked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX queue_ready ON queue_messages (topic, visible_at) WHERE acked_at IS NULL;
