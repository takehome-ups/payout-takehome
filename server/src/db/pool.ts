import pg from 'pg';
import { env } from '../config.js';

pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

export const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 20 });

export async function txid(client: pg.PoolClient | pg.Pool = pool): Promise<number> {
  const { rows } = await client.query('SELECT txid_current() AS txid');
  return rows[0].txid;
}
