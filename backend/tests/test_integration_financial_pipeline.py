"""
End-to-End Integration Test
============================

This test checks the complete Financial Statement Review Agent.

Complete pipeline:

    Real CSV Dataset
          ↓
    Load Financial Records
          ↓
    Detect Financial Changes
          ↓
    Build RAG Evidence
          ↓
    Retrieve Relevant Evidence
          ↓
    Check Grounding
          ↓
    Generate Analyst Explanation
          ↓
    Create Finding
          ↓
    Send Finding for Human Review (PENDING)

Unlike unit tests, this file checks that all major parts of the
application work together using the REAL financial dataset.
"""

from pathlib import Path

import pytest

# -----------------------------
# Import project components
# -----------------------------

# Loads the real CSV financial data
from app.documents.csv_loader import load_records

# Detects significant financial changes
from app.engine.variance import detect_variances, VarianceFlag

# The rule-based agents' shared finding contract
from app.agents.contracts import AgentFinding, AgentName, Severity, cite

# Builds RAG snippets from financial records
from app.rag.snippets import build_snippets

# Creates the RAG vector index
from app.rag.store import build_index

# Retrieves evidence from the RAG index
from app.rag.retrieval import retrieve_evidence

# Runs the complete four-agent financial review
from app.agents.orchestrator import run_orchestrated_review

# Handles the agent's "insufficient evidence" behavior
from app.agent.interpret import (
    generate_explanation,
    NO_EVIDENCE_AT_ALL_MESSAGE,
)

# Used to check that AI findings are waiting for human approval
from app.agent.schemas import ReviewStatus

# Used to clear previous findings before each complete-agent test
from app.agent.store import get_finding_store

# Used to check that unknown companies are rejected
from app.agent.tools import CompanyNotFoundError


# ============================================================
# 1. FIND THE REAL DATASET
# ============================================================

# The actual dataset in this project is:
#
# backend/data/financial_statements.csv
#
# __file__ points to:
# backend/tests/test_integration_financial_pipeline.py
#
# parents[1] takes us to the backend folder.
DATASET_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "financial_statements.csv"
)


# ============================================================
# 2. LOAD THE REAL DATASET
# ============================================================

@pytest.fixture(scope="module")
def real_records():
    """
    Load the REAL financial dataset.

    We are not creating fake test data here because this is an
    end-to-end integration test.
    """

    # Make sure the dataset actually exists.
    assert DATASET_PATH.exists(), (
        f"Financial dataset not found at: {DATASET_PATH}"
    )

    # Use the application's real CSV loader.
    records = load_records(DATASET_PATH)

    # Dataset should not be empty.
    assert records, "Financial dataset is empty."

    # The current project dataset contains 161 records.
    assert len(records) == 161

    return records


# ============================================================
# 3. CREATE A REAL RAG INDEX
# ============================================================

@pytest.fixture(scope="module")
def rag_index(tmp_path_factory, real_records):
    """
    Build a temporary RAG index using the REAL financial records.

    Scoped to the module (built once, reused by every test below)
    rather than per-test: no test in this file writes to the index,
    only queries it, so rebuilding 310 snippets from scratch for each
    of the ~15 tests/parametrized cases that use it was pure waste —
    it took this file from a few seconds to over 19 minutes.
    tmp_path_factory (module/session-safe) replaces tmp_path
    (function-scoped only) so this fixture can be widened.
    """

    # Fresh temp directory, isolated from the app's normal Chroma database.
    index_path = tmp_path_factory.mktemp("rag_index")

    # Convert financial records into searchable snippets.
    snippets = build_snippets(real_records)

    # Make sure snippets were created.
    assert snippets, "No RAG snippets were generated."

    # Build the vector index using the real RAG implementation.
    number_of_documents = build_index(
        snippets,
        index_path,
    )

    # Make sure all snippets were indexed.
    assert number_of_documents == len(snippets)

    # Return the temporary RAG index location.
    return index_path


# ============================================================
# 4. TEST REAL DATASET LOADING
# ============================================================

