import { Pencil, SlidersHorizontal } from 'lucide-react';
import { formatQuantity } from '@/lib/format';
import type { InventoryItem } from '@/lib/managerInventoryApi';

export type StockStatus = 'ok' | 'low' | 'negative';

export function getStockStatus(item: InventoryItem): StockStatus {
  if (item.stock_quantity < 0) return 'negative';
  if (item.stock_quantity <= item.low_stock_threshold) return 'low';
  return 'ok';
}

const STATUS_STYLES: Record<StockStatus, { label: string; className: string }> = {
  ok: { label: 'متوفر', className: 'bg-success-500/15 text-success-400' },
  low: { label: 'قارب على النفاد', className: 'bg-warning-500/15 text-warning-400' },
  negative: { label: 'رصيد سالب', className: 'bg-error-500/15 text-error-400' },
};

interface InventoryItemRowProps {
  item: InventoryItem;
  onAdjust: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
}

export default function InventoryItemRow({ item, onAdjust, onEdit }: InventoryItemRowProps) {
  const status = STATUS_STYLES[getStockStatus(item)];
  const isNegative = item.stock_quantity < 0;

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-surface-900 p-4 transition duration-300 hover:border-gold-500/30 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-cream-50">{item.name_ar}</p>
        <p className="mt-0.5 text-xs text-cream-400">
          {item.category} - حد التنبيه {formatQuantity(item.low_stock_threshold)} {item.unit}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="flex flex-col items-end gap-1.5">
          <p className={`font-bold ${isNegative ? 'text-error-400' : 'text-cream-50'}`}>
            <span className="text-lg">{formatQuantity(item.stock_quantity)}</span>{' '}
            <span className="text-sm font-medium text-cream-400">{item.unit}</span>
          </p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAdjust(item)}
            aria-label={`تعديل كمية ${item.name_ar}`}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-cream-200 transition hover:border-gold-400 hover:text-gold-400"
          >
            <SlidersHorizontal size={16} />
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            aria-label={`تعديل ${item.name_ar}`}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-cream-200 transition hover:border-gold-400 hover:text-gold-400"
          >
            <Pencil size={16} />
          </button>
        </div>
      </div>
    </li>
  );
}
