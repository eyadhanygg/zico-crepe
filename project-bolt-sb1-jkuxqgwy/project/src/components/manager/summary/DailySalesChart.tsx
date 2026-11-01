import { formatMoney } from '@/lib/format';
import type { SalesByDay } from '@/lib/salesApi';

interface DailySalesChartProps {
  days: SalesByDay[];
}

function formatDayLabel(day: string): string {
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

export default function DailySalesChart({ days }: DailySalesChartProps) {
  if (days.length === 0) {
    return <p className="py-10 text-center text-sm text-cream-400">لا توجد مبيعات في هذه الفترة</p>;
  }

  const maxSales = Math.max(...days.map((day) => day.sales));

  return (
    <div className="flex h-56 items-end gap-2 sm:gap-3">
      {days.map((day) => {
        const heightPercent = maxSales > 0 ? (day.sales / maxSales) * 100 : 0;
        return (
          <div key={day.day} className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
            <div className="relative flex flex-1 items-end">
              <div
                title={`${formatDayLabel(day.day)}: ${formatMoney(day.sales)} (${day.orderCount} طلب)`}
                style={{ height: `${Math.max(heightPercent, day.sales > 0 ? 4 : 0)}%` }}
                className="w-full rounded-t-xl bg-gradient-to-t from-gold-600 to-gold-300 transition-all duration-700 ease-out group-hover:brightness-110"
              />
            </div>
            <span className="truncate text-center text-[11px] text-cream-400">
              {formatDayLabel(day.day)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
