export const PRESET_ARTICLE_CATEGORIES = ['EdTech', 'MedTech', 'BioTech', 'Законодательство'] as const;

export function isPresetArticleCategory(value: string): boolean {
  return PRESET_ARTICLE_CATEGORIES.includes(value as (typeof PRESET_ARTICLE_CATEGORIES)[number]);
}
