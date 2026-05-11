import { supabase } from './supabase'

/**
 * Guarantee a profile row exists for the current user.
 * Called on session load and before any write that depends on profiles FK.
 * Uses upsert so it's safe to call multiple times.
 */
export async function ensureProfile(session) {
  if (!session?.user) return

  const { id, email, user_metadata } = session.user
  const fallbackUsername =
    user_metadata?.username ||
    email?.split('@')[0]?.replace(/[^a-z0-9_]/gi, '_').toLowerCase() ||
    `user_${id.slice(0, 8)}`

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, username, email')
    .eq('id', id)
    .maybeSingle()

  if (existing) {
    // Back-fill email if it's missing (old accounts)
    if (!existing.email && email) {
      await supabase.from('profiles').update({ email }).eq('id', id)
    }
    return existing
  }

  // Profile missing — create it now
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id, username: fallbackUsername, email: email || '' })
    .select()
    .single()

  if (error?.code === '23505') {
    // Username collision — append short uid suffix
    const safe = `${fallbackUsername}_${id.slice(0, 5)}`
    await supabase
      .from('profiles')
      .insert({ id, username: safe, email: email || '' })
  }

  return data
}
