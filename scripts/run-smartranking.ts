/**
 * Добавляет задачу Smart Ranking в очередь BullMQ (Redis).
 * Pipeline: parse → raw → adapt → store (воркеры обрабатывают автоматически).
 *
 * Требования: Redis запущен, приложение (воркеры) запущено.
 *
 * Запуск: npm run run:smartranking
 *
 * Либо вызвать API: curl -X POST http://localhost:3000/api/parse/smartranking
 */
import { addParseJob } from '../src/queues/parse.js';

const MEDTECH_URL = 'https://smartranking.ru/ru/ranking/medicinskie-tehnologii/';

async function main() {
  console.log('Smart Ranking: добавление задачи в очередь...\n');

  try {
    await addParseJob({
      parserName: 'smartranking',
      url: MEDTECH_URL,
    });
    console.log('✓ Задача добавлена в очередь parse.');
    console.log('  Воркеры обработают: parse → raw → adapt → store');
    console.log('  Следите за логами приложения.\n');
  } catch (err) {
    console.error('Ошибка (проверьте, что Redis запущен):', err);
    process.exit(1);
  }
}

main();
