'use client';

import { useBrandStore } from '@/components/org-switcher';
import { getCreators } from '@/features/creators/api/service';
import type { Creator } from '@/features/creators/api/types';
import { RecentSales } from '@/features/overview/components/recent-sales';
import { useEffect, useMemo, useState } from 'react';
import { useStats } from '../stats-context';

type CreatorData = {
  name: string;
  handle: string;
  platform: string;
  avatar: string;
  fallback: string;
  roas: string;
};

export default function Sales() {
  const { data: statsData } = useStats();
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const [photoReadyCreators, setPhotoReadyCreators] = useState<Creator[]>([]);

  useEffect(() => {
    if (!activeBrandId) {
      setPhotoReadyCreators([]);
      return;
    }

    let cancelled = false;
    getCreators({
      brand_id: activeBrandId,
      discovered_via: 'discovered',
      page: 1,
      limit: 5
    })
      .then((response) => {
        if (!cancelled) setPhotoReadyCreators(response.creators || []);
      })
      .catch(() => {
        if (!cancelled) setPhotoReadyCreators([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeBrandId]);

  const creators: CreatorData[] = useMemo(() => {
    const spotlightCreators = photoReadyCreators.length > 0
      ? photoReadyCreators
      : (statsData?.top_creators || []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return spotlightCreators.map((c: any) => {
      const name = c.display_name || c.handle;
      return {
        name,
        handle: `@${c.handle}`,
        platform: c.platform === 'tiktok' ? 'TikTok' : 'Instagram',
        avatar: c.avatar_url || '',
        fallback: name.slice(0, 2).toUpperCase(),
        roas: c.roas ? `${Number(c.roas).toFixed(1)}x ROAS` : `Score ${c.score || 0}`
      };
    });
  }, [photoReadyCreators, statsData]);

  return <RecentSales creators={creators} />;
}
