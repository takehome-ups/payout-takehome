import type pg from 'pg';
import { pool } from '../db/pool.js';
import { insufficientFunds, notFound } from '../lib/errors.js';
import { log } from '../lib/log.js';
import { assertWithinLossLimit } from './limits.js';

export interface Wallet {
  playerId: string;
  balance: number;
  dailyLossLimit: number;
}

type Queryable = pg.Pool | pg.PoolClient;

export async function getWallet(playerId: string, client: Queryable = pool, forUpdate = false): Promise<Wallet> {
  const { rows } = await client.query(
    `SELECT player_id, balance, daily_loss_limit FROM wallets WHERE player_id = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [playerId],
  );
  if (!rows[0]) throw notFound('wallet');
  return { playerId: rows[0].player_id, balance: rows[0].balance, dailyLossLimit: rows[0].daily_loss_limit };
}

async function inTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function writeBalance(client: Queryable, playerId: string, balance: number): Promise<number> {
  const { rows } = await client.query(
    'UPDATE wallets SET balance = $2, updated_at = now() WHERE player_id = $1 RETURNING txid_current() AS txid',
    [playerId, balance],
  );
  return rows[0].txid;
}

export async function debit(playerId: string, amount: number, roundRef: string): Promise<Wallet> {
  return inTransaction(async (client) => {
    const wallet = await getWallet(playerId, client, true);
    if (wallet.balance < amount) {
      log('wallet.debit_rejected', { player_id: playerId, round_ref: roundRef, amount, balance: wallet.balance });
      throw insufficientFunds();
    }
    await assertWithinLossLimit(playerId, amount, wallet.dailyLossLimit);

    const balance = wallet.balance - amount;
    const txid = await writeBalance(client, playerId, balance);
    log('wallet.debit', { player_id: playerId, round_ref: roundRef, amount, balance_before: wallet.balance, balance_after: balance, txid });
    return { ...wallet, balance };
  });
}

export async function credit(playerId: string, amount: number, roundId: string): Promise<Wallet> {
  return inTransaction(async (client) => {
    const wallet = await getWallet(playerId, client, true);
    const balance = wallet.balance + amount;
    const txid = await writeBalance(client, playerId, balance);
    log('wallet.credit', { player_id: playerId, round_id: roundId, amount, balance_before: wallet.balance, balance_after: balance, txid });
    return { ...wallet, balance };
  });
}
