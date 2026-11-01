import { useId, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { INVENTORY_CATEGORY_SUGGESTIONS, INVENTORY_UNIT_SUGGESTIONS } from '@/config/inventory';
import { parseQuantityInput } from '@/lib/format';
import {
  deleteInventoryItem,
  saveInventoryItem,
  type InventoryItem,
} from '@/lib/managerInventoryApi';

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-surface-950 px-4 py-3 text-cream-50 placeholder:text-cream-400/60 outline-none transition duration-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30';

const labelClass = 'mb-1.5 block text-sm font-medium text-cream-200';

interface InventoryItemFormModalProps {
  pin: string;
  item: InventoryItem | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function InventoryItemFormModal({
  pin,
  item,
  onSaved,
  onClose,
}: InventoryItemFormModalProps) {
  const datalistId = useId();
  const [name, setName] = useState(item?.name_ar ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [threshold, setThreshold] = useState(item ? String(item.low_stock_threshold) : '');
  const [initialStock, setInitialStock] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedUnit = unit.trim();
    const parsedThreshold = parseQuantityInput(threshold);
    const parsedInitialStock = item ? 0 : parseQuantityInput(initialStock);

    if (!trimmedName) return setError('أدخل اسم الخامة');
    if (!trimmedCategory) return setError('أدخل تصنيف الخامة');
    if (!trimmedUnit) return setError('أدخل وحدة القياس');
    if (parsedThreshold === null) return setError('أدخل حد التنبيه بالأرقام');
    if (parsedInitialStock === null) return setError('أدخل الكمية الحالية بالأرقام');

    setIsBusy(true);
    setError(null);
    try {
      await saveInventoryItem(
        pin,
        {
          name_ar: trimmedName,
          category: trimmedCategory,
          unit: trimmedUnit,
          low_stock_threshold: parsedThreshold,
          initial_stock: parsedInitialStock,
        },
        item?.id ?? null,
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الخامة');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setIsBusy(true);
    setError(null);
    try {
      await deleteInventoryItem(pin, item.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حذف الخامة');
      setConfirmingDelete(false);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Modal
      title={item ? 'تعديل الخامة' : 'خامة جديدة'}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="rounded-xl bg-error-500/10 px-4 py-2.5 text-sm text-error-400">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            {item &&
              (confirmingDelete ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isBusy}
                  className="h-12 flex-1 rounded-2xl bg-error-500 font-bold text-cream-50 transition hover:bg-error-400 disabled:opacity-50"
                >
                  تأكيد الحذف
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={isBusy}
                  aria-label="حذف الخامة"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-error-500/40 text-error-400 transition hover:bg-error-500/10 disabled:opacity-50"
                >
                  <Trash2 size={18} />
                </button>
              ))}
            <button
              type="button"
              onClick={handleSave}
              disabled={isBusy}
              className="h-12 flex-1 rounded-2xl bg-gold-400 font-bold text-surface-950 transition duration-200 hover:bg-gold-300 disabled:opacity-50"
            >
              {isBusy ? 'جارٍ الحفظ...' : 'حفظ الخامة'}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <label className="block">
          <span className={labelClass}>اسم الخامة</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="مثال: نوتيلا"
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelClass}>التصنيف</span>
            <input
              type="text"
              list={`${datalistId}-categories`}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              maxLength={40}
              placeholder="ألبان"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>وحدة القياس</span>
            <input
              type="text"
              list={`${datalistId}-units`}
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              maxLength={20}
              placeholder="كجم"
              className={inputClass}
            />
          </label>
        </div>

        <datalist id={`${datalistId}-categories`}>
          {INVENTORY_CATEGORY_SUGGESTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <datalist id={`${datalistId}-units`}>
          {INVENTORY_UNIT_SUGGESTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>

        <div className={`grid gap-4 ${item ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <label className="block">
            <span className={labelClass}>حد التنبيه (تنبيه عند الوصول لهذه الكمية)</span>
            <input
              type="text"
              dir="ltr"
              inputMode="decimal"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              placeholder="0"
              className={`${inputClass} text-start`}
            />
          </label>
          {!item && (
            <label className="block">
              <span className={labelClass}>الكمية الحالية</span>
              <input
                type="text"
                dir="ltr"
                inputMode="decimal"
                value={initialStock}
                onChange={(event) => setInitialStock(event.target.value)}
                placeholder="0"
                className={`${inputClass} text-start`}
              />
            </label>
          )}
        </div>
        {item && (
          <p className="text-xs text-cream-400">
            لتعديل الكمية الحالية استخدم زر تعديل الكمية من القائمة، حتى يتم تسجيل كل حركة.
          </p>
        )}
      </div>
    </Modal>
  );
}
