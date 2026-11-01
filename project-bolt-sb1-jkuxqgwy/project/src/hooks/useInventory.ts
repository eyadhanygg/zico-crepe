import { useCallback, useEffect, useState } from 'react';
import { fetchInventory, type InventoryItem } from '@/lib/managerInventoryApi';

export function useInventory(pin: string) {
  const [data, setData] = useState<InventoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchInventory(pin)
      .then((items) => {
        if (!cancelled) setData(items);
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
  }, [pin, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  return { data, isLoading, error, retry };
}
