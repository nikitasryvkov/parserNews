import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('news_articles', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('summary');
    table.text('content').notNullable();
    table.string('source_url').notNullable();
    table.string('source').notNullable();
    table.string('category');
    table.timestamp('published_at');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('news_articles');
}
