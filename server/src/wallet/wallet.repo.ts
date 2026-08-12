import { pool } from '../db/pool.js';
import { insufficientFunds, notFound } from '../lib/errors.js';
import { log } from '../lib/log.js';
import { assertWithinLossLimit } from './limits.js';

export interface Wallet {
  playerId: string;
  balance: number;
  version: number;
  dailyLossLimit: number;
}

export async function getWallet(playerId: string): Promise<Wallet> {
  const { rows } = await pool.query(
    'SELECT player_id, balance, version, daily_loss_limit FROM wallets WHERE player_id = $1',
    [playerId],
  );
  if (!rows[0]) throw notFound('wallet');
  return {
    playerId: rows[0].player_id,
    balance: rows[0].balance,
    version: rows[0].version,
    dailyLossLimit: rows[0].daily_loss_limit,
  };
}

async function writeBalance(playerId: string, balance: number): Promise<{ version: number; txid: number }> {
  const { rows } = await pool.query(
    `UPDATE wallets SET balance = $2, version = version + 1, updated_at = now()
      WHERE player_id = $1
      RETURNING version, txid_current() AS txid`,
    [playerId, balance],
  );
  return rows[0];
}

export async function debit(playerId: string, amount: number, roundRef: string): Promise<Wallet> {
  const wallet = await getWallet(playerId);
  if (wallet.balance < amount) {
    log('wallet.debit_rejected', { player_id: playerId, round_ref: roundRef, amount, balance: wallet.balance });
    throw insufficientFunds();
  }
  await assertWithinLossLimit(playerId, amount, wallet.dailyLossLimit);

  const balance = wallet.balance - amount;
  const { version, txid } = await writeBalance(playerId, balance);
  log('wallet.debit', {
    player_id: playerId,
    round_ref: roundRef,
    amount,
    balance_before: wallet.balance,
    balance_after: balance,
    version_read: wallet.version,
    version,
    txid,
  });
  return { ...wallet, balance, version };
}

export async function credit(playerId: string, amount: number, roundId: string): Promise<Wallet> {
  const wallet = await getWallet(playerId);
  const balance = wallet.balance + amount;
  const { version, txid } = await writeBalance(playerId, balance);
  log('wallet.credit', {
    player_id: playerId,
    round_id: roundId,
    amount,
    balance_before: wallet.balance,
    balance_after: balance,
    version_read: wallet.version,
    version,
    txid,
  });
  return { ...wallet, balance, version };
}
