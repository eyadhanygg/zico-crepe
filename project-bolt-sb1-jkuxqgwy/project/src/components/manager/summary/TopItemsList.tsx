import { formatMoney } from '@/lib/format';
import type { TopItem } from '@/lib/salesApi';

interface TopItemsListProps {
  items: TopItem[];
}

export default function TopItemsList({ items }: TopItemsListProps) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-cream-400">لا توجد مبيعات للمنتجات بعد</p>;
  }

  return (
    <ol className="flex flex-col divide-y divide-white/5">
      {items.map((item, index) => (
        <li key={item.name} className="flex items-center gap-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-800 text-sm font-bold text-gold-400">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-cream-50">{item.name}</p>
            <p className="text-xs text-cream-400">{item.quantity} قطعة مباعة</p>
          </div>
          <span className="shrink-0 font-bold text-gold-400">{formatMoney(item.sales)}</span>
        </li>
      ))}
    </ol>
  );
}
