"""Premium, Equilibrium, and Discount zone calculations for the active dealing range."""

from __future__ import annotations

from typing import List, Literal, Optional

from .models import Candle, PremiumDiscountZone, SwingPoint


def compute_premium_discount(
    candles: List[Candle],
    swings: List[SwingPoint],
) -> Optional[PremiumDiscountZone]:
    """Compute Premium (>52.5%), Equilibrium (47.5%–52.5%), and Discount (<47.5%) zones."""
    if not candles:
        return None

    highs = [s.price for s in swings if s.is_high]
    lows = [s.price for s in swings if not s.is_high]

    if highs and lows:
        range_high = highs[-1]
        range_low = lows[-1]
        if range_high <= range_low:
            range_high = max(highs[-3:])
            range_low = min(lows[-3:])
    else:
        range_high = max(c.high for c in candles)
        range_low = min(c.low for c in candles)

    if range_high <= range_low:
        return None

    span = range_high - range_low
    equilibrium = range_low + 0.50 * span
    premium_start = range_low + 0.525 * span
    discount_end = range_low + 0.475 * span
    current_price = candles[-1].close

    zone: Literal["premium", "equilibrium", "discount"]
    if current_price >= premium_start:
        zone = "premium"
    elif current_price <= discount_end:
        zone = "discount"
    else:
        zone = "equilibrium"

    return PremiumDiscountZone(
        range_high=range_high,
        range_low=range_low,
        equilibrium=equilibrium,
        premium_start=premium_start,
        discount_end=discount_end,
        current_price=current_price,
        current_zone=zone,
    )
