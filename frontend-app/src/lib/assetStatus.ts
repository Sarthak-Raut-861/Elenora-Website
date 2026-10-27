import type { BlockedDateRange } from '../types'

// Internal statuses that should never be shown to users verbatim
const INTERNAL_STATUSES = ['dry_cleaning', 'dry_cleaning_pending', 'maintenance', 'in_review']

export interface UserFacingStatus {
  label: string
  color: string
  bg: string
  dotColor: string
  canBook: boolean
}

/**
 * Maps raw asset data to a user-friendly status.
 * Admin pages should NOT use this — they show raw statuses directly.
 */
export function getUserFacingStatus(
  assetStatus: string,
  isInDryCleaning: boolean,
  isActive: boolean,
  blocked: BlockedDateRange[],
): UserFacingStatus {
  // Inactive assets are simply unavailable
  if (!isActive) {
    return { label: 'Unavailable', color: '#dc2626', bg: '#fef2f2', dotColor: '#dc2626', canBook: false }
  }

  // Any internal operational status → "Coming Soon" to users
  if (isInDryCleaning || INTERNAL_STATUSES.includes(assetStatus)) {
    return { label: 'Coming Soon', color: '#d97706', bg: '#fffbeb', dotColor: '#f59e0b', canBook: false }
  }

  // Check date-based availability (next 365 days)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let hasFreeDates = false
  for (let i = 0; i < 365; i++) {
    const check = new Date(today)
    check.setDate(today.getDate() + i)
    const isBlocked = blocked.some(r => {
      const s = new Date(String(r.from_date)); s.setHours(0,0,0,0)
      const e = new Date(String(r.to_date));   e.setHours(0,0,0,0)
      return check >= s && check <= e
    })
    if (!isBlocked) { hasFreeDates = true; break }
  }

  if (!hasFreeDates && blocked.length > 0) {
    // All dates in next 365 days are taken, but user can still book further out
    return { label: 'Fully Booked', color: '#dc2626', bg: '#fef2f2', dotColor: '#dc2626', canBook: true }
  }

  return { label: 'Available', color: '#16a34a', bg: '#f0fdf4', dotColor: '#22c55e', canBook: true }
}

/**
 * Simpler version for catalog cards — no blocked-dates data needed,
 * just hides internal statuses from the "In Stock / Out of Stock" line.
 */
export function getCatalogAvailabilityLabel(
  isAvailable: boolean,
  isInDryCleaning: boolean,
  assetStatus: string,
): { label: string; color: string } {
  if (isInDryCleaning || INTERNAL_STATUSES.includes(assetStatus)) {
    return { label: 'Coming Soon', color: '#d97706' }
  }
  return isAvailable
    ? { label: 'In Stock',      color: '#03a685' }
    : { label: 'Out of Stock',  color: '#ff6161' }
}
