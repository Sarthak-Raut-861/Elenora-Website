import type {
  Allocation,
  Asset,
  AssetCreatePayload,
  Booking,
  Category,
  DryCleaner,
  DryCleaningRequest,
  LoginPayload,
  LoginResponse,
  Payment,
  PaymentBreakdown,
  BlockedDateRanges,
  RegisterPayload,
  RentalPlan,
  ReturnRecord,
  Role,
  BuyOrderPayload,
  UserUpdatePayload,
  User,
  UserHistoryResponse,
  TrackingPageData,
  RecentActivityItem,
} from './types'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
    : typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000/api'
    : 'https://elenora-website.onrender.com/api'
const TOKEN_KEY = 'asset_tracking_access_token'

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = API_BASE_URL.replace(/\/api\/?$/, '')
  const cleanPath = url.startsWith('/') ? url : `/${url}`
  return `${base}${cleanPath}`
}

function normalizeAsset(asset: Asset): Asset {
  if (!asset) return asset
  const resolvedMain = resolveMediaUrl(asset.image_url)
  let resolvedGallery: string[] = []
  if (asset.gallery_images) {
    try {
      const parsed = typeof asset.gallery_images === 'string' ? JSON.parse(asset.gallery_images) : asset.gallery_images
      if (Array.isArray(parsed)) {
        resolvedGallery = parsed.map((img: string) => resolveMediaUrl(img))
      }
    } catch {
      // keep existing
    }
  }

  let resolvedVariants = asset.color_variants
  if (asset.color_variants) {
    try {
      const parsed = typeof asset.color_variants === 'string' ? JSON.parse(asset.color_variants) : asset.color_variants
      if (Array.isArray(parsed)) {
        const mapped = parsed.map((v: any) => ({
          ...v,
          image_url: resolveMediaUrl(v.image_url),
        }))
        resolvedVariants = JSON.stringify(mapped)
      }
    } catch {
      // keep existing
    }
  }

  return {
    ...asset,
    image_url: resolvedMain || asset.image_url,
    gallery_images: resolvedGallery.length > 0 ? JSON.stringify(resolvedGallery) : asset.gallery_images,
    color_variants: resolvedVariants,
  }
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    throw new ApiError(
      `API endpoint returned HTML instead of JSON (${response.status}). Please verify service routing.`,
      response.status
    )
  }

  const data = (await response.json().catch(() => null)) as
    | T
    | { detail?: string | Array<{ msg?: string; loc?: Array<string | number> }> }
    | null

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    if (data && typeof data === 'object' && 'detail' in data) {
      const detail = data.detail
      if (typeof detail === 'string') {
        message = detail
      } else if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0]
        if (first?.msg) {
          const location = Array.isArray(first.loc) ? first.loc.join('.') : ''
          message = location ? `${location}: ${first.msg}` : first.msg
        }
      }
    }

    throw new ApiError(message, response.status)
  }

  if (data === null) {
    throw new ApiError(`Invalid or empty response from server (${response.status})`, response.status)
  }

  return data as T
}

export async function request<T>(
  path: string,
  options?: {
    method?: string
    token?: string | null
    body?: unknown
  },
): Promise<T> {
  const storedToken = localStorage.getItem(TOKEN_KEY)
  let activeToken = storedToken ?? options?.token ?? null

  const runFetch = async (token: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return fetch(`${API_BASE_URL}${path}`, {
      method: options?.method ?? 'GET',
      headers,
      credentials: 'include',
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })
  }

  let response = await runFetch(activeToken)

  const canRefresh = !['/auth/login', '/auth/register', '/auth/refresh'].includes(path)

  if (response.status === 401 && canRefresh) {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })

    if (refreshResponse.ok) {
      const refreshed = (await refreshResponse.json()) as LoginResponse
      activeToken = refreshed.access_token
      localStorage.setItem(TOKEN_KEY, activeToken)
      response = await runFetch(activeToken)
    }
  }

  return parseResponse<T>(response)
}

