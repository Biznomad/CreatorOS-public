'use client';

import { PieGraph } from '@/features/overview/components/pie-graph';
import { useMemo } from 'react';
import { useStats } from '../stats-context';

export default function PieStats() {
  const { data: statsData } = useStats();

  const data = useMemo(() => {
    if (!statsData) return [];
    const byStatus = statsData.pipeline?.by_status || {};
    const statuses = ['discovered', 'contacted', 'replied', 'negotiating', 'onboarded', 'active'];
    return statuses
      .map((status) => ({
        status,
        count: byStatus[status] || 0,
        fill: `var(--color-${status})`
      }))
      .filter((s) => s.count > 0);
  }, [statsData]);

  return <PieGraph data={data} />;
}
