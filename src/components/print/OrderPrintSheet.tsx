import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import KitchenTicketPrint from '@/components/print/KitchenTicketPrint';
import type { OrderReceipt } from '@/types/pos';

interface OrderPrintSheetProps {
  receipt: OrderReceipt;
  onDone: () => void;
}

export default function OrderPrintSheet({ receipt, onDone }: OrderPrintSheetProps) {
  const hasPrinted = useRef(false);

  useEffect(() => {
    window.addEventListener('afterprint', onDone);
    if (!hasPrinted.current) {
      hasPrinted.current = true;
      window.print();
    }
    return () => window.removeEventListener('afterprint', onDone);
  }, [onDone]);

  return createPortal(
    <div id="print-area" className="hidden print:block">
      <KitchenTicketPrint receipt={receipt} />
    </div>,
    document.body,
  );
}
