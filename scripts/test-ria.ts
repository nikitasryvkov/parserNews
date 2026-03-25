import { getParser } from '../src/parsers/index.js';

async function main() {
  const p = getParser('ria');
  if (!p) {
    console.error('Parser "ria" not registered');
    process.exit(1);
  }
  const out = await p('https://ria.ru/lenta/');
  const items = (out[0]?.items as unknown[]) ?? [];
  console.log('count:', items.length);
  if (items[0]) console.log('first:', JSON.stringify(items[0], null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
