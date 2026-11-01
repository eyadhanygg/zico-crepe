export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: 'داخل المطعم',
  takeaway: 'سفري',
  delivery: 'توصيل',
};

export interface MenuCategory {
  id: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name_ar: string;
  description_ar: string;
  price: number;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CartLine {
  item: MenuItem;
  quantity: number;
}

export interface CustomerDraft {
  name: string;
  phone: string;
  address: string;
  distanceKm: string;
}

export interface CustomerSuggestion {
  name: string;
  phone: string;
  address: string | null;
}

export interface CreatedOrder {
  orderId: string;
  orderNumber: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  lowStockItems: string[];
}

export interface ReceiptLine {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderReceipt extends CreatedOrder {
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryDistanceKm: number | null;
  lines: ReceiptLine[];
  createdAt: Date;
}
