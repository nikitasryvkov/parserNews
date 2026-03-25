import { Worker } from 'bullmq';
import { getRedisOptions } from '../config/index.js';
import { getAdapter } from '../adapters/index.js';
import { readRawFromFile } from '../services/rawFiles.js';
import { addStoreJob } from '../queues/store.js';
import { createChildLogger } from '../lib/logger.js';
import type { AdaptJobData, StoreJobData } from '../types/index.js';

const log = createChildLogger('adaptWorker');
const QUEUE_NAME = 'adapt';

export function createAdaptWorker(): Worker<AdaptJobData> {
  const worker = new Worker<AdaptJobData>(
    QUEUE_NAME,
    async (job) => {
      const { rawFilePath, parserName, format } = job.data;
      log.info({ jobId: job.id, parserName, rawFilePath, attempt: job.attemptsMade + 1 }, 'Processing adapt job');

      const rawData = await readRawFromFile(rawFilePath);

      const adapter = getAdapter(parserName);
      if (!adapter) throw new Error(`Adapter not found: ${parserName}`);

      const result = adapter(rawData, format);
      log.info({ parserName, type: result.type, count: result.items.length }, 'Adapt complete');

      if (result.type === 'none') {
        return;
      }

      let storeData: StoreJobData;
      if (result.type === 'articles') {
        storeData = { type: 'articles', parserName, items: result.items };
      } else if (parserName === 'edtechs') {
        storeData = { type: 'companies_edtech', parserName, items: result.items };
      } else {
        storeData = { type: 'companies_medtech', parserName, items: result.items };
      }

      await addStoreJob(storeData);
    },
    {
      connection: getRedisOptions(),
      concurrency: 3,
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
    },
  );

  worker.on('failed', (job, err) => {
    log.error(
      { jobId: job?.id, data: job?.data, attempt: job?.attemptsMade, err: err.message },
      'Adapt job failed',
    );
  });

  return worker;
}
