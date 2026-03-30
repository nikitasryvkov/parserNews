import type { Logger } from 'pino';
import type { ArticlesRepository } from './repository.js';
import type { ListArticlesQuery, ListArticlesResult, UpdateArticleCategoryInput, ArticleRecord } from './types.js';

export interface ArticlesService {
  list(query: ListArticlesQuery): Promise<ListArticlesResult>;
  updateCategory(input: UpdateArticleCategoryInput): Promise<ArticleRecord | null>;
  deleteById(id: number): Promise<boolean>;
  deleteAll(): Promise<number>;
}

export interface ArticlesServiceDependencies {
  repository: ArticlesRepository;
  logger?: Pick<Logger, 'info'>;
}

export function createArticlesService({ repository, logger }: ArticlesServiceDependencies): ArticlesService {
  return {
    list(query) {
      return repository.list(query);
    },

    updateCategory(input) {
      return repository.updateCategory(input.id, input.category);
    },

    async deleteById(id) {
      const deleted = await repository.deleteById(id);
      return deleted > 0;
    },

    async deleteAll() {
      const deleted = await repository.deleteAll();
      logger?.info?.({ deleted }, 'All articles deleted');
      return deleted;
    },
  };
}
