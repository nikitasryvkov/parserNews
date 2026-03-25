import * as api from './api.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const toasts = $('#toasts');

/* ───── toast ───── */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  toasts.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3500);
}

/* ───── health indicator ───── */
async function updateHealth() {
  const ind = $('#health-indicator');
  try {
    const h = await api.fetchHealth();
    const dot = ind.querySelector('.health-dot');
    const txt = ind.querySelector('.health-text');
    const ok = h.status === 'ok';
    dot.className = `health-dot ${ok ? 'ok' : 'error'}`;
    txt.textContent = ok ? 'Системы в норме' : `Деградация: ${Object.entries(h.checks).filter(([,v]) => v !== 'ok').map(([k]) => k).join(', ')}`;
  } catch {
    ind.querySelector('.health-dot').className = 'health-dot error';
    ind.querySelector('.health-text').textContent = 'Нет соединения';
  }
}

/* ───── mobile menu ───── */
$('#mobile-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
document.addEventListener('click', (e) => {
  if ($('#sidebar').classList.contains('open') && !e.target.closest('.sidebar') && !e.target.closest('.mobile-toggle')) {
    $('#sidebar').classList.remove('open');
  }
});

/* ───── routing ───── */
const routes = {
  '': renderDashboard,
  articles: renderArticles,
  companies: renderCompanies,
  tags: renderTags,
  queues: renderQueues,
  settings: renderSettings,
  vpo: renderVpo,
};
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const state = {
  articles: { page: 1, search: '', totalPages: 1, limit: 20 },
  companies: { page: 1, search: '', totalPages: 1, limit: 20, pool: 'medtech' },
};

function pageSizeSelectHtml(prefix, currentLimit) {
  const opts = PAGE_SIZE_OPTIONS.map(
    (n) => `<option value="${n}"${n === currentLimit ? ' selected' : ''}>${n}</option>`,
  ).join('');
  return `<label class="page-size-label"><span class="page-size-label-text">На странице</span>
    <select class="search-input page-size-select" id="${prefix}-page-size" aria-label="Записей на странице">${opts}</select>
  </label>`;
}
let refreshTimer = null;

function navigate() {
  clearInterval(refreshTimer);
  const hash = location.hash.replace(/^#\/?/, '');
  const route = routes[hash] ?? renderDashboard;
  document.querySelectorAll('.nav-link').forEach((l) => {
    l.classList.toggle('active', l.dataset.page === hash);
  });
  $('#sidebar').classList.remove('open');
  route();
}

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', () => { navigate(); updateHealth(); setInterval(updateHealth, 30_000); });

/* ───── helpers ───── */
function loading() { return '<div class="loading"><div class="spinner"></div>Загрузка...</div>'; }

function empty(text, sub) {
  return `<div class="empty-state">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 15h8M9 9h.01M15 9h.01"/></svg>
    <p>${text}</p>${sub ? `<p class="sub">${sub}</p>` : ''}</div>`;
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function dynamicsClass(val) {
  if (!val) return 'cell-dim';
  if (val.includes('+') || val.includes('рост')) return 'cell-positive';
  if (val.includes('-') || val.includes('паден')) return 'cell-negative';
  return '';
}

function paginationPageList(page, totalPages, id) {
  const parts = [];
  const addNum = (n) => {
    const active = n === page ? ' is-active' : '';
    const ariaCur = n === page ? ' aria-current="page"' : '';
    parts.push(
      `<button type="button" class="btn btn-secondary btn-sm pagination-num${active}" data-action="${id}-jump-page" data-page="${n}" aria-label="Страница ${n}"${ariaCur}>${n}</button>`,
    );
  };
  const addGap = () => parts.push('<span class="pagination-gap" aria-hidden="true">…</span>');

  if (totalPages <= 9) {
    for (let n = 1; n <= totalPages; n++) addNum(n);
  } else {
    addNum(1);
    let left = Math.max(2, page - 2);
    let right = Math.min(totalPages - 1, page + 2);
    if (page <= 4) {
      left = 2;
      right = Math.min(5, totalPages - 1);
    }
    if (page >= totalPages - 3) {
      left = Math.max(2, totalPages - 4);
      right = totalPages - 1;
    }
    if (left > 2) addGap();
    for (let n = left; n <= right; n++) addNum(n);
    if (right < totalPages - 1) addGap();
    addNum(totalPages);
  }
  return parts.join('');
}

function paginationHtml(page, limit, total, id) {
  const pages = Math.ceil(total / limit) || 1;
  const nums =
    pages <= 1
      ? ''
      : `<div class="pagination-pages" role="group" aria-label="Номера страниц">${paginationPageList(page, pages, id)}</div>`;
  return `<div class="pagination">
    <span class="pagination-summary">Страница ${page} из ${pages} (${total} записей)</span>
    <div class="pagination-controls">
      <div class="pagination-buttons">
        <button type="button" class="btn btn-secondary btn-sm" data-action="${id}-prev" ${page <= 1 ? 'disabled' : ''}>← Назад</button>
        ${nums}
        <button type="button" class="btn btn-secondary btn-sm" data-action="${id}-next" ${page >= pages ? 'disabled' : ''}>Вперёд →</button>
      </div>
      <div class="pagination-goto">
        <label class="pagination-goto-label"><span class="pagination-goto-text">На стр.</span>
          <input type="number" class="search-input pagination-goto-input" id="${id}-page-goto" min="1" max="${pages}" value="${page}" inputmode="numeric" aria-label="Номер страницы"></label>
        <button type="button" class="btn btn-primary btn-sm" data-action="${id}-goto-page">Перейти</button>
      </div>
    </div>
  </div>`;
}

/* ═══════════════════ HOME ═══════════════════ */
function renderDashboard() {
  app.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Главная</h1>
        <p class="page-subtitle">О системе ParserNews</p>
      </div>
      <div class="btn-group">
        <button type="button" class="btn btn-primary" data-action="parse-tadviser">TAdviser</button>
        <button type="button" class="btn btn-secondary" data-action="parse-ria">РИА</button>
        <button type="button" class="btn btn-secondary" data-action="parse-smartranking">MedTech</button>
        <button type="button" class="btn btn-secondary" data-action="parse-edtechs">EdTech</button>
      </div>
    </div>
    <article class="card home-about">
      <p class="home-about-lead">
        <strong>ParserNews</strong> — внутренний сервис сбора и учёта новостных и справочных материалов.
        Данные подтягиваются с внешних сайтов, проходят очереди обработки (разбор → адаптация под общую схему → сохранение в базу)
        и дальше доступны в веб-интерфейсе: просмотр статей, компаний и настройка фильтров.
      </p>

      <h2 class="home-about-h">Источники</h2>
      <ul class="home-about-list">
        <li><strong>TAdviser</strong> — раздел аналитики портала TAdviser (IT и смежные темы).</li>
        <li><strong>РИА Новости</strong> — лента <code>ria.ru/lenta/</code>; глубина и тайминги задаются в «Настройках». Для РИА действует <strong>фильтр по тегам</strong> — в базу попадают только материалы, проходящие правила на странице «Теги фильтра».</li>
        <li><strong>MedTech</strong> (Smart Ranking) — рейтинг медицинских технологий на smartranking.ru.</li>
        <li><strong>EdTech</strong> — рейтинг крупнейших компаний онлайн-образования на <a href="https://edtechs.ru/" target="_blank" rel="noopener">edtechs.ru</a>. Список id — API <code>/api/edtech/</code>, карточки — <code>/api/edtech_company_details/{id}</code>; снимок id хранится в БД на случай недоступности ленты.</li>
        <li><strong>Свод ВПО</strong> — <a href="#/vpo">страница «Свод ВПО»</a>: загрузка Excel, один сводный .xlsx по годам, история скачиваний; в раздел статей не пишется.</li>
      </ul>

      <h2 class="home-about-h">Инфраструктура</h2>
      <p class="home-about-p">
        Очереди задач строятся на <strong>Redis</strong> и <strong>BullMQ</strong>, хранение — <strong>PostgreSQL</strong>.
        Состояние подключений отображается внизу боковой панели. Ручной запуск сбора — с главной страницы; мониторинг очередей — в разделе «Очереди».
      </p>
    </article>`;
}

function fillRiaSettingsForm(s) {
  const p = $('#ria-lenta-pages');
  const d = $('#ria-page-delay');
  const st = $('#ria-settle-ms');
  if (p && s) p.value = String(s.lentaPages);
  if (d && s) d.value = String(s.pageDelayMs);
  if (st && s) st.value = String(s.puppeteerSettleMs);
}

/* ═══════════════════ SETTINGS (РИА) ═══════════════════ */
async function renderSettings() {
  app.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Настройки</h1><p class="page-subtitle">Лента РИА Новости (<code>ria.ru/lenta/</code>)</p></div>
    </div>
    <div class="card ria-settings-card">
      <div class="card-label">Глубина ленты и тайминги</div>
      <p class="ria-settings-hint">Сколько <strong>порций</strong> забрать за запуск: первая с главной ленты, следующие через «ещё 20 материалов» (<code>/services/lenta/more.html</code>). Запрос к РИА <strong>всегда</strong> идёт на сайт заново (кэш raw отключён). В базу попадут только новости, проходящие <a href="#/tags">фильтр тегов</a> — при узком наборе тегов в таблице может оказаться меньше строк, чем собрано.</p>
      <p class="settings-page-status" id="ria-settings-load-status">Загрузка…</p>
      <div class="ria-settings-form">
        <label class="ria-setting"><span class="ria-setting-label">Порций (блоков)</span>
          <input type="number" id="ria-lenta-pages" class="search-input ria-setting-input" min="1" max="50" step="1" title="1–50"></label>
        <label class="ria-setting"><span class="ria-setting-label">Пауза между порциями (мс)</span>
          <input type="number" id="ria-page-delay" class="search-input ria-setting-input" min="0" max="10000" step="50" title="0–10000"></label>
        <label class="ria-setting"><span class="ria-setting-label">Ожидание после загрузки в Puppeteer (мс)</span>
          <input type="number" id="ria-settle-ms" class="search-input ria-setting-input" min="0" max="30000" step="100" title="0–30000"></label>
        <button type="button" class="btn btn-primary btn-sm" data-action="ria-settings-save">Сохранить</button>
      </div>
    </div>`;

  const status = $('#ria-settings-load-status');
  try {
    const riaCfg = await api.fetchRiaSettings();
    if (riaCfg?.settings) fillRiaSettingsForm(riaCfg.settings);
    if (status) {
      status.textContent = '';
      status.classList.remove('settings-page-status-error');
    }
  } catch (err) {
    if (status) {
      status.textContent = `Не удалось загрузить настройки: ${err.message}`;
      status.classList.add('settings-page-status-error');
    }
  }
}

/* ═══════════════════ СВОД ВПО ═══════════════════ */
async function loadVpoHistory() {
  const el = $('#vpo-history-list');
  if (!el) return;
  try {
    const data = await api.fetchVpoHistory();
    const items = data.items || [];
    if (!items.length) {
      el.innerHTML =
        '<p class="vpo-history-empty">Пока нет выгрузок. После обработки загруженных файлов здесь появится объединённый .xlsx и его можно скачать.</p>';
      return;
    }
    el.innerHTML = items
      .map(
        (h) => `<div class="vpo-history-item">
        <div class="vpo-history-item-title">${esc(h.title)}</div>
        <div class="vpo-history-item-meta">${fmtDateTime(h.createdAt)} · строк данных: ${h.rowCount} · исходных файлов: ${h.sourceFiles?.length ?? 0}</div>
        <div class="vpo-history-item-files">${esc((h.sourceFiles || []).join(', '))}</div>
        <div class="vpo-history-item-actions">
          <a class="btn btn-primary btn-sm" href="${api.vpoHistoryDownloadUrl(h.id)}" download>Скачать .xlsx</a>
          <button class="btn-icon" data-action="vpo-history-delete" data-id="${h.id}" title="Удалить">&times;</button>
        </div>
      </div>`,
      )
      .join('');
  } catch (err) {
    el.innerHTML = `<p class="settings-page-status-error">${esc(err.message)}</p>`;
  }
}

function renderVpo() {
  app.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Свод ВПО</h1>
        <p class="page-subtitle">Несколько одинаковых .xlsx → объединённая таблица, история выгрузок справа</p>
      </div>
      <div class="btn-group">
        <button type="button" class="btn btn-secondary btn-sm" data-action="vpo-history-refresh">Обновить историю</button>
        <button type="button" class="btn btn-danger btn-sm" data-action="vpo-history-delete-all">Удалить всю историю</button>
      </div>
    </div>
    <div class="vpo-page-layout">
      <div class="vpo-page-main">
        <div class="card ria-settings-card">
          <div class="card-label">Загрузка файлов</div>
          <p class="ria-settings-hint">Листы <code>Р2_1_2(1)</code>–<code>(4)</code> (кириллическая <strong>Р</strong> или латинская <strong>P</strong>). Отбор направлений по первому столбцу. В результате — один файл <strong>Свод</strong>: для каждой таблицы (листа) Excel отдельный блок под своими заголовками; значения из разных листов не объединяются в одну строку. Несколько загруженных файлов идут в одном .xlsx подряд, каждый со своим именем и блоками.</p>
          <div class="vpo-upload-row">
            <input type="file" id="vpo-files" multiple accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" class="search-input vpo-file-input">
            <button type="button" class="btn btn-primary btn-sm" data-action="vpo-upload">Загрузить и обработать</button>
          </div>
          <p class="settings-page-status" id="vpo-upload-status"></p>
        </div>
      </div>
      <aside class="vpo-page-aside card">
        <div class="card-label">История объединённых файлов</div>
        <p class="vpo-aside-hint">После завершения задачи в очереди появится запись. Список обновляется автоматически.</p>
        <div id="vpo-history-list">${loading()}</div>
      </aside>
    </div>`;
  loadVpoHistory();
  refreshTimer = setInterval(loadVpoHistory, 8000);
}

/* ═══════════════════ ARTICLES ═══════════════════ */
async function renderArticles() {
  app.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Статьи</h1><p class="page-subtitle">Спаршенные материалы из источников</p></div>
      <button class="btn btn-danger btn-sm" data-action="delete-all-articles">Удалить все статьи</button>
    </div>
    <div class="search-bar">
      <input class="search-input search-bar-grow" id="articles-search" type="text" placeholder="Поиск по заголовку, источнику, категории..." value="${esc(state.articles.search)}">
      <button class="btn btn-primary" data-action="articles-search-btn">Найти</button>
      ${pageSizeSelectHtml('articles', state.articles.limit)}
    </div>
    <div id="articles-table">${loading()}</div>`;
  loadArticles();
}

async function loadArticles() {
  const container = $('#articles-table');
  if (!PAGE_SIZE_OPTIONS.includes(state.articles.limit)) state.articles.limit = 20;
  try {
    const lim = state.articles.limit;
    const data = await api.fetchArticles(state.articles.page, lim, state.articles.search);
    state.articles.totalPages = Math.max(1, Math.ceil((data.total ?? 0) / (data.limit ?? lim)));
    if (!data.articles?.length) {
      container.innerHTML = empty('Статьи не найдены', state.articles.search ? 'Попробуйте изменить поисковый запрос' : 'Запустите сбор данных с главной страницы');
      return;
    }
    container.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th style="width:50px">#</th><th>Заголовок</th><th>Источник</th><th>Категория</th><th>Опубликовано</th><th>Добавлено</th><th style="width:50px"></th></tr></thead>
      <tbody>${data.articles.map((a) => `<tr data-row-id="${a.id}">
        <td class="cell-dim cell-mono">${a.id}</td>
        <td class="cell-title">
          <a href="${esc(a.source_url)}" target="_blank" rel="noopener">${esc(a.title)}</a>
          ${a.summary ? `<div class="cell-summary">${esc(a.summary)}</div>` : ''}
        </td>
        <td><span class="badge badge-info">${esc(a.source)}</span></td>
        <td class="cell-dim">${esc(a.category) || '—'}</td>
        <td class="cell-dim" style="white-space:nowrap">${fmtDate(a.published_at)}</td>
        <td class="cell-dim" style="white-space:nowrap">${fmtDateTime(a.created_at)}</td>
        <td><button class="btn-icon" data-action="delete-article" data-id="${a.id}" title="Удалить">&times;</button></td>
      </tr>`).join('')}</tbody></table>
      ${paginationHtml(data.page, data.limit, data.total, 'articles')}
    </div>`;
  } catch (err) {
    container.innerHTML = `<div class="card card-danger"><p>${esc(err.message)}</p></div>`;
  }
}

/* ═══════════════════ COMPANIES ═══════════════════ */
function companiesPoolSubtitle() {
  return state.companies.pool === 'edtech'
    ? 'Рейтинг EdTech — edtechs.ru (онлайн-образование)'
    : 'Рейтинг Smart Ranking — медицинские технологии (MedTech)';
}

async function renderCompanies() {
  const pool = state.companies.pool;
  app.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Компании</h1>
        <p class="page-subtitle" id="companies-subtitle">${esc(companiesPoolSubtitle())}</p>
        <div class="btn-group companies-pool-tabs" role="tablist" aria-label="Таблица рейтинга">
          <button type="button" role="tab" class="btn ${pool === 'medtech' ? 'btn-primary' : 'btn-secondary'}" data-action="companies-pool" data-pool="medtech" aria-selected="${pool === 'medtech'}">MedTech</button>
          <button type="button" role="tab" class="btn ${pool === 'edtech' ? 'btn-primary' : 'btn-secondary'}" data-action="companies-pool" data-pool="edtech" aria-selected="${pool === 'edtech'}">EdTech</button>
        </div>
      </div>
      <button class="btn btn-danger btn-sm" data-action="delete-all-companies">Удалить все в этой таблице</button>
    </div>
    <div class="search-bar">
      <input class="search-input search-bar-grow" id="companies-search" type="text" placeholder="Поиск по названию, сегменту, CEO..." value="${esc(state.companies.search)}">
      <button class="btn btn-primary" data-action="companies-search-btn">Найти</button>
      ${pageSizeSelectHtml('companies', state.companies.limit)}
    </div>
    <div id="companies-table">${loading()}</div>`;
  loadCompanies();
}

async function loadCompanies() {
  const container = $('#companies-table');
  const sub = $('#companies-subtitle');
  if (sub) sub.textContent = companiesPoolSubtitle();
  if (!PAGE_SIZE_OPTIONS.includes(state.companies.limit)) state.companies.limit = 20;
  try {
    const lim = state.companies.limit;
    const pool = state.companies.pool;
    const data = await api.fetchCompanies(state.companies.page, lim, state.companies.search, pool);
    state.companies.totalPages = Math.max(1, Math.ceil((data.total ?? 0) / (data.limit ?? lim)));
    if (!data.companies?.length) {
      const hint =
        state.companies.search
          ? 'Попробуйте изменить запрос'
          : pool === 'edtech'
            ? 'Запустите сбор с главной: кнопка EdTech'
            : 'Запустите сбор с главной: кнопка MedTech';
      container.innerHTML = empty('Компании не найдены', hint);
      return;
    }
    container.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Поз.</th><th>Компания</th><th>CEO</th><th>Сегмент</th><th>Выручка 2024 Q2</th><th>Выручка 2025 Q3</th><th>Динамика</th><th style="width:50px"></th></tr></thead>
      <tbody>${data.companies.map((c) => `<tr data-row-id="${c.id}">
        <td class="cell-mono" style="font-weight:700;text-align:center">${c.position}</td>
        <td class="cell-title"><a href="${esc(c.company_url)}" target="_blank" rel="noopener">${esc(c.company_name)}</a></td>
        <td>${esc(c.ceo) || '<span class="cell-dim">—</span>'}</td>
        <td>${c.segment ? `<span class="badge badge-muted">${esc(c.segment)}</span>` : '<span class="cell-dim">—</span>'}</td>
        <td class="cell-mono">${esc(c.revenue_2024_q2) || '—'}</td>
        <td class="cell-mono">${esc(c.revenue_2025_q3) || '—'}</td>
        <td class="${dynamicsClass(c.dynamics)}">${esc(c.dynamics) || '—'}</td>
        <td><button class="btn-icon" data-action="delete-company" data-id="${c.id}" title="Удалить">&times;</button></td>
      </tr>`).join('')}</tbody></table>
      ${paginationHtml(data.page, data.limit, data.total, 'companies')}
    </div>`;
  } catch (err) {
    container.innerHTML = `<div class="card card-danger"><p>${esc(err.message)}</p></div>`;
  }
}

/* ═══════════════════ TAGS ═══════════════════ */
const MODE_LABELS = { phrase: 'Фраза', words: 'Все слова', prefix: 'Префикс', regex: 'Regex' };
const MODE_HINTS = {
  phrase: 'Ищет точное вхождение подстроки в тексте',
  words: 'Все слова тега должны присутствовать (в любом порядке)',
  prefix: 'Каждое слово — префикс: «биотех» → биотехнология, биотехнологии',
  regex: 'Регулярное выражение (JavaScript синтаксис)',
};

async function renderTags() {
  app.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Теги фильтра TAdviser</h1>
        <p class="page-subtitle">Статья проходит, если совпал хотя бы один включающий тег и ни один исключающий</p></div>
      <div class="btn-group">
        <button class="btn btn-secondary btn-sm" data-action="tags-reset">По умолчанию</button>
        <button class="btn btn-danger btn-sm" data-action="tags-delete-all">Удалить все</button>
      </div>
    </div>
    <div class="card" style="margin-bottom:20px">
      <div class="card-label">Добавить тег</div>
      <div class="tag-add-form">
        <input class="search-input" id="tag-input" type="text" placeholder="Текст тега...">
        <select class="tag-mode-select" id="tag-mode">
          <option value="phrase">Фраза</option>
          <option value="words">Все слова</option>
          <option value="prefix">Префикс</option>
          <option value="regex">Regex</option>
        </select>
        <label class="tag-exclude-label"><input type="checkbox" id="tag-exclude"> Исключить</label>
        <button class="btn btn-primary btn-sm" data-action="tag-add-btn">Добавить</button>
      </div>
      <div class="tag-mode-hint" id="tag-mode-hint">${MODE_HINTS.phrase}</div>
    </div>
    <div class="cards" id="tags-stats"></div>
    <div id="tags-include"></div>
    <div id="tags-exclude" style="margin-top:20px"></div>`;

  $('#tag-mode').addEventListener('change', (e) => {
    $('#tag-mode-hint').textContent = MODE_HINTS[e.target.value] || '';
  });

  loadTagsList();
}

async function loadTagsList() {
  try {
    const data = await api.fetchTags();
    const include = data.tags.filter((t) => !t.exclude);
    const exclude = data.tags.filter((t) => t.exclude);

    $('#tags-stats').innerHTML = `
      <div class="card card-success"><div class="card-label">Включающие теги</div><div class="card-value">${include.length}</div></div>
      <div class="card card-danger"><div class="card-label">Исключающие теги</div><div class="card-value">${exclude.length}</div></div>
      <div class="card"><div class="card-label">Всего</div><div class="card-value">${data.total}</div></div>`;

    $('#tags-include').innerHTML = include.length
      ? `<h2 class="section-title">Включающие теги</h2><div class="tags-grid">${include.map(renderTagChip).join('')}</div>`
      : `<h2 class="section-title">Включающие теги</h2>${empty('Нет включающих тегов', 'Добавьте теги или сбросьте по умолчанию')}`;

    $('#tags-exclude').innerHTML = exclude.length
      ? `<h2 class="section-title">Исключающие теги <span class="badge badge-danger">отклоняют статьи</span></h2><div class="tags-grid">${exclude.map(renderTagChip).join('')}</div>`
      : '';
  } catch (err) {
    $('#tags-include').innerHTML = `<div class="card card-danger"><p>${esc(err.message)}</p></div>`;
  }
}

function renderTagChip(t) {
  const modeLabel = MODE_LABELS[t.mode] || t.mode;
  const cls = t.exclude ? 'tag-chip tag-chip-exclude' : 'tag-chip';
  const modeOptions = Object.entries(MODE_LABELS).map(([k, v]) =>
    `<option value="${k}"${k === t.mode ? ' selected' : ''}>${esc(v)}</option>`
  ).join('');
  return `<span class="${cls}" data-tag-id="${t.id}">
    <select class="tag-chip-mode-select" data-action="tag-change-mode" data-id="${t.id}" title="${esc(MODE_HINTS[t.mode] || '')}">${modeOptions}</select>
    <span class="tag-chip-text">${esc(t.tag)}</span>
    <button class="tag-chip-toggle" data-action="tag-toggle-exclude" data-id="${t.id}" data-exclude="${t.exclude}" title="${t.exclude ? 'Сделать включающим' : 'Сделать исключающим'}">${t.exclude ? '↩' : '⛔'}</button>
    <button class="tag-chip-remove" data-action="tag-remove" data-id="${t.id}" title="Удалить">&times;</button>
  </span>`;
}

/* ═══════════════════ QUEUES ═══════════════════ */
async function renderQueues() {
  app.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Очереди</h1><p class="page-subtitle">Состояние BullMQ задач</p></div>
      <button type="button" class="btn btn-secondary" data-action="queues-refresh">Обновить</button>
    </div>
    <div class="cards" id="queues-cards">${loading()}</div>
    <h2 class="section-title">Упавшие задачи</h2>
    <div id="queues-failed">${loading()}</div>`;
  loadQueues();
  refreshTimer = setInterval(loadQueues, 10_000);
}

async function loadQueues() {
  try {
    const [queues, failed] = await Promise.all([api.fetchQueues(), api.fetchFailedJobs()]);

    const qCard = (label, q, cls) => `
      <div class="card ${cls}">
        <div class="card-label">${label}</div>
        <div class="stat-row">
          <span class="stat-pill"><span class="dot dot-waiting"></span>${q.waiting} ожидает</span>
          <span class="stat-pill"><span class="dot dot-active"></span>${q.active} активных</span>
          <span class="stat-pill"><span class="dot dot-completed"></span>${q.completed} выполнено</span>
          <span class="stat-pill"><span class="dot dot-failed"></span>${q.failed} ошибок</span>
        </div>
      </div>`;

    $('#queues-cards').innerHTML = `
      ${qCard('Parse — сбор данных', queues.parse, 'card-accent')}
      ${qCard('Adapt — адаптация', queues.adapt, 'card-accent')}
      ${qCard('Store — сохранение', queues.store, 'card-accent')}`;

    if (!failed.jobs?.length) {
      $('#queues-failed').innerHTML = empty('Упавших задач нет', 'Всё работает штатно');
      return;
    }

    $('#queues-failed').innerHTML = failed.jobs.map((j) => `
      <div class="failed-job">
        <div class="failed-job-header">
          <span class="badge badge-danger">${esc(j.queue)}</span>
          <span class="badge badge-muted">${esc(j.name)}</span>
          <span class="failed-job-meta">${fmtDateTime(j.timestamp)}</span>
        </div>
        <div class="failed-job-reason">${esc(j.failedReason)}</div>
        ${j.stacktrace?.length ? `<pre class="failed-job-stack">${esc(j.stacktrace.join('\n'))}</pre>` : ''}
      </div>`).join('');
  } catch (err) {
    $('#queues-cards').innerHTML = `<div class="card card-danger"><p>${esc(err.message)}</p></div>`;
  }
}

/* ═══════════════════ EVENT DELEGATION ═══════════════════ */
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'vpo-history-refresh') {
    loadVpoHistory();
  }

  if (action === 'vpo-history-delete') {
    const id = btn.dataset.id;
    if (!confirm('Удалить этот объединённый файл?')) return;
    try {
      await api.deleteVpoHistoryEntry(id);
      toast('Файл удалён', 'success');
      loadVpoHistory();
    } catch (err) { toast(err.message, 'error'); }
  }

  if (action === 'vpo-history-delete-all') {
    if (!confirm('Удалить ВСЮ историю объединённых файлов ВПО? Это действие необратимо.')) return;
    btn.disabled = true;
    try {
      const res = await api.deleteAllVpoHistory();
      toast(`Удалено записей: ${res.deleted}`, 'success');
      loadVpoHistory();
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  }

  if (action === 'vpo-upload') {
    const input = $('#vpo-files');
    const files = input?.files;
    if (!files?.length) {
      toast('Выберите один или несколько файлов .xlsx', 'error');
      return;
    }
    const st = $('#vpo-upload-status');
    btn.disabled = true;
    if (st) {
      st.textContent = 'Загрузка…';
      st.classList.remove('settings-page-status-error');
    }
    try {
      const res = await api.uploadVpoSvod(files);
      toast(res.message || 'Файлы приняты', 'success');
      if (st) st.textContent = `В очереди: ${(res.files || []).join(', ')}`;
      input.value = '';
      loadVpoHistory();
    } catch (err) {
      toast(err.message, 'error');
      if (st) {
        st.textContent = err.message;
        st.classList.add('settings-page-status-error');
      }
    } finally {
      btn.disabled = false;
    }
  }

  if (action === 'parse-tadviser' || action === 'parse-ria' || action === 'parse-smartranking' || action === 'parse-edtechs') {
    const parser = action.replace('parse-', '');
    const parseLabels = { tadviser: 'TAdviser', ria: 'РИА', smartranking: 'MedTech', edtechs: 'EdTech' };
    btn.disabled = true;
    try {
      await api.triggerParse(parser);
      toast(`Запущено: ${parseLabels[parser] ?? parser}`, 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  }

  if (action === 'ria-settings-save') {
    const lentaPages = parseInt($('#ria-lenta-pages')?.value ?? '', 10);
    const pageDelayMs = parseInt($('#ria-page-delay')?.value ?? '', 10);
    const puppeteerSettleMs = parseInt($('#ria-settle-ms')?.value ?? '', 10);
    if (Number.isNaN(lentaPages) || lentaPages < 1 || lentaPages > 50) {
      toast('Порций ленты: число от 1 до 50', 'error');
      return;
    }
    if (Number.isNaN(pageDelayMs) || pageDelayMs < 0 || pageDelayMs > 10000) {
      toast('Пауза между страницами: 0–10000 мс', 'error');
      return;
    }
    if (Number.isNaN(puppeteerSettleMs) || puppeteerSettleMs < 0 || puppeteerSettleMs > 30000) {
      toast('Ожидание Puppeteer: 0–30000 мс', 'error');
      return;
    }
    btn.disabled = true;
    try {
      const res = await api.patchRiaSettings({ lentaPages, pageDelayMs, puppeteerSettleMs });
      if (res.settings) fillRiaSettingsForm(res.settings);
      toast('Настройки РИА сохранены', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  }

  if (action === 'articles-prev') { state.articles.page = Math.max(1, state.articles.page - 1); loadArticles(); }
  if (action === 'articles-next') {
    state.articles.page = Math.min(state.articles.totalPages || 1, state.articles.page + 1);
    loadArticles();
  }
  if (action === 'companies-prev') { state.companies.page = Math.max(1, state.companies.page - 1); loadCompanies(); }
  if (action === 'companies-next') {
    state.companies.page = Math.min(state.companies.totalPages || 1, state.companies.page + 1);
    loadCompanies();
  }

  if (action.endsWith('-jump-page')) {
    const kind = action.replace('-jump-page', '');
    const p = parseInt(btn.dataset.page ?? '', 10);
    if (Number.isNaN(p)) return;
    if (kind === 'articles') {
      state.articles.page = p;
      loadArticles();
    }
    if (kind === 'companies') {
      state.companies.page = p;
      loadCompanies();
    }
  }

  if (action.endsWith('-goto-page')) {
    const kind = action.replace('-goto-page', '');
    const inp = document.getElementById(`${kind}-page-goto`);
    let p = parseInt(inp?.value ?? '', 10);
    const max = parseInt(inp?.max ?? '1', 10);
    if (Number.isNaN(p)) {
      toast('Введите номер страницы', 'error');
      return;
    }
    p = Math.max(1, Math.min(max, p));
    if (kind === 'articles') {
      state.articles.page = p;
      loadArticles();
    }
    if (kind === 'companies') {
      state.companies.page = p;
      loadCompanies();
    }
  }
  if (action === 'articles-search-btn') { state.articles.search = $('#articles-search')?.value ?? ''; state.articles.page = 1; loadArticles(); }
  if (action === 'companies-search-btn') { state.companies.search = $('#companies-search')?.value ?? ''; state.companies.page = 1; loadCompanies(); }
  if (action === 'queues-refresh') { loadQueues(); }

  /* ── tags ── */
  if (action === 'tag-add-btn') {
    const input = $('#tag-input');
    const val = input?.value?.trim();
    if (!val) { toast('Введите тег', 'error'); return; }
    const mode = $('#tag-mode')?.value || 'phrase';
    const exclude = $('#tag-exclude')?.checked || false;
    btn.disabled = true;
    try {
      await api.addTag(val, mode, exclude);
      input.value = '';
      toast('Тег добавлен', 'success');
      loadTagsList();
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  }

  if (action === 'tag-toggle-exclude') {
    const id = btn.dataset.id;
    const current = btn.dataset.exclude === 'true';
    try {
      await api.updateTag(id, { exclude: !current });
      loadTagsList();
      toast(current ? 'Тег теперь включающий' : 'Тег теперь исключающий', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  if (action === 'tag-remove') {
    const id = btn.dataset.id;
    try {
      await api.deleteTagById(id);
      btn.closest('.tag-chip')?.remove();
      const remaining = document.querySelectorAll('.tag-chip').length;
      if (remaining === 0) loadTagsList();
      else loadTagsList();
    } catch (err) { toast(err.message, 'error'); }
  }

  if (action === 'tags-delete-all') {
    if (!confirm('Удалить ВСЕ теги фильтра? Все новости TAdviser будут проходить без фильтрации.')) return;
    btn.disabled = true;
    try {
      const res = await api.deleteAllTags();
      toast(`Удалено тегов: ${res.deleted}`, 'success');
      loadTagsList();
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  }

  if (action === 'tags-reset') {
    if (!confirm('Сбросить теги к значениям по умолчанию? Текущие теги будут заменены.')) return;
    btn.disabled = true;
    try {
      const res = await api.resetTags();
      toast(`Восстановлено тегов: ${res.count}`, 'success');
      loadTagsList();
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  }

  /* ── delete single ── */
  if (action === 'delete-article') {
    const id = btn.dataset.id;
    const row = btn.closest('tr');
    try {
      await api.deleteArticle(id);
      row?.remove();
      toast('Статья удалена', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  if (action === 'delete-company') {
    const id = btn.dataset.id;
    const row = btn.closest('tr');
    try {
      await api.deleteCompany(id, state.companies.pool);
      row?.remove();
      toast('Компания удалена', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  if (action === 'companies-pool') {
    const p = btn.dataset.pool;
    if (p !== 'medtech' && p !== 'edtech') return;
    state.companies.pool = p;
    state.companies.page = 1;
    renderCompanies();
  }

  /* ── delete all ── */
  if (action === 'delete-all-articles') {
    if (!confirm('Удалить ВСЕ статьи? Это действие необратимо.')) return;
    btn.disabled = true;
    try {
      const res = await api.deleteAllArticles();
      toast(`Удалено статей: ${res.deleted}`, 'success');
      state.articles.page = 1;
      loadArticles();
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  }

  if (action === 'delete-all-companies') {
    const label = state.companies.pool === 'edtech' ? 'EdTech' : 'MedTech';
    if (!confirm(`Удалить ВСЕ компании в таблице «${label}»? Это действие необратимо.`)) return;
    btn.disabled = true;
    try {
      const res = await api.deleteAllCompanies(state.companies.pool);
      toast(`Удалено компаний: ${res.deleted}`, 'success');
      state.companies.page = 1;
      loadCompanies();
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  }
});

document.addEventListener('change', async (e) => {
  if (e.target.id === 'articles-page-size') {
    let v = parseInt(e.target.value, 10);
    if (!PAGE_SIZE_OPTIONS.includes(v)) v = 20;
    state.articles.limit = v;
    state.articles.page = 1;
    loadArticles();
    return;
  }
  if (e.target.id === 'companies-page-size') {
    let v = parseInt(e.target.value, 10);
    if (!PAGE_SIZE_OPTIONS.includes(v)) v = 20;
    state.companies.limit = v;
    state.companies.page = 1;
    loadCompanies();
    return;
  }

  const sel = e.target.closest('[data-action="tag-change-mode"]');
  if (!sel) return;
  const id = sel.dataset.id;
  const newMode = sel.value;
  try {
    await api.updateTag(id, { mode: newMode });
    toast(`Режим изменён: ${MODE_LABELS[newMode] || newMode}`, 'success');
  } catch (err) {
    toast(err.message, 'error');
    loadTagsList();
  }
});

document.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const s = document.activeElement;
    if (s?.id === 'articles-search') { state.articles.search = s.value; state.articles.page = 1; loadArticles(); }
    if (s?.id === 'companies-search') { state.companies.search = s.value; state.companies.page = 1; loadCompanies(); }
    if (s?.id === 'articles-page-goto' || s?.id === 'companies-page-goto') {
      const kind = s.id.replace('-page-goto', '');
      let p = parseInt(s.value ?? '', 10);
      const max = parseInt(s.max ?? '1', 10);
      if (Number.isNaN(p)) return;
      p = Math.max(1, Math.min(max, p));
      if (kind === 'articles') {
        state.articles.page = p;
        loadArticles();
      }
      if (kind === 'companies') {
        state.companies.page = p;
        loadCompanies();
      }
    }
    if (s?.id === 'tag-input') {
      const val = s.value?.trim();
      if (!val) return;
      const mode = $('#tag-mode')?.value || 'phrase';
      const exclude = $('#tag-exclude')?.checked || false;
      try {
        await api.addTag(val, mode, exclude);
        s.value = '';
        toast('Тег добавлен', 'success');
        loadTagsList();
      } catch (err) { toast(err.message, 'error'); }
    }
  }
});
