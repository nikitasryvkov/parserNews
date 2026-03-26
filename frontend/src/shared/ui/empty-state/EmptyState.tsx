import { EmptyStateIcon } from '../icons/AppIcons';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <EmptyStateIcon />
      <p>{title}</p>
      {subtitle ? <p className="sub">{subtitle}</p> : null}
    </div>
  );
}