def test_real_dataset_loads_successfully(real_records):
    """
    Check that the real CSV is converted into FinancialRecord
    objects correctly.
    """

    # The dataset should contain 161 records.
    assert len(real_records) == 161

    # Every record should have a company name.
    assert all(
        record.company
        for record in real_records
    )

    # Every record should have a valid year.
    assert all(
        isinstance(record.year, int)
        for record in real_records
    )

    # Check a known AAPL record from the real dataset.
    aapl_2022 = next(
        record
        for record in real_records
        if record.company == "AAPL"
        and record.year == 2022
    )

    # These values come directly from the dataset.
    assert aapl_2022.revenue == 394328.0
    assert aapl_2022.net_income == 99803.0


# ============================================================
# 5. TEST THE FINANCIAL ENGINE
# ============================================================

def test_real_dataset_runs_through_engine(real_records):
    """
    Run the complete real dataset through the deterministic
    financial variance engine.
    """

    # Detect changes greater than 20%.
    flags = detect_variances(
        real_records,
        threshold_pct=20.0,
    )

    # The dataset should contain some significant changes.
    assert flags, (
        "No financial variances were detected in the real dataset."
    )

    # Create a list of valid company/year combinations.
    valid_records = {
        (record.company, record.year)
        for record in real_records
    }

    # Check every detected financial anomaly.
    for flag in flags:

        # The flagged company/year must actually exist
        # in the original dataset.
        assert (
            flag.company,
            flag.year,
        ) in valid_records

        # The engine should compare consecutive years only.
        assert flag.year == flag.prior_year + 1

        # Independently calculate the percentage change.
        expected_change = (
            (flag.value - flag.prior_value)
            / abs(flag.prior_value)
            * 100
        )

        # The engine's calculation must match our calculation.
        assert flag.pct_change == pytest.approx(
            expected_change,
            rel=1e-9,
        )

        # Because the threshold is 20%, the change must be
        # at least 20% in either direction.
        assert abs(flag.pct_change) >= 20.0


# ============================================================
# 6. TEST CALCULATION ACCURACY
# ============================================================

def test_aapl_revenue_calculation_is_correct(real_records):
    """
    Test one known financial calculation directly.

    AAPL:
        2009 revenue = 42,905
        2010 revenue = 65,225

    Expected growth:

        (65,225 - 42,905) / 42,905 × 100

        ≈ 52.02%
    """

    # Find AAPL's 2009 record.
    previous_year = next(
        record
        for record in real_records
        if record.company == "AAPL"
        and record.year == 2009
    )

    # Find AAPL's 2010 record.
    current_year = next(
        record
        for record in real_records
        if record.company == "AAPL"
        and record.year == 2010
    )

    # Verify the original dataset values.
    assert previous_year.revenue == 42905.0
    assert current_year.revenue == 65225.0

    # Calculate the expected percentage independently.
    expected_growth = (
        (current_year.revenue - previous_year.revenue)
        / abs(previous_year.revenue)
        * 100
    )

    # Run these records through the real engine.
    flags = detect_variances(
        [previous_year, current_year],
        threshold_pct=20.0,
    )

    # Find the revenue anomaly.
    revenue_flag = next(
        flag
        for flag in flags
        if flag.metric == "revenue"
    )

    # Check the values used by the engine.
    assert revenue_flag.prior_value == 42905.0
    assert revenue_flag.value == 65225.0

    # Check the calculated percentage.
    assert revenue_flag.pct_change == pytest.approx(
        expected_growth,
        rel=1e-9,
    )

    # Expected result is approximately 52.02%.
    assert revenue_flag.pct_change == pytest.approx(
        52.0219088684,
        rel=1e-9,
    )


# ============================================================
# 7. TEST INCREASE AND DECREASE SCENARIOS
# ============================================================

def test_engine_detects_both_increases_and_decreases(
    real_records,
):
    """
    The financial engine should detect both:

        Revenue/profit INCREASES
        Revenue/profit DECREASES
    """

    flags = detect_variances(
        real_records,
        threshold_pct=20.0,
    )

    # Positive percentage = increase.
    increases = [
        flag
        for flag in flags
        if flag.pct_change > 0
    ]

    # Negative percentage = decrease.
    decreases = [
        flag
        for flag in flags
        if flag.pct_change < 0
    ]

    # Both scenarios should exist in a realistic dataset.
    assert increases, "No increase scenarios detected."

    assert decreases, "No decrease scenarios detected."


