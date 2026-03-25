/**
 * Создаёт базу parser_news.
 * Запуск: node scripts/create-db.js
 */
import pg from 'pg';

const dbName = process.env.DB_NAME || 'parser_news';
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const client = new pg.Client(config);

async function main() {
  try {
    await client.connect();
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    if (res.rows.length > 0) {
      console.log(`База "${dbName}" уже существует.`);
      return;
    }
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`База "${dbName}" создана.`);
  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
