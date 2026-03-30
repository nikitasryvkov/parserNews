export const routePaths = {
  dashboard: '/',
  areasEdtech: '/areas/edtech',
  areasMedtech: '/areas/medtech',
  areasBiotech: '/areas/biotech',
  articles: '/articles',
  companies: '/companies',
  tags: '/tags',
  queues: '/queues',
  settings: '/settings',
  vpo: '/vpo',
  profile: '/profile',
  access: '/access',
} as const;

export type RoutePath = (typeof routePaths)[keyof typeof routePaths];
