/**
 * Teaches plain Node the one Vite convention the data modules rely on: `@/…`
 * means `src/…`, and the extension is left off.
 *
 * Only the seed generator needs this. It exists so `supabase/seed.sql` can be
 * built from the same modules the app runs on, instead of a second copy of forty
 * five accounts that would drift the first time either was edited.
 */

const SRC = new URL('../src/', import.meta.url)

export function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('@/')) return nextResolve(specifier, context)
  return nextResolve(new URL(`${specifier.slice(2)}.js`, SRC).href, context)
}
