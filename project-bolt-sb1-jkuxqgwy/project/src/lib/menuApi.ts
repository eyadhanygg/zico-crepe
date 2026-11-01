import { supabase } from '@/lib/supabase';
import type { CartLine, CreatedOrder, MenuCategory, MenuItem, OrderType } from '@/types/pos';

export interface MenuData {
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface CreateOrderInput {
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryDistanceKm: number | null;
  deliveryFee: number;
  lines: CartLine[];
}

interface FetchMenuOptions {
  includeInactive?: boolean;
}

export async function fetchMenu({ includeInactive = false }: FetchMenuOptions = {}): Promise<MenuData> {
  let categoriesQuery = supabase
    .from('menu_categories')
    .select('id, name_ar, sort_order, is_active')
    .order('sort_order');
  let itemsQuery = supabase
    .from('menu_items')
    .select('id, category_id, name_ar, description_ar, price, image_url, sort_order, is_active')
    .order('sort_order');

  if (!includeInactive) {
    categoriesQuery = categoriesQuery.eq('is_active', true);
    itemsQuery = itemsQuery.eq('is_active', true);
  }

  const [categoriesResult, itemsResult] = await Promise.all([categoriesQuery, itemsQuery]);

  if (categoriesResult.error || itemsResult.error) {
    console.error(categoriesResult.error ?? itemsResult.error);
    throw new Error('تعذر تحميل قائمة الطعام، تحقق من الاتصال وحاول مرة أخرى');
  }

  const categories: MenuCategory[] = (categoriesResult.data ?? []).map((row) => ({
    id: String(row.id),
    name_ar: String(row.name_ar),
    sort_order: Number(row.sort_order),
    is_active: Boolean(row.is_active),
  }));

  const items: MenuItem[] = (itemsResult.data ?? []).map((row) => ({
    id: String(row.id),
    category_id: String(row.category_id),
    name_ar: String(row.name_ar),
    description_ar: String(row.description_ar ?? ''),
    price: Number(row.price),
    image_url: row.image_url ? String(row.image_url) : null,
    sort_order: Number(row.sort_order),
    is_active: Boolean(row.is_active),
  }));

  return { categories, items };
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const { data, error } = await supabase.rpc('create_order', {
    p_order_type: input.orderType,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_delivery_address: input.deliveryAddress,
    p_delivery_distance_km: input.deliveryDistanceKm,
    p_delivery_fee: input.deliveryFee,
    p_items: input.lines.map((line) => ({ menu_item_id: line.item.id, quantity: line.quantity })),
  });

  if (error) {
    console.error(error);
    if (error.message.includes('unavailable')) {
      throw new Error('بعض المنتجات غير متاحة حاليًا، حدّث القائمة وحاول مرة أخرى');
    }
    throw new Error('تعذر حفظ الطلب، حاول مرة أخرى');
  }

  const row = data as Record<string, unknown> | null;
  if (
    !row ||
    typeof row.order_id !== 'string' ||
    typeof row.order_number !== 'number' ||
    typeof row.subtotal !== 'number' ||
    typeof row.delivery_fee !== 'number' ||
    typeof row.total !== 'number' ||
    !Array.isArray(row.low_stock)
  ) {
    throw new Error('استجابة غير متوقعة من الخادم، تحقق من الطلب');
  }

  return {
    orderId: row.order_id,
    orderNumber: row.order_number,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    total: row.total,
    lowStockItems: readLowStockNames(row.low_stock),
  };
}

function readLowStockNames(entries: unknown[]): string[] {
  return entries.flatMap((entry) =>
    typeof entry === 'object' && entry !== null && 'name' in entry && typeof entry.name === 'string'
      ? [entry.name]
      : [],
  );
}
