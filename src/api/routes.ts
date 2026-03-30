import { mkdirSync } from 'fs';
import { basename, join } from 'path';
import { randomUUID } from 'crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import IORedis from 'ioredis';
import { addParseJob, getParseQueue, getAdaptQueue, getStoreQueue } from '../queues/index.js';
import { getParser } from '../parsers/index.js';
import { getDb } from '../db/index.js';
import { isSafeUrl } from '../lib/validateUrl.js';
import { createChildLogger } from '../lib/logger.js';
import { getConfig, getRedisOptions } from '../config/index.js';
import { asyncHandler } from './asyncHandler.js';
import { getAllTags, addTag, updateTag, addManyTags, deleteTag, deleteAllTags, resetToDefaults, type TagMode } from '../services/tags.js';
import { getRiaParserOptions, updateRiaParserOptions } from '../services/parserSettings.js';
import { listVpoHistory, resolveVpoHistoryFilePath, deleteVpoHistoryEntry, deleteAllVpoHistory } from '../services/vpoHistory.js';
import { KeycloakAdminError, listManagedUsers, replaceUserAppRoles } from '../auth/admin.js';
import { getAllAppRoles, getPublicAuthConfig, requirePermissions } from './auth.js';
import { isAppRole, type AppRole } from '../auth/rbac.js';

const log = createChildLogger('routes');
const router = Router();

const VPO_UPLOAD_ROOT = join(process.cwd(), 'data', 'uploads', 'vpo');

const PARSER_NAME_RE = /^[a-zA-Z0-9_-]{1,50}$/;

/* ───── helpers ───── */

function paginationParams(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  const search = String(query.search ?? '').trim();
  return { page, limit, offset: (page - 1) * limit, search };
}

function optionalTextParam(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Escape LIKE/ILIKE wildcard characters so user input is treated literally. */
function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}

function vpoCreatedAtToIso(created: unknown): string {
  if (created instanceof Date && !Number.isNaN(created.getTime())) return created.toISOString();
  const d = new Date(typeof created === 'string' || typeof created === 'number' ? created : NaN);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  log.warn({ created }, 'vpo history: invalid created_at');
  return '';
}

/* ───── shared Redis singleton for health checks ───── */

let _healthRedis: IORedis | null = null;

function getHealthRedis(): IORedis {
  if (_healthRedis) return _healthRedis;
  _healthRedis = new IORedis({
    ...getRedisOptions(),
    lazyConnect: true,
    connectTimeout: 3_000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  _healthRedis.on('error', () => {});
  return _healthRedis;
}

/* ───── health ───── */

router.get('/health', asyncHandler(async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = { db: 'error', redis: 'error' };
  const authConfig = getPublicAuthConfig();

  try {
    await getDb().raw('SELECT 1');
    checks.db = 'ok';
  } catch { /* db down */ }

  try {
    const redis = getHealthRedis();
    if (redis.status === 'ready') {
      await redis.ping();
      checks.redis = 'ok';
    } else {
      await redis.connect();
      await redis.ping();
      checks.redis = 'ok';
    }
  } catch { /* redis down */ }

  const healthy = checks.db === 'ok' && checks.redis === 'ok';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    authRequired: authConfig.authRequired,
    authProvider: authConfig.provider,
    checks,
  });
}));

/* ───── parse triggers ───── */

router.get('/auth/config', asyncHandler(async (_req, res) => {
  res.json(getPublicAuthConfig());
}));

router.get('/auth/me', asyncHandler(async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.json({
    ok: true,
    provider: req.auth.provider ?? getConfig().auth.provider,
    user: req.auth.user,
  });
}));

