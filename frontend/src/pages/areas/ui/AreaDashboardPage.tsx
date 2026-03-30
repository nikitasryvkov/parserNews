import type { AreaOption } from '../../../shared/config/areas';

interface AreaDashboardPageProps {
  area: AreaOption;
}

export function AreaDashboardPage({ area }: AreaDashboardPageProps) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{area.title}</h1>
          <p className="page-subtitle">Промежуточный экран для будущего дашборда по выбранному направлению</p>
        </div>
      </div>

      <article className="card area-placeholder-card">
        <span className="badge badge-info area-placeholder-badge">Будущий дашборд</span>
        <p className="area-placeholder-lead">{area.description}</p>
        <p className="area-placeholder-text">
          Этот экран уже зарезервирован под отдельный дашборд направления. На следующем этапе сюда можно будет добавить
          KPI-карточки, графики, отраслевые фильтры, сводки по источникам и аналитику по статьям.
        </p>
      </article>
    </>
  );
}
