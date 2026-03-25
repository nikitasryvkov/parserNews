import { Worker } from 'bullmq';
import { relative } from 'path';
import { getRedisOptions } from '../config/index.js';
import { getParser } from '../parsers/index.js';
import { writeRawToFile, listRawFilesByParser } from '../services/rawFiles.js';
import { addAdaptJob } from '../queues/adapt.js';
import { createChildLogger } from '../lib/logger.js';
import type { ParseJobData } from '../types/index.js';

const log = createChildLogger('parseWorker');
const QUEUE_NAME = 'parse';

/**
 * Для этих парсеров кэш raw отключён: результат зависит от настроек (глубина ленты) и не должен
 * залипать на старом JSON (типичный кейс: USE_RAW_CACHE=1 + в data/raw/ria лежит файл только на 20 новостей).
 */
const PARSERS_SKIP_RAW_CACHE = new Set(['ria', 'edtechs', 'vpo']);

export function createParseWorker(): Worker<ParseJobData> {
  const worker = new Worker<ParseJobData>(
    QUEUE_NAME,
    async (job) => {
      const { parserName, url, uploadDir } = job.data;
      log.info({ jobId: job.id, parserName, url, attempt: job.attemptsMade + 1 }, 'Processing parse job');

      const useCache = process.env.USE_RAW_CACHE === '1' && !PARSERS_SKIP_RAW_CACHE.has(parserName);

      if (PARSERS_SKIP_RAW_CACHE.has(parserName) && process.env.USE_RAW_CACHE === '1') {
        log.info({ parserName }, 'USE_RAW_CACHE ignored for this parser (always fresh fetch)');
      }

      if (useCache) {
        const rawFiles = await listRawFilesByParser(parserName);
        if (rawFiles.length > 0) {
          const relPath = relative(process.cwd(), rawFiles[0]).replace(/\\/g, '/');
          log.info({ parserName }, 'Using cached raw file, skipping site fetch');
          await addAdaptJob({ rawFilePath: relPath, parserName, format: 'default' });
          return;
        }
      }

      const parser = getParser(parserName);
      if (!parser) throw new Error(`Parser not found: ${parserName}`);

      const rawOutputs = await parser(url, { uploadDir });
      const itemCount = rawOutputs.reduce(
        (sum, r) => sum + ((r.items as unknown[])?.length ?? 0),
        0,
      );
      log.info({ parserName, itemCount }, 'Parse complete');

      for (const rawData of rawOutputs) {
        const rawFilePath = await writeRawToFile(rawData, parserName);
        await addAdaptJob({ rawFilePath, parserName, format: 'default' });
      }
    },
    {
      connection: getRedisOptions(),
      concurrency: 2,
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
    },
  );

  worker.on('failed', (job, err) => {
    log.error(
      { jobId: job?.id, data: job?.data, attempt: job?.attemptsMade, err: err.message },
      'Parse job failed',
    );
  });

  return worker;
}