export const api = {
  baseUrl: API_BASE_URL,
  login: (payload: LoginPayload) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: payload }),
  register: (payload: RegisterPayload) =>
    request<User>('/auth/register', { method: 'POST', body: payload }),
  logout: (token: string | null) => request<{ detail: string }>('/auth/logout', { method: 'POST', token }),
  refresh: () => request<LoginResponse>('/auth/refresh', { method: 'POST' }),
  me: (token: string) => request<User>('/users/me', { token }),
  updateMe: (token: string, payload: UserUpdatePayload) =>
    request<User>('/users/me', { method: 'PUT', token, body: payload }),
  changePassword: (token: string, payload: { current_password: string; new_password: string }) =>
    request<{ detail: string }>('/auth/change-password', { method: 'POST', token, body: payload }),

  listAssets: async (token: string | null) => {
    const list = await request<Asset[]>('/assets/', { token: token || null })
    return Array.isArray(list) ? list.map(normalizeAsset) : []
  },
  getAsset: async (token: string | null, assetId: number) => {
    const item = await request<Asset>(`/assets/${assetId}`, { token: token || null })
    return normalizeAsset(item)
  },
  listAssetsFiltered: async (
    token: string | null,
    params?: { name?: string; category_name?: string; status?: string; listing_type?: string },
  ) => {
    const query = new URLSearchParams()
    if (params?.name) query.set('name', params.name)
    if (params?.category_name) query.set('category_name', params.category_name)
    if (params?.status) query.set('status', params.status)
    if (params?.listing_type) query.set('listing_type', params.listing_type)
    const q = query.toString()
    const list = await request<Asset[]>(`/assets/${q ? `?${q}` : ''}`, { token: token || null })
    return Array.isArray(list) ? list.map(normalizeAsset) : []
  },
  updateAsset: (
    token: string,
    assetId: number,
    payload: {
      name?: string
      description?: string
      image_url?: string | null
      category_id?: number
      status?: string
      is_active?: boolean
      is_in_dry_cleaning?: boolean
      listing_type?: 'both' | 'rent' | 'buy'
      buy_price?: number | null
      rental_price?: number | null
      sizes?: string | null
      color_variants?: string | null
      gallery_images?: string | null
      update_all_units?: boolean
    },
  ) => request<Asset>(`/assets/${assetId}`, { method: 'PATCH', token, body: payload }),
  deleteAsset: (token: string, assetId: number) =>
    request<void>(`/assets/${assetId}`, { method: 'DELETE', token }),
  addAssetStock: (token: string, assetId: number, quantity: number) =>
    request<Asset[]>(`/assets/${assetId}/add-stock`, { method: 'POST', token, body: { quantity } }),
  deleteAssetGroup: (token: string, assetId: number) =>
    request<void>(`/assets/group/${assetId}`, { method: 'DELETE', token }),

  listCategories: (token: string | null) => request<Category[]>('/categories/', { token: token || null }),
  createCategory: (token: string, payload: { name: string }) =>
    request<Category>('/categories/', { method: 'POST', token, body: payload }),
  updateCategory: (token: string, categoryId: number, payload: { name: string }) =>
    request<Category>(`/categories/${categoryId}`, { method: 'PATCH', token, body: payload }),
  deleteCategory: (token: string, categoryId: number) =>
    request<void>(`/categories/${categoryId}`, { method: 'DELETE', token }),

  listRentalPlans: (token?: string | null) => request<RentalPlan[]>('/rental-plans/', { token: token || null }),
  createRentalPlan: (
    token: string,
    payload: {
      name: string
      duration_days: number
      daily_rate: number
      deposit_amount: number
      daily_fine_rate: number
      damage_fee: number
    },
  ) => request<RentalPlan>('/rental-plans/', { method: 'POST', token, body: payload }),
  updateRentalPlan: (
    token: string,
    planId: number,
    payload: Partial<{
      name: string
      duration_days: number
      daily_rate: number
      deposit_amount: number
      daily_fine_rate: number
      damage_fee: number
      is_active: boolean
    }>,
  ) => request<RentalPlan>(`/rental-plans/${planId}`, { method: 'PATCH', token, body: payload }),
  deleteRentalPlan: (token: string, planId: number) =>
    request<void>(`/rental-plans/${planId}`, { method: 'DELETE', token }),

  createBuyOrder: (token: string, payload: BuyOrderPayload) =>
    request<Booking>('/bookings/buy', { method: 'POST', token, body: payload }),
  createBooking: (
    token: string,
    payload: {
      rental_plan_id: number
      pickup_date: string
      category_id?: number | null
      requested_asset_id?: number | null
      aadhaar_number?: string
      pan_number?: string
      size?: string
    }
  ) => request<Booking>('/bookings/', { method: 'POST', token, body: payload }),
  getBlockedDatesForAsset: (token: string | null, assetId: number) =>
    request<BlockedDateRanges>(`/bookings/assets/${assetId}/blocked-dates`, { token }),
  listBookings: (token: string) => request<Booking[]>('/bookings/', { token }),
  listAdminBookings: (token: string) => request<Booking[]>('/bookings/admin/all', { token }),
  cancelBooking: (token: string, bookingId: number) =>
    request<Booking>(`/bookings/${bookingId}`, { method: 'DELETE', token }),
  requestReturn: (token: string, bookingId: number) =>
    request<Booking>(`/bookings/${bookingId}/request-return`, { method: 'PATCH', token }),
  refreshBookingStatuses: (token: string) =>
    request<{ message: string; picked_up_count: number; overdue_count: number }>('/bookings/admin/refresh-statuses', { method: 'POST', token }),
  markPickedUp: (token: string, bookingId: number) =>
    request<Booking>(`/bookings/admin/${bookingId}/mark-picked-up`, { method: 'PATCH', token }),

  payDeposit: (token: string, bookingId: number) =>
    request<Payment>(`/payments/deposit/${bookingId}`, { method: 'POST', token }),
  payRent: (token: string, bookingId: number) =>
    request<Payment>(`/payments/rent/${bookingId}`, { method: 'POST', token }),

  listUsers: (token: string, params?: { role?: string; is_active?: boolean }) => {
    const query = new URLSearchParams()
    if (params?.role) query.set('role', params.role)
    if (params?.is_active !== undefined) query.set('is_active', String(params.is_active))
    const q = query.toString()
    return request<User[]>(`/users/${q ? `?${q}` : ''}`, { token })
  },
  updateUserById: (token: string, userId: number, payload: UserUpdatePayload) =>
    request<User>(`/users/${userId}`, { method: 'PUT', token, body: payload }),
  createUserByAdmin: (token: string, payload: { full_name: string; email: string; password: string; role: Role; phone?: string }) =>
    request<User>('/users/', { method: 'POST', token, body: payload }),
  setUserRole: (token: string, userId: number, role: 'admin' | 'staff' | 'user') =>
    request<User>(`/users/${userId}/role`, { method: 'PATCH', token, body: { role } }),
  setUserActive: (token: string, userId: number, is_active: boolean) =>
    request<User>(`/users/${userId}/activate`, { method: 'PATCH', token, body: { is_active } }),
  getUserHistory: (token: string, userId: number) =>
    request<UserHistoryResponse>(`/users/${userId}/history`, { token }),

  allocateAsset: (token: string, bookingId: number, asset_id: number) =>
    request<Allocation>(`/admin/allocate/${bookingId}`, {
      method: 'POST',
      token,
      body: { asset_id },
    }),
  rejectBookingByAdmin: (token: string, bookingId: number) =>
    request<Booking>(`/admin/bookings/${bookingId}/reject`, {
      method: 'PATCH',
      token,
    }),
  listAllocations: (token: string) => request<Allocation[]>('/admin/allocations', { token }),
  processReturn: (
    token: string,
    bookingId: number,
    returned_at: string,
    damage_amount: number = 0,
    damage_notes: string | null = null,
    send_for_dry_cleaning: boolean = false,
  ) =>
    request<ReturnRecord>(`/admin/returns/${bookingId}`, {
      method: 'POST',
      token,
      body: { returned_at, damage_amount, damage_notes, send_for_dry_cleaning },
    }),
  getPaymentBreakdown: (token: string, bookingId: number) =>
    request<PaymentBreakdown>(`/payments/breakdown/${bookingId}`, { token }),

  createAsset: (token: string, payload: AssetCreatePayload) =>
    request<Asset[]>('/assets/', { method: 'POST', token, body: payload }),

  uploadMultipleImages: async (token: string, files: File[]): Promise<string[]> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    const res = await fetch(`${API_BASE_URL}/assets/upload-images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!res.ok) throw new Error('Failed to upload images')
    const data = await res.json()
    return (data.image_urls || []).map((u: string) => resolveMediaUrl(u))
  },

  uploadSingleImage: async (token: string, file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_BASE_URL}/assets/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!res.ok) throw new Error('Failed to upload image')
    const data = await res.json()
    return resolveMediaUrl(data.image_url)
  },

  // Dry Cleaning
  getDryCleaningPendingSend: (token: string) =>
    request<DryCleaningRequest[]>('/dry-cleaning/pending-send', { token }),
  listDryCleaningRequests: (token: string, status?: string) => {
    const q = status ? `?status=${status}` : ''
    return request<DryCleaningRequest[]>(`/dry-cleaning/${q}`, { token })
  },
  listDryCleaningPortalJobs: (token: string) =>
    request<DryCleaningRequest[]>('/dry-cleaning/portal/my-jobs', { token }),
  sendToDryCleaner: (
    token: string,
    payload: {
      asset_id: number; booking_id?: number | null
      dry_cleaner_name?: string; dry_cleaner_id?: number
      notes?: string; admin_notes?: string
      priority?: string; expected_by?: string
    },
  ) => request<DryCleaningRequest>('/dry-cleaning/', { method: 'POST', token, body: payload }),
  startCleaning: (token: string, requestId: number) =>
    request<DryCleaningRequest>(`/dry-cleaning/${requestId}/start`, { method: 'POST', token }),
  markCleaningDone: (
    token: string, requestId: number,
    payload?: { cleaner_notes?: string; actual_cost?: number; rating?: number },
  ) => request<DryCleaningRequest>(`/dry-cleaning/${requestId}/complete`, { method: 'POST', token, body: payload ?? {} }),
  updateDryCleaningRequest: (
    token: string, requestId: number,
    payload: { dry_cleaner_name?: string; notes?: string; admin_notes?: string; priority?: string },
  ) => request<DryCleaningRequest>(`/dry-cleaning/${requestId}`, { method: 'PATCH', token, body: payload }),
  createDryCleanerUser: (
    token: string,
    payload: { full_name: string; email: string; password: string; phone?: string },
  ) => request<User>('/users/dry-cleaner', { method: 'POST', token, body: payload }),

  // Dry Cleaner Directory
  listDryCleaners: (token: string, activeOnly?: boolean) =>
    request<DryCleaner[]>(`/dry-cleaning/cleaners${activeOnly ? '?active_only=true' : ''}`, { token }),
  createDryCleaner: (token: string, payload: Partial<DryCleaner> & { name: string }) =>
    request<DryCleaner>('/dry-cleaning/cleaners', { method: 'POST', token, body: payload }),
  updateDryCleaner: (token: string, id: number, payload: Partial<DryCleaner>) =>
    request<DryCleaner>(`/dry-cleaning/cleaners/${id}`, { method: 'PATCH', token, body: payload }),
  deleteDryCleaner: (token: string, id: number) =>
    request<void>(`/dry-cleaning/cleaners/${id}`, { method: 'DELETE', token }),

  // Tracking
  getBookingTracking: (token: string, bookingId: number) =>
    request<TrackingPageData>(`/tracking/bookings/${bookingId}`, { token }),
  getRecentActivity: (token: string, limit = 10) =>
    request<RecentActivityItem[]>(`/tracking/admin/recent-activity?limit=${limit}`, { token }),
}
