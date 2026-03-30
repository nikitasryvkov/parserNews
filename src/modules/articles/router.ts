import { Router } from 'express';
import { asyncHandler } from '../../api/asyncHandler.js';
import { requirePermissions } from '../../api/auth.js';
import type { ArticlesService } from './service.js';
import { parseArticleId, parseArticlesListQuery, parseUpdateArticleCategoryInput } from './validation.js';

export interface ArticlesRouterDependencies {
  service: ArticlesService;
}

export function createArticlesRouter({ service }: ArticlesRouterDependencies): Router {
  const router = Router();

  router.get('/articles', requirePermissions('articles.view'), asyncHandler(async (req, res) => {
    const query = parseArticlesListQuery(req.query as Record<string, unknown>);
    const result = await service.list(query);
    res.json(result);
  }));

  router.patch('/articles/:id', requirePermissions('articles.manage'), asyncHandler(async (req, res) => {
    const parsedInput = parseUpdateArticleCategoryInput(req.params.id, req.body);

    if (!parsedInput.ok) {
      res.status(400).json({ error: parsedInput.error });
      return;
    }

    const article = await service.updateCategory(parsedInput.value);

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.json({ ok: true, article });
  }));

  router.delete('/articles', requirePermissions('articles.delete'), asyncHandler(async (_req, res) => {
    const deleted = await service.deleteAll();
    res.json({ ok: true, deleted });
  }));

  router.delete('/articles/:id', requirePermissions('articles.delete'), asyncHandler(async (req, res) => {
    const id = parseArticleId(req.params.id);

    if (!id.ok) {
      res.status(400).json({ error: id.error });
      return;
    }

    const deleted = await service.deleteById(id.value);

    if (!deleted) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.json({ ok: true, id: id.value });
  }));

  return router;
}
