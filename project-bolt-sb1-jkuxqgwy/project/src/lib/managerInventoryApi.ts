import { callManagerRpc } from '@/lib/managerRpc';

const UNEXPECTED_RESPONSE = 'استجابة غير متوقعة من الخادم';

export interface InventoryItem {
  id: string;
  name_ar: string;
  category: string;
  unit: string;
  stock_quantity: number;
  low_stock_threshold: number;
}

export interface InventoryItemInput {
  name_ar: string;
  category: string;
  unit: string;
  low_stock_threshold: number;
  initial_stock: number;
}

export interface RecipeLine {
  inventory_item_id: string;
  quantity: number;
}

function readRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(UNEXPECTED_RESPONSE);
  return value.map((row) => {
    if (typeof row !== 'object' || row === null) throw new Error(UNEXPECTED_RESPONSE);
    return row as Record<string, unknown>;
  });
}

export async function fetchInventory(pin: string): Promise<InventoryItem[]> {
  const result = await callManagerRpc('manager_list_inventory', { p_pin: pin });
  return readRows(result.data).map((row) => ({
    id: String(row.id),
    name_ar: String(row.name_ar),
    category: String(row.category),
    unit: String(row.unit),
    stock_quantity: Number(row.stock_quantity),
    low_stock_threshold: Number(row.low_stock_threshold),
  }));
}

export async function saveInventoryItem(
  pin: string,
  input: InventoryItemInput,
  existingId: string | null,
): Promise<void> {
  await callManagerRpc('manager_save_inventory_item', {
    p_pin: pin,
    p_item_id: existingId,
    p_name: input.name_ar,
    p_category: input.category,
    p_unit: input.unit,
    p_low_stock_threshold: input.low_stock_threshold,
    p_initial_stock: input.initial_stock,
  });
}

export async function adjustInventoryStock(
  pin: string,
  itemId: string,
  change: number,
  note: string,
): Promise<void> {
  await callManagerRpc('manager_adjust_inventory_stock', {
    p_pin: pin,
    p_item_id: itemId,
    p_change: change,
    p_note: note,
  });
}

export async function deleteInventoryItem(pin: string, itemId: string): Promise<void> {
  await callManagerRpc('manager_delete_inventory_item', { p_pin: pin, p_item_id: itemId });
}

export async function fetchRecipe(pin: string, menuItemId: string): Promise<RecipeLine[]> {
  const result = await callManagerRpc('manager_get_recipe', {
    p_pin: pin,
    p_menu_item_id: menuItemId,
  });
  return readRows(result.data).map((row) => ({
    inventory_item_id: String(row.inventory_item_id),
    quantity: Number(row.quantity),
  }));
}

export async function saveRecipe(pin: string, menuItemId: string, lines: RecipeLine[]): Promise<void> {
  await callManagerRpc('manager_save_recipe', {
    p_pin: pin,
    p_menu_item_id: menuItemId,
    p_lines: lines,
  });
}
