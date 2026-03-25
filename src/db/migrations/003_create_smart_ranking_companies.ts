import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('smart_ranking_companies', (table) => {
    table.increments('id').primary();
    table.integer('position').notNullable();
    table.text('company_name').notNullable();
    table.text('company_url').notNullable();
    table.text('ceo');
    table.text('segment');
    table.text('revenue_2024_q2');
    table.text('revenue_2025_q3');
    table.text('dynamics');
    table.text('source').notNullable();
    table.text('source_url').notNullable();
    table.jsonb('raw_company_page');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('smart_ranking_companies');
}
