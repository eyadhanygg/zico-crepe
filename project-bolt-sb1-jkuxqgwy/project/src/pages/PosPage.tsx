import { useState } from 'react';
import { LayoutDashboard, RefreshCw, ShoppingBag } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import CartPanel from '@/components/pos/CartPanel';
import MenuGrid from '@/components/pos/MenuGrid';
import OrderConfirmation from '@/components/pos/OrderConfirmation';
import { BRAND } from '@/config/brand';
import { calculateDeliveryFee, parseDistanceKm } from '@/lib/delivery';
import { createOrder } from '@/lib/menuApi';
import { formatMoney, roundMoney } from '@/lib/format';
import { useCart } from '@/hooks/useCart';
import { useMenu } from '@/hooks/useMenu';
import type {
  CartLine,
  CustomerDraft,
  MenuItem,
  OrderReceipt,
  OrderType,
  ReceiptLine,
} from '@/types/pos';

const EMPTY_CUSTOMER: CustomerDraft = { name: '', phone: '', address: '', distanceKm: '' };

function toReceiptLine(line: CartLine): ReceiptLine {
  return {
    name: line.item.name_ar,
    quantity: line.quantity,
    unitPrice: line.item.price,
    lineTotal: roundMoney(line.item.price * line.quantity),
  };
}

interface PosPageProps {
  onOpenManager: () => void;
}

function getValidationMessage(
  lineCount: number,
  orderType: OrderType,
  customer: CustomerDraft,
  distanceKm: number | null,
): string | null {
  if (lineCount === 0) return 'أضف منتجات للطلب';
  if (orderType === 'delivery' && customer.address.trim() === '') return 'أدخل عنوان التوصيل';
  if (orderType === 'delivery' && distanceKm === null) {
    return `أدخل المسافة بالكيلومتر (حتى ${BRAND.delivery.maxKm} كم)`;
  }
  return null;
}

export default function PosPage({ onOpenManager }: PosPageProps) {
  const menu = useMenu();
  const cart = useCart();
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [customer, setCustomer] = useState<CustomerDraft>(EMPTY_CUSTOMER);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<OrderReceipt | null>(null);

  const categories = menu.data?.categories ?? [];
  const activeCategoryId = selectedCategoryId ?? categories[0]?.id ?? null;

  const distanceKm = parseDistanceKm(customer.distanceKm);
  const deliveryFee =
    orderType === 'delivery' && distanceKm !== null ? calculateDeliveryFee(distanceKm) : 0;
  const validationMessage = getValidationMessage(
    cart.lines.length,
    orderType,
    customer,
    distanceKm,
  );

  const handleAddItem = (item: MenuItem) => {
    setSubmitError(null);
    cart.addItem(item);
  };

  const handleCustomerChange = (patch: Partial<CustomerDraft>) => {
    setCustomer((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async () => {
    if (validationMessage !== null || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const request = {
        orderType,
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
        deliveryAddress: orderType === 'delivery' ? customer.address.trim() : '',
        deliveryDistanceKm: orderType === 'delivery' ? distanceKm : null,
        deliveryFee,
        lines: cart.lines,
      };
      const order = await createOrder(request);
      const receipt: OrderReceipt = {
        ...order,
        orderType,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        deliveryAddress: request.deliveryAddress,
        deliveryDistanceKm: request.deliveryDistanceKm,
        lines: request.lines.map(toReceiptLine),
        createdAt: new Date(),
      };
      cart.clear();
      setCustomer(EMPTY_CUSTOMER);
      setIsCartOpen(false);
      setConfirmation(receipt);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'تعذر حفظ الطلب، حاول مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cartPanel = (
    <CartPanel
      lines={cart.lines}
      subtotal={cart.subtotal}
      deliveryFee={deliveryFee}
      orderType={orderType}
      customer={customer}
      validationMessage={validationMessage}
      submitError={submitError}
      isSubmitting={isSubmitting}
      onOrderTypeChange={setOrderType}
      onCustomerChange={handleCustomerChange}
      onQuantityChange={cart.changeQuantity}
      onClear={cart.clear}
      onSubmit={handleSubmit}
      onClose={() => setIsCartOpen(false)}
    />
  );

  return (
    <div className="min-h-dvh bg-surface-950 font-sans text-cream-50">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-surface-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight text-cream-50">{BRAND.nameAr}</h1>
              <p className="truncate text-xs text-cream-400">{BRAND.tagline}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenManager}
            className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-cream-200 transition hover:border-gold-400 hover:text-gold-400"
          >
            <LayoutDashboard size={16} />
            <span>لوحة المدير</span>
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 pb-32 pt-6 lg:grid-cols-[1fr_400px] lg:pb-10">
        <section className="min-w-0">
          {menu.isLoading ? (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="aspect-[4/5] animate-pulse rounded-3xl bg-surface-900" />
              ))}
            </div>
          ) : menu.error ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/5 bg-surface-900 py-16 text-center">
              <p className="px-6 text-cream-200">{menu.error}</p>
              <button
                type="button"
                onClick={menu.retry}
                className="flex items-center gap-2 rounded-full bg-gold-400 px-5 py-2.5 text-sm font-bold text-surface-950 transition hover:bg-gold-300"
              >
                <RefreshCw size={16} />
                <span>إعادة المحاولة</span>
              </button>
            </div>
          ) : menu.data && menu.data.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-cream-400">
              <ShoppingBag size={32} />
              <p>القائمة فارغة حاليًا</p>
            </div>
          ) : menu.data ? (
            <MenuGrid
              categories={categories}
              items={menu.data.items}
              activeCategoryId={activeCategoryId}
              quantities={cart.quantities}
              onSelectCategory={setSelectedCategoryId}
              onAddItem={handleAddItem}
            />
          ) : null}
        </section>

        {isCartOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in lg:hidden"
            onClick={() => setIsCartOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          className={`fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-surface-900 shadow-2xl transition-transform duration-300 ease-out lg:sticky lg:top-24 lg:z-auto lg:h-[calc(100dvh-7rem)] lg:translate-y-0 lg:self-start lg:rounded-3xl lg:border lg:shadow-black/40 ${
            isCartOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {cartPanel}
        </aside>
      </main>

      {!isCartOpen && cart.lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-4 lg:hidden">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex h-16 w-full animate-pop-in items-center justify-between rounded-2xl bg-gold-400 px-5 text-surface-950 shadow-2xl shadow-black/40 transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-surface-950 px-2 text-sm font-bold text-gold-400">
                {cart.itemCount}
              </span>
              <span className="font-bold">عرض الطلب</span>
            </span>
            <span className="font-bold">{formatMoney(cart.subtotal + deliveryFee)}</span>
          </button>
        </div>
      )}

      {confirmation && (
        <OrderConfirmation order={confirmation} onNewOrder={() => setConfirmation(null)} />
      )}
    </div>
  );
}
