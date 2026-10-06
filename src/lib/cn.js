/**
 * Joins class names, dropping anything falsy.
 *
 * Deliberately not `clsx` + `tailwind-merge`: nothing in this app relies on
 * later classes beating earlier ones for the *same* property, so the extra
 * two dependencies would buy nothing.
 */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}
