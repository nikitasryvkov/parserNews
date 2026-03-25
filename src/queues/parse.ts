import { Queue } from 'bullmq';
import { getRedisOptions } from '../config/index.js';
import type { ParseJobData } from '../types/index.js';

const QUEUE_NAME = 'parse';

let _queue: Queue<ParseJobData> | null = null;

export function getParseQueue(): Queue<ParseJobData> {
  if (!_queue) {
    _queue = new Queue<ParseJobData>(QUEUE_NAME, {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      },
    });
  }
  return _queue;
}

export async function addParseJob(data: ParseJobData): Promise<void> {
  await getParseQueue().add('parse', data);
}
