/**
 * Тест парсера Smart Ranking без Redis/воркеров.
 * Запуск: npx tsx scripts/test-smartranking.ts
 */
import { getParser } from '../src/parsers/index.js';

async function main() {
  const parser = getParser('smartranking');
  if (!parser) {
    console.error('Parser "smartranking" not found');
    process.exit(1);
  }

  console.log('Запуск парсера Smart Ranking...');
  try {
    const rawOutputs = await parser('https://smartranking.ru/ru/ranking/medicinskie-tehnologii/');
    const items = (rawOutputs[0]?.items ?? []) as unknown[];
    console.log('\nКомпаний:', items.length);
    if (items.length > 0) {
      console.log('Первая компания:', JSON.stringify(items[0], null, 2));
    } else {
      console.log('Raw output:', JSON.stringify(rawOutputs, null, 2).slice(0, 500));
    }
  } catch (err) {
    console.error('Ошибка:', err);
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
