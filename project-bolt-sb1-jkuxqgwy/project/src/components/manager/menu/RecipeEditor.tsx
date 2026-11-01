import { Plus, X } from 'lucide-react';
import type { InventoryItem } from '@/lib/managerInventoryApi';

const inputClass =
  'rounded-xl border border-white/10 bg-surface-900 px-3 py-2.5 text-cream-50 outline-none transition duration-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30';

export interface RecipeDraftLine {
  key: string;
  inventoryItemId: string;
  quantity: string;
}

export function createRecipeDraftLine(): RecipeDraftLine {
  return { key: crypto.randomUUID(), inventoryItemId: '', quantity: '' };
}

interface RecipeEditorProps {
  ingredients: InventoryItem[];
  lines: RecipeDraftLine[];
  onChange: (lines: RecipeDraftLine[]) => void;
}

export default function RecipeEditor({ ingredients, lines, onChange }: RecipeEditorProps) {
  const unitById = new Map(ingredients.map((item) => [item.id, item.unit]));

  const updateLine = (key: string, patch: Partial<RecipeDraftLine>) => {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-surface-950 p-4">
      <div>
        <p className="text-sm font-medium text-cream-100">مكونات القطعة الواحدة</p>
        <p className="text-xs text-cream-400">تُخصم هذه الكميات من المخزون تلقائيًا عند بيع المنتج</p>
      </div>

      {ingredients.length === 0 ? (
        <p className="text-sm text-cream-400">أضف الخامات من تبويب المخزون أولًا لتتمكن من ربطها بالمنتج</p>
      ) : lines.length === 0 ? (
        <p className="text-sm text-cream-400">لم تُضف مكونات لهذا المنتج بعد</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lines.map((line) => (
            <li key={line.key} className="flex items-center gap-2">
              <select
                aria-label="الخامة"
                value={line.inventoryItemId}
                onChange={(event) => updateLine(line.key, { inventoryItemId: event.target.value })}
                className={`${inputClass} min-w-0 flex-1`}
              >
                <option value="">اختر الخامة</option>
                {ingredients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name_ar}
                  </option>
                ))}
              </select>
              <input
                type="text"
                dir="ltr"
                inputMode="decimal"
                aria-label="الكمية"
                value={line.quantity}
                onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                placeholder="0"
                className={`${inputClass} w-20 shrink-0 text-start`}
              />
              <span className="w-10 shrink-0 text-xs text-cream-400">
                {unitById.get(line.inventoryItemId) ?? ''}
              </span>
              <button
                type="button"
                onClick={() => onChange(lines.filter((target) => target.key !== line.key))}
                aria-label="حذف المكوّن"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-cream-400 transition hover:bg-surface-800 hover:text-error-400"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {ingredients.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([...lines, createRecipeDraftLine()])}
          className="flex h-10 items-center justify-center gap-2 rounded-full border border-dashed border-gold-500/50 text-sm font-medium text-gold-400 transition hover:bg-gold-400/10"
        >
          <Plus size={16} />
          <span>إضافة مكوّن</span>
        </button>
      )}
    </div>
  );
}
