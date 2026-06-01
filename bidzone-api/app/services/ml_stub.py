"""Placeholder ML / agentic layers — deterministic estimates until models are trained."""

from __future__ import annotations

from decimal import Decimal


def win_probability_percent(
    your_bid_cents: int,
    min_next_bid_cents: int,
    seconds_remaining: int,
) -> int:
    if your_bid_cents < min_next_bid_cents:
        return 12
    headroom = (your_bid_cents - min_next_bid_cents) / max(min_next_bid_cents, 1)
    p = 36 + min(40, headroom * 30)
    if seconds_remaining < 3600:
        p += 7
    if seconds_remaining < 600:
        p += 8
    if seconds_remaining < 120:
        p += 5
    return round(min(94, max(16, p)))


def bid_coach_text(category: str, current_high_cents: int, min_next_cents: int) -> dict[str, str | int]:
    ref = int(current_high_cents * 1.07 + min_next_cents * 0.015)
    suggest = int(min_next_cents + max(1, current_high_cents * 0.025))
    return {
        "category": category,
        "reference_clearing_price_cents": ref,
        "suggested_bid_cents": suggest,
        "rationale": (
            f"Comparable {category} lots in this marketplace often clear near {ref} cents. "
            f"A bid around {suggest} cents is typically competitive without overshooting. "
            "Demo heuristic only — not financial advice."
        ),
    }


def composite_trust_score(
    avg_stars: float | None,
    unpaid_win_count: int,
    completed_sales_count: int,
) -> Decimal:
    """Phase 6 stub: blends review average with payment-default penalty and completion bonus.

    Replace with trained trust model when labels exist (cancellations, chargebacks, delivery SLA).
    """
    base = (avg_stars if avg_stars is not None else 3.0) / 5.0
    bail_penalty = min(0.35, max(0, unpaid_win_count) * 0.06)
    completion_bonus = min(0.2, max(0, completed_sales_count) * 0.02)
    v = base - bail_penalty + completion_bonus
    return Decimal(str(round(max(0.05, min(0.99, v)), 4)))
