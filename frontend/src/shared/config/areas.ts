export type AreaId = 'edtech' | 'medtech' | 'biotech';

export interface AreaOption {
  id: AreaId;
  label: string;
  title: string;
  description: string;
  path: string;
}

export const AREA_OPTIONS: AreaOption[] = [
  {
    id: 'edtech',
    label: 'EdTech',
    title: 'Область EdTech',
    description: 'Здесь будет размещён дашборд по направлению EdTech: ключевые метрики, источники и динамика контента.',
    path: '/areas/edtech',
  },
  {
    id: 'medtech',
    label: 'MedTech',
    title: 'Область MedTech',
    description: 'Здесь будет размещён дашборд по направлению MedTech: мониторинг отрасли, компании и аналитические сводки.',
    path: '/areas/medtech',
  },
  {
    id: 'biotech',
    label: 'BioTech',
    title: 'Область BioTech',
    description: 'Здесь будет размещён дашборд по направлению BioTech: исследования, новости и отраслевые показатели.',
    path: '/areas/biotech',
  },
];

export function findAreaByPath(pathname: string): AreaOption | null {
  return AREA_OPTIONS.find((area) => area.path === pathname) ?? null;
}
