'use client';

import { BarGraph } from '@/features/overview/components/bar-graph';
import { useEffect, useState } from 'react';
import { useBrandStore } from '@/components/org-switcher';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

const API_BASE = '/api/proxy';

type BarStatMonth = {
  month: string;
  whitelisted: number;
  brand: number;
};

export default function BarStats() {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const [data, setData] = useState<BarStatMonth[]>([]);

  useEffect(() => {
    if (!activeBrandId) {
      setData([]);
      return;
    }

    let cancelled = false;
    fetch(withLocalQaMarker(`${API_BASE}/api/campaigns/compare?brand_id=${encodeURIComponent(activeBrandId)}`))
      .then((r) => {
        if (!r.ok) throw new Error('Campaign comparison unavailable');
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setData(d?.months || []);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeBrandId]);

  return <BarGraph data={data} />;
}
