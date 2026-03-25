/**
 * Подключение к БД через Knex.
 */
import knex, { type Knex } from 'knex';
import { getKnexConfig } from '../config/index.js';

let _db: Knex | null = null;

export function getDb(): Knex {
  if (!_db) {
    _db = knex(getKnexConfig());
  }
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_db) {
    await _db.destroy();
    _db = null;
  }
}
