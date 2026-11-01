import { BRAND } from '@/config/brand';
import { callManagerRpc } from '@/lib/managerRpc';
import type { OrderType } from '@/types/pos';

export interface SalesByType {
  orderType: OrderType;
  orderCount: number;
  sales: number;
}

export interface SalesByDay {
  day: string;
  orderCount: number;
  sales: number;
}

export interface TopItem {
  name: string;
  quantity: number;
  sales: number;
}

export interface SalesSummary {
  orderCount: number;
  grossSales: number;
  itemSales: number;
  deliveryFees: number;
  averageTicket: number;
  byType: SalesByType[];
  byDay: SalesByDay[];
  topItems: TopItem[];
}

export async function fetchSalesSummary(pin: string, from: Date, to: Date): Promise<SalesSummary> {
  const result = await callManagerRpc('manager_sales_summary', {
    p_pin: pin,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_timezone: BRAND.timezone,
  });

  const row = result.data as Record<string, unknown> | undefined;
  if (!row || typeof row.order_count !== 'number' || !Array.isArray(row.by_type)) {
    throw new Error('استجابة غير متوقعة من الخادم');
  }

  return {
    orderCount: Number(row.order_count),
    grossSales: Number(row.gross_sales),
    itemSales: Number(row.item_sales),
    deliveryFees: Number(row.delivery_fees),
    averageTicket: Number(row.average_ticket),
    byType: (row.by_type as Record<string, unknown>[]).map((entry) => ({
      orderType: String(entry.order_type) as OrderType,
      orderCount: Number(entry.order_count),
      sales: Number(entry.sales),
    })),
    byDay: (row.by_day as Record<string, unknown>[]).map((entry) => ({
      day: String(entry.day),
      orderCount: Number(entry.order_count),
      sales: Number(entry.sales),
    })),
    topItems: (row.top_items as Record<string, unknown>[]).map((entry) => ({
      name: String(entry.name),
      quantity: Number(entry.quantity),
      sales: Number(entry.sales),
    })),
  };
}