# ============================================================
# 8. TEST THRESHOLD LOGIC
# ============================================================

def test_high_threshold_returns_no_anomalies(real_records):
    """
    If we set an extremely high threshold, normal financial
    changes should not be flagged.
    """

    flags = detect_variances(
        real_records,
        threshold_pct=99999.0,
    )

    # Nothing should exceed a 99,999% threshold.
    assert flags == []


# ============================================================
# 9. TEST RAG INDEXING
# ============================================================

def test_real_data_is_indexed_into_rag(
    real_records,
    rag_index,
):
    """
    Verify that the real financial dataset is successfully
    converted into searchable RAG evidence.
    """

    # Create snippets from real financial records.
    snippets = build_snippets(real_records)

    assert snippets

    # Search the actual temporary RAG index.
    results = retrieve_evidence(
        "AAPL revenue 2022",
        rag_index,
        k=3,
        company="AAPL",
        min_similarity=0.3,
    )

    # We should find evidence.
    assert results


# ============================================================
# 10. TEST RAG RETRIEVAL
# ============================================================

@pytest.mark.parametrize(
    "company, year",
    [
        ("AAPL", 2022),
        ("MSFT", 2022),
        ("NVDA", 2022),
        ("AMZN", 2022),
        ("GOOG", 2022),
    ],
)
def test_rag_finds_correct_company_and_year(
    real_records,
    rag_index,
    company,
    year,
):
    """
    Ask questions about several real companies.

    The RAG system should return evidence belonging to
    the requested company and year.
    """

    # First make sure this company/year exists in the dataset.
    assert any(
        record.company == company
        and record.year == year
        for record in real_records
    )

    # Ask the RAG system a financial question.
    results = retrieve_evidence(
        f"{company} revenue {year}",
        rag_index,
        k=3,
        company=company,
        min_similarity=0.3,
    )

    # Evidence must be returned.
    assert results

    # Every result must belong to the requested company.
    assert all(
        result.metadata["company"] == company
        for result in results
    )

    # At least one result must be for the requested year.
    assert any(
        result.metadata["year"] == year
        for result in results
    )

    # Evidence should actually discuss revenue.
    assert any(
        "revenue" in result.text.lower()
        for result in results
    )


# ============================================================
# 11. MEASURE RAG RETRIEVAL ACCURACY
# ============================================================

def test_rag_retrieval_accuracy(
    real_records,
    rag_index,
):
    """
    Measure how often RAG retrieves the correct company/year.

    Target:
        At least 90% retrieval accuracy.
    """

    # Representative real company/year questions.
    test_cases = [
        ("AAPL", 2022),
        ("MSFT", 2022),
        ("NVDA", 2022),
        ("AMZN", 2022),
        ("GOOG", 2022),
        ("INTC", 2022),
        ("MCD", 2022),
    ]

    correct_answers = 0

    # Test every query.
    for company, year in test_cases:

        results = retrieve_evidence(
            f"{company} revenue {year}",
            rag_index,
            k=3,
            company=company,
            min_similarity=0.3,
        )

        # A result is considered correct when both
        # company AND year match.
        if any(
            result.metadata.get("company") == company
            and result.metadata.get("year") == year
            for result in results
        ):
            correct_answers += 1

    # Calculate accuracy.
    accuracy = (
        correct_answers
        / len(test_cases)
    )

    print(
        f"\nRAG Retrieval Accuracy: {accuracy:.1%}"
    )

    # Our acceptance target is 90%.
    assert accuracy >= 0.90


# ============================================================
# 12. TEST WRONG-COMPANY PROTECTION
# ============================================================

def test_rag_does_not_return_wrong_company(
    rag_index,
):
    """
    If we ask about AAPL, evidence from another company
    must not be returned.
    """

    results = retrieve_evidence(
        "Why did AAPL revenue change?",
        rag_index,
        k=5,
        company="AAPL",
        min_similarity=0.3,
    )

    assert results

    # Every result must belong to AAPL.
    assert all(
        result.metadata["company"] == "AAPL"
        for result in results
    )


# ============================================================
# 13. TEST GROUNDING
# ============================================================

