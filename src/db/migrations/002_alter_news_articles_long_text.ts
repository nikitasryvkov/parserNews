import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('news_articles', (table) => {
    table.text('title').alter();
    table.text('source_url').alter();
    table.text('category').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('news_articles', (table) => {
    table.string('title').alter();
    table.string('source_url').alter();
    table.string('category').alter();
  });
}
