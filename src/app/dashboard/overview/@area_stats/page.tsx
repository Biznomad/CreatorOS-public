'use client';

import { AreaGraph } from '@/features/overview/components/area-graph';
import { useMemo } from 'react';
import { useStats } from '../stats-context';

export default function AreaStats() {
  const { data: statsData } = useStats();

  const data = useMemo(() => {
    if (!statsData) return [];
    if (statsData.pipeline?.monthly_growth?.length) {
      return statsData.pipeline.monthly_growth;
    }
    if (statsData.pipeline?.total) {
      return [{ month: 'Current', creators: statsData.pipeline.total }];
    }
    return [];
  }, [statsData]);

  return <AreaGraph data={data} />;
}
