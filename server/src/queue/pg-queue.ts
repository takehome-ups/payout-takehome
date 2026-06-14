import { pool } from '../db/pool.js';
import { env } from '../config.js';

export interface Message<T = unknown> {
  id: number;
  topic: string;
  payload: T;
  attempts: number;
}

export async function enqueue(topic: string, payload: unknown): Promise<number> {
  const { rows } = await pool.query(
    'INSERT INTO queue_messages (topic, payload) VALUES ($1, $2) RETURNING id',
    [topic, JSON.stringify(payload)],
  );
  return rows[0].id;
}

export async function receive<T>(topic: string, visibilityMs = env.visibilityTimeoutMs): Promise<Message<T> | null> {
  const { rows } = await pool.query(
    `UPDATE queue_messages
        SET attempts = attempts + 1,
            visible_at = now() + ($2 || ' milliseconds')::interval
      WHERE id = (
        SELECT id FROM queue_messages
         WHERE topic = $1 AND acked_at IS NULL AND visible_at <= now()
         ORDER BY id
         LIMIT 1
         FOR UPDATE SKIP LOCKED)
      RETURNING id, topic, payload, attempts`,
    [topic, String(visibilityMs)],
  );
  return rows[0] ?? null;
}

export async function ack(id: number): Promise<void> {
  await pool.query('UPDATE queue_messages SET acked_at = now() WHERE id = $1', [id]);
}
