export interface ArticleRecord {
  id: number;
  title: string;
  summary: string | null;
  source: string;
  source_url: string | null;
  category: string | null;
  published_at: string | null;
  created_at: string;
}

export interface ArticleFilterOptions {
  sources: string[];
  categories: string[];
}

export interface ListArticlesQuery {
  page: number;
  limit: number;
  offset: number;
  search: string;
  source: string;
  category: string;
}

export interface ListArticlesResult {
  total: number;
  page: number;
  limit: number;
  articles: ArticleRecord[];
  filterOptions: ArticleFilterOptions;
}

export interface UpdateArticleCategoryInput {
  id: number;
  category: string | null;
}
