"""Tests for the dispatch/isolation boundary.

These tests assert what each agent is *not* allowed to see. That is the
point of the decentralized design: an agent cannot reach for a field
outside its remit because the field is absent from the object it receives.
"""

from __future__ import annotations

from app.agents.dispatch import (
    WATCHED_METRICS,
    ConsistencyChunk,
    CorrectnessChunk,
    build_bundle,
    slice_for_consistency,
    slice_for_correctness,
    slice_for_variance,
)
from app.schemas.financial import FinancialRecord


def _record(year: int = 2023, **overrides) -> FinancialRecord:
    base = dict(
        year=year,
        company="ACME",
        source_row=year - 2000,
        revenue=1000.0,
        gross_profit=400.0,
        net_income=100.0,
        ebitda=250.0,
        shareholder_equity=500.0,
        net_profit_margin=10.0,
        roe=20.0,
        roa=8.0,
        roi=12.0,
        debt_equity_ratio=1.5,
        current_ratio=2.0,
        earning_per_share=3.5,
        free_cash_flow_per_share=2.5,
        return_on_tangible_equity=22.0,
        inflation_rate_us=3.1,
        number_of_employees=1000,
    )
    base.update(overrides)
    return FinancialRecord(**base)


def test_correctness_agent_cannot_see_ratios_it_has_no_basis_to_verify():
    # The source reports no total assets, invested capital or current
    # liabilities, so ROA/ROI/current ratio are not recomputable. Handing
    # them over would invite the agent to "verify" a number it cannot.
    fields = CorrectnessChunk.model_fields
    for hidden in ("roa", "roi", "current_ratio", "debt_equity_ratio", "ebitda"):
        assert hidden not in fields


def test_correctness_chunk_carries_only_what_its_rules_consume():
    chunk = slice_for_correctness(_record())
    assert set(CorrectnessChunk.model_fields) == {
        "company",
        "year",
        "source_row",
        "revenue",
        "gross_profit",
        "net_income",
        "shareholder_equity",
        "reported_net_profit_margin",
        "reported_roe",
    }
    assert chunk.reported_roe == 20.0
    assert chunk.reported_net_profit_margin == 10.0


def test_consistency_agent_cannot_see_unrelated_per_share_or_macro_fields():
    fields = ConsistencyChunk.model_fields
    for hidden in ("earning_per_share", "free_cash_flow_per_share", "inflation_rate_us", "roi"):
        assert hidden not in fields


def test_variance_agent_sees_only_watched_metrics():
    chunk = slice_for_variance("ACME", [_record(2022), _record(2023)])
    for point in chunk.points:
        assert set(point.metrics) <= set(WATCHED_METRICS)
    # Fields it does not watch are absent entirely, not merely unused.
    assert "roa" not in chunk.points[0].metrics
    assert "current_ratio" not in chunk.points[0].metrics


def test_variance_chunk_is_ordered_by_year():
    chunk = slice_for_variance("ACME", [_record(2023), _record(2021), _record(2022)])
    assert [p.year for p in chunk.points] == [2021, 2022, 2023]


def test_source_row_is_carried_through_every_slice():
    record = _record(2023)
    assert slice_for_correctness(record).source_row == 23
    assert slice_for_consistency(record).source_row == 23
    assert slice_for_variance("ACME", [record]).points[0].source_row == 23


def test_missing_metrics_are_omitted_rather_than_defaulted_to_zero():
    chunk = slice_for_variance("ACME", [_record(2023, net_income=None)])
    # A zero here would be read as a real reported value and produce a
    # fabricated -100% variance against it.
    assert "net_income" not in chunk.points[0].metrics
    assert "revenue" in chunk.points[0].metrics


def test_build_bundle_produces_one_chunk_per_year_for_point_in_time_agents():
    records = [_record(2021), _record(2022), _record(2023)]
    bundle = build_bundle("ACME", records)

    assert [c.year for c in bundle.correctness] == [2021, 2022, 2023]
    assert [c.year for c in bundle.consistency] == [2021, 2022, 2023]
    assert [p.year for p in bundle.variance.points] == [2021, 2022, 2023]
    assert bundle.company == "ACME"
