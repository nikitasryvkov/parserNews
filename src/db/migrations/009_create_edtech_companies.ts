import type { Knex } from 'knex';

/** Компании рейтинга ED Techs (edtechs.ru), отдельно от MedTech (smart_ranking_companies). */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('edtech_companies', (table) => {
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
  await knex.schema.alterTable('edtech_companies', (table) => {
    table.unique(['company_url']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('edtech_companies');
}
