import { Pencil, UtensilsCrossed } from 'lucide-react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { formatMoney } from '@/lib/format';
import type { MenuItem } from '@/types/pos';

interface MenuItemRowProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onToggleActive: (item: MenuItem, isActive: boolean) => void;
}

export default function MenuItemRow({ item, onEdit, onToggleActive }: MenuItemRowProps) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-white/5 bg-surface-900 p-3 transition duration-300 hover:border-gold-500/30 sm:p-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-800 sm:h-20 sm:w-20">
        {item.image_url ? (
          <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <UtensilsCrossed size={22} className="text-cream-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-bold text-cream-50">{item.name_ar}</p>
        </div>
        <p className="mt-0.5 text-sm font-medium text-gold-400">{formatMoney(item.price)}</p>
        <p className="mt-1 truncate text-xs text-cream-400">
          {item.description_ar || 'بدون وصف'}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <ToggleSwitch
          checked={item.is_active}
          onChange={(next) => onToggleActive(item, next)}
          label={`${item.is_active ? 'إيقاف' : 'تفعيل'} ${item.name_ar}`}
        />
        <button
          type="button"
          onClick={() => onEdit(item)}
          aria-label={`تعديل ${item.name_ar}`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-cream-200 transition hover:border-gold-400 hover:text-gold-400"
        >
          <Pencil size={16} />
        </button>
      </div>
    </li>
  );
}
