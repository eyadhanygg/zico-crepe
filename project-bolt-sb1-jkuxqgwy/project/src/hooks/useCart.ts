import { useCallback, useMemo, useState } from 'react';
import { roundMoney } from '@/lib/format';
import type { CartLine, MenuItem } from '@/types/pos';

const MAX_QUANTITY = 99;

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addItem = useCallback((item: MenuItem) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.item.id === item.id);
      if (!existing) return [...prev, { item, quantity: 1 }];
      return prev.map((line) =>
        line.item.id === item.id
          ? { ...line, quantity: Math.min(line.quantity + 1, MAX_QUANTITY) }
          : line,
      );
    });
  }, []);

  const changeQuantity = useCallback((itemId: string, delta: number) => {
    setLines((prev) =>
      prev.flatMap((line) => {
        if (line.item.id !== itemId) return [line];
        const next = line.quantity + delta;
        if (next < 1) return [];
        return [{ ...line, quantity: Math.min(next, MAX_QUANTITY) }];
      }),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const subtotal = useMemo(
    () => roundMoney(lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)),
    [lines],
  );

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );

  const quantities = useMemo(
    () => Object.fromEntries(lines.map((line) => [line.item.id, line.quantity])),
    [lines],
  );

  return { lines, addItem, changeQuantity, clear, subtotal, itemCount, quantities };
}
