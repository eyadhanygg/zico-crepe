import { formatDateTime } from '@/lib/dateTime';
import { ORDER_TYPE_LABELS, type OrderReceipt } from '@/types/pos';

interface KitchenTicketPrintProps {
  receipt: OrderReceipt;
}

export default function KitchenTicketPrint({ receipt }: KitchenTicketPrintProps) {
  const showCustomer = receipt.orderType !== 'dine_in' && receipt.customerName !== '';

  return (
    <div dir="rtl" className="w-[72mm] font-sans text-black">
      <div className="text-center">
        <p className="text-base font-bold">تذكرة مطبخ</p>
        <p className="text-4xl font-bold leading-tight">#{receipt.orderNumber}</p>
        <p className="mt-1 text-sm font-bold">{ORDER_TYPE_LABELS[receipt.orderType]}</p>
        <p className="text-xs">{formatDateTime(receipt.createdAt)}</p>
      </div>

      {showCustomer && (
        <p className="mt-2 text-center text-base font-bold">العميل: {receipt.customerName}</p>
      )}

      <div className="my-2 border-t-2 border-dashed border-black" />

      <ul className="space-y-2">
        {receipt.lines.map((line) => (
          <li key={line.name} className="text-xl font-bold leading-snug">
            <span className="tabular-nums">{line.quantity}</span> × {line.name}
          </li>
        ))}
      </ul>

      <div className="mt-3 border-t-2 border-dashed border-black" />
    </div>
  );
}
