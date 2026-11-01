import MenuItemCard from '@/components/pos/MenuItemCard';
import type { MenuCategory, MenuItem } from '@/types/pos';

interface MenuGridProps {
  categories: MenuCategory[];
  items: MenuItem[];
  activeCategoryId: string | null;
  quantities: Record<string, number>;
  onSelectCategory: (categoryId: string) => void;
  onAddItem: (item: MenuItem) => void;
}

export default function MenuGrid({
  categories,
  items,
  activeCategoryId,
  quantities,
  onSelectCategory,
  onAddItem,
}: MenuGridProps) {
  const visibleItems = items.filter((item) => item.category_id === activeCategoryId);

  return (
    <div className="flex flex-col gap-5">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelectCategory(category.id)}
              className={`shrink-0 rounded-full border px-5 py-2 text-sm font-medium transition duration-200 ${
                isActive
                  ? 'border-gold-400 bg-gold-400 text-surface-950'
                  : 'border-white/10 bg-surface-900 text-cream-200 hover:border-gold-500/40'
              }`}
            >
              {category.name_ar}
            </button>
          );
        })}
      </div>

      {visibleItems.length === 0 ? (
        <p className="py-16 text-center text-cream-400">لا توجد منتجات في هذا القسم</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
          {visibleItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              quantityInCart={quantities[item.id] ?? 0}
              onAdd={onAddItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
