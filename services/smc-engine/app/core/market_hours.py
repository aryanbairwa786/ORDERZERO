"""Indian stock market (NSE/BSE) time, holiday calendar, and INR formatting utilities."""

from __future__ import annotations

from datetime import date, datetime, time, timezone, timedelta
from typing import Literal, Set

try:
    from zoneinfo import ZoneInfo
    IST = ZoneInfo("Asia/Kolkata")
except Exception:
    IST = timezone(timedelta(hours=5, minutes=30), name="IST")

PRE_OPEN_START = time(9, 0)
PRE_OPEN_END = time(9, 8)
MARKET_OPEN = time(9, 15)
MARKET_CLOSE = time(15, 30)

# Representative NSE equity market holidays (configurable via DB/admin in production)
NSE_HOLIDAYS: Set[date] = {
    # 2025
    date(2025, 2, 26),  # Mahashivratri
    date(2025, 3, 14),  # Holi
    date(2025, 3, 31),  # Id-Ul-Fitr
    date(2025, 4, 10),  # Shri Mahavir Jayanti
    date(2025, 4, 14),  # Dr. Baba Saheb Ambedkar Jayanti
    date(2025, 4, 18),  # Good Friday
    date(2025, 5, 1),   # Maharashtra Day
    date(2025, 8, 15),  # Independence Day
    date(2025, 8, 27),  # Ganesh Chaturthi
    date(2025, 10, 2),  # Mahatma Gandhi Jayanti / Dussehra
    date(2025, 10, 21), # Diwali Laxmi Pujan
    date(2025, 10, 22), # Diwali Balipratipada
    date(2025, 11, 5),  # Prakash Gurpurb Sri Guru Nanak Dev
    date(2025, 12, 25), # Christmas
    # 2026
    date(2026, 1, 26),  # Republic Day
    date(2026, 3, 3),   # Holi
    date(2026, 3, 26),  # Shri Ram Navami
    date(2026, 3, 31),  # Shri Mahavir Jayanti
    date(2026, 4, 3),   # Good Friday
    date(2026, 4, 14),  # Dr. Baba Saheb Ambedkar Jayanti
    date(2026, 5, 1),   # Maharashtra Day
    date(2026, 5, 28),  # Bakri Id
    date(2026, 6, 26),  # Muharram
    date(2026, 9, 14),  # Ganesh Chaturthi
    date(2026, 10, 2),  # Mahatma Gandhi Jayanti
    date(2026, 10, 20), # Dussehra
    date(2026, 11, 10), # Diwali Balipratipada
    date(2026, 11, 24), # Prakash Gurpurb Sri Guru Nanak Dev
    date(2026, 12, 25), # Christmas
}


def to_ist(dt: datetime) -> datetime:
    """Convert any datetime (naive assumed IST or aware) to Asia/Kolkata."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=IST)
    return dt.astimezone(IST)


def is_nse_trading_day(day: date, holidays: Set[date] | None = None) -> bool:
    """Return True if the date is a weekday and not an NSE holiday."""
    holiday_set = NSE_HOLIDAYS if holidays is None else holidays
    return day.weekday() < 5 and day not in holiday_set


def get_nse_session_status(
    dt: datetime, holidays: Set[date] | None = None
) -> Literal["pre_open", "open", "closed", "holiday"]:
    """Classify an IST timestamp into NSE session status."""
    ist_dt = to_ist(dt)
    holiday_set = NSE_HOLIDAYS if holidays is None else holidays
    if ist_dt.date() in holiday_set or ist_dt.weekday() >= 5:
        return "holiday"
    t = ist_dt.time()
    if PRE_OPEN_START <= t <= PRE_OPEN_END:
        return "pre_open"
    if MARKET_OPEN <= t <= MARKET_CLOSE:
        return "open"
    return "closed"


def format_inr(amount: float, decimals: int = 2, include_symbol: bool = True) -> str:
    """Format a number in Indian numbering system (e.g., ₹1,23,45,678.50)."""
    sign = "-" if amount < 0 else ""
    abs_val = abs(amount)
    formatted = f"{abs_val:.{decimals}f}"
    if decimals > 0:
        int_part, dec_part = formatted.split(".")
    else:
        int_part, dec_part = formatted, ""

    if len(int_part) <= 3:
        indian_int = int_part
    else:
        last_three = int_part[-3:]
        rest = int_part[:-3]
        groups = []
        while len(rest) > 2:
            groups.append(rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.append(rest)
        groups.reverse()
        indian_int = ",".join(groups) + "," + last_three

    symbol = "₹" if include_symbol else ""
    if decimals > 0:
        return f"{sign}{symbol}{indian_int}.{dec_part}"
    return f"{sign}{symbol}{indian_int}"


def format_indian_compact(value: float, include_symbol: bool = True) -> str:
    """Format large values into Indian Lakh (L) and Crore (Cr) units."""
    sign = "-" if value < 0 else ""
    abs_val = abs(value)
    symbol = "₹" if include_symbol else ""
    if abs_val >= 1_00_00_000:
        return f"{sign}{symbol}{abs_val / 1_00_00_000:.2f} Cr"
    if abs_val >= 1_00_000:
        return f"{sign}{symbol}{abs_val / 1_00_000:.2f} L"
    return format_inr(value, decimals=2, include_symbol=include_symbol)
