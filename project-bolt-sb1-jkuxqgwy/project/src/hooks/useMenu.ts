import { useCallback, useEffect, useState } from 'react';
import { fetchMenu, type MenuData } from '@/lib/menuApi';

interface UseMenuOptions {
  includeInactive?: boolean;
}

export function useMenu({ includeInactive = false }: UseMenuOptions = {}) {
  const [data, setData] = useState<MenuData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchMenu({ includeInactive })
      .then((menu) => {
        if (!cancelled) setData(menu);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [includeInactive, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  return { data, isLoading, error, retry };
}
