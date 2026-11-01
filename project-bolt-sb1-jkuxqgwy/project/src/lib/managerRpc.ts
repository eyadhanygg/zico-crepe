import { supabase } from '@/lib/supabase';

export const MANAGER_UNKNOWN_ERROR = 'تعذر تنفيذ العملية، حاول مرة أخرى';
const UNEXPECTED_RESPONSE = 'استجابة غير متوقعة من الخادم';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_pin: 'الرقم السري غير صحيح',
  pin_locked: 'تم قفل لوحة المدير مؤقتًا بعد محاولات متكررة، حاول بعد 15 دقيقة',
  pin_not_set: 'لم يتم إنشاء رقم سري بعد',
  invalid_format: 'الرقم السري يجب أن يكون من 4 إلى 8 أرقام',
  invalid_input: 'بيانات غير صالحة، تحقق من الحقول',
  not_found: 'العنصر غير موجود، حدّث الصفحة وحاول مرة أخرى',
};

export class ManagerError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(ERROR_MESSAGES[code] ?? MANAGER_UNKNOWN_ERROR);
    this.name = 'ManagerError';
    this.code = code;
  }
}

export async function callManagerRpc(
  fn: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(error);
    throw new Error(MANAGER_UNKNOWN_ERROR);
  }

  const result = data as Record<string, unknown> | null;
  if (!result || typeof result.ok !== 'boolean') {
    throw new Error(UNEXPECTED_RESPONSE);
  }
  if (!result.ok) {
    throw new ManagerError(String(result.error ?? 'unknown'));
  }
  return result;
}
