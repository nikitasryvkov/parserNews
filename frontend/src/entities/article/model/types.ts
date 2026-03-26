export interface Article {
  id: number;
  title: string;
  source: string;
  source_url: string | null;
  category: string | null;
  summary: string | null;
  published_at: string | null;
  created_at: string;
}

export interface ArticlesResponse {
  total: number;
  page: number;
  limit: number;
  articles: Article[];
}
