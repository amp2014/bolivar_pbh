import { supabase } from '../lib/supabase'

/**
 * Returns all supplies that are currently low or out, OUT items first.
 * Used by the home dashboard tile and future pre-stay email.
 */
export async function getLowOrOutSupplies() {
  const { data } = await supabase
    .from('supplies')
    .select('id, name, category, status')
    .in('status', ['low', 'out'])
    .order('category')
    .order('name')
  if (!data) return []
  // OUT before LOW regardless of category sort
  return [
    ...data.filter((s) => s.status === 'out'),
    ...data.filter((s) => s.status === 'low'),
  ]
}
