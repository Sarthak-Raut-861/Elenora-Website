import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  ArrowLeft,
  Package,
  Clock,
  Loader2,
  AlertCircle,
  MapPin,
  Sparkles,
} from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../auth-context'
import type { TrackingEventType } from '../types'

// ── Step definitions ──────────────────────────────────────────────────────────

interface StepDef {
  event_type: TrackingEventType
  label: string
  defaultDesc: string
  clothOnly?: boolean
}

const CLOTH_STEPS: StepDef[] = [
  { event_type: 'booking_confirmed',  label: 'Booking Confirmed',       defaultDesc: 'Your booking has been confirmed' },
  { event_type: 'deposit_paid',       label: 'Deposit Paid',            defaultDesc: 'Security deposit received' },
  { event_type: 'rent_paid',          label: 'Rent Paid',               defaultDesc: 'Total rent paid successfully' },
  { event_type: 'asset_allocated',    label: 'Asset Allocated',         defaultDesc: 'Admin has allocated your asset' },
  { event_type: 'ready_for_pickup',   label: 'Ready for Pickup',        defaultDesc: 'Visit the center to pick up your item' },
  { event_type: 'picked_up',          label: 'Picked Up',               defaultDesc: 'Asset handed over to you' },
  { event_type: 'return_requested',   label: 'Return Requested',        defaultDesc: 'You requested to return the item' },
  { event_type: 'returned',           label: 'Returned',                defaultDesc: 'Item returned successfully' },
  { event_type: 'sent_dry_cleaning',  label: 'Sent for Dry Cleaning',   defaultDesc: 'Item sent to dry cleaning facility', clothOnly: true },
  { event_type: 'dry_cleaning_done',  label: 'Dry Cleaned & Available', defaultDesc: 'Item cleaned and back in inventory', clothOnly: true },
]

const ELECTRONICS_STEPS: StepDef[] = CLOTH_STEPS.filter(s => !s.clothOnly)

function isClothCategory(category: string | null): boolean {
  if (!category) return true // default to cloth steps when unknown
  const c = category.toLowerCase()
  return c === 'cloth' || c === 'jwellary' || c === 'jewellery' || c === 'jewelry'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending:          { label: 'Pending',          bg: '#fef3c7', color: '#d97706' },
  booked:           { label: 'Approved',         bg: '#dbeafe', color: '#2563eb' },
  allocated:        { label: 'Allocated',        bg: '#ede9fe', color: '#7c3aed' },
  rent_paid:        { label: 'Rent Paid',        bg: '#f3e8ff', color: '#9333ea' },
  ready_for_pickup: { label: 'Ready for Pickup', bg: '#fef3c7', color: '#ea580c' },
  picked_up:        { label: 'Picked Up',        bg: '#dcfce7', color: '#16a34a' },
  return_requested: { label: 'Return Requested', bg: '#fed7aa', color: '#c2410c' },
  returned:         { label: 'Returned',         bg: '#f0fdf4', color: '#15803d' },
  overdue:          { label: 'Overdue',          bg: '#fee2e2', color: '#dc2626' },
  cancelled:        { label: 'Cancelled',        bg: '#f3f4f6', color: '#6b7280' },
}

// ── Step state ────────────────────────────────────────────────────────────────

type StepState = 'completed' | 'active' | 'pending'

function getStepState(
  stepDef: StepDef,
  completedTypes: Set<string>,
  activeType: string | null,
): StepState {
  if (completedTypes.has(stepDef.event_type)) return 'completed'
  if (activeType === stepDef.event_type) return 'active'
  return 'pending'
}

// ── Step Circle ───────────────────────────────────────────────────────────────

function StepCircle({ state }: { state: StepState }) {
  if (state === 'completed') {
    return (
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: 'linear-gradient(135deg, #00c9a7 0%, #0d9488 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 0 0 4px rgba(0,201,167,0.15), 0 4px 12px rgba(0,201,167,0.25)',
      }}>
        <CheckCircle2 size={20} color="#fff" strokeWidth={2.5} />
      </div>
    )
  }
  if (state === 'active') {
    return (
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: '#1a3a6b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 0 0 4px rgba(26,58,107,0.2)',
        animation: 'pulse 2s infinite',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
      </div>
    )
  }
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: '#fff', border: '2px solid #e2e8f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d1d5db' }} />
    </div>
  )
}

// ── Connector line ────────────────────────────────────────────────────────────

function Connector({ completed }: { completed: boolean }) {
  return (
    <div style={{
      width: 2, height: 40, marginLeft: 19,
      background: completed ? '#00c9a7' : '#e2e8f0',
      transition: 'background 0.3s',
    }} />
  )
}

// ── Single timeline step ──────────────────────────────────────────────────────

