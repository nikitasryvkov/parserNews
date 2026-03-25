import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('smart_ranking_companies', (table) => {
    table.unique(['company_url']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('smart_ranking_companies', (table) => {
    table.dropUnique(['company_url']);
  });
}
