import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  RotateCcw,
  CircleDollarSign,
  History,
  Sparkles,
  Package,
  CheckCircle2,
  PlusCircle,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CreditCard,
  X,
  Tag,
  MapPin,
  CalendarDays,
} from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../auth-context'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import type { Booking } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function daysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function durationLabel(pickup: string, due: string): string {
  const days = Math.ceil(
    (new Date(due).getTime() - new Date(pickup).getTime()) / (1000 * 60 * 60 * 24)
  )
  return days === 1 ? '1 Day' : `${days} Days`
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  topBorderColor,
  valueColor,
}: {
  label: string
  value: number
  icon: React.ElementType
  iconBg: string
  topBorderColor: string
  valueColor: string
}) {
  return (
    <div
      className="bg-white rounded-xl hover:shadow-md transition-all duration-200 cursor-default"
      style={{
        padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)',
        borderTop: `3px solid ${topBorderColor}`,
        borderRadius: '12px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold" style={{ fontSize: '36px', lineHeight: 1.1, fontFamily: 'var(--font-serif)', color: 'var(--color-accent-gold)' }}>
            {value}
          </p>
          <p style={{ fontSize: '13px', fontFamily: 'var(--font-sans)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            {label}
          </p>
        </div>
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(201,169,110,0.1)', border: '1px solid var(--color-border)' }}
        >
          <Icon className="w-5 h-5" style={{ color: 'var(--color-accent-gold)' }} />
        </div>
      </div>
    </div>
  )
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────
type Tab = 'all' | 'active' | 'upcoming' | 'past'

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Completed' },
  ]
  return (
    <div
      className="flex gap-1"
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '4px' }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="flex-1 transition-all"
          style={{
            padding: '6px 16px',
            borderRadius: '6px',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.65rem',
            fontWeight: active === t.id ? 600 : 400,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: active === t.id ? 'var(--color-bg-primary)' : 'var(--color-text-muted)',
            background: active === t.id ? 'var(--color-accent-gold)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
}) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ paddingTop: '40px', paddingBottom: '40px' }}
    >
      <div
        className="flex items-center justify-center mb-3"
        style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(201,169,110,0.1)', border: '1px solid var(--color-border)' }}
      >
        <Icon className="w-6 h-6" style={{ color: 'var(--color-text-faint)' }} />
      </div>
      <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</p>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{subtitle}</p>
    </div>
  )
}