router.get('/auth/users', requirePermissions('access.users.view'), asyncHandler(async (req, res) => {
  const { page, limit, offset, search } = paginationParams(req.query as Record<string, unknown>);

  let result;
  try {
    result = await listManagedUsers(search, offset, limit);
  } catch (error) {
    if (error instanceof KeycloakAdminError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    throw error;
  }

  res.json({
    ok: true,
    page,
    limit,
    total: result.total,
    roles: getAllAppRoles(),
    users: result.users,
  });
}));

router.put('/auth/users/:id/roles', requirePermissions('access.roles.manage'), asyncHandler(async (req, res) => {
  const userId = String(req.params.id ?? '').trim();
  const rawRoles = req.body?.appRoles;

  if (!userId) {
    res.status(400).json({ error: 'User id is required' });
    return;
  }

  if (!Array.isArray(rawRoles)) {
    res.status(400).json({ error: 'appRoles must be an array' });
    return;
  }

  const nextRoles = [...new Set(
    rawRoles
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean),
  )];
  const invalidRoles = nextRoles.filter((role) => !isAppRole(role));

  if (invalidRoles.length) {
    res.status(400).json({
      error: `Unknown roles: ${invalidRoles.join(', ')}`,
      allowedRoles: getAllAppRoles(),
    });
    return;
  }

  let user;
  try {
    user = await replaceUserAppRoles(userId, nextRoles as AppRole[]);
  } catch (error) {
    if (error instanceof KeycloakAdminError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    throw error;
  }

  res.json({ ok: true, user });
}));

const PARSER_DEFAULT_URLS: Record<string, string> = {
  tadviser: 'https://www.tadviser.ru/index.php/Аналитика_TAdviser',
  smartranking: 'https://smartranking.ru/ru/ranking/medicinskie-tehnologii/',
  ria: 'https://ria.ru/lenta/',
  edtechs: 'https://edtechs.ru/',
};

async function validateParseRequest(parserName: unknown, url: unknown): Promise<string | null> {
  if (!parserName || typeof parserName !== 'string') return 'parserName is required';
  if (!PARSER_NAME_RE.test(parserName)) return 'parserName contains invalid characters';
  if (url !== undefined && url !== null && url !== '') {
    if (typeof url !== 'string') return 'url must be a string';
    if (!(await isSafeUrl(url))) return 'url is not allowed (blocked by security policy)';
  }
  return null;
}

router.post('/parse', requirePermissions('parser.run'), asyncHandler(async (req, res) => {
  const { parserName, url } = req.body;
  const validationError = await validateParseRequest(parserName, url);
  if (validationError) { res.status(400).json({ error: validationError }); return; }
  const targetUrl = url || PARSER_DEFAULT_URLS[parserName];
  if (!targetUrl) { res.status(400).json({ error: `No default URL for parser "${parserName}". Pass "url" in body.` }); return; }
  if (!getParser(parserName)) { res.status(400).json({ error: `Parser not found: ${parserName}` }); return; }
  await addParseJob({ parserName, url: targetUrl });
  res.json({ ok: true, parserName, url: targetUrl });
}));

router.post('/parse/:parserName', requirePermissions('parser.run'), asyncHandler(async (req, res) => {
  const parserName = req.params.parserName;
  const url = req.body?.url;
  const validationError = await validateParseRequest(parserName, url);
  if (validationError) { res.status(400).json({ error: validationError }); return; }
  const targetUrl = url || PARSER_DEFAULT_URLS[parserName];
  if (!targetUrl) { res.status(400).json({ error: `No default URL for parser "${parserName}". Pass "url" in body.` }); return; }
  if (!getParser(parserName)) { res.status(404).json({ error: `Parser not found: ${parserName}` }); return; }
  await addParseJob({ parserName, url: targetUrl });
  res.json({ ok: true, parserName, url: targetUrl });
}));

/* ───── upload: свод ВПО (Excel) ───── */

type ReqWithVpoSession = Request & { vpoSessionId?: string };

function vpoUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  const r = req as ReqWithVpoSession;
  r.vpoSessionId = randomUUID();
  const sessionId = r.vpoSessionId;
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(VPO_UPLOAD_ROOT, sessionId);
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const base = basename((file.originalname || 'file.xlsx').replace(/\0/g, ''));
        const safe = base.replace(/[/\\?*:|"<>]/g, '_') || 'file.xlsx';
        cb(null, safe);
      },
    }),
    limits: { fileSize: 15 * 1024 * 1024, files: 20 },
    fileFilter: (_req, file, cb) => {
      const name = file.originalname.toLowerCase();
      const ok =
        name.endsWith('.xlsx') &&
        (
          file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.mimetype === 'application/octet-stream' ||
          file.mimetype === 'application/zip'
        );
      cb(null, ok);
    },
  }).array('files', 20);

  upload(req, res, (err: unknown) => {
    if (err) {
      log.error({ err }, 'multer vpo upload');
      res.status(400).json({ error: err instanceof Error ? err.message : 'Ошибка загрузки файлов' });
      return;
    }
    next();
  });
}

router.post('/upload/vpo-svod', requirePermissions('vpo.upload'), vpoUploadMiddleware, asyncHandler(async (req, res) => {
  const r = req as ReqWithVpoSession;
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) {
    res.status(400).json({ error: 'Добавьте один или несколько файлов .xlsx' });
    return;
  }
  if (!r.vpoSessionId) {
    res.status(500).json({ error: 'Internal error: session' });
    return;
  }
  const uploadDir = join(VPO_UPLOAD_ROOT, r.vpoSessionId);
  await addParseJob({ parserName: 'vpo', url: 'vpo-upload', uploadDir });
  res.json({
    ok: true,
    sessionId: r.vpoSessionId,
    files: files.map((f) => f.filename),
    message: 'Файлы приняты, обработка в очереди',
  });
}));

