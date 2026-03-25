import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tadviser_tags', (table) => {
    table.text('mode').notNullable().defaultTo('phrase');
    table.boolean('exclude').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tadviser_tags', (table) => {
    table.dropColumn('mode');
    table.dropColumn('exclude');
  });
}