def test_financial_findings_are_grounded(
    real_records,
    rag_index,
):
    """
    Every material financial anomaly should have supporting
    evidence in the RAG system.

    Target:
        At least 90% of findings should have evidence.
    """

    # Detect real financial anomalies.
    flags = detect_variances(
        real_records,
        threshold_pct=20.0,
    )

    assert flags

    grounded_findings = 0

    # Check each anomaly.
    for flag in flags:

        # Ask RAG for supporting evidence.
        evidence = retrieve_evidence(
            flag.query_text,
            rag_index,
            k=3,
            company=flag.company,
            min_similarity=0.3,
        )

        # If evidence exists, the finding is grounded.
        if evidence:

            grounded_findings += 1

            # Evidence must belong to the correct company.
            assert all(
                item.metadata["company"]
                == flag.company
                for item in evidence
            )

    # Calculate grounding percentage.
    grounding_rate = (
        grounded_findings
        / len(flags)
    )

    print(
        f"\nGrounding Coverage: {grounding_rate:.1%}"
    )

    # At least 90% should be grounded.
    assert grounding_rate >= 0.90


# ============================================================
# 14. TEST HALLUCINATION PROTECTION
# ============================================================

def test_unrelated_question_returns_no_evidence(
    rag_index,
):
    """
    Ask a completely unrelated question.

    The RAG system should NOT force an irrelevant financial
    document to match the question.
    """

    results = retrieve_evidence(
        (
            "Why did the fictional CFO secretly resign "
            "because of a banana spaceship?"
        ),
        rag_index,
        k=3,
        min_similarity=0.90,
    )

    # No evidence should be returned.
    assert results == []


# ============================================================
# 15. TEST AGENT REFUSAL TO GUESS
# ============================================================

def test_agent_refuses_to_guess_without_evidence():
    """
    This is one of the MOST IMPORTANT tests for the project.

    Product principle:

        No evidence
             ↓
        No explanation
             ↓
        Insufficient evidence

    The AI must NEVER invent a financial cause.
    """

    # Create a finding, as the variance agent would produce it.
    flag = AgentFinding(
        agent=AgentName.VARIANCE,
        check_code="VARIANCE_REVENUE",
        company="AAPL",
        year=2022,
        severity=Severity.MEDIUM,
        metric="revenue",
        statement=(
            "Revenue increased 7.8% year over year, from 365,817.0 in FY2021 "
            "to 394,328.0 in FY2022."
        ),
        citations=[
            cite("revenue", "AAPL", 2022, 394328.0, source_row=2),
            cite("revenue", "AAPL", 2021, 365817.0, source_row=3),
        ],
        actual=394328.0,
        prior_year=2021,
        prior_value=365817.0,
        pct_change=7.79,
    )

    # Give the agent NO evidence.
    explanation, confidence, grounded = generate_explanation(
        flag,
        [],
        llm_client=None,
    )

    # The agent should explicitly refuse to guess.
    assert explanation == NO_EVIDENCE_AT_ALL_MESSAGE

    # No evidence means zero confidence.
    assert confidence == 0.0

    # No evidence means the result is not grounded.
    assert grounded is False


# ============================================================
# 16. TEST THE COMPLETE AGENT PIPELINE
# ============================================================

