import { Queue } from 'bullmq';
import { getRedisOptions } from '../config/index.js';
import type { AdaptJobData } from '../types/index.js';

const QUEUE_NAME = 'adapt';

let _queue: Queue<AdaptJobData> | null = null;

export function getAdaptQueue(): Queue<AdaptJobData> {
  if (!_queue) {
    _queue = new Queue<AdaptJobData>(QUEUE_NAME, {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3_000 },
      },
    });
  }
  return _queue;
}

export async function addAdaptJob(data: AdaptJobData): Promise<void> {
  await getAdaptQueue().add('adapt', data);
}
