import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, ChevronLeft, ChevronRight, Package2,
  CheckCircle2, Loader2, AlertCircle, Tag, Info,
} from 'lucide-react';
import { api } from '../api';
import type { Asset, BlockedDateRange } from '../types';
import { Input } from './ui/Input';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function fromISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function toISODate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function formatDisplayDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}
function overlapsAnyBlockedRange(
  start: Date, durationDays: number, blockedRanges: BlockedDateRange[]
): boolean {
  const s = toDateOnly(start);
  const e = toDateOnly(addDays(s, durationDays));
  return blockedRanges.some((r) => {
    const bs = toDateOnly(fromISODate(r.from_date));
    const be = toDateOnly(fromISODate(r.to_date));
    return bs <= e && be >= s;
  });
}
function getMonthDays(viewMonth: Date): Date[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const firstGrid = new Date(first);
  firstGrid.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(firstGrid, i));
}

// ── Asset Thumbnail ───────────────────────────────────────────────────────────
function AssetThumb({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src?.trim() || failed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#9ca3af' }}>
        <Package2 size={28} />
      </div>
    );
  }
  return (
    <img
      src={src.trim()}
      alt={alt}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      onError={() => setFailed(true)}
    />
  );
}

// ── Label ─────────────────────────────────────────────────────────────────────
function FieldLabel({ icon: Icon, children }: { icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
      {Icon && <Icon size={13} color="#9ca3af" />}
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</span>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AssetBookingModalProps {
  asset: Asset | null;
  categoryId?: number | null;
  onClose: () => void;
  token: string | null;
  onBookingSuccess?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AssetBookingModal({
  asset, categoryId, onClose, token, onBookingSuccess,
}: AssetBookingModalProps) {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [pickupDate, setPickupDate] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => toDateOnly(new Date()));
  const plansQuery = useQuery({
    queryKey: ['plans', token],
    queryFn: async () => {
      if (!token) return [];
      const plans = await api.listRentalPlans(token);
      return plans.map((p) => ({
        ...p,
        daily_rate: Number(p.daily_rate),
        deposit_amount: Number(p.deposit_amount),
        daily_fine_rate: Number(p.daily_fine_rate),
        damage_fee: Number(p.damage_fee),
      }));
    },
    enabled: Boolean(token),
  });

  const blockedDatesQuery = useQuery({
    queryKey: ['blockedDates', asset?.id],
    queryFn: async () => {
      if (!asset) return [] as BlockedDateRange[];
      const res = await api.getBlockedDatesForAsset(token, asset.id);
      return res.blocked_ranges;
    },
    enabled: Boolean(asset),
  });

  // Auto-advance calendar to the first month that has a free day.
  // This handles "fully booked for the next N months" cases so the user
  // doesn't have to manually scroll through a wall of red dates.
  useEffect(() => {
    const ranges = blockedDatesQuery.data;
    if (!ranges || ranges.length === 0) return;
    const today = toDateOnly(new Date());
    // Find the first free day starting from today, up to 3 years out
    for (let i = 0; i < 365 * 3; i++) {
      const check = new Date(today);
      check.setDate(today.getDate() + i);
      const blocked = ranges.some(r => {
        const s = toDateOnly(fromISODate(r.from_date));
        const e = toDateOnly(fromISODate(r.to_date));
        return check >= s && check <= e;
      });
      if (!blocked) {
        // Jump to the month of the first free day if it's not the current month
        const firstFreeMonth = new Date(check.getFullYear(), check.getMonth(), 1);
        if (firstFreeMonth > toDateOnly(new Date())) {
          setCalendarMonth(firstFreeMonth);
        }
        return;
      }
    }
  }, [blockedDatesQuery.data]);

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!token || !asset || !selectedPlanId || !pickupDate || !aadhaarNumber || !panNumber)
        throw new Error('Aadhaar and PAN are required to create booking');
      if (!/^\d{12}$/.test(aadhaarNumber)) throw new Error('Aadhaar must be exactly 12 digits');
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) throw new Error('PAN format must be like ABCDE1234F');
      const selectedPlan = plansQuery.data?.find((p) => p.id === selectedPlanId);
      if (!selectedPlan) throw new Error('Please select a valid rental plan');
      if (overlapsAnyBlockedRange(fromISODate(pickupDate), selectedPlan.duration_days, blockedDatesQuery.data ?? []))
        throw new Error('Selected dates are blocked. Please choose another date.');
      return api.createBooking(token, {
        rental_plan_id: selectedPlanId,
        pickup_date: pickupDate,
        category_id: categoryId,
        requested_asset_id: asset.id,
        aadhaar_number: aadhaarNumber,
        pan_number: panNumber,
      });
    },
    onSuccess: () => {
      setNotice('Booking created! Admin will allocate the asset.');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setTimeout(() => { onBookingSuccess?.(); onClose(); }, 1500);
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Failed to create booking')),
  });

  const selectedPlan = plansQuery.data?.find((p) => p.id === selectedPlanId);
  const hasDateOverlap = Boolean(
    selectedPlan && pickupDate &&
    overlapsAnyBlockedRange(fromISODate(pickupDate), selectedPlan.duration_days, blockedDatesQuery.data ?? [])
  );
  const isFormValid = Boolean(
    selectedPlanId && pickupDate &&
    /^\d{12}$/.test(aadhaarNumber) &&
    /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber) &&
    !hasDateOverlap
  );

  const todayDate = toDateOnly(new Date());
  const isPending = createBookingMutation.isPending;
  const isBooked = Boolean(notice);

  const handleCalendarSelect = (day: Date) => {
    if (!selectedPlan) return setError('Select a rental plan first');
    if (toDateOnly(day) < todayDate) return;
    if (overlapsAnyBlockedRange(day, selectedPlan.duration_days, blockedDatesQuery.data ?? []))
      return setError('Selected date range is blocked for this asset.');
    setError('');
    setPickupDate(toISODate(day));
  };

  if (!asset) return null;

  return (
    <AnimatePresence>
      {/* ── Full-screen overlay: centers the modal via flex ── */}
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* ── Modal ── */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '520px',
            maxWidth: '100%',
            maxHeight: '85vh',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
          background: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#eff6ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Package2 size={18} color="#2563eb" />
            </div>
            <div>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>
                Book Asset
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                {asset.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#f3f4f6', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6b7280', flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e5e7eb')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f3f4f6')}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Asset Preview Card ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '12px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}>
          {/* Thumbnail */}
          <div style={{
            width: 72, height: 72, borderRadius: '10px',
            overflow: 'hidden', flexShrink: 0,
            background: '#f3f4f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AssetThumb src={asset.image_url} alt={asset.name} />
          </div>
          {/* Info */}
          <div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 3px 0' }}>
              {asset.name}
            </p>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px 0', fontFamily: 'monospace' }}>
              {asset.asset_code}
            </p>
            <span style={{
              display: 'inline-block',
              background: asset.is_in_dry_cleaning ? '#fef3c7' : '#dcfce7',
              color: asset.is_in_dry_cleaning ? '#d97706' : '#16a34a',
              fontSize: '11px', fontWeight: 600,
              padding: '3px 10px', borderRadius: '9999px',
              textTransform: 'uppercase', letterSpacing: '0.3px',
            }}>
              {asset.is_in_dry_cleaning ? 'Coming Soon' : 'Available'}
            </span>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 20px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#e5e7eb transparent',
        } as React.CSSProperties}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>

            {/* Description */}
            {asset.description && (
              <div>
                <FieldLabel icon={Info}>Asset Description</FieldLabel>
                <div style={{
                  background: '#f8fafc', borderRadius: '8px',
                  padding: '10px 14px', fontSize: '14px', color: '#374151',
                  border: '1px solid #e5e7eb',
                }}>
                  {asset.description}
                </div>
              </div>
            )}

            {/* Notices */}
            <AnimatePresence>
              {notice && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', borderRadius: '8px',
                    background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d',
                    fontSize: '14px', fontWeight: 500,
                  }}
                >
                  <CheckCircle2 size={16} />
                  {notice}
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', borderRadius: '8px',
                    background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                    fontSize: '14px', fontWeight: 500,
                  }}
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {!isBooked && (
              <>
                {/* ── Rental Plan ── */}
                <div>
                  <FieldLabel icon={Tag}>Rental Plan</FieldLabel>
                  {plansQuery.isLoading ? (
                    <div style={{ height: 42, background: '#f3f4f6', borderRadius: '8px' }} />
                  ) : (
                    <>
                      <select
                        value={selectedPlanId ?? ''}
                        onChange={(e) => { setSelectedPlanId(Number(e.target.value) || null); setPickupDate(''); }}
                        disabled={isPending || !plansQuery.data?.length}
                        style={{
                          width: '100%', padding: '10px 14px',
                          border: '1.5px solid #e5e7eb', borderRadius: '8px',
                          fontSize: '14px', color: selectedPlanId ? '#111827' : '#9ca3af',
                          background: '#fff', outline: 'none', cursor: 'pointer',
                          boxSizing: 'border-box', appearance: 'none',
                          transition: 'border-color 0.15s, box-shadow 0.15s',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">-- Choose a rental plan --</option>
                        {plansQuery.data?.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} — {plan.duration_days} days · ₹{plan.daily_rate}/day · Deposit ₹{plan.deposit_amount}
                          </option>
                        ))}
                      </select>
                      {selectedPlan && (
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                          ₹{selectedPlan.daily_rate}/day · {selectedPlan.duration_days} day plan · Deposit ₹{selectedPlan.deposit_amount}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* ── Pickup Date Calendar ── */}
                <div>
                  <FieldLabel icon={Calendar}>Pickup Date</FieldLabel>
                  <div style={{
                    border: '1.5px solid #e5e7eb', borderRadius: '10px',
                    background: '#fff', overflow: 'hidden',
                  }}>
                    {/* Month nav */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
                    }}>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', border: 'none',
                          background: 'transparent', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: '#6b7280',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                        {calendarMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', border: 'none',
                          background: 'transparent', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: '#6b7280',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div style={{ padding: '12px 16px' }}>
                      {/* Day headers */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                        marginBottom: '6px',
                      }}>
                        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                          <div key={d} style={{
                            textAlign: 'center', fontSize: '11px', fontWeight: 600,
                            color: '#9ca3af', textTransform: 'uppercase', padding: '4px 0',
                          }}>
                            {d}
                          </div>
                        ))}
                      </div>

                      {/* Day cells */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                        {getMonthDays(calendarMonth).map((day) => {
                          const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                          const isSelected = pickupDate === toISODate(day);
                          const isToday = toDateOnly(day).getTime() === todayDate.getTime();
                          const isInPast = toDateOnly(day) < todayDate;
                          const isBlocked = selectedPlan
                            ? overlapsAnyBlockedRange(day, selectedPlan.duration_days, blockedDatesQuery.data ?? [])
                            : false;
                          const disabled = isPending || !isCurrentMonth || isInPast || !selectedPlan || isBlocked;

                          let bg = 'transparent';
                          let color = '#374151';
                          let border = 'none';
                          let cursor = 'pointer';
                          let borderRadius = '50%';
                          let cellTitle: string | undefined;

                          if (!isCurrentMonth) { color = 'transparent'; cursor = 'default'; }
                          else if (isSelected) { bg = '#00c9a7'; color = '#fff'; }
                          else if (isBlocked && !isInPast) {
                            bg = '#fee2e2'; color = '#fca5a5';
                            cursor = 'not-allowed'; borderRadius = '6px';
                            cellTitle = 'Already booked';
                          }
                          else if (isToday) { border = '2px solid #00c9a7'; color = '#0d9488'; }
                          else if (isInPast) { color = '#d1d5db'; cursor = 'not-allowed'; }

                          return (
                            <button
                              key={toISODate(day)}
                              type="button"
                              title={cellTitle}
                              onClick={() => !disabled && handleCalendarSelect(day)}
                              disabled={disabled}
                              style={{
                                width: 36, height: 36, borderRadius,
                                border, background: bg, color,
                                fontSize: '13px', fontWeight: isSelected ? 600 : 400,
                                cursor, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={(e) => {
                                if (!disabled && !isSelected && isCurrentMonth)
                                  e.currentTarget.style.background = '#ccfbf1';
                              }}
                              onMouseLeave={(e) => {
                                if (!disabled && !isSelected && isCurrentMonth)
                                  e.currentTarget.style.background = isBlocked ? '#fee2e2' : 'transparent';
                              }}
                            >
                              {day.getDate()}
                            </button>
                          );
                        })}
                      </div>

                      {/* Legend — only shown when there are blocked dates */}
                      {(blockedDatesQuery.data?.length ?? 0) > 0 && (
                        <div style={{
                          display: 'flex', gap: '14px', marginTop: '10px',
                          paddingTop: '10px', borderTop: '1px solid #f3f4f6',
                          flexWrap: 'wrap',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: 12, height: 12, borderRadius: '3px', background: '#fee2e2', border: '1px solid #fca5a5', flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Already booked</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#00c9a7', flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Selected</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #00c9a7', flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Today</span>
                          </div>
                        </div>
                      )}

                    </div>{/* end padding div */}

                    {/* Selected date display */}
                    {pickupDate && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 16px', borderTop: '1px solid #f0f9ff',
                        background: '#f0fdf4',
                      }}>
                        <Calendar size={14} color="#0d9488" />
                        <span style={{ fontSize: '13px', color: '#0d9488' }}>
                          Pickup: <strong>{formatDisplayDate(pickupDate)}</strong>
                          {selectedPlan && (
                            <> · Returns <strong>{formatDisplayDate(
                              (() => {
                                const d = new Date(fromISODate(pickupDate))
                                d.setDate(d.getDate() + selectedPlan.duration_days)
                                const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0')
                                return `${y}-${m}-${day}`
                              })()
                            )}</strong></>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Conflict warning */}
                    {hasDateOverlap && pickupDate && (
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        padding: '10px 16px', borderTop: '1px solid #fecaca',
                        background: '#fef2f2',
                      }}>
                        <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span style={{ fontSize: '13px', color: '#dc2626', lineHeight: 1.5 }}>
                          This date range conflicts with an existing booking. Please pick a different date.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Documents ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <FieldLabel>Aadhaar Number *</FieldLabel>
                    <Input
                      placeholder="123456789012"
                      maxLength={12}
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      error={aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber) ? 'Must be 12 digits' : undefined}
                      disabled={isPending}
                    />
                  </div>
                  <div>
                    <FieldLabel>PAN Number *</FieldLabel>
                    <Input
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className="uppercase"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                      error={panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber) ? 'Invalid format' : undefined}
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* ── Unified Booking Summary + Cost ── */}
                {selectedPlan && (
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e5e7eb',
                    borderRadius: '12px', padding: '16px',
                  }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>
                      Booking summary
                    </p>

                    {/* Meta grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: '12px' }}>
                      {[
                        { label: 'Asset', value: asset.name },
                        { label: 'Rental plan', value: selectedPlan.name },
                        { label: 'Pickup date', value: pickupDate ? formatDisplayDate(pickupDate) : '—' },
                        { label: 'Duration', value: `${selectedPlan.duration_days} days` },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 1px 0', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</p>
                          <p style={{ fontSize: '13px', color: '#111827', fontWeight: 500, margin: 0 }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: '1px dashed #e5e7eb', margin: '12px 0' }} />

                    {/* Cost lines */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: '#6b7280' }}>Daily rate</span>
                        <span style={{ color: '#111827', fontWeight: 500 }}>₹{selectedPlan.daily_rate.toFixed(2)} /day</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: '#6b7280' }}>Rent total</span>
                        <span style={{ color: '#2563eb', fontWeight: 500 }}>₹{(selectedPlan.daily_rate * selectedPlan.duration_days).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: '#6b7280' }}>Security deposit</span>
                        <span style={{ color: '#16a34a', fontWeight: 500 }}>₹{selectedPlan.deposit_amount.toFixed(2)}</span>
                      </div>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: '16px', fontWeight: 700,
                        paddingTop: '8px', borderTop: '1px solid #e5e7eb', marginTop: '2px',
                      }}>
                        <span style={{ color: '#111827' }}>Total due</span>
                        <span style={{ color: '#111827' }}>₹{(selectedPlan.daily_rate * selectedPlan.duration_days + selectedPlan.deposit_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        {!isBooked && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #f0f0f0',
            background: '#fff',
            flexShrink: 0,
          }}>
            {/* Info banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: '8px', padding: '10px 14px',
              marginBottom: '12px',
            }}>
              <Info size={15} color="#d97706" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#92400e', lineHeight: 1.4 }}>
                Deposit is paid upfront. Rent is charged after admin approval.
              </span>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={onClose}
                disabled={isPending}
                style={{
                  padding: '10px 20px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', background: '#fff',
                  fontSize: '14px', fontWeight: 500, color: '#374151',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                Cancel
              </button>
              <button
                onClick={() => createBookingMutation.mutate()}
                disabled={!isFormValid || isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 24px', borderRadius: '8px',
                  border: 'none',
                  background: hasDateOverlap ? '#9ca3af' : isFormValid && !isPending ? '#00c9a7' : '#9ca3af',
                  color: '#fff',
                  fontSize: '14px', fontWeight: 600,
                  cursor: isFormValid && !isPending ? 'pointer' : 'not-allowed',
                  opacity: isFormValid && !isPending ? 1 : 0.6,
                  transition: 'background 0.15s, opacity 0.15s',
                }}
                onMouseEnter={(e) => { if (isFormValid && !isPending) e.currentTarget.style.background = '#0aab8e'; }}
                onMouseLeave={(e) => { if (isFormValid && !isPending) e.currentTarget.style.background = '#00c9a7'; }}
                title={hasDateOverlap ? 'Please select an available date' : undefined}
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {isPending ? 'Processing...' : hasDateOverlap ? 'Select an Available Date' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
