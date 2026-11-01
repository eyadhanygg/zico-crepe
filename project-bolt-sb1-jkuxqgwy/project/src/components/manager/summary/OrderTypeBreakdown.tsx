import { ORDER_TYPE_LABELS } from '@/types/pos';
import { formatMoney } from '@/lib/format';
import type { SalesByType } from '@/lib/salesApi';

interface OrderTypeBreakdownProps {
  entries: SalesByType[];
  grossSales: number;
}

export default function OrderTypeBreakdown({ entries, grossSales }: OrderTypeBreakdownProps) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-cream-400">لا توجد طلبات بعد</p>;
  }

  return (
    <ul className="flex flex-col gap-5">
      {entries.map((entry) => {
        const share = grossSales > 0 ? (entry.sales / grossSales) * 100 : 0;
        return (
          <li key={entry.orderType} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-cream-100">{ORDER_TYPE_LABELS[entry.orderType]}</span>
              <span className="text-cream-400">
                {entry.orderCount} طلب - {formatMoney(entry.sales)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-800">
              <div
                style={{ width: `${share}%` }}
                className="h-full rounded-full bg-gradient-to-l from-gold-400 to-gold-600 transition-all duration-700 ease-out"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
