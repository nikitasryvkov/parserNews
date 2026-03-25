/**
 * Тестовый скрипт для проверки парсера TAdviser.
 * Запуск: npx tsx scripts/test-tadviser.ts
 *
 * Требования: установленный Puppeteer (Chromium).
 */

import { getParser } from '../src/parsers/index.js';

async function main() {
  const parser = getParser('tadviser');
  if (!parser) {
    console.error('Parser "tadviser" not found');
    process.exit(1);
  }

  console.log('Запуск парсера TAdviser...');
  const url = process.argv[2] || ''; // пустая строка — использовать дефолтный URL

  const rawOutputs = await parser(url);
  console.log(JSON.stringify(rawOutputs, null, 2));
  console.log('\nВсего материалов:', rawOutputs[0]?.items?.length ?? 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
