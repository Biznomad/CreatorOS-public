import { queryOptions } from '@tanstack/react-query';
import { getOutreach } from './service';
import type { OutreachMessage, OutreachFilters } from './types';

export type { OutreachMessage };

export const outreachKeys = {
  all: ['outreach'] as const,
  list: (filters: OutreachFilters) => [...outreachKeys.all, 'list', filters] as const,
  detail: (id: number) => [...outreachKeys.all, 'detail', id] as const
};

export const outreachQueryOptions = (filters: OutreachFilters) =>
  queryOptions({
    queryKey: outreachKeys.list(filters),
    queryFn: () => getOutreach(filters)
  });
