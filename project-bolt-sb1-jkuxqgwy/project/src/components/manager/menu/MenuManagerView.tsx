import { useState } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import CategoryFormModal from '@/components/manager/menu/CategoryFormModal';
import MenuItemFormModal from '@/components/manager/menu/MenuItemFormModal';
import MenuItemRow from '@/components/manager/menu/MenuItemRow';
import { useMenu } from '@/hooks/useMenu';
import { setCategoryActive, setMenuItemActive } from '@/lib/managerMenuApi';
import type { MenuCategory, MenuItem } from '@/types/pos';

type Editor =
  | { kind: 'category'; category: MenuCategory | null }
  | { kind: 'item'; item: MenuItem | null }
  | null;

export default function MenuManagerView({ pin }: { pin: string }) {
  const menu = useMenu({ includeInactive: true });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const categories = menu.data?.categories ?? [];
  const activeCategoryId = selectedCategoryId ?? categories[0]?.id ?? null;
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? null;
  const items = (menu.data?.items ?? []).filter((item) => item.category_id === activeCategoryId);

  const runAction = async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
      menu.retry();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    }
  };

  const closeEditor = () => {
    setEditor(null);
    menu.retry();
  };

  if (menu.isLoading && !menu.data) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-surface-900" />
        ))}
      </div>
    );
  }

  if (menu.error && !menu.data) {
    return (
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
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {categories.map((category) => {
            const isActive = category.id === activeCategoryId;
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition duration-200 ${
                  isActive
                    ? 'border-gold-400 bg-gold-400 text-surface-950'
                    : 'border-white/10 bg-surface-900 text-cream-200 hover:border-gold-500/40'
                } ${category.is_active ? '' : 'opacity-50'}`}
              >
                {category.name_ar}
                {!category.is_active && <span className="text-xs">(مخفي)</span>}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setEditor({ kind: 'category', category: null })}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-gold-500/50 px-4 py-2 text-sm font-medium text-gold-400 transition hover:bg-gold-400/10"
          >
            <Plus size={16} />
            <span>قسم جديد</span>
          </button>
        </div>

        {activeCategory && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/5 bg-surface-900 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-cream-50">{activeCategory.name_ar}</h2>
              <p className="text-xs text-cream-400">
                {items.length} منتج - {activeCategory.is_active ? 'ظاهر في الكاشير' : 'مخفي من الكاشير'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditor({ kind: 'category', category: activeCategory })}
                className="flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-cream-200 transition hover:border-gold-400 hover:text-gold-400"
              >
                <Pencil size={14} />
                <span>تعديل القسم</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  runAction(() => setCategoryActive(pin, activeCategory.id, !activeCategory.is_active))
                }
                className="h-10 rounded-full border border-white/10 px-4 text-sm text-cream-200 transition hover:border-gold-400 hover:text-gold-400"
              >
                {activeCategory.is_active ? 'إخفاء القسم' : 'إظهار القسم'}
              </button>
            </div>
          </div>
        )}
      </div>

      {actionError && (
        <p role="alert" className="rounded-xl bg-error-500/10 px-4 py-3 text-sm text-error-400">
          {actionError}
        </p>
      )}

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-cream-400">ابدأ بإضافة قسم أولًا، ثم أضف منتجاتك إليه</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-cream-400">المنتجات</h3>
            <button
              type="button"
              disabled={!activeCategory}
              onClick={() => setEditor({ kind: 'item', item: null })}
              className="flex h-10 items-center gap-2 rounded-full bg-gold-400 px-5 text-sm font-bold text-surface-950 transition hover:bg-gold-300 disabled:opacity-50"
            >
              <Plus size={16} />
              <span>منتج جديد</span>
            </button>
          </div>

          {items.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-white/10 py-12 text-center text-cream-400">
              لا توجد منتجات في هذا القسم بعد
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  onEdit={(target) => setEditor({ kind: 'item', item: target })}
                  onToggleActive={(target, next) =>
                    runAction(() => setMenuItemActive(pin, target.id, next))
                  }
                />
              ))}
            </ul>
          )}
        </>
      )}

      {editor?.kind === 'category' && (
        <CategoryFormModal
          pin={pin}
          category={editor.category}
          onSaved={closeEditor}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.kind === 'item' && (
        <MenuItemFormModal
          pin={pin}
          item={editor.item}
          categories={categories}
          defaultCategoryId={activeCategoryId}
          onSaved={closeEditor}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
