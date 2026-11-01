import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { saveCategory } from '@/lib/managerMenuApi';
import type { MenuCategory } from '@/types/pos';

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-surface-950 px-4 py-3 text-cream-50 placeholder:text-cream-400/60 outline-none transition duration-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30';

interface CategoryFormModalProps {
  pin: string;
  category: MenuCategory | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function CategoryFormModal({ pin, category, onSaved, onClose }: CategoryFormModalProps) {
  const [name, setName] = useState(category?.name_ar ?? '');
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('أدخل اسم القسم');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await saveCategory(pin, { name_ar: trimmed, is_active: isActive }, category?.id ?? null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ القسم');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={category ? 'تعديل القسم' : 'قسم جديد'}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="rounded-xl bg-error-500/10 px-4 py-2.5 text-sm text-error-400">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-12 w-full rounded-2xl bg-gold-400 font-bold text-surface-950 transition duration-200 hover:bg-gold-300 disabled:opacity-50"
          >
            {isSaving ? 'جارٍ الحفظ...' : 'حفظ القسم'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-cream-200">اسم القسم</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="مثال: كريب حلو"
            maxLength={60}
            className={inputClass}
          />
        </label>
        <div className="flex items-center justify-between rounded-2xl bg-surface-950 p-4">
          <div>
            <p className="font-medium text-cream-100">ظاهر في شاشة الكاشير</p>
            <p className="text-xs text-cream-400">إيقافه يخفي القسم وكل منتجاته من الكاشير</p>
          </div>
          <ToggleSwitch checked={isActive} onChange={setIsActive} label="ظاهر في شاشة الكاشير" />
        </div>
      </div>
    </Modal>
  );
}
