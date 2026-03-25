/** Knex config for migrations. Uses process.env; подхватывает `.env` в корне проекта. */
import 'dotenv/config';

export default {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    database: process.env.DB_NAME ?? 'parser_news',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
  },
  migrations: {
    directory: './src/db/migrations',
  },
};
