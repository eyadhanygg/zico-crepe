import { LoaderCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import CustomerFields from '@/components/pos/CustomerFields';
import OrderTypeSelector from '@/components/pos/OrderTypeSelector';
import { formatMoney } from '@/lib/format';
import type { CartLine, CustomerDraft, OrderType } from '@/types/pos';

interface CartPanelProps {
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  orderType: OrderType;
  customer: CustomerDraft;
  validationMessage: string | null;
  submitError: string | null;
  isSubmitting: boolean;
  onOrderTypeChange: (value: OrderType) => void;
  onCustomerChange: (patch: Partial<CustomerDraft>) => void;
  onQuantityChange: (itemId: string, delta: number) => void;
  onClear: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function CartPanel({
  lines,
  subtotal,
  deliveryFee,
  orderType,
  customer,
  validationMessage,
  submitError,
  isSubmitting,
  onOrderTypeChange,
  onCustomerChange,
  onQuantityChange,
  onClear,
  onSubmit,
  onClose,
}: CartPanelProps) {
  const total = subtotal + deliveryFee;
  const canSubmit = validationMessage === null && !isSubmitting;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-cream-50">الطلب الحالي</h2>
          <p className="text-xs text-cream-400">{lines.length} منتجات في السلة</p>
        </div>
        <div className="flex items-center gap-2">
          {lines.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-cream-400 transition hover:bg-surface-800 hover:text-error-400"
            >
              <Trash2 size={15} />
              <span>إفراغ</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-9 w-9 items-center justify-center rounded-full text-cream-200 transition hover:bg-surface-800 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
        <OrderTypeSelector value={orderType} onChange={onOrderTypeChange} />

        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-10 text-center">
            <ShoppingBag size={28} className="text-gold-400" />
            <p className="text-sm text-cream-400">اختر منتجات من القائمة لبدء الطلب</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {lines.map((line) => (
              <li
                key={line.item.id}
                className="flex items-center gap-3 rounded-2xl bg-surface-800/60 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-cream-50">{line.item.name_ar}</p>
                  <p className="text-sm text-gold-400">{formatMoney(line.item.price * line.quantity)}</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-surface-950 p-1">
                  <button
                    type="button"
                    aria-label={`تقليل ${line.item.name_ar}`}
                    onClick={() => onQuantityChange(line.item.id, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-cream-100 transition hover:bg-surface-700"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-6 text-center font-bold text-cream-50">{line.quantity}</span>
                  <button
                    type="button"
                    aria-label={`زيادة ${line.item.name_ar}`}
                    onClick={() => onQuantityChange(line.item.id, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-400 text-surface-950 transition hover:bg-gold-300"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <CustomerFields
          orderType={orderType}
          customer={customer}
          deliveryFee={deliveryFee}
          onChange={onCustomerChange}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-white/5 bg-surface-900 p-5">
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-cream-400">
            <span>المجموع الفرعي</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          {orderType === 'delivery' && (
            <div className="flex justify-between text-cream-400">
              <span>رسوم التوصيل</span>
              <span>{formatMoney(deliveryFee)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-cream-50">الإجمالي</span>
            <span className="text-xl font-bold text-gold-400">{formatMoney(total)}</span>
          </div>
        </div>

        {submitError && (
          <p role="alert" className="rounded-xl bg-error-500/10 px-4 py-2.5 text-sm text-error-400">
            {submitError}
          </p>
        )}
        {validationMessage && lines.length > 0 && (
          <p className="text-center text-xs text-cream-400">{validationMessage}</p>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-gold-400 to-gold-500 text-base font-bold text-surface-950 shadow-lg shadow-gold-500/20 transition duration-200 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle size={20} className="animate-spin" />
              <span>جارٍ حفظ الطلب...</span>
            </>
          ) : (
            <span>تأكيد الطلب</span>
          )}
        </button>
      </div>
    </div>
  );
}