def test_complete_agent_pipeline(
    real_records,
    rag_index,
):
    """
    THIS IS THE MAIN END-TO-END TEST.

    It runs the actual application from:

        Real CSV
          ↓
        Engine
          ↓
        RAG
          ↓
        Retrieval
          ↓
        Agent
          ↓
        Finding
          ↓
        Human Review
    """

    # Get the application's finding store.
    store = get_finding_store()

    # Clear old test findings so this test starts clean.
    store.clear()

    # Run the REAL financial review agent.
    response = run_orchestrated_review(
        company="AAPL",
        year=2022,
        threshold_pct=5.0,
        k=3,
        max_findings=5,
        records_path=DATASET_PATH,
        persist_path=rag_index,
        llm_client=None,
    )

    # ------------------------------------------------------------
    # Check that the Agent completed successfully.
    # ------------------------------------------------------------

    assert response.status == "COMPLETED"

    # Correct company.
    assert response.company == "AAPL"

    # Correct year.
    assert response.year == 2022

    # There should be at least one finding at a 5% threshold.
    assert response.findings

    # ------------------------------------------------------------
    # Check every generated finding.
    # ------------------------------------------------------------

    for finding in response.findings:

        # The finding must belong to the requested company.
        assert finding.company == "AAPL"

        # The finding must belong to the requested year.
        assert finding.year == 2022

        # The financial fact must have the correct metric.
        assert finding.fact.metric == finding.metric

        # The financial fact must have the correct year.
        assert finding.fact.year == finding.year

        # --------------------------------------------------------
        # Evidence check
        # --------------------------------------------------------

        # Every finding must have supporting evidence.
        assert finding.evidence

        # Evidence must belong to AAPL.
        assert all(
            evidence.metadata["company"] == "AAPL"
            for evidence in finding.evidence
        )

        # --------------------------------------------------------
        # Grounding check
        # --------------------------------------------------------

        # The explanation must be grounded in retrieved evidence.
        assert finding.grounded is True

        # --------------------------------------------------------
        # Confidence check
        # --------------------------------------------------------

        # Confidence must always be between 0 and 1.
        assert 0.0 <= finding.confidence <= 1.0

        # --------------------------------------------------------
        # Human review check
        # --------------------------------------------------------

        # AI findings must NOT automatically be approved.
        #
        # They must enter the human review queue as PENDING.
        assert finding.review_status == ReviewStatus.PENDING

    # The final summary should tell the user that review is pending.
    assert "PENDING" in response.summary


# ============================================================
# 17. TEST COMPLETE PIPELINE WITH MULTIPLE COMPANIES
# ============================================================

@pytest.mark.parametrize(
    "company",
    [
        "AAPL",
        "MSFT",
        "NVDA",
    ],
)
def test_complete_pipeline_for_multiple_companies(
    rag_index,
    company,
):
    """
    Run the complete Agent for multiple real companies.

    This makes sure the pipeline is not accidentally designed
    to work only for one company.
    """

    # Clear previous findings.
    store = get_finding_store()
    store.clear()

    # Run the complete Agent.
    response = run_orchestrated_review(
        company=company,
        threshold_pct=20.0,
        k=3,
        max_findings=5,
        records_path=DATASET_PATH,
        persist_path=rag_index,
        llm_client=None,
    )

    # Agent should complete successfully.
    assert response.status == "COMPLETED"

    # Requested company should be preserved.
    assert response.company == company

    # Check every finding.
    for finding in response.findings:

        # Finding belongs to requested company.
        assert finding.company == company

        # Finding has evidence.
        assert finding.evidence

        # Finding is grounded.
        assert finding.grounded is True

        # Finding waits for human approval.
        assert finding.review_status == ReviewStatus.PENDING


# ============================================================
# 18. TEST "NO MATERIAL CHANGE" SCENARIO
# ============================================================

def test_complete_pipeline_handles_no_findings(
    rag_index,
):
    """
    If the threshold is extremely high, there should be no
    anomalies.

    The Agent should return a valid response instead of
    creating a fake finding.
    """

    # Clear old findings.
    store = get_finding_store()
    store.clear()

    # Run the Agent with an extremely high threshold.
    response = run_orchestrated_review(
        company="AAPL",
        threshold_pct=99999.0,
        k=3,
        max_findings=5,
        records_path=DATASET_PATH,
        persist_path=rag_index,
        llm_client=None,
    )

    # Agent should still complete successfully.
    assert response.status == "COMPLETED"

    # Correct company.
    assert response.company == "AAPL"

    # No financial anomaly should be reported.
    assert response.findings == []

    # The summary should say plainly that nothing was flagged, and still
    # report each agent's coverage so "clean" is distinguishable from
    # "nothing could be checked".
    summary = response.summary.lower()
    assert "no rule violations found" in summary
    assert "mathematical correctness (50%)" in summary
    assert "skipped" in summary


# ============================================================
# 19. TEST UNKNOWN COMPANY
# ============================================================

def test_unknown_company_is_rejected():
    """
    If the user asks about a company that does not exist in
    the dataset, the Agent must reject the request.

    It must NOT fabricate financial information.
    """

    # Expect the application's specific error.
    with pytest.raises(CompanyNotFoundError):

        run_orchestrated_review(
            company="NOT_A_REAL_COMPANY_XYZ",
            threshold_pct=20.0,
            records_path=DATASET_PATH,
        )
