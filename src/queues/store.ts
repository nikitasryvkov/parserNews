import { Queue } from 'bullmq';
import { getRedisOptions } from '../config/index.js';
import type { StoreJobData } from '../types/index.js';

const QUEUE_NAME = 'store';

let _queue: Queue<StoreJobData> | null = null;

export function getStoreQueue(): Queue<StoreJobData> {
  if (!_queue) {
    _queue = new Queue<StoreJobData>(QUEUE_NAME, {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
      },
    });
  }
  return _queue;
}

export async function addStoreJob(data: StoreJobData): Promise<void> {
  await getStoreQueue().add('store', data);
}
