import { Armchair, Bike, ShoppingBag, type LucideIcon } from 'lucide-react';
import { ORDER_TYPE_LABELS, type OrderType } from '@/types/pos';

const ORDER_TYPE_ICONS: Record<OrderType, LucideIcon> = {
  dine_in: Armchair,
  takeaway: ShoppingBag,
  delivery: Bike,
};

const ORDER_TYPES: OrderType[] = ['dine_in', 'takeaway', 'delivery'];

interface OrderTypeSelectorProps {
  value: OrderType;
  onChange: (value: OrderType) => void;
}

export default function OrderTypeSelector({ value, onChange }: OrderTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-950 p-1">
      {ORDER_TYPES.map((optionValue) => {
        const isActive = optionValue === value;
        const Icon = ORDER_TYPE_ICONS[optionValue];
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(optionValue)}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium transition duration-200 sm:text-sm ${
              isActive
                ? 'bg-gold-400 text-surface-950 shadow-md shadow-gold-500/20'
                : 'text-cream-400 hover:bg-surface-800 hover:text-cream-100'
            }`}
          >
            <Icon size={18} />
            <span>{ORDER_TYPE_LABELS[optionValue]}</span>
          </button>
        );
      })}
    </div>
  );
}
