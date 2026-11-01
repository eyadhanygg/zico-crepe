import { supabase } from '@/lib/supabase';
import { callManagerRpc, MANAGER_UNKNOWN_ERROR } from '@/lib/managerRpc';

const UNEXPECTED_RESPONSE = 'استجابة غير متوقعة من الخادم';

export function isValidManagerPin(value: string): boolean {
  return /^[0-9]{4,8}$/.test(value);
}

export async function fetchPinIsSet(): Promise<boolean> {
  const { data, error } = await supabase.rpc('manager_pin_is_set');
  if (error) {
    console.error(error);
    throw new Error(MANAGER_UNKNOWN_ERROR);
  }
  if (typeof data !== 'boolean') {
    throw new Error(UNEXPECTED_RESPONSE);
  }
  return data;
}

export async function verifyManagerPin(pin: string): Promise<void> {
  await callManagerRpc('manager_verify_pin', { p_pin: pin });
}

export async function setManagerPin(currentPin: string | null, newPin: string): Promise<void> {
  await callManagerRpc('manager_set_pin', { p_current_pin: currentPin, p_new_pin: newPin });
}
