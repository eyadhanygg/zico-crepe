import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import RecipeEditor, { createRecipeDraftLine, type RecipeDraftLine } from '@/components/manager/menu/RecipeEditor';
import Modal from '@/components/ui/Modal';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { useInventory } from '@/hooks/useInventory';
import { parseMoneyInput, parseQuantityInput } from '@/lib/format';
import { deleteMenuItem, saveMenuItem } from '@/lib/managerMenuApi';
import { fetchRecipe, saveRecipe, type RecipeLine } from '@/lib/managerInventoryApi';
import type { MenuCategory, MenuItem } from '@/types/pos';

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-surface-950 px-4 py-3 text-cream-50 placeholder:text-cream-400/60 outline-none transition duration-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30';

const labelClass = 'mb-1.5 block text-sm font-medium text-cream-200';

type RecipeStatus = 'loading' | 'ready' | 'error';

function isValidImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function toDraftLines(lines: RecipeLine[]): RecipeDraftLine[] {
  return lines.map((line) => ({
    key: crypto.randomUUID(),
    inventoryItemId: line.inventory_item_id,
    quantity: String(line.quantity),
  }));
}

function buildRecipeLines(drafts: RecipeDraftLine[]): RecipeLine[] | string {
  const lines: RecipeLine[] = [];
  for (const draft of drafts) {
    if (!draft.inventoryItemId) return 'اختر الخامة لكل مكوّن، أو احذف السطر الفارغ';
    const quantity = parseQuantityInput(draft.quantity);
    if (quantity === null || quantity <= 0) return 'أدخل كمية أكبر من صفر لكل مكوّن';
    if (lines.some((line) => line.inventory_item_id === draft.inventoryItemId)) {
      return 'لا يمكن تكرار نفس الخامة في مكونات المنتج';
    }
    lines.push({ inventory_item_id: draft.inventoryItemId, quantity });
  }
  return lines;
}

interface MenuItemFormModalProps {
  pin: string;
  item: MenuItem | null;
  categories: MenuCategory[];
  defaultCategoryId: string | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function MenuItemFormModal({
  pin,
  item,
  categories,
  defaultCategoryId,
  onSaved,
  onClose,
}: MenuItemFormModalProps) {
  const [savedItemId, setSavedItemId] = useState<string | null>(item?.id ?? null);
  const [name, setName] = useState(item?.name_ar ?? '');
  const [description, setDescription] = useState(item?.description_ar ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [categoryId, setCategoryId] = useState(
    item?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? '',
  );
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? '');
  const [isActive, setIsActive] = useState(item?.is_active ?? true);
  const [recipeDrafts, setRecipeDrafts] = useState<RecipeDraftLine[]>([]);
  const [recipeStatus, setRecipeStatus] = useState<RecipeStatus>(item ? 'loading' : 'ready');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const inventory = useInventory(pin);

  useEffect(() => {
    if (!savedItemId || recipeStatus !== 'loading') return;
    let cancelled = false;
    fetchRecipe(pin, savedItemId)
      .then((lines) => {
        if (cancelled) return;
        setRecipeDrafts(toDraftLines(lines));
        setRecipeStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setRecipeStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [pin, savedItemId, recipeStatus]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const parsedPrice = parseMoneyInput(price);
    const trimmedImage = imageUrl.trim();

    if (!trimmedName) return setError('أدخل اسم المنتج');
    if (parsedPrice === null) return setError('أدخل سعرًا صحيحًا (رقم أكبر من أو يساوي صفر)');
    if (!categoryId) return setError('اختر القسم');
    if (trimmedImage && !isValidImageUrl(trimmedImage)) {
      return setError('رابط الصورة غير صالح، يجب أن يبدأ بـ https://');
    }
    const recipe = buildRecipeLines(recipeDrafts);
    if (typeof recipe === 'string') return setError(recipe);

    setIsBusy(true);
    setError(null);
    try {
      const itemId = await saveMenuItem(
        pin,
        {
          category_id: categoryId,
          name_ar: trimmedName,
          description_ar: description.trim(),
          price: parsedPrice,
          image_url: trimmedImage || null,
          is_active: isActive,
        },
        savedItemId,
      );
      setSavedItemId(itemId);
      await saveRecipe(pin, itemId, recipe);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ المنتج');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!savedItemId) return;
    setIsBusy(true);
    setError(null);
    try {
      await deleteMenuItem(pin, savedItemId);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حذف المنتج');
      setConfirmingDelete(false);
    } finally {
      setIsBusy(false);
    }
  };

  const canSave = !isBusy && recipeStatus === 'ready';

  return (
    <Modal
      title={item ? 'تعديل المنتج' : 'منتج جديد'}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="rounded-xl bg-error-500/10 px-4 py-2.5 text-sm text-error-400">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            {savedItemId &&
              (confirmingDelete ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isBusy}
                  className="h-12 flex-1 rounded-2xl bg-error-500 font-bold text-cream-50 transition hover:bg-error-400 disabled:opacity-50"
                >
                  تأكيد الحذف
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={isBusy}
                  aria-label="حذف المنتج"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-error-500/40 text-error-400 transition hover:bg-error-500/10 disabled:opacity-50"
                >
                  <Trash2 size={18} />
                </button>
              ))}
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="h-12 flex-1 rounded-2xl bg-gold-400 font-bold text-surface-950 transition duration-200 hover:bg-gold-300 disabled:opacity-50"
            >
              {isBusy ? 'جارٍ الحفظ...' : 'حفظ المنتج'}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <label className="block">
          <span className={labelClass}>اسم المنتج</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="مثال: نوتيلا بالموز"
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelClass}>السعر</span>
            <input
              type="text"
              dir="ltr"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0.00"
              className={`${inputClass} text-start`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>القسم</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={inputClass}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name_ar}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className={labelClass}>وصف المنتج</span>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={240}
            placeholder="مكونات المنتج باختصار"
            className={`${inputClass} resize-none`}
          />
        </label>

        <label className="block">
          <span className={labelClass}>رابط الصورة (اختياري)</span>
          <input
            type="url"
            dir="ltr"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://..."
            className={`${inputClass} text-start`}
          />
        </label>

        <div className="flex items-center justify-between rounded-2xl bg-surface-950 p-4">
          <div>
            <p className="font-medium text-cream-100">متاح للبيع</p>
            <p className="text-xs text-cream-400">إيقافه يخفي المنتج من شاشة الكاشير</p>
          </div>
          <ToggleSwitch checked={isActive} onChange={setIsActive} label="متاح للبيع" />
        </div>

        {recipeStatus === 'loading' && <div className="h-32 animate-pulse rounded-2xl bg-surface-950" />}
        {recipeStatus === 'error' && (
          <p className="rounded-xl bg-error-500/10 px-4 py-3 text-sm text-error-400">
            تعذر تحميل مكونات المنتج، أغلق النافذة وحاول مرة أخرى
          </p>
        )}
        {recipeStatus === 'ready' && (
          <>
            <RecipeEditor
              ingredients={inventory.data ?? []}
              lines={recipeDrafts}
              onChange={setRecipeDrafts}
            />
            {inventory.error && <p className="text-sm text-error-400">{inventory.error}</p>}
          </>
        )}
      </div>
    </Modal>
  );
}
