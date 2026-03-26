import { Link } from 'react-router-dom';
import { useAuth } from '../../../features/auth/model/useAuth';
import { useParserActions } from '../../../features/parser-actions/model/useParserActions';
import { PARSER_ACTIONS } from '../../../shared/config/constants';
import { routePaths } from '../../../shared/config/routes';

export function DashboardPage() {
  const auth = useAuth();
  const { pendingParser, runParser } = useParserActions();
  const canRunParser = auth.hasPermission('parser.run');

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Главная</h1>
          <p className="page-subtitle">Сводный контроль сбора новостей и справочников</p>
        </div>
        {canRunParser ? (
          <div className="btn-group">
            {PARSER_ACTIONS.map((parser) => (
              <button
                key={parser.name}
                type="button"
                className={`btn ${parser.tone}`}
                onClick={() => runParser(parser.name, parser.label)}
                disabled={pendingParser === parser.name}
              >
                {pendingParser === parser.name ? 'Запуск…' : parser.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <article className="card home-about">
        <p className="home-about-lead">
          <strong>ParserNews</strong> собирает новости и справочники из внешних источников, пропускает их через очереди
          обработки и сохраняет в PostgreSQL. Интерфейс нужен для ручного запуска парсеров, контроля состояния системы и
          управления контентом.
        </p>

        <h2 className="home-about-h">Источники</h2>
        <ul className="home-about-list">
          <li>
            <strong>TAdviser</strong> — аналитика и новости по IT и смежным рынкам.
          </li>
          <li>
            <strong>РИА Новости</strong> — лента <code>ria.ru/lenta/</code>, глубина и тайминги настраиваются на странице{' '}
            <Link to={routePaths.settings}>«Настройки»</Link>.
          </li>
          <li>
            <strong>MedTech</strong> — рейтинг Smart Ranking по медицинским технологиям.
          </li>
          <li>
            <strong>EdTech</strong> — рейтинг крупнейших компаний онлайн-образования на{' '}
            <a href="https://edtechs.ru/" target="_blank" rel="noreferrer">
              edtechs.ru
            </a>
            .
          </li>
          <li>
            <strong>Свод ВПО</strong> — отдельная страница <Link to={routePaths.vpo}>«Свод ВПО»</Link> для объединения нескольких
            Excel-файлов в один результат.
          </li>
        </ul>

        <h2 className="home-about-h">Инфраструктура</h2>
        <p className="home-about-p">
          Очереди построены на <strong>Redis</strong> и <strong>BullMQ</strong>, хранение — <strong>PostgreSQL</strong>. Статус
          подключений виден внизу боковой панели, а детальный мониторинг задач доступен в разделе{' '}
          <Link to={routePaths.queues}>«Очереди»</Link>.
        </p>
      </article>
    </>
  );
}
