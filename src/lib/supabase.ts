import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY: copy .env.example to .env.local and fill it in',
  )
}

// `pkce`, not auth-js's `implicit` default, and it is load-bearing here: the
// implicit flow returns the session as a URL *fragment*
// (`#access_token=...&refresh_token=...`), which is the same place HashRouter
// keeps the current route (see src/App.tsx). The two would fight over the
// fragment on every OAuth return, and whichever ran second would win --
// either the router parses a token blob as a route, or it rewrites the hash
// before detectSessionInUrl has read the tokens out of it. PKCE returns a
// `?code=` query parameter instead, leaving the fragment entirely to the
// router. It is also the better flow for a public browser client regardless:
// tokens never land in the URL, browser history, or a Referer header.
export const supabase = createClient(url, anonKey, {
  auth: { flowType: 'pkce' },
})
