'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useBrandStore } from '@/components/org-switcher';
import { withLocalQaMarker } from '@/lib/whitelabel-api';

const API_BASE = '/api/proxy';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StatsData = Record<string, any> | null;

type StatsContextValue = {
  data: StatsData;
  loading: boolean;
};

const StatsContext = createContext<StatsContextValue>({
  data: null,
  loading: true
});

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const [data, setData] = useState<StatsData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBrandId) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(withLocalQaMarker(`${API_BASE}/api/stats/${encodeURIComponent(activeBrandId)}`))
      .then((r) => {
        if (!r.ok) throw new Error('Overview stats unavailable');
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeBrandId]);

  return (
    <StatsContext.Provider value={{ data, loading }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  return useContext(StatsContext);
}