function TimelineStep({
  stepDef,
  state,
  eventAt,
  description,
  isLast,
  nextCompleted,
}: {
  stepDef: StepDef
  state: StepState
  eventAt: string | null
  description: string | null
  isLast: boolean
  nextCompleted: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <StepCircle state={state} />

        <div style={{ flex: 1, paddingBottom: isLast ? 0 : '8px', paddingTop: '8px' }}>
          {/* Label row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '15px',
              fontWeight: state === 'active' ? 700 : state === 'completed' ? 600 : 400,
              color: state === 'pending' ? '#9ca3af' : state === 'active' ? '#1a3a6b' : '#0f172a',
            }}>
              {stepDef.label}
            </span>
            {state === 'active' && (
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px',
                borderRadius: '20px', background: '#1a3a6b', color: '#fff',
              }}>
                In Progress
              </span>
            )}
            {state === 'pending' && (
              <span style={{
                fontSize: '11px', color: '#9ca3af',
              }}>
                Pending
              </span>
            )}
          </div>

          {/* Timestamp */}
          {eventAt && (
            <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={11} />
              {formatDateTime(eventAt)}
            </p>
          )}

          {/* Description */}
          {(description || stepDef.defaultDesc) && (
            <p style={{
              fontSize: '13px',
              color: state === 'pending' ? '#9ca3af' : '#64748b',
              margin: '4px 0 0',
            }}>
              {description ?? stepDef.defaultDesc}
            </p>
          )}
        </div>
      </div>

      {/* Connector */}
      {!isLast && <Connector completed={nextCompleted} />}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function BookingTrackingPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tracking', bookingId, token],
    queryFn: () => api.getBookingTracking(token!, Number(bookingId)),
    enabled: Boolean(token && bookingId),
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} color="#00c9a7" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <AlertCircle size={40} color="#ef4444" />
        <p style={{ fontSize: '16px', color: '#374151' }}>Could not load tracking info.</p>
        <button onClick={() => navigate(-1)} style={{ padding: '8px 20px', borderRadius: '8px', background: '#1a3a6b', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
          Go Back
        </button>
      </div>
    )
  }

  const isCloth = isClothCategory(data.asset_category)
  const steps = isCloth ? CLOTH_STEPS : ELECTRONICS_STEPS

  // Build a map: event_type → event (last occurrence wins for duplicates)
  const eventMap = new Map<string, { event_at: string; description: string | null }>()
  for (const ev of data.events) {
    eventMap.set(ev.event_type, { event_at: ev.event_at, description: ev.description })
  }

  const completedTypes = new Set(eventMap.keys())

  // Determine active step: first step not yet completed
  const activeStep = steps.find(s => !completedTypes.has(s.event_type)) ?? null

  const statusInfo = STATUS_LABELS[data.current_status] ?? { label: data.current_status, bg: '#f3f4f6', color: '#374151' }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #eef6ff 0%, #f0f4f8 50%, #f0fdf9 100%)' }}>
      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 4px rgba(26,58,107,0.2)} 50%{box-shadow:0 0 0 8px rgba(26,58,107,0.08)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '14px', color: '#64748b', marginBottom: '20px',
            padding: '4px 0',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#0f172a')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
        >
          <ArrowLeft size={16} />
          Back to Bookings
        </button>

        {/* Header card */}
        <div style={{
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.8) inset',
          padding: '24px', marginBottom: '20px',
          border: '1px solid rgba(226,232,240,0.8)',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {/* Asset thumbnail */}
            <div style={{
              width: 64, height: 64, borderRadius: '12px', flexShrink: 0,
              background: '#f0fdf4', border: '1px solid #d1fae5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {data.asset_image_url ? (
                <img src={data.asset_image_url} alt={data.asset_name ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Package size={28} color="#00c9a7" />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Booking #{data.booking_id}
                </h1>
                <span style={{
                  fontSize: '12px', fontWeight: 600, padding: '3px 12px',
                  borderRadius: '20px', background: statusInfo.bg, color: statusInfo.color,
                }}>
                  {statusInfo.label}
                </span>
              </div>

              {data.asset_name && (
                <p style={{ fontSize: '14px', color: '#374151', margin: '4px 0 0', fontWeight: 500 }}>
                  {data.asset_name}
                  {data.asset_category && (
                    <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400, marginLeft: '6px' }}>
                      · {data.asset_category}
                    </span>
                  )}
                </p>
              )}

              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} />
                  Pickup: {formatDate(data.pickup_date)}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  Due: {formatDate(data.due_date)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline card */}
        <div style={{
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.8) inset',
          padding: '28px 24px',
          border: '1px solid rgba(226,232,240,0.8)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Sparkles size={18} color="#00c9a7" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Booking Timeline
            </h2>
            {!isCloth && (
              <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 'auto' }}>Electronics</span>
            )}
          </div>

          {data.events.length === 0 && (
            <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
              No tracking events yet.
            </p>
          )}

          <div>
            {steps.map((stepDef, idx) => {
              const ev = eventMap.get(stepDef.event_type)
              const state = getStepState(stepDef, completedTypes, activeStep?.event_type ?? null)
              const nextStep = steps[idx + 1]
              const nextCompleted = nextStep ? completedTypes.has(nextStep.event_type) : false

              return (
                <TimelineStep
                  key={`${stepDef.event_type}-${idx}`}
                  stepDef={stepDef}
                  state={state}
                  eventAt={ev?.event_at ?? null}
                  description={ev?.description ?? null}
                  isLast={idx === steps.length - 1}
                  nextCompleted={nextCompleted}
                />
              )
            })}
          </div>
        </div>

        {/* Last updated */}
        {data.events.length > 0 && (
          <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '16px' }}>
            Last updated {timeAgo(data.events[data.events.length - 1].event_at)} · auto-refreshes every 30s
          </p>
        )}
      </div>
    </div>
  )
}
