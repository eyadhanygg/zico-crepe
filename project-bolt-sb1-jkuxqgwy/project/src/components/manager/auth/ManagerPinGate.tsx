import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, LockKeyhole, RefreshCw } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import { BRAND } from '@/config/brand';
import { fetchPinIsSet, isValidManagerPin, setManagerPin, verifyManagerPin } from '@/lib/managerAuthApi';

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-surface-950 px-4 py-3 text-center text-lg tracking-[0.4em] text-cream-50 placeholder:tracking-normal placeholder:text-cream-400/50 outline-none transition duration-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30';

interface ManagerPinGateProps {
  onUnlock: (pin: string) => void;
  onBackToPos: () => void;
}

export default function ManagerPinGate({ onUnlock, onBackToPos }: ManagerPinGateProps) {
  const [pinIsSet, setPinIsSet] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    fetchPinIsSet()
      .then((isSet) => {
        if (!cancelled) setPinIsSet(isSet);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidManagerPin(pin)) {
      setError('الرقم السري يجب أن يكون من 4 إلى 8 أرقام');
      return;
    }
    if (!pinIsSet && pin !== confirmPin) {
      setError('الرقمان غير متطابقين');
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      if (pinIsSet) {
        await verifyManagerPin(pin);
      } else {
        await setManagerPin(null, pin);
      }
      onUnlock(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      setPin('');
      setConfirmPin('');
    } finally {
      setIsBusy(false);
    }
  };

  const isSetup = pinIsSet === false;

  return (
    <div className="flex min-h-dvh flex-col bg-surface-950 font-sans text-cream-50">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <BrandLogo />
        <button
          type="button"
          onClick={onBackToPos}
          className="flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-cream-200 transition hover:border-gold-400 hover:text-gold-400"
        >
          <ArrowRight size={16} />
          <span>شاشة الكاشير</span>
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-3xl border border-white/5 bg-surface-900 p-6 shadow-xl shadow-black/30 sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-400">
              <LockKeyhole size={26} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-cream-50">
                {isSetup ? 'أنشئ رقمًا سريًا للمدير' : 'لوحة المدير'}
              </h1>
              <p className="mt-1 text-sm text-cream-400">
                {isSetup
                  ? 'هذا الرقم يحمي الأسعار والقائمة والتقارير من التعديل'
                  : `أدخل الرقم السري للوصول إلى ${BRAND.nameAr}`}
              </p>
            </div>
          </div>

          {loadError ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-cream-200">{loadError}</p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="flex items-center gap-2 rounded-full bg-gold-400 px-5 py-2.5 text-sm font-bold text-surface-950 transition hover:bg-gold-300"
              >
                <RefreshCw size={16} />
                <span>إعادة المحاولة</span>
              </button>
            </div>
          ) : pinIsSet === null ? (
            <div className="h-48 animate-pulse rounded-2xl bg-surface-950" />
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-cream-200">
                  {isSetup ? 'الرقم السري الجديد (4 إلى 8 أرقام)' : 'الرقم السري'}
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  dir="ltr"
                  maxLength={8}
                  autoFocus
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                  className={inputClass}
                />
              </label>

              {isSetup && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-cream-200">تأكيد الرقم السري</span>
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
              )}

              {error && (
                <p role="alert" className="rounded-xl bg-error-500/10 px-4 py-2.5 text-center text-sm text-error-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isBusy}
                className="h-12 rounded-2xl bg-gold-400 font-bold text-surface-950 transition duration-200 hover:bg-gold-300 disabled:opacity-50"
              >
                {isBusy ? 'جارٍ التحقق...' : isSetup ? 'حفظ الرقم والدخول' : 'دخول'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
