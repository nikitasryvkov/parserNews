import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('vpo_history', (table) => {
    table.uuid('id').primary();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.jsonb('source_files').notNullable();
    table.integer('row_count').notNullable();
    table.text('title').notNullable();
    table.string('storage_file', 255).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('vpo_history');
}
