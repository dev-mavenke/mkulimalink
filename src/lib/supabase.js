import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missing = Object.entries({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anonKey })
  .filter(([, value]) => !value)
  .map(([key]) => key)

/**
 * True when both Supabase keys are present.
 *
 * When it is false the app runs on seeded data and a local demo session rather
 * than throwing at boot, so a new contributor can clone, `npm run dev`, and see
 * the whole interface before they have been given project credentials. The
 * operator dashboard reports which of the two you are in — see `systemChecks`.
 */
export const supabaseReady = missing.length === 0

if (!supabaseReady && import.meta.env.DEV) {
  console.info(
    `[mkulimalink] Running on seeded data — missing ${missing.join(', ')}. ` +
      'Copy .env.example to .env to connect the project.',
  )
}

/**
 * Null when unconfigured, so every call site has to decide what it does without a
 * backend instead of failing at the first await. `supabaseReady` is the guard.
 */
export const supabase = supabaseReady
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The session lives in localStorage; nothing here is read from the URL
        // except the recovery/confirm links, which land on /signin.
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

/**
 * Postgres and GoTrue error codes, restated as something a person can act on.
 *
 * `42501` is the SQLSTATE the operator functions raise — insufficient_privilege.
 * It is also what RLS returns when a policy refuses a write, which is why the
 * wording covers both without guessing which one happened.
 */
const MESSAGES = {
  invalid_credentials: 'Email or password doesn’t match an account.',
  email_not_confirmed: 'Confirm your email address first — check your inbox.',
  user_already_exists: 'That email already has an account. Sign in instead.',
  email_exists: 'That email already has an account. Sign in instead.',
  weak_password: 'Use at least six characters.',
  over_request_rate_limit: 'Too many attempts. Wait a minute and try again.',
  over_email_send_rate_limit: 'Too many emails sent. Wait a few minutes.',
  validation_failed: 'Check the email address and try again.',
  42501: 'You don’t have permission to do that.',
  PGRST301: 'Your session expired. Sign in again.',
}

export function describeError(error) {
  if (!error) return null
  const key = error.code ?? error.status
  if (MESSAGES[key]) return MESSAGES[key]
  if (error.message?.includes('Failed to fetch')) {
    return 'Can’t reach the network. Check your connection.'
  }
  return error.message ?? 'Something went wrong. Try again.'
}
