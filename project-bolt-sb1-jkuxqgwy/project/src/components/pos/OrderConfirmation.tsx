import { useCallback, useState } from 'react';
import { CircleCheck, ChefHat, Download, LoaderCircle } from 'lucide-react';
import OrderPrintSheet from '@/components/print/OrderPrintSheet';
import { formatMoney } from '@/lib/format';
import { saveReceiptImage } from '@/lib/receiptImage';
import type { OrderReceipt } from '@/types/pos';

interface OrderConfirmationProps {
  order: OrderReceipt;
  onNewOrder: () => void;
}

export default function OrderConfirmation({ order, onNewOrder }: OrderConfirmationProps) {
  const [isKitchenPrinting, setIsKitchenPrinting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const closeKitchenPrint = useCallback(() => setIsKitchenPrinting(false), []);

  const handleSaveReceipt = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveReceiptImage(order);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'تعذر حفظ الفاتورة، حاول مرة أخرى');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-confirmation-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/80 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-sm animate-pop-in rounded-3xl border border-white/10 bg-surface-900 p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-500/15">
          <CircleCheck size={36} className="text-success-400" />
        </div>
        <h2 id="order-confirmation-title" className="mt-5 text-xl font-bold text-cream-50">
          تم حفظ الطلب
        </h2>
        <p className="mt-1 text-sm text-cream-400">رقم الطلب</p>
        <p className="font-display text-4xl font-bold text-gold-400">#{order.orderNumber}</p>

        <div className="mt-6 flex flex-col gap-2 rounded-2xl bg-surface-950 p-4 text-sm">
          <div className="flex justify-between text-cream-400">
            <span>المجموع الفرعي</span>
            <span>{formatMoney(order.subtotal)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-cream-400">
              <span>رسوم التوصيل</span>
              <span>{formatMoney(order.deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 font-bold text-cream-50">
            <span>الإجمالي</span>
            <span>{formatMoney(order.total)}</span>
          </div>
        </div>

        {order.lowStockItems.length > 0 && (
          <div
            role="status"
            className="mt-4 rounded-2xl border border-warning-500/30 bg-warning-500/10 p-4 text-start"
          >
            <p className="text-sm font-bold text-warning-400">تنبيه: هذه الخامات قاربت على النفاد</p>
            <p className="mt-1 text-sm text-cream-200">{order.lowStockItems.join('، ')}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleSaveReceipt}
            disabled={isSaving}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 text-sm font-bold text-cream-100 transition duration-200 hover:border-gold-400 hover:text-gold-400 active:scale-[0.99] disabled:opacity-60"
          >
            {isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{isSaving ? 'جارٍ الحفظ' : 'حفظ الفاتورة كصورة'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsKitchenPrinting(true)}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 text-sm font-bold text-cream-100 transition duration-200 hover:border-gold-400 hover:text-gold-400 active:scale-[0.99]"
          >
            <ChefHat size={16} />
            <span>تذكرة المطبخ</span>
          </button>
        </div>
        {saveError && <p className="mt-3 text-sm text-error-400">{saveError}</p>}

        <button
          type="button"
          onClick={onNewOrder}
          className="mt-3 h-12 w-full rounded-2xl bg-gold-400 font-bold text-surface-950 transition duration-200 hover:bg-gold-300 active:scale-[0.99]"
        >
          طلب جديد
        </button>
      </div>

      {isKitchenPrinting && <OrderPrintSheet receipt={order} onDone={closeKitchenPrint} />}
    </div>
  );
}
