import { requestJson } from '../../../shared/api/http/client';
import type { FailedJobsResponse, QueuesResponse } from '../model/types';

export function fetchQueues(): Promise<QueuesResponse> {
  return requestJson<QueuesResponse>('/queues');
}

export function fetchFailedJobs(): Promise<FailedJobsResponse> {
  return requestJson<FailedJobsResponse>('/queues/failed');
}
