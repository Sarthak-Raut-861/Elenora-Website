import type { Asset, Offer } from "../types";

export interface AssetPricing {
  hasOffer: boolean;
  offerBadge: string | null;
  offerTitle: string | null;
  originalBuy: number | null;
  offerBuy: number | null;
  originalRent: number | null;
  offerRent: number | null;
  discountPercentage: number | null;
}

/**
 * Calculates promotional special offer pricing for an asset without altering
 * the authentic database stock or base asset prices.
 */
export function getAssetPricing(
  asset?: (Partial<Asset> & {
    id?: number;
    category_id?: number;
    buy_price?: number | null;
    rental_price?: number | null;
  }) | null,
  activeOffers: Offer[] = []
): AssetPricing {
  const origBuy = asset && typeof asset.buy_price === "number" ? asset.buy_price : null;
  const origRent = asset && typeof asset.rental_price === "number" ? asset.rental_price : null;

  const defaultResult: AssetPricing = {
    hasOffer: false,
    offerBadge: null,
    offerTitle: null,
    originalBuy: origBuy,
    offerBuy: null,
    originalRent: origRent,
    offerRent: null,
    discountPercentage: null,
  };

  if (!asset || !activeOffers || activeOffers.length === 0) {
    return defaultResult;
  }

  // Find matching offer with precedence: Asset > Category > Sitewide
  const matchingOffer =
    activeOffers.find((o) => o.scope === "asset" && o.asset_id === asset.id) ||
    activeOffers.find((o) => o.scope === "category" && o.category_id === asset.category_id) ||
    activeOffers.find((o) => o.scope === "sitewide");

  if (!matchingOffer) {
    return defaultResult;
  }

  const appliesToBuy = matchingOffer.apply_to === "both" || matchingOffer.apply_to === "buy";
  const appliesToRent = matchingOffer.apply_to === "both" || matchingOffer.apply_to === "rent";

  let calcBuy = origBuy;
  let calcRent = origRent;
  let computedPct: number | null = null;

  if (matchingOffer.discount_type === "percentage") {
    const pct = Math.min(90, Math.max(1, matchingOffer.discount_value));
    computedPct = pct;
    if (appliesToBuy && origBuy) {
      calcBuy = Math.max(1, Math.round(origBuy * (1 - pct / 100)));
    }
    if (appliesToRent && origRent) {
      calcRent = Math.max(1, Math.round(origRent * (1 - pct / 100)));
    }
  } else if (matchingOffer.discount_type === "fixed_amount") {
    const amt = matchingOffer.discount_value;
    if (appliesToBuy && origBuy) {
      calcBuy = Math.max(1, origBuy - amt);
      computedPct = Math.round((amt / origBuy) * 100);
    }
    if (appliesToRent && origRent) {
      // Scale flat rent discount sensibly if flat amount exceeds daily rent
      const rentDiscount = amt >= origRent ? Math.round(origRent * 0.25) : amt;
      calcRent = Math.max(1, origRent - rentDiscount);
      if (!computedPct) computedPct = Math.round((rentDiscount / origRent) * 100);
    }
  } else if (matchingOffer.discount_type === "custom_price") {
    if (appliesToBuy && typeof matchingOffer.custom_buy_price === "number") {
      calcBuy = matchingOffer.custom_buy_price;
      if (origBuy && origBuy > calcBuy) {
        computedPct = Math.round(((origBuy - calcBuy) / origBuy) * 100);
      }
    }
    if (appliesToRent && typeof matchingOffer.custom_rental_price === "number") {
      calcRent = matchingOffer.custom_rental_price;
      if (origRent && origRent > calcRent && !computedPct) {
        computedPct = Math.round(((origRent - calcRent) / origRent) * 100);
      }
    }
  }

  const hasBuyDiscount = Boolean(appliesToBuy && calcBuy !== null && origBuy !== null && calcBuy < origBuy);
  const hasRentDiscount = Boolean(appliesToRent && calcRent !== null && origRent !== null && calcRent < origRent);

  if (!hasBuyDiscount && !hasRentDiscount) {
    return defaultResult;
  }

  const badge = matchingOffer.badge_text || (computedPct ? `${computedPct}% OFF` : "SPECIAL OFFER");

  return {
    hasOffer: true,
    offerBadge: badge,
    offerTitle: matchingOffer.title,
    originalBuy: origBuy,
    offerBuy: hasBuyDiscount ? calcBuy : null,
    originalRent: origRent,
    offerRent: hasRentDiscount ? calcRent : null,
    discountPercentage: computedPct,
  };
}
