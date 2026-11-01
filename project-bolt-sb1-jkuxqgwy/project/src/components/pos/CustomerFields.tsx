import { useState } from 'react';
import CustomerSuggestionList from '@/components/pos/CustomerSuggestionList';
import OrderTypeSelector from '@/components/pos/OrderTypeSelector';
import { useCustomerSuggestions } from '@/hooks/useCustomerSuggestions';
import { formatMoney } from '@/lib/format';
import type { CustomerDraft, CustomerSuggestion, OrderType } from '@/types/pos';

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-surface-950 px-4 py-3 text-cream-50 placeholder:text-cream-400/60 outline-none transition duration-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30';

const labelClass = 'mb-1.5 block text-sm font-medium text-cream-200';

type ActiveField = 'name' | 'phone';

interface CustomerFieldsProps {
  orderType: OrderType;
  customer: CustomerDraft;
  deliveryFee: number;
  onChange: (patch: Partial<CustomerDraft>) => void;
}

export default function CustomerFields({
  orderType,
  customer,
  deliveryFee,
  onChange,
}: CustomerFieldsProps) {
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const searchTerm = activeField === 'phone' ? customer.phone : customer.name;
  const { suggestions, error } = useCustomerSuggestions(activeField ? searchTerm : '');
  const showSuggestions = activeField !== null && (suggestions.length > 0 || error !== null);

  const applySuggestion = (suggestion: CustomerSuggestion) => {
    onChange({ name: suggestion.name, phone: suggestion.phone, address: suggestion.address ?? '' });
    setActiveField(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div className="relative">
          <label className="block">
            <span className={labelClass}>اسم العميل</span>
            <input
              type="text"
              autoComplete="off"
              value={customer.name}
              onChange={(event) => onChange({ name: event.target.value })}
              onFocus={() => setActiveField('name')}
              onBlur={() => setActiveField(null)}
              placeholder="مثال: أحمد"
              className={inputClass}
            />
          </label>
          {showSuggestions && activeField === 'name' && (
            <CustomerSuggestionList suggestions={suggestions} error={error} onSelect={applySuggestion} />
          )}
        </div>
        <div className="relative">
          <label className="block">
            <span className={labelClass}>رقم الهاتف</span>
            <input
              type="tel"
              dir="ltr"
              inputMode="tel"
              autoComplete="off"
              value={customer.phone}
              onChange={(event) => onChange({ phone: event.target.value })}
              onFocus={() => setActiveField('phone')}
              onBlur={() => setActiveField(null)}
              placeholder="01xxxxxxxxx"
              className={`${inputClass} text-start`}
            />
          </label>
          {showSuggestions && activeField === 'phone' && (
            <CustomerSuggestionList suggestions={suggestions} error={error} onSelect={applySuggestion} />
          )}
        </div>
      </div>

      {orderType === 'delivery' && (
        <div className="flex animate-fade-in flex-col gap-4 rounded-2xl border border-gold-500/20 bg-surface-950/60 p-4">
          <label className="block">
            <span className={labelClass}>عنوان التوصيل</span>
            <textarea
              rows={2}
              value={customer.address}
              onChange={(event) => onChange({ address: event.target.value })}
              placeholder="الشارع، المبنى، الدور"
              className={`${inputClass} resize-none`}
            />
          </label>
          <div className="grid grid-cols-2 items-end gap-4">
            <label className="block">
              <span className={labelClass}>المسافة (كم)</span>
              <input
                type="text"
                dir="ltr"
                inputMode="decimal"
                value={customer.distanceKm}
                onChange={(event) => onChange({ distanceKm: event.target.value })}
                placeholder="3.5"
                className={`${inputClass} text-start`}
              />
            </label>
            <div className="rounded-2xl bg-surface-800 px-4 py-3">
              <span className="block text-xs text-cream-400">رسوم التوصيل</span>
              <span className="block font-bold text-gold-400">{formatMoney(deliveryFee)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
