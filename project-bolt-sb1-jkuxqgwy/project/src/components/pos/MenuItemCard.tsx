import { Plus } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import type { MenuItem } from '@/types/pos';

interface MenuItemCardProps {
  item: MenuItem;
  quantityInCart: number;
  onAdd: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, quantityInCart, onAdd }: MenuItemCardProps) {
  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      aria-label={`إضافة ${item.name_ar}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-surface-900 text-start shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-gold-500/40 hover:shadow-xl active:scale-[0.98]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-800">
        {item.image_url && (
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        {quantityInCart > 0 && (
          <span className="absolute end-3 top-3 flex h-7 min-w-7 animate-pop-in items-center justify-center rounded-full bg-gold-400 px-2 text-sm font-bold text-surface-950 shadow-md">
            {quantityInCart}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="block text-base font-bold text-cream-50">{item.name_ar}</span>
        <span className="line-clamp-2 block text-sm leading-relaxed text-cream-400">
          {item.description_ar}
        </span>
        <span className="mt-auto flex items-center justify-between pt-2">
          <span className="font-bold text-gold-400">{formatMoney(item.price)}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-400 text-surface-950 transition duration-300 group-hover:scale-110">
            <Plus size={18} />
          </span>
        </span>
      </div>
    </button>
  );
}
