import { supabase } from './supabase'

export async function attachProfiles(rows, columns = 'id, username, avatar_url') {
  if (!rows?.length) return rows || []

  const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))]
  if (userIds.length === 0) return rows

  const { data, error } = await supabase
    .from('profiles')
    .select(columns)
    .in('id', userIds)

  if (error) throw error

  const profilesById = new Map((data || []).map(profile => [profile.id, profile]))
  return rows.map(row => ({
    ...row,
    profiles: profilesById.get(row.user_id) || null,
  }))
}
