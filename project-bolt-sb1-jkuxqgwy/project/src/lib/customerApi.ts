import { supabase } from '@/lib/supabase';
import type { CustomerSuggestion } from '@/types/pos';

export const CUSTOMER_SEARCH_MIN_LENGTH = 2;

export async function searchCustomers(query: string): Promise<CustomerSuggestion[]> {
  const { data, error } = await supabase.rpc('search_customers', { p_query: query });
  if (error) {
    console.error(error);
    throw new Error('تعذر البحث عن العملاء');
  }
  if (!Array.isArray(data)) {
    throw new Error('استجابة غير متوقعة من الخادم');
  }

  return data.map((entry) => {
    const row = entry as Record<string, unknown>;
    return {
      name: String(row.name ?? ''),
      phone: String(row.phone ?? ''),
      address: typeof row.address === 'string' ? row.address : null,
    };
  });
}
