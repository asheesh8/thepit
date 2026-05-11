import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missingEnvMessage = 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to your local env to connect The Pit.'

function missingResponse(data = null) {
  return { data, error: { message: missingEnvMessage } }
}

function createMissingBuilder() {
  const builder = {}
  const chain = () => builder
  const resolve = async () => missingResponse()

  ;[
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'or',
    'order', 'limit', 'single', 'maybeSingle', 'match',
  ].forEach(method => {
    builder[method] = method === 'single' || method === 'maybeSingle' ? resolve : chain
  })
  builder.then = (onFulfilled, onRejected) => Promise.resolve(missingResponse([])).then(onFulfilled, onRejected)
  return builder
}

function createMissingSupabaseClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => missingResponse(),
      signUp: async () => missingResponse(),
      signInWithOAuth: async () => missingResponse(),
      signOut: async () => ({ error: null }),
    },
    from: () => createMissingBuilder(),
    storage: {
      from: () => ({
        upload: async () => missingResponse(),
        remove: async () => missingResponse(),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
      subscribe: () => ({}),
    }),
    removeChannel: () => {},
  }
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMissingSupabaseClient()