router.get('/vpo/history', requirePermissions('vpo.view'), asyncHandler(async (_req, res) => {
  const items = await listVpoHistory(50);
  res.json({
    ok: true,
    items: items.map((h) => ({
      id: h.id,
      createdAt: vpoCreatedAtToIso(h.created_at),
      title: h.title,
      rowCount: h.row_count,
      sourceFiles: h.source_files,
    })),
  });
}));

router.get('/vpo/history/:id/file', requirePermissions('vpo.view'), asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const row = await getDb()('vpo_history').where({ id }).first();
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const abs = resolveVpoHistoryFilePath(String(row.storage_file));
  if (!abs) {
    res.status(404).json({ error: 'File not found on disk' });
    return;
  }
  const downloadName = `VPO_svod_${id.slice(0, 8)}.xlsx`;
  res.download(abs, downloadName, (dlErr) => {
    if (dlErr) log.error({ err: dlErr, abs }, 'GET /vpo/history/:id/file send failed');
  });
}));

router.delete('/vpo/history/:id', requirePermissions('vpo.delete'), asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const ok = await deleteVpoHistoryEntry(id);
  if (!ok) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ ok: true, id });
}));

router.delete('/vpo/history', requirePermissions('vpo.delete'), asyncHandler(async (_req, res) => {
  const deleted = await deleteAllVpoHistory();
  res.json({ ok: true, deleted });
}));

/* ───── parser settings (РИА лента) ───── */

router.get('/settings/ria', requirePermissions('settings.view'), asyncHandler(async (_req, res) => {
  const settings = await getRiaParserOptions();
  res.json({ ok: true, settings });
}));

router.patch('/settings/ria', requirePermissions('settings.manage'), asyncHandler(async (req, res) => {
  const { lentaPages, pageDelayMs, puppeteerSettleMs } = req.body ?? {};
  if (
    lentaPages === undefined &&
    pageDelayMs === undefined &&
    puppeteerSettleMs === undefined
  ) {
    res.status(400).json({ error: 'Укажите хотя бы одно поле: lentaPages, pageDelayMs, puppeteerSettleMs' });
    return;
  }
  const patch: { lentaPages?: number; pageDelayMs?: number; puppeteerSettleMs?: number } = {};
  if (lentaPages !== undefined) {
    if (typeof lentaPages !== 'number' || !Number.isFinite(lentaPages)) {
      res.status(400).json({ error: 'lentaPages must be a number' });
      return;
    }
    patch.lentaPages = lentaPages;
  }
  if (pageDelayMs !== undefined) {
    if (typeof pageDelayMs !== 'number' || !Number.isFinite(pageDelayMs)) {
      res.status(400).json({ error: 'pageDelayMs must be a number' });
      return;
    }
    patch.pageDelayMs = pageDelayMs;
  }
  if (puppeteerSettleMs !== undefined) {
    if (typeof puppeteerSettleMs !== 'number' || !Number.isFinite(puppeteerSettleMs)) {
      res.status(400).json({ error: 'puppeteerSettleMs must be a number' });
      return;
    }
    patch.puppeteerSettleMs = puppeteerSettleMs;
  }
  const settings = await updateRiaParserOptions(patch);
  res.json({ ok: true, settings });
}));

/* ───── articles (paginated) ───── */

router.get('/articles', requirePermissions('articles.view'), asyncHandler(async (req, res) => {
  const { page, limit, offset, search } = paginationParams(req.query as Record<string, unknown>);
  const source = optionalTextParam(req.query.source);
  const category = optionalTextParam(req.query.category);
  const db = getDb();

  let base = db('news_articles');
  if (search) {
    const escaped = escapeLike(search);
    base = base.where(function () {
      this.whereILike('title', `%${escaped}%`)
        .orWhereILike('summary', `%${escaped}%`)
        .orWhereILike('source', `%${escaped}%`)
        .orWhereILike('category', `%${escaped}%`);
    });
  }

  if (source) {
    const escapedSource = escapeLike(source);
    base = base.whereILike('source', `%${escapedSource}%`);
  }

  if (category) {
    const escapedCategory = escapeLike(category);
    base = base.whereILike('category', `%${escapedCategory}%`);
  }

  const [{ count }] = await base.clone().count('* as count');
  const rows = await base.clone()
    .select('id', 'title', 'summary', 'source', 'source_url', 'category', 'published_at', 'created_at')
    .orderBy([{ column: 'published_at', order: 'desc', nulls: 'last' }, { column: 'id', order: 'desc' }])
    .limit(limit)
    .offset(offset);

  res.json({ total: Number(count), page, limit, articles: rows });
}));

