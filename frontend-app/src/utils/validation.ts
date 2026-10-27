// ── Validation utilities ──────────────────────────────────────────────────────

export const validateName = (value: string): string | null => {
  if (!value || !value.trim()) return 'Name is required'
  if (value.trim().length < 2) return 'Name must be at least 2 characters'
  if (value.trim().length > 50) return 'Name must be at most 50 characters'
  if (!/^[a-zA-Z\s]+$/.test(value)) return 'Name can only contain letters'
  return null
}

export const validateEmail = (value: string): string | null => {
  if (!value || !value.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address'
  return null
}

export const validatePassword = (value: string): string | null => {
  if (!value) return 'Password is required'
  if (value.length < 8) return 'Password must be 8+ chars with uppercase, number & special character'
  if (!/(?=.*[A-Z])/.test(value)) return 'Password must be 8+ chars with uppercase, number & special character'
  if (!/(?=.*\d)/.test(value)) return 'Password must be 8+ chars with uppercase, number & special character'
  if (!/(?=.*[@$!%*?&])/.test(value)) return 'Password must be 8+ chars with uppercase, number & special character'
  return null
}

export const validatePhone = (value: string): string | null => {
  if (!value || !value.trim()) return 'Phone is required'
  const digits = value.replace(/\s/g, '')
  if (!/^[6-9]\d{9}$/.test(digits)) return 'Enter a valid 10-digit Indian mobile number'
  return null
}

export const validateAssetName = (value: string): string | null => {
  if (!value || !value.trim()) return 'Asset name is required'
  if (value.trim().length < 2) return 'Asset name must be at least 2 characters'
  if (!/^[a-zA-Z0-9\s\-]+$/.test(value)) return 'Only letters, numbers, spaces and hyphens allowed'
  return null
}

export const validateDescription = (value: string, min = 10): string | null => {
  if (!value || !value.trim()) return 'Description is required'
  if (value.trim().length < min) return `Description must be at least ${min} characters`
  return null
}

export const validatePositiveNumber = (value: string | number, label = 'Value'): string | null => {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (value === '' || value === null || value === undefined || isNaN(n)) return `${label} is required`
  if (n <= 0) return `${label} must be greater than 0`
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) return `${label} can have at most 2 decimal places`
  return null
}

export const validateNonNegativeNumber = (value: string | number, label = 'Value'): string | null => {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (value === '' || value === null || value === undefined || isNaN(n)) return `${label} is required`
  if (n < 0) return `${label} must be 0 or greater`
  return null
}

export const validatePositiveInteger = (value: string | number, label = 'Value'): string | null => {
  const n = typeof value === 'string' ? parseInt(value, 10) : value
  if (value === '' || value === null || value === undefined || isNaN(n)) return `${label} is required`
  if (!Number.isInteger(n) || n <= 0) return `${label} must be a positive whole number`
  return null
}

export const validateMessage = (value: string): string | null => {
  if (!value || !value.trim()) return 'Message is required'
  if (value.trim().length < 20) return 'Message must be at least 20 characters'
  if (value.length > 500) return 'Message must be at most 500 characters'
  return null
}
