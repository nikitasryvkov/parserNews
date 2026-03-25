import { Worker } from 'bullmq';
import { getRedisOptions } from '../config/index.js';
import { insertNewsArticles } from '../services/index.js';
import { insertSmartRankingCompanies } from '../services/smartRankingCompanies.js';
import { insertEdtechCompanies } from '../services/edtechCompanies.js';
import { createChildLogger } from '../lib/logger.js';
import type { StoreJobData } from '../types/index.js';

const log = createChildLogger('storeWorker');
const QUEUE_NAME = 'store';

export function createStoreWorker(): Worker<StoreJobData> {
  const worker = new Worker<StoreJobData>(
    QUEUE_NAME,
    async (job) => {
      const data = job.data;
      log.info(
        { jobId: job.id, type: data.type, parserName: data.parserName, itemCount: data.items.length, attempt: job.attemptsMade + 1 },
        'Processing store job',
      );

      if (data.type === 'articles') {
        const result = await insertNewsArticles(data.items);
        log.info({ jobId: job.id, ...result }, 'Stored articles');
      } else if (data.type === 'companies_edtech') {
        const result = await insertEdtechCompanies(data.items);
        log.info({ jobId: job.id, ...result }, 'Stored edtech companies');
      } else {
        const result = await insertSmartRankingCompanies(data.items);
        log.info({ jobId: job.id, ...result }, 'Stored medtech companies');
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
      { jobId: job?.id, type: job?.data?.type, parserName: job?.data?.parserName, attempt: job?.attemptsMade, err: err.message },
      'Store job failed',
    );
  });

  return worker;
}
