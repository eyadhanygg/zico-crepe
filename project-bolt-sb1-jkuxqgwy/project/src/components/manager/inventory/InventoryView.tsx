import { useState } from 'react';
import { AlertTriangle, Plus, RefreshCw } from 'lucide-react';
import InventoryItemFormModal from '@/components/manager/inventory/InventoryItemFormModal';
import InventoryItemRow, { getStockStatus } from '@/components/manager/inventory/InventoryItemRow';
import StockAdjustModal from '@/components/manager/inventory/StockAdjustModal';
import { useInventory } from '@/hooks/useInventory';
import type { InventoryItem } from '@/lib/managerInventoryApi';

type Editor =
  | { kind: 'item'; item: InventoryItem | null }
  | { kind: 'adjust'; item: InventoryItem }
  | null;

export default function InventoryView({ pin }: { pin: string }) {
  const inventory = useInventory(pin);
  const [editor, setEditor] = useState<Editor>(null);

  const items = inventory.data ?? [];
  const attentionCount = items.filter((item) => getStockStatus(item) !== 'ok').length;

  const closeEditor = () => {
    setEditor(null);
    inventory.retry();
  };

  if (inventory.isLoading && !inventory.data) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-surface-900" />
        ))}
      </div>
    );
  }

  if (inventory.error && !inventory.data) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/5 bg-surface-900 py-16 text-center">
        <p className="px-6 text-cream-200">{inventory.error}</p>
        <button
          type="button"
          onClick={inventory.retry}
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-cream-50">المخزون والخامات</h2>
          <p className="text-sm text-cream-400">{items.length} خامة مسجلة</p>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ kind: 'item', item: null })}
          className="flex h-10 items-center gap-2 rounded-full bg-gold-400 px-5 text-sm font-bold text-surface-950 transition hover:bg-gold-300"
        >
          <Plus size={16} />
          <span>خامة جديدة</span>
        </button>
      </div>

      {attentionCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 px-4 py-3 text-sm text-warning-400">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{attentionCount} خامة قاربت على النفاد أو رصيدها سالب، راجع كمياتها</span>
        </div>
      )}

      {inventory.error && (
        <p role="alert" className="rounded-xl bg-error-500/10 px-4 py-3 text-sm text-error-400">
          {inventory.error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-cream-400">ابدأ بإضافة الخامات مثل الدقيق والجبن والعلب، ثم اربطها بمنتجات القائمة</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <InventoryItemRow
              key={item.id}
              item={item}
              onAdjust={(target) => setEditor({ kind: 'adjust', item: target })}
              onEdit={(target) => setEditor({ kind: 'item', item: target })}
            />
          ))}
        </ul>
      )}

      {editor?.kind === 'item' && (
        <InventoryItemFormModal
          pin={pin}
          item={editor.item}
          onSaved={closeEditor}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.kind === 'adjust' && (
        <StockAdjustModal
          pin={pin}
          item={editor.item}
          onSaved={closeEditor}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
