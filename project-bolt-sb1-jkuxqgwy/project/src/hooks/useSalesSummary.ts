import { useCallback, useEffect, useState } from 'react';
import { fetchSalesSummary, type SalesSummary } from '@/lib/salesApi';

export type RangePreset = 'today' | 'week' | 'month';

export const RANGE_PRESETS: { value: RangePreset; label: string; days: number }[] = [
  { value: 'today', label: 'اليوم', days: 1 },
  { value: 'week', label: '7 أيام', days: 7 },
  { value: 'month', label: '30 يومًا', days: 30 },
];

export function getRangeBounds(preset: RangePreset): { from: Date; to: Date } {
  const days = RANGE_PRESETS.find((option) => option.value === preset)?.days ?? 1;
  const to = new Date();
  const from = new Date(to);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
}

export function useSalesSummary(preset: RangePreset, pin: string) {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = getRangeBounds(preset);
    setIsLoading(true);
    setError(null);

    fetchSalesSummary(pin, from, to)
      .then((result) => {
        if (!cancelled) setSummary(result);
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
  }, [preset, pin, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  return { summary, isLoading, error, retry };
}
