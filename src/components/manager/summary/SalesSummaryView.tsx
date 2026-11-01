import { useState } from 'react';
import { ReceiptText, RefreshCw, Truck, TrendingUp, Wallet } from 'lucide-react';
import DailySalesChart from '@/components/manager/summary/DailySalesChart';
import OrderTypeBreakdown from '@/components/manager/summary/OrderTypeBreakdown';
import StatCard from '@/components/manager/summary/StatCard';
import TopItemsList from '@/components/manager/summary/TopItemsList';
import { formatMoney } from '@/lib/format';
import { RANGE_PRESETS, useSalesSummary, type RangePreset } from '@/hooks/useSalesSummary';
import type { SalesSummary } from '@/lib/salesApi';

const panelClass = 'rounded-3xl border border-white/5 bg-surface-900 p-5 shadow-lg shadow-black/20 sm:p-6';

function SummaryContent({ summary }: { summary: SalesSummary }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="إجمالي المبيعات"
          value={formatMoney(summary.grossSales)}
          hint="شامل رسوم التوصيل"
          icon={Wallet}
        />
        <StatCard
          label="عدد الطلبات"
          value={String(summary.orderCount)}
          hint="طلبات مكتملة في الفترة"
          icon={ReceiptText}
        />
        <StatCard
          label="متوسط الفاتورة"
          value={formatMoney(summary.averageTicket)}
          hint="متوسط قيمة الطلب الواحد"
          icon={TrendingUp}
        />
        <StatCard
          label="رسوم التوصيل"
          value={formatMoney(summary.deliveryFees)}
          hint="إجمالي رسوم الطلبات الخارجية"
          icon={Truck}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className={panelClass}>
          <h2 className="mb-5 text-lg font-bold text-cream-50">الأداء اليومي</h2>
          <DailySalesChart days={summary.byDay} />
        </section>
        <section className={panelClass}>
          <h2 className="mb-5 text-lg font-bold text-cream-50">حسب نوع الطلب</h2>
          <OrderTypeBreakdown entries={summary.byType} grossSales={summary.grossSales} />
        </section>
      </div>

      <section className={panelClass}>
        <h2 className="mb-2 text-lg font-bold text-cream-50">أكثر المنتجات مبيعًا</h2>
        <TopItemsList items={summary.topItems} />
      </section>
    </>
  );
}

export default function SalesSummaryView({ pin }: { pin: string }) {
  const [preset, setPreset] = useState<RangePreset>('today');
  const { summary, isLoading, error, retry } = useSalesSummary(preset, pin);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        {RANGE_PRESETS.map((option) => {
          const isActive = option.value === preset;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => setPreset(option.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition duration-200 ${
                isActive
                  ? 'border-gold-400 bg-gold-400 text-surface-950'
                  : 'border-white/10 bg-surface-900 text-cream-200 hover:border-gold-500/40'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/5 bg-surface-900 py-16 text-center">
          <p className="px-6 text-cream-200">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-2 rounded-full bg-gold-400 px-5 py-2.5 text-sm font-bold text-surface-950 transition hover:bg-gold-300"
          >
            <RefreshCw size={16} />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      ) : isLoading && !summary ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-3xl bg-surface-900" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-3xl bg-surface-900" />
        </div>
      ) : summary ? (
        <div className={`flex flex-col gap-6 transition-opacity duration-300 ${isLoading ? 'opacity-60' : ''}`}>
          <SummaryContent summary={summary} />
        </div>
      ) : null}
    </div>
  );
}
