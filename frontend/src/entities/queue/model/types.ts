export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface QueuesResponse {
  parse: QueueStats;
  adapt: QueueStats;
  store: QueueStats;
}

export interface FailedJob {
  queue: string;
  name: string;
  timestamp: string;
  failedReason: string;
  stacktrace?: string[];
}

export interface FailedJobsResponse {
  total: number;
  jobs: FailedJob[];
}
