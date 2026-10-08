import { PLATFORM_TOTALS, seedBoardRows } from '@/data/seed/board'
import { hydrateListing, seedListings } from '@/data/seed/listings'
import { deriveBoardSummary } from '@/data/derive'

const API = 'http://localhost:5000'

function parseDay(value) {
  return new Date(`${value}T00:00:00`)
}

function assemble({ boardRows, listings, boardDate }) {
  const boardIndex = new Map(boardRows.map((row) => [row.id, row]))
  const listingIndex = new Map(listings.map((listing) => [listing.id, listing]))

  return {
    boardRows,
    boardDate,
    boardSummary: deriveBoardSummary(boardRows, PLATFORM_TOTALS),
    boardRowFor: (cropId) => boardIndex.get(cropId),
    listings,
    listingById: (id) => listingIndex.get(id),
  }
}

export function seedMarket() {
  return {
    source: 'seed',
    ...assemble({
      boardRows: seedBoardRows(),
      listings: seedListings(),
      boardDate: new Date(),
    }),
  }
}

export function emptyMarket() {
  return {
    source: null,
    ...assemble({ boardRows: [], listings: [], boardDate: null }),
  }
}

export async function loadMarket() {
  const res = await fetch(`${API}/api/market`)
  const body = await res.json()
  if (!res.ok) throw new Error(body.message || 'Could not load the market')

  const boardRows = body.boardRows.map((row) => ({
    ...row,
    history: (row.history ?? []).map((point) => ({
      ...point,
      date: parseDay(point.date),
    })),
  }))

  const listings = body.listings.map((row) =>
    hydrateListing({
      ...row,
      postedAt: new Date(row.postedAt),
    }),
  )

  return {
    source: 'neon',
    ...assemble({
      boardRows,
      listings,
      boardDate: body.boardDate ? parseDay(body.boardDate) : new Date(),
    }),
  }
}

export async function createListing(profile, form) {
  const res = await fetch(`${API}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      farmerId: profile.id,
      farmerName: profile.name,
      crop: form.crop,
      grade: form.grade,
      quantity: Number(form.quantity),
      price: Number(form.price),
      county: form.county,
      ward: form.ward.trim(),
      readyIn: Number(form.readyIn),
      note: form.note.trim() || null,
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message || 'Could not post the lot')
  return { local: false, id: body.id }
}