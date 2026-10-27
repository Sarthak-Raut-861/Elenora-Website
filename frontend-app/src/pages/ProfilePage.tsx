import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  User, Lock, Eye, EyeOff, Save, Shield,
  Calendar, Camera, AlertCircle, Check,
} from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../auth-context'
import { Alert } from '../components/ui/Alert'
import { validateName, validatePhone, validatePassword } from '../utils/validation'

function FieldError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#ef4444', margin: '4px 0 0 0' }}>
      <AlertCircle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
      {message}
    </p>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string | undefined) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#e5e7eb' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label: '', color: '#e5e7eb' },
    { label: 'Weak', color: '#ef4444' },
    { label: 'Fair', color: '#f59e0b' },
    { label: 'Strong', color: '#22c55e' },
    { label: 'Very strong', color: '#16a34a' },
  ]
  return { score, ...map[score] }
}

// ── Shared input style helpers ────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 16px', fontSize: '15px', color: '#111827',
  border: '1.5px solid #e5e7eb', borderRadius: '10px',
  outline: 'none', background: '#fff',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}
function focusInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#3b82f6'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'
}
function blurInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#e5e7eb'
  e.currentTarget.style.boxShadow = 'none'
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', marginBottom: '6px',
      fontSize: '12px', fontWeight: 600, color: '#6b7280',
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {children}
    </label>
  )
}

