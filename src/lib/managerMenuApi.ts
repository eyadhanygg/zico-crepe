import { callManagerRpc } from '@/lib/managerRpc';

export interface CategoryInput {
  name_ar: string;
  is_active: boolean;
}

export interface MenuItemInput {
  category_id: string;
  name_ar: string;
  description_ar: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
}

export async function saveCategory(
  pin: string,
  input: CategoryInput,
  existingId: string | null,
): Promise<void> {
  await callManagerRpc('manager_save_category', {
    p_pin: pin,
    p_category_id: existingId,
    p_name: input.name_ar,
    p_is_active: input.is_active,
  });
}

export async function saveMenuItem(
  pin: string,
  input: MenuItemInput,
  existingId: string | null,
): Promise<string> {
  const result = await callManagerRpc('manager_save_menu_item', {
    p_pin: pin,
    p_item_id: existingId,
    p_category_id: input.category_id,
    p_name: input.name_ar,
    p_description: input.description_ar,
    p_price: input.price,
    p_image_url: input.image_url,
    p_is_active: input.is_active,
  });
  if (typeof result.id !== 'string') throw new Error('استجابة غير متوقعة من الخادم');
  return result.id;
}

export async function setMenuItemActive(pin: string, itemId: string, isActive: boolean): Promise<void> {
  await callManagerRpc('manager_set_menu_item_active', {
    p_pin: pin,
    p_item_id: itemId,
    p_is_active: isActive,
  });
}

export async function setCategoryActive(
  pin: string,
  categoryId: string,
  isActive: boolean,
): Promise<void> {
  await callManagerRpc('manager_set_category_active', {
    p_pin: pin,
    p_category_id: categoryId,
    p_is_active: isActive,
  });
}

export async function deleteMenuItem(pin: string, itemId: string): Promise<void> {
  await callManagerRpc('manager_delete_menu_item', { p_pin: pin, p_item_id: itemId });
}
