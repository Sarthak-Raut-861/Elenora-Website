import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, ChevronLeft, ChevronRight, Package2,
  CheckCircle2, Loader2, AlertCircle, Tag, Info,
  ShieldCheck, UserCheck, ArrowRight, LogIn, Clock, Sparkles
} from 'lucide-react';
import { api } from '../api';
import type { Asset, BlockedDateRange } from '../types';
import { formatINR } from '../utils/currency';

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#666', background: '#222' }}>
        <Package2 size={24} />
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

// ── Field Label ───────────────────────────────────────────────────────────────
function FieldLabel({ icon: Icon, children }: { icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
      {Icon && <Icon size={13} color="#C9A34A" />}
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#C9A34A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {children}
      </span>
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
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [pickupDate, setPickupDate] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => toDateOnly(new Date()));

  // Size selection for rental piece
  const availableSizes = useMemo(() => {
    if (!asset?.sizes) return ['XS', 'S', 'M', 'L', 'XL'];
    return asset.sizes.split(',').map((s) => s.trim()).filter(Boolean);
  }, [asset?.sizes]);

  const [selectedSize, setSelectedSize] = useState<string>('');

  useEffect(() => {
    if (availableSizes.length > 0 && !selectedSize) {
      setSelectedSize(availableSizes[0]);
    }
  }, [availableSizes, selectedSize]);

  // Restore draft booking state if previously preserved before redirecting to login
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("elanora_draft_rental");
      if (saved && asset?.id) {
        const draft = JSON.parse(saved);
        if (draft.assetId === asset.id) {
          if (draft.selectedPlanId) setSelectedPlanId(draft.selectedPlanId);
          if (draft.pickupDate) setPickupDate(draft.pickupDate);
          if (draft.aadhaarNumber) setAadhaarNumber(draft.aadhaarNumber);
          if (draft.panNumber) setPanNumber(draft.panNumber);
          if (draft.selectedSize) setSelectedSize(draft.selectedSize);
        }
      }
    } catch (e) {
      console.warn("Could not parse rental draft", e);
    }
  }, [asset?.id]);

  const handleGuestRedirectToLogin = () => {
    if (asset?.id) {
      const draft = {
        assetId: asset.id,
        selectedPlanId,
        pickupDate,
        aadhaarNumber,
        panNumber,
        selectedSize,
      };
      sessionStorage.setItem("elanora_draft_rental", JSON.stringify(draft));
    }
    onClose();
    const returnUrl = `${location.pathname}?resumeBooking=1`;
    navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
  };

  // 1. Fetch rental plans (public endpoint)
  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const plans = await api.listRentalPlans(token);
      return plans.map((p) => ({
        ...p,
        daily_rate: Number(p.daily_rate),
        deposit_amount: Number(p.deposit_amount),
        daily_fine_rate: Number(p.daily_fine_rate),
        damage_fee: Number(p.damage_fee),
      }));
    },
    enabled: true,
  });

  // 2. Auto-select first plan when plans load
  useEffect(() => {
    if (!selectedPlanId && plansQuery.data && plansQuery.data.length > 0) {
      setSelectedPlanId(plansQuery.data[0].id);
    }
  }, [plansQuery.data, selectedPlanId]);

  // 3. Fetch blocked dates for this asset
  const blockedDatesQuery = useQuery({
    queryKey: ['blockedDates', asset?.id],
    queryFn: async () => {
      if (!asset) return [] as BlockedDateRange[];
      const res = await api.getBlockedDatesForAsset(token, asset.id);
      return res.blocked_ranges;
    },
    enabled: Boolean(asset),
  });

  // 4. Auto-advance calendar to first free month if current month is fully booked
  useEffect(() => {
    const ranges = blockedDatesQuery.data;
    if (!ranges || ranges.length === 0) return;
    const today = toDateOnly(new Date());
    for (let i = 0; i < 365 * 3; i++) {
      const check = new Date(today);
      check.setDate(today.getDate() + i);
      const blocked = ranges.some(r => {
        const s = toDateOnly(fromISODate(r.from_date));
        const e = toDateOnly(fromISODate(r.to_date));
        return check >= s && check <= e;
      });
      if (!blocked) {
        const firstFreeMonth = new Date(check.getFullYear(), check.getMonth(), 1);
        if (firstFreeMonth > toDateOnly(new Date())) {
          setCalendarMonth(firstFreeMonth);
        }
        return;
      }
    }
  }, [blockedDatesQuery.data]);

  const selectedPlan = plansQuery.data?.find((p) => p.id === selectedPlanId)
    || (plansQuery.data && plansQuery.data[0]);

  // Overlap and validation checks
  const hasDateOverlap = Boolean(
    selectedPlan && pickupDate &&
    overlapsAnyBlockedRange(fromISODate(pickupDate), selectedPlan.duration_days, blockedDatesQuery.data ?? [])
  );

  const aadhaarClean = aadhaarNumber.replace(/\D/g, '');
  const aadhaarValid = aadhaarClean.length === 12;

  const panClean = panNumber.toUpperCase().trim();
  const panValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panClean);

  const isFormValid = Boolean(
    token &&
    selectedPlanId &&
    pickupDate &&
    aadhaarValid &&
    panValid &&
    !hasDateOverlap
  );

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Please sign in to confirm this booking');
      if (!asset) throw new Error('Asset not found');
      if (!selectedPlanId) throw new Error('Please select a rental plan');
      if (!pickupDate) throw new Error('Please select a pickup date from the calendar');
      if (!aadhaarValid) throw new Error('Aadhaar must be exactly 12 digits');
      if (!panValid) throw new Error('PAN format must be like ABCDE1234F');
      if (!selectedPlan) throw new Error('Please select a valid rental plan');
      if (overlapsAnyBlockedRange(fromISODate(pickupDate), selectedPlan.duration_days, blockedDatesQuery.data ?? [])) {
        throw new Error('Selected dates are blocked. Please choose another date.');
      }

      return api.createBooking(token, {
        rental_plan_id: selectedPlanId,
        pickup_date: pickupDate,
        category_id: categoryId ?? asset.category_id,
        requested_asset_id: asset.id,
        aadhaar_number: aadhaarClean,
        pan_number: panClean,
        size: selectedSize || undefined,
      });
    },
    onSuccess: () => {
      try { sessionStorage.removeItem("elanora_draft_rental"); } catch {}
      setNotice('Booking reservation created successfully! Our concierge will review and allocate.');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setTimeout(() => {
        onBookingSuccess?.();
        onClose();
      }, 1500);
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Failed to create booking')),
  });

  const todayDate = toDateOnly(new Date());
  const isPending = createBookingMutation.isPending;
  const isBooked = Boolean(notice);

  // Return date calculation
  const returnDateISO = (selectedPlan && pickupDate) ? (() => {
    const d = fromISODate(pickupDate);
    d.setDate(d.getDate() + selectedPlan.duration_days);
    return toISODate(d);
  })() : null;

  // Calendar click handler
  const handleCalendarSelect = (day: Date) => {
    const activePlan = selectedPlan || (plansQuery.data && plansQuery.data[0]);
    if (!activePlan) {
      setError('Please select a rental plan');
      return;
    }
    if (!selectedPlanId) {
      setSelectedPlanId(activePlan.id);
    }
    if (toDateOnly(day) < todayDate) return;
    if (overlapsAnyBlockedRange(day, activePlan.duration_days, blockedDatesQuery.data ?? [])) {
      setError('Selected dates overlap with an existing reservation. Please pick another date.');
      return;
    }
    setError('');
    setPickupDate(toISODate(day));
  };

  if (!asset) return null;

  // Pricing calculations
  const rentTotal = selectedPlan ? (selectedPlan.daily_rate * selectedPlan.duration_days) : 0;
  const depositTotal = selectedPlan ? selectedPlan.deposit_amount : 0;
  const grandTotal = rentTotal + depositTotal;

  // Next required step text for button
  const getButtonText = () => {
    if (isPending) return 'Processing Reservation...';
    if (!token) return 'Sign In to Reserve Piece';
    if (!selectedPlanId) return 'Select a Rental Plan';
    if (!pickupDate) return 'Select Pickup Date on Calendar';
    if (!aadhaarValid) return 'Enter 12-Digit Aadhaar';
    if (!panValid) return 'Enter 10-Char PAN (ABCDE1234F)';
    if (hasDateOverlap) return 'Selected Dates Unavailable';
    return `Continue · ${formatINR(grandTotal)}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '840px',
            maxWidth: '100%',
            maxHeight: '92vh',
            background: '#141414',
            borderRadius: '20px',
            border: '1px solid rgba(201, 163, 74, 0.25)',
            boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.9), 0 0 30px rgba(201, 163, 74, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: '#FFFFFF',
          }}
        >

          {/* ── Header (Matches Screen 7 "Select Rental Dates") ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #222222',
            background: '#181818',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(201, 163, 74, 0.15)',
                border: '1px solid rgba(201, 163, 74, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#C9A34A',
              }}>
                <Calendar size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', margin: 0, fontFamily: 'var(--font-serif)', letterSpacing: '0.04em' }}>
                  Select Rental Dates
                </h3>
                <p style={{ fontSize: '12px', color: '#888888', margin: '2px 0 0' }}>
                  {asset.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#222222', border: '1px solid #333333', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#888888', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#333333'; e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#222222'; e.currentTarget.style.color = '#888888'; }}
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Unauthenticated banner ── */}
          {!token && (
            <div style={{
              background: 'rgba(201, 163, 74, 0.12)', borderBottom: '1px solid rgba(201, 163, 74, 0.3)',
              padding: '10px 24px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={15} color="#C9A34A" />
                <span style={{ fontSize: '12px', color: '#E8D49E', fontWeight: 500 }}>
                  You are viewing as a guest. Please sign in to confirm this reservation.
                </span>
              </div>
              <button
                type="button"
                onClick={handleGuestRedirectToLogin}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '6px',
                  background: '#C9A34A', color: '#0B0B0B',
                  fontSize: '11px', fontWeight: 700, border: 'none',
                  cursor: 'pointer', flexShrink: 0, textTransform: 'uppercase',
                }}
              >
                <LogIn size={13} />
                Sign In
              </button>
            </div>
          )}

          {/* ── Body: Two columns ── */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            scrollbarWidth: 'thin',
          }}>

            {/* ── LEFT COLUMN: Asset, Plan, KYC, Pricing Summary ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Asset Preview Mini Banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px', borderRadius: '12px',
                background: '#181818', border: '1px solid #282828',
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '8px',
                  overflow: 'hidden', flexShrink: 0,
                  background: '#222222', border: '1px solid #333333',
                }}>
                  <AssetThumb src={asset.image_url} alt={asset.name} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', padding: '2px 8px', borderRadius: '9999px',
                      background: asset.is_in_dry_cleaning ? 'rgba(201, 163, 74, 0.2)' : 'rgba(201, 163, 74, 0.15)',
                      color: asset.is_in_dry_cleaning ? '#C9A34A' : '#C9A34A',
                      border: asset.is_in_dry_cleaning ? '1px solid rgba(201, 163, 74, 0.4)' : '1px solid rgba(201, 163, 74, 0.3)',
                    }}>
                      {asset.is_in_dry_cleaning ? 'In Ozone Treatment' : 'Ready For Rental'}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {asset.name}
                  </h4>
                  <p style={{ fontSize: '11px', color: '#777777', margin: 0, fontFamily: 'monospace' }}>
                    Code: {asset.asset_code}
                  </p>
                </div>
              </div>

              {/* Notice / Errors */}
              <AnimatePresence>
                {notice && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 14px', borderRadius: '8px',
                      background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80',
                      fontSize: '12px', fontWeight: 500,
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {notice}
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 14px', borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171',
                      fontSize: '12px', fontWeight: 500,
                    }}
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Garment Size Selection */}
              <div>
                <FieldLabel icon={Sparkles}>1. Select Garment Size</FieldLabel>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {availableSizes.map((sz) => {
                    const isSelected = selectedSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        style={{
                          minWidth: '46px',
                          height: '38px',
                          padding: '0 12px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #C9A34A' : '1px solid #333333',
                          background: isSelected ? '#C9A34A' : '#181818',
                          color: isSelected ? '#0B0B0B' : '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 0 12px rgba(201, 163, 74, 0.35)' : 'none',
                        }}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rental Plan Selector */}
              <div>
                <FieldLabel icon={Tag}>2. Select Duration Plan</FieldLabel>
                {plansQuery.isLoading ? (
                  <div style={{ height: 42, background: '#222222', borderRadius: '8px' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {plansQuery.data?.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => {
                            setSelectedPlanId(plan.id);
                            setError('');
                          }}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            border: isSelected ? '1.5px solid #C9A34A' : '1px solid #282828',
                            background: isSelected ? 'rgba(201, 163, 74, 0.08)' : '#181818',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: 16, height: 16, borderRadius: '50%',
                              border: isSelected ? '5px solid #C9A34A' : '2px solid #555555',
                              background: '#141414',
                              flexShrink: 0,
                            }} />
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#C9A34A' : '#FFFFFF', margin: 0 }}>
                                {plan.name}
                              </p>
                              <p style={{ fontSize: '11px', color: '#888888', margin: '2px 0 0' }}>
                                {plan.duration_days} Days · ₹{plan.daily_rate}/day
                              </p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#C9A34A' }}>
                              ₹{plan.daily_rate * plan.duration_days}
                            </span>
                            <span style={{ display: 'block', fontSize: '10px', color: '#666666' }}>
                              + ₹{plan.deposit_amount} dep.
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* KYC Verification Inputs */}
              <div>
                <FieldLabel icon={ShieldCheck}>3. Verification Documents (KYC)</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Aadhaar */}
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#888888', marginBottom: '4px', letterSpacing: '0.05em' }}>
                      AADHAAR NUMBER *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="12-digit UID"
                        maxLength={12}
                        value={aadhaarNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                          setAadhaarNumber(val);
                        }}
                        disabled={isPending}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          paddingRight: '30px',
                          borderRadius: '8px',
                          border: aadhaarNumber && !aadhaarValid ? '1.5px solid #ef4444' : '1px solid #333333',
                          background: '#1b1b1b',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 500,
                          letterSpacing: '0.04em',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#C9A34A'; }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = aadhaarNumber && !aadhaarValid ? '#ef4444' : '#333333';
                        }}
                      />
                      {aadhaarValid && (
                        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4ade80' }}>
                          <CheckCircle2 size={15} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PAN */}
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#888888', marginBottom: '4px', letterSpacing: '0.05em' }}>
                      PAN NUMBER *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        value={panNumber}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                          setPanNumber(val);
                        }}
                        disabled={isPending}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          paddingRight: '30px',
                          borderRadius: '8px',
                          border: panNumber && !panValid ? '1.5px solid #ef4444' : '1px solid #333333',
                          background: '#1b1b1b',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 500,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#C9A34A'; }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = panNumber && !panValid ? '#ef4444' : '#333333';
                        }}
                      />
                      {panValid && (
                        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4ade80' }}>
                          <CheckCircle2 size={15} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill Summary (Matches Screen 7 in Reference Mockup) */}
              <div style={{
                background: '#181818', border: '1px solid #282828',
                borderRadius: '12px', padding: '14px 16px',
              }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#C9A34A', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
                  Rental Summary
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888888' }}>
                    <span>Rental Duration</span>
                    <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{selectedPlan ? `${selectedPlan.duration_days} Days` : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888888' }}>
                    <span>Pickup Date</span>
                    <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{pickupDate ? formatDisplayDate(pickupDate) : 'Select below'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888888' }}>
                    <span>Return Date</span>
                    <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{returnDateISO ? formatDisplayDate(returnDateISO) : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888888' }}>
                    <span>Rental Price</span>
                    <span style={{ color: '#C9A34A', fontWeight: 600 }}>₹{selectedPlan?.daily_rate.toLocaleString('en-IN')}/day</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888888' }}>
                    <span>Security Deposit (Refundable)</span>
                    <span style={{ color: '#C9A34A', fontWeight: 600 }}>₹{depositTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '14px', fontWeight: 700, color: '#FFFFFF',
                    paddingTop: '10px', borderTop: '1px dashed #333333', marginTop: '2px',
                  }}>
                    <span>Total Amount</span>
                    <span style={{ color: '#C9A34A' }}>₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* ── RIGHT COLUMN: Calendar Picker (Matches Screen 7) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              <div>
                <FieldLabel icon={Calendar}>3. Pick Rental Dates</FieldLabel>
                <div style={{
                  border: '1px solid #282828', borderRadius: '14px',
                  background: '#181818', overflow: 'hidden',
                }}>

                  {/* Calendar Nav (Matches Screen 7: < October 2026 >) */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderBottom: '1px solid #222222',
                    background: '#141414',
                  }}>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                      style={{
                        width: 30, height: 30, borderRadius: '8px', border: '1px solid #333333',
                        background: '#1e1e1e', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: '#C9A34A',
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                      {calendarMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                      style={{
                        width: 30, height: 30, borderRadius: '8px', border: '1px solid #333333',
                        background: '#1e1e1e', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: '#C9A34A',
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div style={{ padding: '14px' }}>
                    {/* Weekday Names */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <div key={d} style={{
                          textAlign: 'center', fontSize: '11px', fontWeight: 600,
                          color: '#C9A34A',
                        }}>
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Day Cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                      {getMonthDays(calendarMonth).map((day) => {
                        const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                        const isSelected = pickupDate === toISODate(day);
                        const isToday = toDateOnly(day).getTime() === todayDate.getTime();
                        const isInPast = toDateOnly(day) < todayDate;
                        const activePlan = selectedPlan || (plansQuery.data && plansQuery.data[0]);
                        const isBlocked = activePlan
                          ? overlapsAnyBlockedRange(day, activePlan.duration_days, blockedDatesQuery.data ?? [])
                          : false;
                        const disabled = isPending || !isCurrentMonth || isInPast || isBlocked;

                        let bg = 'transparent';
                        let color = '#E0E0E0';
                        let border = '1px solid transparent';
                        let cursor = 'pointer';
                        let fontWeight = 400;

                        if (!isCurrentMonth) {
                          color = 'transparent';
                          cursor = 'default';
                        } else if (isSelected) {
                          // Blush Pink highlight matching Screen 7!
                          bg = '#C9A34A';
                          color = '#0B0B0B';
                          fontWeight = 700;
                          border = '1px solid #C9A34A';
                        } else if (isBlocked && !isInPast) {
                          bg = 'rgba(239, 68, 68, 0.1)';
                          color = '#ef4444';
                          cursor = 'not-allowed';
                        } else if (isInPast) {
                          color = '#444444';
                          cursor = 'not-allowed';
                        } else if (isToday) {
                          border = '1px solid #C9A34A';
                          color = '#C9A34A';
                          fontWeight = 600;
                        }

                        return (
                          <button
                            key={toISODate(day)}
                            type="button"
                            onClick={() => !disabled && handleCalendarSelect(day)}
                            disabled={disabled}
                            style={{
                              height: 36,
                              borderRadius: '50%',
                              border,
                              background: bg,
                              color,
                              fontSize: '12px',
                              fontWeight,
                              cursor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxSizing: 'border-box',
                              transition: 'all 0.1s',
                            }}
                            onMouseEnter={(e) => {
                              if (!disabled && !isSelected && isCurrentMonth) {
                                e.currentTarget.style.background = 'rgba(201, 163, 74, 0.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!disabled && !isSelected && isCurrentMonth) {
                                e.currentTarget.style.background = isBlocked ? 'rgba(239, 68, 68, 0.1)' : 'transparent';
                              }
                            }}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div style={{
                      display: 'flex', gap: '14px', marginTop: '14px',
                      paddingTop: '10px', borderTop: '1px solid #222222',
                      flexWrap: 'wrap', fontSize: '10px', color: '#888888',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C9A34A' }} />
                        <span>Selected</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1px solid #C9A34A' }} />
                        <span>Today</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.3)' }} />
                        <span>Booked</span>
                      </div>
                    </div>

                  </div>

                </div>
              </div>

              {/* White Glove Promise Box */}
              <div style={{
                background: '#181818', border: '1px solid #282828',
                borderRadius: '12px', padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#C9A34A', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  <Sparkles size={14} />
                  <span>White-Glove Rental Guarantee</span>
                </div>
                <p style={{ fontSize: '11px', color: '#888888', margin: 0, lineHeight: 1.5 }}>
                  Every boutique garment undergoes 7-stage eco-sanitization and custom hand-pressing before delivery. 100% refundable security deposit credited back upon return.
                </p>
              </div>

            </div>

          </div>

          {/* ── Footer / CTA (Matches Screen 7 "Continue" Button) ── */}
          {!isBooked && (
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #222222',
              background: '#181818',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888888', fontSize: '11px' }}>
                <ShieldCheck size={15} color="#C9A34A" />
                <span>Zero deposit retention on undamaged pieces.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #333333',
                    background: '#141414',
                    color: '#888888',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                {!token ? (
                  <button
                    type="button"
                    onClick={handleGuestRedirectToLogin}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#C9A34A',
                      color: '#0B0B0B',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(201, 163, 74, 0.3)',
                    }}
                  >
                    <LogIn size={15} />
                    Sign In to Book
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => createBookingMutation.mutate()}
                    disabled={!isFormValid || isPending}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isFormValid && !isPending
                        ? '#C9A34A'
                        : '#333333',
                      color: isFormValid && !isPending ? '#0B0B0B' : '#777777',
                      fontSize: '13px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      cursor: isFormValid && !isPending ? 'pointer' : 'not-allowed',
                      boxShadow: isFormValid && !isPending ? '0 4px 16px rgba(201, 163, 74, 0.4)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isPending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    {getButtonText()}
                  </button>
                )}
              </div>
            </div>
          )}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