// ── Password field with show/hide toggle ──────────────────────────────────────
function PasswordInput({
  value, onChange, placeholder, disabled, borderColor,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  borderColor?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••'}
        disabled={disabled}
        style={{ ...inputBase, paddingRight: '44px', borderColor: borderColor ?? '#e5e7eb' }}
        onFocus={focusInput}
        onBlur={blurInput}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#9ca3af', display: 'flex', alignItems: 'center',
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { token, user, refreshToken } = useAuth()

  // Profile form
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [profileMsg, setProfileMsg] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string | null>>({})
  const [profileTouched, setProfileTouched] = useState<Record<string, boolean>>({})

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwFieldErrors, setPwFieldErrors] = useState<Record<string, string | null>>({})
  const [pwTouched, setPwTouched] = useState<Record<string, boolean>>({})

  const validateProfileField = (field: string, value: string) => {
    let err: string | null = null
    if (field === 'fullName') err = validateName(value)
    if (field === 'phone' && value.trim()) err = validatePhone(value)
    setProfileFieldErrors(prev => ({ ...prev, [field]: err }))
    return err
  }

  const validatePwField = (field: string, value: string) => {
    let err: string | null = null
    if (field === 'newPassword') err = validatePassword(value)
    if (field === 'confirmPassword') err = value !== newPassword ? 'Passwords do not match' : null
    if (field === 'currentPassword') err = !value ? 'Current password is required' : null
    setPwFieldErrors(prev => ({ ...prev, [field]: err }))
    return err
  }

  const getProfileBorder = (field: string, value: string) => {
    if (!profileTouched[field]) return '#e5e7eb'
    return profileFieldErrors[field] ? '#ef4444' : value ? '#22c55e' : '#e5e7eb'
  }

  const getPwBorder = (field: string, value: string) => {
    if (!pwTouched[field]) return undefined
    return pwFieldErrors[field] ? '#ef4444' : value ? '#22c55e' : undefined
  }

  // Bookings for sidebar stats
  const bookingsQuery = useQuery({
    queryKey: ['bookings', token],
    queryFn: () => api.listBookings(token!),
    enabled: Boolean(token),
  })
  const bookings = bookingsQuery.data ?? []
  const totalBookings = bookings.length
  const completedBookings = bookings.filter(b => b.status === 'returned').length
  const activeBookings = bookings.filter(b => ['picked_up', 'overdue'].includes(b.status)).length

  const profileMutation = useMutation({
    mutationFn: () => api.updateMe(token!, { full_name: fullName, phone: phone || undefined }),
    onSuccess: async () => {
      await refreshToken()
      setProfileMsg('Profile updated!')
      setProfileError('')
      setTimeout(() => setProfileMsg(''), 3000)
    },
    onError: (err: Error) => setProfileError(err.message),
  })

  const passwordMutation = useMutation({
    mutationFn: () => api.changePassword(token!, { current_password: currentPassword, new_password: newPassword }),
    onSuccess: () => {
      setPwMsg('Password changed successfully!')
      setPwError('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwTouched({})
      setPwFieldErrors({})
      setTimeout(() => setPwMsg(''), 3000)
    },
    onError: (err: Error) => setPwError(err.message),
  })

  const passwordsMatch = newPassword === confirmPassword
  const passwordError = Boolean(newPassword && confirmPassword && !passwordsMatch)
  const pwFormValid = Boolean(currentPassword && newPassword && confirmPassword && passwordsMatch)
  const pwStrength = getPasswordStrength(newPassword)

  const pwBtnDisabled = passwordMutation.isPending || !pwFormValid

  const handleProfileSave = () => {
    const nameErr = validateName(fullName)
    const phoneErr = phone.trim() ? validatePhone(phone) : null
    setProfileFieldErrors({ fullName: nameErr, phone: phoneErr })
    setProfileTouched({ fullName: true, phone: true })
    if (nameErr || phoneErr) return
    profileMutation.mutate()
  }

  const handlePasswordUpdate = () => {
    const errs = {
      currentPassword: !currentPassword ? 'Current password is required' : null,
      newPassword: validatePassword(newPassword),
      confirmPassword: confirmPassword !== newPassword ? 'Passwords do not match' : null,
    }
    setPwFieldErrors(errs)
    setPwTouched({ currentPassword: true, newPassword: true, confirmPassword: true })
    if (Object.values(errs).some(Boolean)) return
    passwordMutation.mutate()
  }

  return (
    <>
      {/* Responsive style injected once */}
      <style>{`
        .profile-grid { display: grid; grid-template-columns: 280px 1fr; gap: 24px; align-items: start; }
        .profile-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr !important; }
          .profile-info-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: 'calc(100vh - 4rem)', background: 'var(--color-bg-primary)', padding: '32px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* ── Page header ── */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#111827', margin: 0 }}>My Profile</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>Manage your account details and security</p>
          </div>

          <div className="profile-grid">

            {/* ══ LEFT SIDEBAR ══ */}
            <div style={{
              background: 'var(--color-bg-card)', borderRadius: '16px', padding: '32px 24px',
              boxShadow: 'var(--shadow-sm)', textAlign: 'center',
              borderTop: '2px solid var(--color-accent-gold)',
              border: '1px solid var(--color-border)',
            }}>
              {/* Avatar */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%)', color: '#fff',
                  fontSize: '36px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '4px solid #fff',
                  boxShadow: '0 0 0 3px #dbeafe, 0 8px 24px rgba(26,58,107,0.2)',
                  margin: '0 auto',
                }}>
                  {getInitials(user?.full_name)}
                </div>
                {/* Camera overlay */}
                <div style={{
                  position: 'absolute', bottom: 2, right: 2,
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                  <Camera size={13} color="#2563eb" />
                </div>
              </div>

              {/* Name + email + role */}
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '16px 0 4px 0' }}>
                {user?.full_name || 'User'}
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{user?.email}</p>
              <span style={{
                display: 'inline-block', marginTop: '10px',
                background: '#eff6ff', color: '#2563eb',
                borderRadius: '20px', padding: '4px 14px',
                fontSize: '12px', fontWeight: 500,
              }}>
                {user?.role === 'admin' ? 'Admin' : 'Member'}
              </span>

              {/* Stats row */}
              <div style={{
                display: 'flex', borderTop: '1px solid #f1f5f9',
                marginTop: '24px', paddingTop: '20px',
              }}>
                {[
                  { value: totalBookings, label: 'Bookings' },
                  { value: completedBookings, label: 'Completed' },
                  { value: activeBookings, label: 'Active' },
                ].map((stat, i, arr) => (
                  <div key={stat.label} style={{
                    flex: 1,
                    borderRight: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
                    padding: '0 8px',
                  }}>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>{stat.value}</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0 0' }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Member since */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', marginTop: '20px',
                fontSize: '12px', color: '#9ca3af',
              }}>
                <Calendar size={13} />
                Member since May 2026
              </div>
            </div>

            {/* ══ RIGHT COLUMN ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* ── Personal Information Card ── */}
              <div style={{
                background: 'var(--color-bg-card)', borderRadius: '16px', padding: '28px 32px',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--color-border)',
              }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'rgba(201,169,110,0.1)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <User size={16} color="var(--color-accent-gold)" />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-primary)', margin: 0 }}>
                      Personal information
                    </h2>
                  </div>
                </div>

                {profileMsg && <Alert variant="success" message={profileMsg} onDismiss={() => setProfileMsg('')} />}
                {profileError && <Alert variant="error" message={profileError} onDismiss={() => setProfileError('')} />}

                {/* 2-col grid for name + email */}
                <div className="profile-info-grid" style={{ marginBottom: '16px' }}>
                  {/* Full Name */}
                  <div>
                    <FieldLabel>Full Name</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => { setFullName(e.target.value); if (profileTouched.fullName) validateProfileField('fullName', e.target.value) }}
                        onBlur={() => { setProfileTouched(p => ({ ...p, fullName: true })); validateProfileField('fullName', fullName) }}
                        disabled={profileMutation.isPending}
                        style={{ ...inputBase, border: `1.5px solid ${getProfileBorder('fullName', fullName)}` }}
                        onFocus={focusInput}
                      />
                      {profileTouched.fullName && !profileFieldErrors.fullName && fullName && (
                        <Check size={16} color="#22c55e" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      )}
                    </div>
                    <FieldError message={profileTouched.fullName ? profileFieldErrors.fullName ?? null : null} />
                  </div>

                  {/* Email — readonly */}
                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        value={user?.email ?? ''}
                        disabled
                        readOnly
                        style={{ ...inputBase, background: '#f9fafb', color: '#9ca3af', paddingRight: '40px' }}
                      />
                      <Lock size={14} color="#d1d5db" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>
                </div>

                {/* Phone — full width with +91 prefix */}
                <div style={{ marginBottom: '20px' }}>
                  <FieldLabel>Phone</FieldLabel>
                  <div style={{
                    display: 'flex',
                    border: `1.5px solid ${getProfileBorder('phone', phone)}`,
                    borderRadius: '10px', overflow: 'hidden',
                    transition: 'border-color 0.15s',
                  }}>
                    <div style={{
                      padding: '12px 14px', background: '#f9fafb',
                      borderRight: '1px solid #e5e7eb',
                      fontSize: '15px', color: '#6b7280', fontWeight: 500,
                      whiteSpace: 'nowrap', userSelect: 'none',
                    }}>
                      +91
                    </div>
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); if (profileTouched.phone) validateProfileField('phone', e.target.value) }}
                      onBlur={() => { setProfileTouched(p => ({ ...p, phone: true })); validateProfileField('phone', phone) }}
                      disabled={profileMutation.isPending}
                      maxLength={10}
                      style={{
                        flex: 1, padding: '12px 16px', fontSize: '15px',
                        color: '#111827', border: 'none', outline: 'none',
                        background: '#fff',
                      }}
                    />
                  </div>
                  <FieldError message={profileTouched.phone ? profileFieldErrors.phone ?? null : null} />
                  {phone && !profileFieldErrors.phone && profileTouched.phone && (
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                      +91 {phone.replace(/(\d{5})(\d{5})/, '$1 $2')}
                    </p>
                  )}
                </div>

                {/* Save button */}
                <button
                  onClick={handleProfileSave}
                  disabled={profileMutation.isPending}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    marginLeft: 'auto',
                    padding: '12px 28px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', color: '#fff', border: 'none',
                    opacity: profileMutation.isPending ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { if (!profileMutation.isPending) { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <Save size={16} />
                  {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {/* ── Change Password Card ── */}
              <div style={{
                background: 'var(--color-bg-card)', borderRadius: '16px', padding: '28px 32px',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--color-border)',
              }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(201,169,110,0.1)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Lock size={16} color="var(--color-accent-gold)" />
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-primary)', margin: 0 }}>
                    Change password
                  </h2>
                </div>

                {pwMsg && <Alert variant="success" message={pwMsg} onDismiss={() => setPwMsg('')} />}
                {pwError && <Alert variant="error" message={pwError} onDismiss={() => setPwError('')} />}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Current password */}
                  <div>
                    <FieldLabel>Current Password</FieldLabel>
                    <PasswordInput
                      value={currentPassword}
                      onChange={(v) => { setCurrentPassword(v); if (pwTouched.currentPassword) validatePwField('currentPassword', v) }}
                      disabled={passwordMutation.isPending}
                      borderColor={getPwBorder('currentPassword', currentPassword)}
                    />
                    <FieldError message={pwTouched.currentPassword ? pwFieldErrors.currentPassword ?? null : null} />
                  </div>

                  {/* New password + strength */}
                  <div>
                    <FieldLabel>New Password</FieldLabel>
                    <PasswordInput
                      value={newPassword}
                      onChange={(v) => { setNewPassword(v); if (pwTouched.newPassword) validatePwField('newPassword', v) }}
                      placeholder="Min. 8 characters"
                      disabled={passwordMutation.isPending}
                      borderColor={getPwBorder('newPassword', newPassword)}
                    />
                    <FieldError message={pwTouched.newPassword ? pwFieldErrors.newPassword ?? null : null} />
                    {newPassword && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                          {[1, 2, 3, 4].map((seg) => (
                            <div key={seg} style={{
                              flex: 1, height: '4px', borderRadius: '4px',
                              background: seg <= pwStrength.score ? pwStrength.color : '#e5e7eb',
                              transition: 'background 0.2s',
                            }} />
                          ))}
                        </div>
                        <p style={{ fontSize: '12px', color: pwStrength.color, margin: 0, fontWeight: 500 }}>
                          {pwStrength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <FieldLabel>Confirm New Password</FieldLabel>
                    <PasswordInput
                      value={confirmPassword}
                      onChange={(v) => { setConfirmPassword(v); if (pwTouched.confirmPassword) validatePwField('confirmPassword', v) }}
                      placeholder="Re-enter new password"
                      disabled={passwordMutation.isPending}
                      borderColor={getPwBorder('confirmPassword', confirmPassword)}
                    />
                    <FieldError message={pwTouched.confirmPassword ? pwFieldErrors.confirmPassword ?? null : null} />
                  </div>

                  {/* Update button */}
                  <button
                    onClick={handlePasswordUpdate}
                    disabled={passwordMutation.isPending}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      marginLeft: 'auto',
                      padding: '12px 28px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
                      color: '#fff',
                      border: 'none', fontSize: '14px', fontWeight: 500,
                      cursor: passwordMutation.isPending ? 'not-allowed' : 'pointer',
                      opacity: passwordMutation.isPending ? 0.7 : 1,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { if (!passwordMutation.isPending) { e.currentTarget.style.background = '#6d28d9'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                    onMouseLeave={(e) => { if (!passwordMutation.isPending) { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' } }}
                  >
                    <Shield size={16} />
                    {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>

            </div>{/* end right column */}
          </div>{/* end grid */}
        </div>
      </div>
    </>
  )
}
