import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { context, build } from 'esbuild';

const watch = process.argv.includes('--watch');
const entryPoint = resolve('frontend/src/main.tsx');
const outfile = resolve('public/js/app.js');

const options = {
  entryPoints: [entryPoint],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  jsx: 'automatic',
  sourcemap: watch ? 'inline' : false,
  define: {
    'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production'),
  },
};

await mkdir(dirname(outfile), { recursive: true });

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('Frontend watcher started');
} else {
  await build(options);
  console.log('Frontend bundle built');
}
