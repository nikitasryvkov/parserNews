import type { QueueStats } from '../../../entities/queue/model/types';
import { formatDateTime } from '../../../shared/lib/date/format';
import { EmptyState } from '../../../shared/ui/empty-state/EmptyState';
import { ErrorCard } from '../../../shared/ui/error-card/ErrorCard';
import { LoadingState } from '../../../shared/ui/loading-state/LoadingState';
import { useQueuesPage } from '../model/useQueuesPage';

interface QueueCardProps {
  label: string;
  queue: QueueStats;
}

function QueueCard({ label, queue }: QueueCardProps) {
  return (
    <div className="card card-accent">
      <div className="card-label">{label}</div>
      <div className="stat-row">
        <span className="stat-pill">
          <span className="dot dot-waiting" />
          {queue.waiting} ожидает
        </span>
        <span className="stat-pill">
          <span className="dot dot-active" />
          {queue.active} активных
        </span>
        <span className="stat-pill">
          <span className="dot dot-completed" />
          {queue.completed} выполнено
        </span>
        <span className="stat-pill">
          <span className="dot dot-failed" />
          {queue.failed} ошибок
        </span>
      </div>
    </div>
  );
}

export function QueuesPage() {
  const { loading, error, queues, jobs, reload } = useQueuesPage();

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Очереди</h1>
          <p className="page-subtitle">Состояние задач BullMQ</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={reload}>
          Обновить
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorCard message={error} />
      ) : queues ? (
        <>
          <div className="cards">
            <QueueCard label="Parse — сбор данных" queue={queues.parse} />
            <QueueCard label="Adapt — адаптация" queue={queues.adapt} />
            <QueueCard label="Store — сохранение" queue={queues.store} />
          </div>

          <h2 className="section-title">Упавшие задачи</h2>
          {jobs.length === 0 ? (
            <EmptyState title="Упавших задач нет" subtitle="Всё работает штатно" />
          ) : (
            <div>
              {jobs.map((job, index) => (
                <div key={`${job.queue}-${job.name}-${job.timestamp}-${index}`} className="failed-job">
                  <div className="failed-job-header">
                    <span className="badge badge-danger">{job.queue}</span>
                    <span className="badge badge-muted">{job.name}</span>
                    <span className="failed-job-meta">{formatDateTime(job.timestamp)}</span>
                  </div>
                  <div className="failed-job-reason">{job.failedReason}</div>
                  {job.stacktrace?.length ? <pre className="failed-job-stack">{job.stacktrace.join('\n')}</pre> : null}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState title="Данные по очередям недоступны" />
      )}
    </>
  );
}
