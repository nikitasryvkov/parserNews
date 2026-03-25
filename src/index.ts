/**
 * Entry point: starts BullMQ workers, Express API, and optional parse-on-startup.
 */
import 'dotenv/config';
import { Worker } from 'bullmq';
import { createParseWorker, createAdaptWorker, createStoreWorker } from './workers/index.js';
import { startApi } from './api/index.js';
import { getParser } from './parsers/index.js';
import { getAdapter } from './adapters/index.js';
import { closeDb } from './db/index.js';
import { closeBrowser } from './lib/puppeteer.js';
import { validateConfig } from './config/index.js';
import { createChildLogger } from './lib/logger.js';
import {
  insertNewsArticles,
  writeRawToFile,
  readRawFromFile,
  listRawFiles,
} from './services/index.js';
import { loadTags } from './services/tags.js';
import type { AdapterArticle } from './types/index.js';

const log = createChildLogger('main');

process.on('unhandledRejection', (reason) => {
  log.fatal({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  log.fatal({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});

const SHUTDOWN_TIMEOUT_MS = 30_000;

try {
  validateConfig();
} catch (err) {
  log.fatal({ err }, 'Invalid configuration, exiting');
  process.exit(1);
}

await loadTags().catch((err) => log.warn({ err }, 'Tags preload failed, using defaults'));

const parseWorker = createParseWorker();
const adaptWorker = createAdaptWorker();
const storeWorker = createStoreWorker();

parseWorker.on('ready', () => log.info('Parse worker ready'));
adaptWorker.on('ready', () => log.info('Adapt worker ready'));
storeWorker.on('ready', () => log.info('Store worker ready'));

try {
  await startApi();
} catch (err) {
  log.fatal({ err }, 'Failed to start API, exiting');
  process.exit(1);
}

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  log.info({ signal }, 'Shutting down...');

  const timeout = setTimeout(() => {
    log.warn('Shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    const workers: Worker[] = [parseWorker, adaptWorker, storeWorker];
    await Promise.allSettled(workers.map((w) => w.close()));
    await closeBrowser();
    await closeDb();
    log.info('Shutdown complete');
  } catch (err) {
    log.error({ err }, 'Error during shutdown');
  } finally {
    clearTimeout(timeout);
    process.exit(0);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

async function processRawToDb(rawFilePaths: string[], parserName: string): Promise<void> {
  const adapter = getAdapter(parserName);
  if (!adapter) return;
  const allArticles: AdapterArticle[] = [];
  for (const fp of rawFilePaths) {
    const rawData = await readRawFromFile(fp);
    const result = adapter(rawData, 'default');
    if (result.type === 'articles') {
      allArticles.push(...result.items);
    }
  }
  if (allArticles.length > 0) {
    await insertNewsArticles(allArticles);
    log.info({ count: allArticles.length }, 'Saved articles to DB');
  }
}

if (process.env.PARSE_ON_STARTUP === '1') {
  const parser = getParser('tadviser');
  const adapter = getAdapter('tadviser');
  if (parser && adapter) {
    log.info('Parse on startup enabled');
    try {
      const useCache = process.env.USE_RAW_CACHE === '1';
      const rawFiles = await listRawFiles();
      if (useCache && rawFiles.length > 0) {
        log.info({ fileCount: rawFiles.length }, 'Using raw cache, skipping site fetch');
        await processRawToDb(rawFiles, 'tadviser');
      } else {
        const outputs = await parser('');
        const rawPaths: string[] = [];
        for (const rawData of outputs) {
          const fp = await writeRawToFile(rawData);
          rawPaths.push(fp);
        }
        const itemCount = outputs.reduce(
          (sum, r) => sum + ((r.items as unknown[])?.length ?? 0),
          0,
        );
        log.info({ itemCount }, 'Parsed items, saved to data/raw/');
        await processRawToDb(rawPaths, 'tadviser');
      }
    } catch (err) {
      log.error({ err }, 'Parse on startup failed');
    }
  }
}