/* ───── companies: EdTech (edtechs.ru) ───── */

router.patch('/articles/:id', requirePermissions('articles.manage'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, 'category')) {
    res.status(400).json({ error: 'category is required' });
    return;
  }

  if (req.body?.category !== null && req.body?.category !== undefined && typeof req.body.category !== 'string') {
    res.status(400).json({ error: 'category must be a string or null' });
    return;
  }

  const categoryValue = normalizeNullableText(req.body?.category);

  if (categoryValue && categoryValue.length > 120) {
    res.status(400).json({ error: 'category is too long (max 120 chars)' });
    return;
  }

  const [article] = await getDb()('news_articles')
    .where({ id })
    .update({ category: categoryValue })
    .returning(['id', 'title', 'summary', 'source', 'source_url', 'category', 'published_at', 'created_at']);

  if (!article) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  res.json({ ok: true, article });
}));

router.get('/companies/edtech', requirePermissions('companies.view'), asyncHandler(async (req, res) => {
  const { page, limit, offset, search } = paginationParams(req.query as Record<string, unknown>);
  const db = getDb();

  let base = db('edtech_companies');
  if (search) {
    const escaped = escapeLike(search);
    base = base.where(function () {
      this.whereILike('company_name', `%${escaped}%`)
        .orWhereILike('segment', `%${escaped}%`)
        .orWhereILike('ceo', `%${escaped}%`);
    });
  }

  const [{ count }] = await base.clone().count('* as count');
  const rows = await base
    .clone()
    .select('id', 'position', 'company_name', 'company_url', 'ceo', 'segment',
      'revenue_2024_q2', 'revenue_2025_q3', 'dynamics', 'created_at')
    .orderBy('position', 'asc')
    .limit(limit)
    .offset(offset);

  res.json({ total: Number(count), page, limit, companies: rows });
}));

/* ───── companies: MedTech (Smart Ranking) ───── */

router.get('/companies', requirePermissions('companies.view'), asyncHandler(async (req, res) => {
  const { page, limit, offset, search } = paginationParams(req.query as Record<string, unknown>);
  const db = getDb();

  let base = db('smart_ranking_companies');
  if (search) {
    const escaped = escapeLike(search);
    base = base.where(function () {
      this.whereILike('company_name', `%${escaped}%`)
        .orWhereILike('segment', `%${escaped}%`)
        .orWhereILike('ceo', `%${escaped}%`);
    });
  }

  const [{ count }] = await base.clone().count('* as count');
  const rows = await base.clone()
    .select('id', 'position', 'company_name', 'company_url', 'ceo', 'segment',
      'revenue_2024_q2', 'revenue_2025_q3', 'dynamics', 'created_at')
    .orderBy('position', 'asc')
    .limit(limit)
    .offset(offset);

  res.json({ total: Number(count), page, limit, companies: rows });
}));

/* ───── tags management ───── */

router.get('/tags', requirePermissions('tags.view'), asyncHandler(async (_req, res) => {
  const tags = await getAllTags();
  res.json({ total: tags.length, tags });
}));

const VALID_MODES: TagMode[] = ['phrase', 'words', 'prefix', 'regex'];

router.post('/tags', requirePermissions('tags.manage'), asyncHandler(async (req, res) => {
  const { tag, tags, mode = 'phrase', exclude = false } = req.body;
  if (!VALID_MODES.includes(mode)) {
    res.status(400).json({ error: `mode must be one of: ${VALID_MODES.join(', ')}` });
    return;
  }
  if (tags && Array.isArray(tags)) {
    const count = await addManyTags(tags, mode);
    res.json({ ok: true, added: count });
    return;
  }
  if (!tag || typeof tag !== 'string' || !tag.trim()) {
    res.status(400).json({ error: 'tag is required (string)' });
    return;
  }
  const row = await addTag(tag, mode, !!exclude);
  res.json({ ok: true, tag: row });
}));

router.patch('/tags/:id', requirePermissions('tags.manage'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
  const { tag, mode, exclude } = req.body;
  if (mode !== undefined && !VALID_MODES.includes(mode)) {
    res.status(400).json({ error: `mode must be one of: ${VALID_MODES.join(', ')}` });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (tag !== undefined) updates.tag = tag;
  if (mode !== undefined) updates.mode = mode;
  if (exclude !== undefined) updates.exclude = !!exclude;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: 'Nothing to update' }); return; }
  const row = await updateTag(id, updates as { tag?: string; mode?: TagMode; exclude?: boolean });
  if (!row) { res.status(404).json({ error: 'Tag not found' }); return; }
  res.json({ ok: true, tag: row });
}));