// ── Section Wrapper ───────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  iconColor,
  children,
  count,
}: {
  icon: React.ElementType
  title: string
  iconColor: string
  children: React.ReactNode
  count?: number
}) {
  return (
    <section
      style={{
        background: 'var(--color-bg-card)',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        {/* Icon circle */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon style={{ width: 15, height: 15, color: '#fff' }} />
        </div>
        <h2 style={{
          fontSize: '16px', fontWeight: 600, margin: 0,
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          color: 'var(--color-accent-gold)',
        }}>{title}</h2>
        {count !== undefined && (
          <span style={{
            fontSize: '12px', fontWeight: 500,
            color: 'var(--color-text-muted)',
            background: 'rgba(201,169,110,0.1)',
            border: '1px solid var(--color-border)',
            padding: '2px 10px', borderRadius: '20px',
          }}>
            {count}
          </span>
        )}
        {count !== undefined && count > 3 && (
          <span style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--color-accent-gold)', cursor: 'pointer' }}>
            View All
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

// ── Booking Card Image ────────────────────────────────────────────────────────
function BookingThumb({ variant }: { variant: 'active' | 'upcoming' }) {
  const bg = variant === 'active' ? '#dcfce7' : '#dbeafe'
  const color = variant === 'active' ? '#16a34a' : '#2563eb'
  return (
    <div style={{
      width: 48, height: 48, borderRadius: '10px', flexShrink: 0,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Package style={{ width: 22, height: 22, color }} />
    </div>
  )
}

// ── Active / Upcoming Booking Card ───────────────────────────────────────────
interface BookingCardProps {
  booking: Booking
  onPayDeposit: (id: number) => void
  onPayRent: (id: number) => void
  onCancel: (id: number) => void
  onReturn: (id: number) => void
  onTrack: (id: number) => void
  isActionPending: boolean
  variant?: 'active' | 'upcoming'
}

function BookingCard({
  booking: b,
  onPayDeposit,
  onPayRent,
  onCancel,
  onReturn,
  onTrack,
  isActionPending,
  variant = 'active',
}: BookingCardProps) {
  const daysLeft = variant === 'upcoming' ? daysUntil(b.pickup_date) : null

  // Status badge colours
  const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    pending:          { bg: '#fef3c7', color: '#d97706', label: 'Pending Approval' },
    booked:           { bg: '#dbeafe', color: '#2563eb', label: 'Approved' },
    allocated:        { bg: '#ede9fe', color: '#7c3aed', label: 'Allocated' },
    rent_paid:        { bg: '#f3e8ff', color: '#9333ea', label: `Rent Paid · Pickup on ${formatDate(b.pickup_date)}` },
    ready_for_pickup: { bg: '#ffedd5', color: '#ea580c', label: 'Return Requested' },
    return_requested: { bg: '#fed7aa', color: '#c2410c', label: 'Return Requested' },
    picked_up:        { bg: '#dcfce7', color: '#16a34a', label: 'Picked Up' },
    overdue:          { bg: '#fee2e2', color: '#dc2626', label: 'Overdue' },
  }
  const badge = statusStyle[b.status] ?? { bg: '#f3f4f6', color: '#374151', label: b.status }

  const daysLeftLabel = daysLeft === null ? null
    : daysLeft <= 0 ? 'Today'
    : `Starts in ${daysLeft}d`

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        boxShadow: 'none',
        padding: '20px 24px',
        transition: 'box-shadow 0.25s, transform 0.25s, border-color 0.25s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-gold)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--color-border-strong)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
    >
      {/* ── Top row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <BookingThumb variant={variant} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            {b.rental_plan?.name ?? `Plan #${b.rental_plan_id}`}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
            Booking #{b.id}
          </p>
        </div>

        {/* Right badges */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          <span style={{
            background: badge.bg, color: badge.color,
            borderRadius: '20px', padding: '4px 12px',
            fontSize: '12px', fontWeight: 600,
          }}>
            {badge.label}
          </span>
          {daysLeftLabel && (
            <span style={{
              background: '#fee2e2', color: '#dc2626',
              borderRadius: '20px', padding: '3px 10px',
              fontSize: '11px', fontWeight: 500,
            }}>
              {daysLeftLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── Info chips ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
        {[
          { icon: Calendar, color: 'var(--color-accent-gold)', text: `${formatDate(b.pickup_date)} – ${formatDate(b.due_date)}` },
          { icon: Clock,    color: 'var(--color-accent-gold-dim)', text: durationLabel(b.pickup_date, b.due_date) },
          { icon: Tag,      color: 'var(--color-success)', text: b.rental_plan?.daily_rate ? `₹${b.rental_plan.daily_rate}/day` : null },
        ].filter(c => c.text).map(({ icon: Icon, color, text }) => (
          <div key={text} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
            borderRadius: '8px', padding: '7px 12px',
            fontSize: '13px', color: 'var(--color-text-muted)',
          }}>
            <Icon style={{ width: 14, height: 14, color, flexShrink: 0 }} />
            {text}
          </div>
        ))}
      </div>

      {/* ── Cost row ── */}
      <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: '13px' }}>
        <span style={{ color: 'var(--color-text-muted)' }}>
          Rent: <strong style={{ color: 'var(--color-accent-gold)' }}>₹{b.rent_amount}</strong>
        </span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          Deposit: <strong style={{ color: 'var(--color-text-primary)' }}>₹{b.deposit_amount}</strong>
        </span>
      </div>

      {/* ── Action buttons ── */}
      {(b.status === 'pending' || b.status === 'allocated' || b.status === 'picked_up' || b.status === 'return_requested' || b.status === 'overdue' || b.status === 'rent_paid') && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '10px',
          marginTop: '16px', paddingTop: '14px',
          borderTop: '1px solid var(--color-border)',
        }}>
          {b.status === 'pending' && (
            <>
              <button
                onClick={() => onPayDeposit(b.id)}
                disabled={isActionPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  background: 'var(--color-accent-gold)', color: 'var(--color-bg-primary)',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  padding: '10px 20px', fontSize: '0.75rem', fontWeight: 600,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: isActionPending ? 'not-allowed' : 'pointer',
                  opacity: isActionPending ? 0.6 : 1,
                  boxShadow: 'var(--shadow-gold)',
                  transition: 'background 0.15s, transform 0.15s',
                }}
                onMouseEnter={(e) => { if (!isActionPending) { e.currentTarget.style.background = 'var(--color-accent-gold-light)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent-gold)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <CreditCard style={{ width: 16, height: 16 }} />
                Pay Deposit
              </button>
              <button
                onClick={() => onCancel(b.id)}
                disabled={isActionPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  background: 'transparent', color: 'var(--color-error)',
                  border: '1.5px solid var(--color-error)', borderRadius: 'var(--radius-sm)',
                  padding: '10px 20px', fontSize: '0.75rem', fontWeight: 500,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: isActionPending ? 'not-allowed' : 'pointer',
                  opacity: isActionPending ? 0.6 : 1,
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => { if (!isActionPending) { e.currentTarget.style.background = 'rgba(224,112,112,0.1)' } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <X style={{ width: 16, height: 16 }} />
                Cancel
              </button>
            </>
          )}
          {b.status === 'allocated' && (
            <button
              onClick={() => onPayRent(b.id)}
              disabled={isActionPending}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                background: 'var(--color-accent-gold)', color: 'var(--color-bg-primary)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                padding: '10px 20px', fontSize: '0.75rem', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: isActionPending ? 'not-allowed' : 'pointer',
                opacity: isActionPending ? 0.6 : 1,
                boxShadow: 'var(--shadow-gold)',
                transition: 'background 0.15s, transform 0.15s',
              }}
              onMouseEnter={(e) => { if (!isActionPending) { e.currentTarget.style.background = 'var(--color-accent-gold-light)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent-gold)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <CreditCard style={{ width: 16, height: 16 }} />
              Pay Rent
            </button>
          )}
          {b.status === 'rent_paid' && (
            <p style={{ fontSize: '13px', color: 'var(--color-accent-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CalendarDays style={{ width: 15, height: 15 }} />
              Your pickup is scheduled for {formatDate(b.pickup_date)}
            </p>
          )}
          {b.status === 'return_requested' && (
            <p style={{ fontSize: '13px', color: 'var(--color-accent-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw style={{ width: 15, height: 15 }} />
              Return request submitted. Admin will process it soon.
            </p>
          )}
          {(b.status === 'picked_up' || b.status === 'overdue' || b.status === 'rent_paid') && (
            <button
              onClick={() => onReturn(b.id)}
              disabled={isActionPending}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                background: 'transparent', color: 'var(--color-text-primary)',
                border: '1.5px solid var(--color-border-strong)', borderRadius: 'var(--radius-sm)',
                padding: '10px 20px', fontSize: '0.75rem', fontWeight: 500,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: isActionPending ? 'not-allowed' : 'pointer',
                opacity: isActionPending ? 0.6 : 1,
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => { if (!isActionPending) { e.currentTarget.style.background = 'rgba(245,236,215,0.08)'; e.currentTarget.style.borderColor = 'var(--color-text-primary)' } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-border-strong)' }}
            >
              <RotateCcw style={{ width: 16, height: 16 }} />
              Request Return
            </button>
          )}
        </div>
      )}
      {/* ── Track button ── */}
      {b.status !== 'cancelled' && (
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={() => onTrack(b.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', color: 'var(--color-accent-gold)',
              border: '1.5px solid var(--color-accent-gold)', borderRadius: 'var(--radius-sm)',
              padding: '7px 16px', fontSize: '0.7rem', fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-gold)'; e.currentTarget.style.color = 'var(--color-bg-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-accent-gold)' }}
          >
            <MapPin style={{ width: 14, height: 14 }} />
            Track
          </button>
        </div>
      )}
    </div>
  )
}
function PastBookingRow({ booking: b, onRebook, onTrack }: { booking: Booking; onRebook: () => void; onTrack: () => void }) {
  const statusBadge: Record<string, { bg: string; color: string; border: string; label: string }> = {
    returned:  { bg: 'rgba(126,200,160,0.12)', color: '#7EC8A0', border: 'rgba(126,200,160,0.3)', label: 'Returned' },
    cancelled: { bg: 'rgba(158,128,112,0.12)', color: '#9E8070',  border: 'rgba(158,128,112,0.25)', label: 'Cancelled' },
  }
  const badge = statusBadge[b.status] ?? { bg: 'rgba(158,128,112,0.12)', color: '#9E8070', border: 'rgba(158,128,112,0.25)', label: b.status }

  return (
    <div
      style={{
        background: 'var(--color-bg-secondary)',
        borderRadius: '12px',
        border: '1px solid rgba(201,169,110,0.15)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '14px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-gold)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(201,169,110,0.15)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: '8px',
        background: 'rgba(201,169,110,0.08)',
        border: '1px solid var(--color-border)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Package style={{ width: 18, height: 18, color: 'var(--color-text-faint)' }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
          {b.rental_plan?.name ?? `Plan #${b.rental_plan_id}`}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '3px 0 0 0', letterSpacing: '0.01em' }}>
          {formatDate(b.pickup_date)} – {formatDate(b.due_date)} · {durationLabel(b.pickup_date, b.due_date)}
        </p>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <span style={{
          background: badge.bg, color: badge.color,
          border: `1px solid ${badge.border}`,
          borderRadius: '999px', padding: '2px 12px',
          fontSize: '12px', fontWeight: 600,
        }}>
          {badge.label}
        </span>
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-accent-gold)', margin: 0 }}>
          ₹{b.rent_amount}
        </p>
        <button
          onClick={onRebook}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            border: '1.5px solid var(--color-accent-gold)', color: 'var(--color-accent-gold)',
            borderRadius: 'var(--radius-sm)', padding: '6px 16px',
            fontSize: '0.7rem', fontWeight: 500,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'transparent', cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-gold)'; e.currentTarget.style.color = 'var(--color-bg-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-accent-gold)' }}
        >
          <RefreshCw style={{ width: 12, height: 12 }} />
          Rebook
        </button>
        {b.status === 'returned' && (
          <button
            onClick={onTrack}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              border: '1.5px solid var(--color-border-strong)', color: 'var(--color-text-muted)',
              borderRadius: 'var(--radius-sm)', padding: '6px 16px',
              fontSize: '0.7rem', fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              background: 'transparent', cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,169,110,0.08)'; e.currentTarget.style.color = 'var(--color-accent-gold)'; e.currentTarget.style.borderColor = 'var(--color-accent-gold)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border-strong)' }}
          >
            <MapPin style={{ width: 12, height: 12 }} />
            Track
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const PAST_PAGE_SIZE = 5

export function BookingsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [pastVisible, setPastVisible] = useState(PAST_PAGE_SIZE)

  const bookingsQuery = useQuery({
    queryKey: ['bookings', token],
    queryFn: () => api.listBookings(token!),
    enabled: Boolean(token),
  })

  const payDepositMutation = useMutation({
    mutationFn: (bookingId: number) => api.payDeposit(token!, bookingId),
    onSuccess: () => {
      setActionSuccess('Deposit paid successfully!')
      setActionError('')
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setTimeout(() => setActionSuccess(''), 3000)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const payRentMutation = useMutation({
    mutationFn: (bookingId: number) => api.payRent(token!, bookingId),
    onSuccess: () => {
      setActionSuccess('Rent paid successfully!')
      setActionError('')
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setTimeout(() => setActionSuccess(''), 3000)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const cancelMutation = useMutation({
    mutationFn: (bookingId: number) => api.cancelBooking(token!, bookingId),
    onSuccess: () => {
      setActionSuccess('Booking cancelled.')
      setActionError('')
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setTimeout(() => setActionSuccess(''), 3000)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const returnMutation = useMutation({
    mutationFn: (bookingId: number) => api.requestReturn(token!, bookingId),
    onSuccess: () => {
      setActionSuccess('Return requested successfully!')
      setActionError('')
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setTimeout(() => setActionSuccess(''), 3000)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const isActionPending =
    payDepositMutation.isPending ||
    payRentMutation.isPending ||
    cancelMutation.isPending ||
    returnMutation.isPending

  const bookings = bookingsQuery.data ?? []
  const activeBookings = bookings.filter((b) => ['picked_up', 'overdue', 'ready_for_pickup', 'return_requested', 'rent_paid'].includes(b.status))
  const upcomingBookings = bookings.filter((b) =>
    ['pending', 'booked', 'allocated'].includes(b.status)
  )
  const pastBookings = bookings.filter((b) => ['returned', 'cancelled'].includes(b.status))

  const cardActions = {
    onPayDeposit: (id: number) => payDepositMutation.mutate(id),
    onPayRent: (id: number) => payRentMutation.mutate(id),
    onCancel: (id: number) => cancelMutation.mutate(id),
    onReturn: (id: number) => returnMutation.mutate(id),
    onTrack: (id: number) => navigate(`/bookings/${id}/track`),
    isActionPending,
  }

  const showActive = activeTab === 'all' || activeTab === 'active'
  const showUpcoming = activeTab === 'all' || activeTab === 'upcoming'
  const showPast = activeTab === 'all' || activeTab === 'past'

  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: 'var(--color-bg-primary)' }}>
      {/* Centered container — max 1200px, full bleed padding */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '32px 24px',
        }}
      >
        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
          <div style={{ borderLeft: '4px solid var(--color-accent-gold)', paddingLeft: '12px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
              My Bookings
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px', marginBottom: 0 }}>
              Track your active and past rentals
            </p>
          </div>
          <button
            onClick={() => navigate('/assets')}
            style={{
              background: 'var(--color-accent-gold)', color: 'var(--color-bg-primary)', border: 'none',
              borderRadius: 'var(--radius-sm)', padding: '10px 20px',
              fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: '8px',
              cursor: 'pointer', flexShrink: 0,
              boxShadow: 'var(--shadow-gold)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-gold-light)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent-gold)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <PlusCircle style={{ width: 16, height: 16 }} />
            Book New Asset
          </button>
        </div>

        {/* ── Stats Grid — 4 equal columns ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <StatCard
            label="Total Bookings"
            value={bookings.length}
            icon={CircleDollarSign}
            iconBg="bg-blue-50 text-blue-600"
            topBorderColor="#1a3a6b"
            valueColor="text-blue-700"
          />
          <StatCard
            label="Active Now"
            value={activeBookings.length}
            icon={Sparkles}
            iconBg="bg-green-50 text-green-600"
            topBorderColor="#00c9a7"
            valueColor="text-green-700"
          />
          <StatCard
            label="Upcoming"
            value={upcomingBookings.length}
            icon={Clock}
            iconBg="bg-amber-50 text-amber-600"
            topBorderColor="#f59e0b"
            valueColor="text-amber-700"
          />
          <StatCard
            label="Completed"
            value={pastBookings.length}
            icon={History}
            iconBg="bg-purple-50 text-purple-600"
            topBorderColor="#7c3aed"
            valueColor="text-purple-700"
          />
        </div>

        {/* ── Alerts ── */}
        {actionError && (
          <Alert variant="error" message={actionError} onDismiss={() => setActionError('')} className="mb-5" />
        )}
        {actionSuccess && (
          <Alert variant="success" message={actionSuccess} onDismiss={() => setActionSuccess('')} className="mb-5" />
        )}

        {/* ── Loading skeleton ── */}
        {bookingsQuery.isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="skeleton-shimmer"
                style={{ borderRadius: '12px', padding: '20px 24px', height: '96px', border: '1px solid var(--color-border)' }}
              />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          /* ── Zero state ── */
          <div className="flex justify-center" style={{ paddingTop: '48px', paddingBottom: '48px' }}>
            <div
              className="text-center"
              style={{
                maxWidth: '360px',
                width: '100%',
                borderRadius: '16px',
                padding: '48px 32px',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div
                className="flex items-center justify-center mx-auto"
                style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(201,169,110,0.1)', border: '1px solid var(--color-border)', marginBottom: '16px' }}
              >
                <Calendar style={{ width: 28, height: 28, color: 'var(--color-accent-gold)' }} />
              </div>
              <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text-primary)' }}>No bookings yet</p>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                Browse the catalog to book an asset and start your rental journey.
              </p>
              <Button onClick={() => navigate('/assets')} className="mt-6 w-full">
                Browse Catalog
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* ── Tab bar ── */}
            <TabBar active={activeTab} onChange={setActiveTab} />

            {/* ── Active Bookings ── */}
            {showActive && (
              <Section icon={Sparkles} title="Active Bookings" iconColor="rgba(201,169,110,0.7)" count={activeBookings.length}>
                {activeBookings.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="No active rentals right now"
                    subtitle="Assets you've picked up will appear here"
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeBookings.map((b) => (
                      <BookingCard key={b.id} booking={b} variant="active" {...cardActions} />
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* ── Upcoming Bookings ── */}
            {showUpcoming && (
              <Section icon={Clock} title="Upcoming Bookings" iconColor="rgba(201,169,110,0.45)" count={upcomingBookings.length}>
                {upcomingBookings.length === 0 ? (
                  <EmptyState
                    icon={AlertCircle}
                    title="No upcoming bookings"
                    subtitle="Confirmed bookings awaiting pickup will appear here"
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {upcomingBookings.map((b) => (
                      <BookingCard key={b.id} booking={b} variant="upcoming" {...cardActions} />
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* ── Past Bookings ── */}
            {showPast && (pastBookings.length > 0 || activeTab === 'past') && (
              <Section icon={History} title="Past Bookings" iconColor="rgba(107,85,72,0.6)" count={pastBookings.length}>
                {pastBookings.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title="No completed bookings"
                    subtitle="Returned or cancelled bookings will appear here"
                  />
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {pastBookings.slice(0, pastVisible).map((b) => (
                        <PastBookingRow key={b.id} booking={b} onRebook={() => navigate('/assets')} onTrack={() => navigate(`/bookings/${b.id}/track`)} />
                      ))}
                    </div>
                    {pastVisible < pastBookings.length && (
                      <button
                        onClick={() => setPastVisible((v) => v + PAST_PAGE_SIZE)}
                        style={{ fontSize: '13px', marginTop: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent-gold)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}
                      >
                        Load more <ChevronRight style={{ width: 16, height: 16 }} />
                      </button>
                    )}
                  </>
                )}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
