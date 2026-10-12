import { queryOptions } from '@tanstack/react-query';
import { getCreators } from './service';
import type { Creator, CreatorFilters } from './types';

export type { Creator };

export const creatorKeys = {
  all: ['creators'] as const,
  list: (filters: CreatorFilters) => [...creatorKeys.all, 'list', filters] as const,
  detail: (id: string) => [...creatorKeys.all, 'detail', id] as const
};

export const creatorsQueryOptions = (filters: CreatorFilters) =>
  queryOptions({
    queryKey: creatorKeys.list(filters),
    queryFn: () => getCreators(filters)
  });
