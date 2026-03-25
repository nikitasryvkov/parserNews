import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Remove duplicates keeping only the row with the smallest id per source_url
  await knex.raw(`
    DELETE FROM news_articles
    WHERE id NOT IN (
      SELECT MIN(id) FROM news_articles GROUP BY source_url
    )
  `);

  await knex.schema.alterTable('news_articles', (table) => {
    table.unique(['source_url']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('news_articles', (table) => {
    table.dropUnique(['source_url']);
  });
}
