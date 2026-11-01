import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { formatQuantity, parseQuantityInput } from '@/lib/format';
import { adjustInventoryStock, type InventoryItem } from '@/lib/managerInventoryApi';

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-surface-950 px-4 py-3 text-cream-50 placeholder:text-cream-400/60 outline-none transition duration-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30';

const labelClass = 'mb-1.5 block text-sm font-medium text-cream-200';

type Direction = 'add' | 'remove';

interface StockAdjustModalProps {
  pin: string;
  item: InventoryItem;
  onSaved: () => void;
  onClose: () => void;
}

export default function StockAdjustModal({ pin, item, onSaved, onClose }: StockAdjustModalProps) {
  const [direction, setDirection] = useState<Direction>('add');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const amount = parseQuantityInput(amountText);
  const change = amount === null ? null : direction === 'add' ? amount : -amount;
  const stockAfter = change === null ? null : item.stock_quantity + change;

  const handleSave = async () => {
    if (amount === null || amount === 0 || change === null) {
      setError('أدخل كمية أكبر من صفر');
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      await adjustInventoryStock(pin, item.id, change, note.trim());
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تعديل الكمية');
    } finally {
      setIsBusy(false);
    }
  };

  const directionButtonClass = (value: Direction) =>
    `h-11 flex-1 rounded-xl text-sm font-bold transition duration-200 ${
      direction === value
        ? value === 'add'
          ? 'bg-success-500 text-surface-950'
          : 'bg-error-500 text-cream-50'
        : 'text-cream-400 hover:text-cream-100'
    }`;

  return (
    <Modal
      title={`تعديل الكمية - ${item.name_ar}`}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="rounded-xl bg-error-500/10 px-4 py-2.5 text-sm text-error-400">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isBusy}
            className="h-12 w-full rounded-2xl bg-gold-400 font-bold text-surface-950 transition duration-200 hover:bg-gold-300 disabled:opacity-50"
          >
            {isBusy ? 'جارٍ الحفظ...' : 'تسجيل الحركة'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex gap-1 rounded-2xl bg-surface-950 p-1">
          <button
            type="button"
            aria-pressed={direction === 'add'}
            onClick={() => setDirection('add')}
            className={directionButtonClass('add')}
          >
            إضافة للمخزون
          </button>
          <button
            type="button"
            aria-pressed={direction === 'remove'}
            onClick={() => setDirection('remove')}
            className={directionButtonClass('remove')}
          >
            سحب من المخزون
          </button>
        </div>

        <label className="block">
          <span className={labelClass}>الكمية ({item.unit})</span>
          <input
            type="text"
            dir="ltr"
            inputMode="decimal"
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
            placeholder="0"
            className={`${inputClass} text-start`}
          />
        </label>

        <div className="rounded-2xl bg-surface-950 p-4 text-sm">
          <div className="flex justify-between text-cream-400">
            <span>الرصيد الحالي</span>
            <span>
              {formatQuantity(item.stock_quantity)} {item.unit}
            </span>
          </div>
          <div className="mt-2 flex justify-between font-bold text-cream-50">
            <span>الرصيد بعد الحركة</span>
            <span className={stockAfter !== null && stockAfter < 0 ? 'text-error-400' : ''}>
              {stockAfter === null ? '-' : `${formatQuantity(stockAfter)} ${item.unit}`}
            </span>
          </div>
        </div>

        <label className="block">
          <span className={labelClass}>سبب الحركة (اختياري)</span>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
            placeholder="مثال: جرد، تلف، توريد جديد"
            className={inputClass}
          />
        </label>
      </div>
    </Modal>
  );
}
