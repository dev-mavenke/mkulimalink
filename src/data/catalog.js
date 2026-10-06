/**
 * The vocabulary of the trade. Units are the ones farmers and buyers actually
 * quote in — a 90 kg gunia of potatoes, a 64 kg crate of tomatoes — not a
 * tidied-up metric abstraction, because a mismatch here is how a deal goes
 * wrong.
 */

export const UNITS = {
  crate: { label: 'Crate', short: 'crate', kg: 64 },
  gunia: { label: 'Bag (gunia)', short: '90 kg bag', kg: 90 },
  net: { label: 'Net', short: 'net', kg: 13 },
  kg: { label: 'Kilogram', short: 'kg', kg: 1 },
  bunch: { label: 'Bunch', short: 'bunch', kg: 18 },
  tray: { label: 'Tray', short: 'tray', kg: 1.9 },
}

export const GRADES = [
  { id: 'g1', label: 'Grade 1', note: 'Uniform size, no blemish' },
  { id: 'g2', label: 'Grade 2', note: 'Sound, some size variation' },
  { id: 'ungraded', label: 'Ungraded', note: 'Straight from the field' },
]

export const CROPS = [
  { id: 'tomato', name: 'Tomato', category: 'Vegetables', unit: 'crate' },
  { id: 'potato', name: 'Potato', category: 'Roots', unit: 'gunia' },
  { id: 'onion', name: 'Red onion', category: 'Vegetables', unit: 'net' },
  { id: 'cabbage', name: 'Cabbage', category: 'Vegetables', unit: 'gunia' },
  { id: 'kale', name: 'Kale (sukuma)', category: 'Greens', unit: 'gunia' },
  { id: 'avocado', name: 'Hass avocado', category: 'Fruit', unit: 'crate' },
  { id: 'banana', name: 'Banana', category: 'Fruit', unit: 'bunch' },
  { id: 'maize', name: 'Dry maize', category: 'Grain', unit: 'gunia' },
  { id: 'beans', name: 'Rosecoco beans', category: 'Legumes', unit: 'gunia' },
  { id: 'capsicum', name: 'Capsicum', category: 'Vegetables', unit: 'crate' },
  { id: 'eggs', name: 'Eggs', category: 'Livestock', unit: 'tray' },
  { id: 'passion', name: 'Passion fruit', category: 'Fruit', unit: 'crate' },
]

export const CATEGORIES = [...new Set(CROPS.map((crop) => crop.category))].sort()

/** Counties that actually supply Nairobi and Mombasa in volume. */
export const COUNTIES = [
  'Bomet',
  'Bungoma',
  'Kiambu',
  'Kirinyaga',
  'Kisii',
  'Machakos',
  'Meru',
  'Murang’a',
  'Nakuru',
  'Narok',
  'Nyandarua',
  'Nyeri',
  'Taita Taveta',
  'Trans Nzoia',
  'Uasin Gishu',
]

/** Reference markets whose daily sheets the board is compared against. */
export const REFERENCE_MARKETS = [
  { id: 'wakulima', name: 'Wakulima', city: 'Nairobi' },
  { id: 'kongowea', name: 'Kongowea', city: 'Mombasa' },
  { id: 'kibuye', name: 'Kibuye', city: 'Kisumu' },
]

export function cropById(id) {
  return CROPS.find((crop) => crop.id === id)
}

export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id)
}
