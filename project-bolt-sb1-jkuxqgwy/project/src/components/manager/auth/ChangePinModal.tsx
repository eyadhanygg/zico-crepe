import { useState, type FormEvent } from 'react';
import Modal from '@/components/ui/Modal';
import { isValidManagerPin, setManagerPin } from '@/lib/managerAuthApi';

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-surface-950 px-4 py-3 text-center text-lg tracking-[0.4em] text-cream-50 placeholder:tracking-normal placeholder:text-cream-400/50 outline-none transition duration-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30';

const labelClass = 'mb-1.5 block text-sm font-medium text-cream-200';

interface ChangePinModalProps {
  onChanged: (newPin: string) => void;
  onClose: () => void;
}

export default function ChangePinModal({ onChanged, onClose }: ChangePinModalProps) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidManagerPin(currentPin)) {
      setError('أدخل الرقم السري الحالي');
      return;
    }
    if (!isValidManagerPin(newPin)) {
      setError('الرقم السري الجديد يجب أن يكون من 4 إلى 8 أرقام');
      return;
    }
    if (newPin !== confirmPin) {
      setError('الرقمان الجديدان غير متطابقين');
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      await setManagerPin(currentPin, newPin);
      onChanged(newPin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تغيير الرقم السري');
      setCurrentPin('');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Modal
      title="تغيير الرقم السري"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="rounded-xl bg-error-500/10 px-4 py-2.5 text-sm text-error-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            form="change-pin-form"
            disabled={isBusy}
            className="h-12 w-full rounded-2xl bg-gold-400 font-bold text-surface-950 transition duration-200 hover:bg-gold-300 disabled:opacity-50"
          >
            {isBusy ? 'جارٍ الحفظ...' : 'حفظ الرقم الجديد'}
          </button>
        </div>
      }
    >
      <form id="change-pin-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="block">
          <span className={labelClass}>الرقم السري الحالي</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            dir="ltr"
            maxLength={8}
            value={currentPin}
            onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ''))}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>الرقم السري الجديد (4 إلى 8 أرقام)</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            dir="ltr"
            maxLength={8}
            value={newPin}
            onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>تأكيد الرقم السري الجديد</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            dir="ltr"
            maxLength={8}
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))}
            className={inputClass}
          />
        </label>
      </form>
    </Modal>
  );
}
