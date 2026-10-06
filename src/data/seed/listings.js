import { UNITS, cropById } from '@/data/catalog'

/**
 * Open lots, seeded. The fallback for `public.listings`; `hoursAgo` resolves
 * against load time so the freshness stamps stay honest while you're developing.
 *
 * These farmers are not among the seeded accounts, and deliberately so: the two
 * sets stand in for different parts of the market, and inventing links between
 * them would have put nine fake relationships into the schema on day one. In
 * Postgres a lot carries `farmer_id` when there is an account behind it and the
 * denormalised name when there isn't.
 */

const SEED = [
  {
    id: 'lot-2841',
    crop: 'tomato',
    grade: 'g1',
    quantity: 42,
    price: 4900,
    county: 'Kirinyaga',
    ward: 'Mwea',
    farmer: { name: 'Grace Wanjiku', lots: 37, rating: 4.9 },
    readyIn: 1,
    hoursAgo: 0.6,
    note: 'Picked this morning, still firm. Can load onto a 3-tonne pickup.',
  },
  {
    id: 'lot-2839',
    crop: 'potato',
    grade: 'g1',
    quantity: 120,
    price: 3250,
    county: 'Nyandarua',
    ward: 'Ol Kalou',
    farmer: { name: 'Kipchoge Farms', lots: 112, rating: 4.8 },
    readyIn: 0,
    hoursAgo: 3,
    note: 'Shangi variety, cured four days. Loading bay on the tarmac.',
  },
  {
    id: 'lot-2836',
    crop: 'avocado',
    grade: 'g1',
    quantity: 64,
    price: 2680,
    county: 'Murang’a',
    ward: 'Kandara',
    farmer: { name: 'Njeri Mwangi', lots: 21, rating: 5 },
    readyIn: 2,
    hoursAgo: 5,
    note: 'Export-reject Hass — full size, dry matter above 24%.',
  },
  {
    id: 'lot-2834',
    crop: 'kale',
    grade: 'g2',
    quantity: 30,
    price: 1210,
    county: 'Kiambu',
    ward: 'Limuru',
    farmer: { name: 'Samuel Otieno', lots: 58, rating: 4.6 },
    readyIn: 0,
    hoursAgo: 8,
    note: 'Cut to order — tell me the morning you want it and I harvest at 5am.',
  },
  {
    id: 'lot-2830',
    crop: 'onion',
    grade: 'g1',
    quantity: 210,
    price: 1420,
    county: 'Narok',
    ward: 'Suswa',
    farmer: { name: 'Naserian Cooperative', lots: 240, rating: 4.9 },
    readyIn: 0,
    hoursAgo: 22,
    note: 'Cooperative lot from nine members. Graded and netted on site.',
  },
  {
    id: 'lot-2828',
    crop: 'capsicum',
    grade: 'g1',
    quantity: 18,
    price: 5500,
    county: 'Meru',
    ward: 'Timau',
    farmer: { name: 'Mutuma Kariuki', lots: 14, rating: 4.7 },
    readyIn: 1,
    hoursAgo: 27,
    note: 'Mixed red and yellow, greenhouse grown. Cold room available.',
  },
  {
    id: 'lot-2825',
    crop: 'beans',
    grade: 'g1',
    quantity: 45,
    price: 11400,
    county: 'Bomet',
    ward: 'Longisa',
    farmer: { name: 'Chepkoech Ngeno', lots: 31, rating: 4.8 },
    readyIn: 0,
    hoursAgo: 44,
    note: 'Dried to 13% moisture and sorted twice. Moisture meter reading on request.',
  },
  {
    id: 'lot-2821',
    crop: 'maize',
    grade: 'g2',
    quantity: 300,
    price: 4550,
    county: 'Trans Nzoia',
    ward: 'Kitale',
    farmer: { name: 'Barasa Holdings', lots: 96, rating: 4.5 },
    readyIn: 3,
    hoursAgo: 60,
    note: 'Aflatoxin tested, certificate attached to the lot.',
  },
  {
    id: 'lot-2818',
    crop: 'banana',
    grade: 'g1',
    quantity: 88,
    price: 1000,
    county: 'Kisii',
    ward: 'Nyaribari',
    farmer: { name: 'Moraa Nyakundi', lots: 44, rating: 4.7 },
    readyIn: 1,
    hoursAgo: 73,
    note: 'Tissue-culture bananas, cut green for a two-day haul.',
  },
]

/**
 * Fills in everything derived from the crop catalogue. Shared by both sources:
 * live rows arrive with the same fields a lot is stored with, and the unit maths
 * happens here either way so there is one implementation of it.
 */
export function hydrateListing(entry) {
  const crop = cropById(entry.crop)
  const unit = UNITS[crop.unit]

  return {
    ...entry,
    cropName: crop.name,
    category: crop.category,
    unit,
    totalKg: Math.round(entry.quantity * unit.kg),
    total: entry.quantity * entry.price,
  }
}

export function seedListings() {
  return SEED.map((entry) =>
    hydrateListing({
      ...entry,
      postedAt: new Date(Date.now() - entry.hoursAgo * 3_600_000),
    }),
  )
}

export { SEED as LISTING_SEED }
