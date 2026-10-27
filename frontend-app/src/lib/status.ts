/**
 * Shared booking status color map — single source of truth.
 * Used by BookingsPage, admin/Operations, admin/Users.
 */
export const bookingStatusColor: Record<string, string> = {
  pending:          'bg-yellow-100 text-yellow-700 border-yellow-200',
  booked:           'bg-blue-100 text-blue-700 border-blue-200',
  allocated:        'bg-violet-100 text-violet-700 border-violet-200',
  rent_paid:        'bg-purple-100 text-purple-700 border-purple-200',
  ready_for_pickup: 'bg-orange-100 text-orange-700 border-orange-200',
  return_requested: 'bg-orange-100 text-orange-600 border-orange-200',
  picked_up:        'bg-green-100 text-green-700 border-green-200',
  returned:         'bg-gray-100 text-gray-600 border-gray-200',
  overdue:          'bg-red-100 text-red-700 border-red-200',
  cancelled:        'bg-gray-100 text-gray-400 border-gray-200',
}

export const assetStatusColor: Record<string, string> = {
  available: 'bg-green-100 text-green-700 border-green-200',
  booked: 'bg-blue-100 text-blue-700 border-blue-200',
  allocated: 'bg-violet-100 text-violet-700 border-violet-200',
  picked_up: 'bg-amber-100 text-amber-700 border-amber-200',
  returned: 'bg-gray-100 text-gray-600 border-gray-200',
}

/** Format a snake_case status string for display */
export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ')
}
