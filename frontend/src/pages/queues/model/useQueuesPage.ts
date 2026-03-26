import { useState } from 'react';
import { fetchFailedJobs, fetchQueues } from '../../../entities/queue/api/queuesApi';
import { POLLING_INTERVALS } from '../../../shared/config/constants';
import { usePollingEffect } from '../../../shared/lib/react/usePollingEffect';

export function useQueuesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [queues, setQueues] = useState<Awaited<ReturnType<typeof fetchQueues>> | null>(null);
  const [jobs, setJobs] = useState<Awaited<ReturnType<typeof fetchFailedJobs>>['jobs']>([]);

  usePollingEffect(
    async () => {
      try {
        const [queuesResponse, failedJobsResponse] = await Promise.all([fetchQueues(), fetchFailedJobs()]);
        setQueues(queuesResponse);
        setJobs(failedJobsResponse.jobs);
        setError('');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить очереди');
      } finally {
        setLoading(false);
      }
    },
    POLLING_INTERVALS.queues,
    [refreshKey],
  );

  return {
    loading,
    error,
    queues,
    jobs,
    reload: () => setRefreshKey((current) => current + 1),
  };
}