router.delete('/tags', requirePermissions('tags.manage'), asyncHandler(async (_req, res) => {
  const deleted = await deleteAllTags();
  res.json({ ok: true, deleted });
}));

router.delete('/tags/:id', requirePermissions('tags.manage'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
  const ok = await deleteTag(id);
  if (!ok) { res.status(404).json({ error: 'Tag not found' }); return; }
  res.json({ ok: true, id });
}));

router.post('/tags/reset', requirePermissions('tags.manage'), asyncHandler(async (_req, res) => {
  const count = await resetToDefaults();
  res.json({ ok: true, count });
}));

/* ───── delete articles / companies ───── */

router.delete('/articles', requirePermissions('articles.delete'), asyncHandler(async (_req, res) => {
  const { rowCount } = await getDb()('news_articles').delete() as unknown as { rowCount: number };
  log.info({ deleted: rowCount }, 'All articles deleted');
  res.json({ ok: true, deleted: rowCount ?? 0 });
}));

router.delete('/articles/:id', requirePermissions('articles.delete'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
  const deleted = await getDb()('news_articles').where({ id }).delete();
  if (!deleted) { res.status(404).json({ error: 'Article not found' }); return; }
  res.json({ ok: true, id });
}));

router.delete('/companies/edtech', requirePermissions('companies.delete'), asyncHandler(async (_req, res) => {
  const { rowCount } = await getDb()('edtech_companies').delete() as unknown as { rowCount: number };
  log.info({ deleted: rowCount }, 'All edtech companies deleted');
  res.json({ ok: true, deleted: rowCount ?? 0 });
}));

router.delete('/companies/edtech/:id', requirePermissions('companies.delete'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
  const deleted = await getDb()('edtech_companies').where({ id }).delete();
  if (!deleted) { res.status(404).json({ error: 'Company not found' }); return; }
  res.json({ ok: true, id });
}));

router.delete('/companies', requirePermissions('companies.delete'), asyncHandler(async (_req, res) => {
  const { rowCount } = await getDb()('smart_ranking_companies').delete() as unknown as { rowCount: number };
  log.info({ deleted: rowCount }, 'All medtech companies deleted');
  res.json({ ok: true, deleted: rowCount ?? 0 });
}));

router.delete('/companies/:id', requirePermissions('companies.delete'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
  const deleted = await getDb()('smart_ranking_companies').where({ id }).delete();
  if (!deleted) { res.status(404).json({ error: 'Company not found' }); return; }
  res.json({ ok: true, id });
}));

/* ───── queues ───── */

router.get('/queues', requirePermissions('queues.view'), asyncHandler(async (_req, res) => {
  const [parse, adapt, store] = await Promise.all([
    getParseQueue().getJobCounts(),
    getAdaptQueue().getJobCounts(),
    getStoreQueue().getJobCounts(),
  ]);
  res.json({
    parse: { waiting: parse.waiting, active: parse.active, completed: parse.completed, failed: parse.failed },
    adapt: { waiting: adapt.waiting, active: adapt.active, completed: adapt.completed, failed: adapt.failed },
    store: { waiting: store.waiting, active: store.active, completed: store.completed, failed: store.failed },
  });
}));

router.get('/queues/failed', requirePermissions('queues.view'), asyncHandler(async (_req, res) => {
  const [parseFailed, adaptFailed, storeFailed] = await Promise.all([
    getParseQueue().getFailed(),
    getAdaptQueue().getFailed(),
    getStoreQueue().getFailed(),
  ]);

  const formatJob = (queue: string) => (job: { id?: string; name?: string; failedReason?: string; stacktrace?: string[] | string; data?: unknown; timestamp?: number }) => ({
    queue,
    id: job.id,
    name: job.name,
    failedReason: job.failedReason,
    stacktrace: (Array.isArray(job.stacktrace) ? job.stacktrace : []).slice(0, 5),
    data: job.data,
    timestamp: job.timestamp ? new Date(job.timestamp).toISOString() : undefined,
  });

  const all = [
    ...parseFailed.map(formatJob('parse')),
    ...adaptFailed.map(formatJob('adapt')),
    ...storeFailed.map(formatJob('store')),
  ].sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));

  res.json({ total: all.length, jobs: all.slice(0, 50) });
}));

export default router;
