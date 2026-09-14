import { request } from './apiClient';
import {
  DEMO_COMPANY_INFO,
  DEMO_KPIS,
  DEMO_EXECUTIVE_SUMMARY,
  DEMO_REVIEW_STATUS,
  DEMO_FINANCIAL_METRICS,
  DEMO_YOY_DATA,
  DEMO_VARIANCE_ITEMS,
  DEMO_FINDINGS,
  DEMO_AUDIT_ACTIVITIES,
  DEMO_REVIEW_HISTORY
} from '../data/demoData';

export async function checkBackendHealth() {
  return request('/api/health');
}

export async function uploadCsvStatement(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/ingest/csv', {
    method: 'POST',
    body: formData
  });
}

export async function uploadExcelStatement(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/ingest/excel', {
    method: 'POST',
    body: formData
  });
}

export async function ingestStatementJson(statementData) {
  return request('/api/ingest/statement', {
    method: 'POST',
    body: JSON.stringify(statementData)
  });
}

export async function getStatements(company = null, fiscalYear = null) {
  const params = new URLSearchParams();
  if (company) params.append('company', company);
  if (fiscalYear) params.append('fiscal_year', String(fiscalYear));
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/statements${query}`);
}

export async function getStatementById(statementId) {
  return request(`/api/statements/${statementId}`);
}

export async function deleteStatement(statementId) {
  return request(`/api/statements/${statementId}`, {
    method: 'DELETE'
  });
}

export async function validateStatementPayload(statementData) {
  return request('/api/analysis/validate', {
    method: 'POST',
    body: JSON.stringify(statementData)
  });
}

export async function analyzeStatement(statementId) {
  return request(`/api/analysis/${statementId}`);
}

export async function compareStatementsByYear(company, currentYear, priorYear) {
  const params = new URLSearchParams({
    company,
    current_year: String(currentYear),
    prior_year: String(priorYear)
  });
  return request(`/api/analysis/compare/by-year?${params.toString()}`);
}

export async function getVarianceFlags(thresholdPct = 20.0) {
  return request(`/api/analysis/flags?threshold_pct=${thresholdPct}`);
}

export async function getAnalysisFindings(thresholdPct = 20.0, k = 3) {
  return request(`/api/analysis/findings?threshold_pct=${thresholdPct}&k=${k}`);
}

export async function queryEvidence(query, company = null, k = 3) {
  const params = new URLSearchParams({ query, k: String(k) });
  if (company) params.append('company', company);
  return request(`/api/analysis/evidence?${params.toString()}`);
}

export async function runAgentReview({
  company,
  year = null,
  instruction = null,
  threshold_pct = 20.0,
  k = 3,
  max_findings = 5
}) {
  const payload = { company, threshold_pct, k, max_findings };
  if (year !== null && year !== undefined && year !== '') {
    payload.year = parseInt(year, 10);
  }
  if (instruction && instruction.trim()) {
    payload.instruction = instruction.trim();
  }
  return request('/api/agent/review', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getAgentFindings({ company = null, year = null, status = null } = {}) {
  const params = new URLSearchParams();
  if (company) params.append('company', company);
  if (year) params.append('year', String(year));
  if (status && status !== 'ALL') params.append('status', status);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/agent/findings${query}`);
}

export async function getAgentFindingById(findingId) {
  return request(`/api/agent/findings/${findingId}`);
}

export async function reviewFindingDecision(findingId, status) {
  const validStatus = status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  return request(`/api/agent/review/${findingId}`, {
    method: 'POST',
    body: JSON.stringify({ status: validStatus })
  });
}

export async function uploadStatements(currentYearFile, previousYearFile, isDemo = false) {
  if (isDemo) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      reviewId: 'REV-2025-089',
      currentYearFileName: currentYearFile ? currentYearFile.name : DEMO_COMPANY_INFO.currentYearFileName,
      previousYearFileName: previousYearFile ? previousYearFile.name : DEMO_COMPANY_INFO.previousYearFileName,
      status: 'UPLOADED',
      uploadedAt: new Date().toISOString()
    };
  }

  const fileToUpload = currentYearFile || previousYearFile;
  if (!fileToUpload) {
    throw new Error('No financial statement file selected for ingestion');
  }

  const name = fileToUpload.name.toLowerCase();
  if (name.endsWith('.csv')) {
    return uploadCsvStatement(fileToUpload);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return uploadExcelStatement(fileToUpload);
  }
  if (name.endsWith('.json')) {
    const text = await fileToUpload.text();
    const parsed = JSON.parse(text);
    return ingestStatementJson(parsed);
  }

  const formData = new FormData();
  formData.append('file', fileToUpload);
  return request('/api/ingest/csv', {
    method: 'POST',
    body: formData
  });
}

export async function getCompanyInfo(reviewId, isDemo = false) {
  if (isDemo) {
    return DEMO_COMPANY_INFO;
  }
  return null;
}

export async function getKpis(reviewId, isDemo = false) {
  if (isDemo) {
    return DEMO_KPIS;
  }
  return [];
}

export async function getExecutiveSummary(reviewId, isDemo = false) {
  if (isDemo) {
    return DEMO_EXECUTIVE_SUMMARY;
  }
  return null;
}

export async function getReviewStatus(reviewId, isDemo = false) {
  if (isDemo) {
    return DEMO_REVIEW_STATUS;
  }
  return null;
}

export async function getFinancialSummary(reviewId, isDemo = false) {
  if (isDemo) {
    return DEMO_FINANCIAL_METRICS;
  }
  return [];
}

export async function getYoYAnalysis(reviewId, isDemo = false) {
  if (isDemo) {
    return DEMO_YOY_DATA;
  }
  return [];
}

export async function getVarianceAnalysis(reviewId, isDemo = false) {
  if (isDemo) {
    return DEMO_VARIANCE_ITEMS;
  }
  return [];
}

export async function getFindings(reviewId, isDemo = false) {
  if (isDemo) {
    return DEMO_FINDINGS;
  }
  return getAgentFindings();
}

export async function getFindingDetails(reviewId, findingId, isDemo = false) {
  if (isDemo) {
    return DEMO_FINDINGS.find(item => item.id === findingId) || DEMO_FINDINGS[0];
  }
  return getAgentFindingById(findingId);
}

export async function askFinancialAssistant(reviewId, message, findingId = null, isDemo = false, liveCompany = null) {
  if (isDemo) {
    await new Promise(resolve => setTimeout(resolve, 600));
    const lower = message.toLowerCase();

    if (lower.includes('profit') || lower.includes('mismatch') || lower.includes('calculation')) {
      return {
        answer: 'Operating revenue of 150 Cr minus operating expenses of 110 Cr yields 40 Cr operating profit. However, line 14 of the Statement of Profit & Loss declares 50 Cr net profit. Verification across disclosures identified no recorded exceptional items or tax credits reconciling this 10 Cr divergence.',
        isEvidenceGrounded: true,
        citations: [
          {
            source: 'Acme_Annual_Financial_Statement_FY25.pdf',
            page: 4,
            section: 'Consolidated Statement of Profit & Loss, Line 14',
            quote: 'Reported Net Profit for the Period: 50.00 Cr'
          }
        ]
      };
    }

    if (lower.includes('expense') || lower.includes('opex') || lower.includes('operating')) {
      return {
        answer: 'Operating expenses escalated by +83.3% YoY (from 60 Cr to 110 Cr), outstripping revenue growth of 50.0%. Note 22 reveals this was driven by administrative outlays (68.5 Cr vs 32.0 Cr), compressing EBITDA margins from 40.0% to 26.7%.',
        isEvidenceGrounded: true,
        citations: [
          {
            source: 'Acme_Annual_Financial_Statement_FY25.pdf',
            page: 7,
            section: 'Note 22: Other Operating Expenses',
            quote: 'Administrative and general expenses increased to 68.50 Cr from 32.00 Cr'
          }
        ]
      };
    }

    if (lower.includes('lease') || lower.includes('ind as 116') || lower.includes('liability')) {
      return {
        answer: 'Under Ind AS 116, non-cancellable operating lease obligations must be capitalized as Right-of-Use assets and corresponding lease liabilities. Note 18 discloses 18.5 Cr in undiscounted future lease payments across 3 years, but the Balance Sheet lists zero lease liabilities.',
        isEvidenceGrounded: true,
        citations: [
          {
            source: 'Acme_Annual_Financial_Statement_FY25.pdf',
            page: 12,
            section: 'Note 18: Commitments and Contingencies',
            quote: 'Total undiscounted future lease payments under non-cancellable operating leases amount to 18.50 Cr'
          }
        ]
      };
    }

    return {
      answer: `Analysis for Acme Global Technologies Ltd (FY 2024-25) regarding "${message}": The primary observation relates to the imbalance between revenue growth (+50%) and cost escalation (+83.3%), with priority review recommended for the 10 Cr net profit reconciliation discrepancy.`,
      isEvidenceGrounded: true,
      citations: [
        {
          source: 'Acme_Annual_Financial_Statement_FY25.pdf',
          page: 4,
          section: 'Executive Financial Summary',
          quote: 'Revenue 150 Cr vs Previous Year 100 Cr'
        }
      ]
    };
  }

  const companyToQuery = liveCompany || undefined;
  const evidenceList = await queryEvidence(message, companyToQuery, 3);
  
  if (!evidenceList || evidenceList.length === 0) {
    return {
      answer: `Insufficient evidence: No matching financial disclosures or recorded statements found for "${message}". The review agent only provides answers directly grounded in retrieved financial evidence.`,
      isEvidenceGrounded: false,
      evidence: []
    };
  }

  const topEvidence = evidenceList[0];
  const formattedAnswer = `Based on retrieved financial statement disclosures for ${topEvidence.metadata?.company || companyToQuery || 'the company'} (similarity match: ${(topEvidence.similarity * 100).toFixed(1)}%):\n\n"${topEvidence.text}"`;

  return {
    answer: formattedAnswer,
    isEvidenceGrounded: true,
    evidence: evidenceList
  };
}

export async function updateFindingReview(reviewId, findingId, action, comment = '', isDemo = false) {
  if (isDemo) {
    const finding = DEMO_FINDINGS.find(item => item.id === findingId);
    if (finding) {
      if (action === 'APPROVE') finding.status = 'APPROVED';
      if (action === 'MARK_REVIEWED') finding.status = 'REVIEWED';
      if (action === 'DISMISS' || action === 'REJECT') finding.status = 'DISMISSED';
      if (comment) finding.reviewComment = comment;
    }
    return {
      success: true,
      findingId,
      status: finding ? finding.status : action,
      comment
    };
  }

  const decisionStatus = (action === 'APPROVE' || action === 'APPROVED') ? 'APPROVED' : 'REJECTED';
  const updatedFinding = await reviewFindingDecision(findingId, decisionStatus);
  return {
    success: true,
    findingId,
    status: updatedFinding.review_status,
    finding: updatedFinding,
    comment
  };
}

// Builds a draft comment from the finding's own real fields (metric,
// status, pct_change). No AI/LLM call happens here - there's no backend
// endpoint for "compose a sign-off comment," so this is template text
// the reviewer edits, not a generated observation. The UI labels this
// "Insert Draft Comment," not "Generate," on purpose.
export async function generateReviewComment(reviewId, findingId, isDemo = false, findingObject = null) {
  if (isDemo) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const finding = DEMO_FINDINGS.find(item => item.id === findingId) || DEMO_FINDINGS[0];
    return {
      comment: `Reviewed ${finding.title}. Variance of ${finding.financialImpact} noted against ${finding.evidence?.sourceDocument || 'statement'} (Page ${finding.evidence?.pageNumber || 1}). Auditor follow-up registered.`
    };
  }

  if (findingObject) {
    const statusText = findingObject.review_status || 'PENDING';
    const metricText = findingObject.metric || findingObject.title;
    const changeText = findingObject.fact?.pct_change !== undefined ? `${findingObject.fact.pct_change}%` : '';
    return {
      comment: `Auditor review performed on ${metricText} (${statusText}). Shift of ${changeText} investigated against retrieved financial evidence.`
    };
  }

  return {
    comment: `Auditor review sign-off recorded for finding ${findingId}.`
  };
}

export async function getReviewHistory(isDemo = false) {
  if (isDemo) {
    return DEMO_REVIEW_HISTORY;
  }
  const statements = await getStatements();
  const findings = await getAgentFindings();
  
  return statements.map(st => {
    const relatedFindings = findings.filter(f => f.company?.toLowerCase() === st.company?.toLowerCase() && f.year === st.fiscal_year);
    const critical = relatedFindings.filter(f => f.severity === 'HIGH').length;
    const hasRejected = relatedFindings.some(f => f.review_status === 'REJECTED');
    const allApproved = relatedFindings.length > 0 && relatedFindings.every(f => f.review_status === 'APPROVED');
    
    let status = 'PENDING';
    if (allApproved) status = 'APPROVED';
    else if (hasRejected) status = 'REVIEWED';
    else if (relatedFindings.length === 0) status = 'PASSED';

    return {
      id: `STMT-${st.id}`,
      statementId: st.id,
      companyName: st.company,
      ticker: st.ticker || '—',
      financialPeriod: `FY ${st.fiscal_year}`,
      fiscalYear: st.fiscal_year,
      reviewDate: st.source?.ingested_at || new Date().toISOString(),
      findingsCount: relatedFindings.length,
      criticalCount: critical,
      reviewer: 'Lead Financial Reviewer',
      status
    };
  });
}

export async function getAuditActivities(reviewId, isDemo = false) {
  if (isDemo) {
    return DEMO_AUDIT_ACTIVITIES;
  }
  return [
    {
      id: 'act-live-1',
      title: 'Backend Financial Engine Connected',
      timestamp: new Date().toISOString(),
      user: 'FastAPI Service',
      type: 'engine'
    },
    {
      id: 'act-live-2',
      title: 'Deterministic Accounting Validation Ready',
      timestamp: new Date().toISOString(),
      user: 'Audit Validator',
      type: 'validation'
    }
  ];
}

export async function getAuditReport(reviewId, isDemo = false, liveState = null) {
  if (isDemo) {
    return {
      company: DEMO_COMPANY_INFO,
      kpis: DEMO_KPIS,
      summary: DEMO_EXECUTIVE_SUMMARY,
      reviewStatus: DEMO_REVIEW_STATUS,
      financialMetrics: DEMO_FINANCIAL_METRICS,
      varianceItems: DEMO_VARIANCE_ITEMS,
      findings: DEMO_FINDINGS,
      generatedAt: new Date().toISOString()
    };
  }

  if (liveState && liveState.statement) {
    const st = liveState.statement;
    const analysis = liveState.analysis;
    const findings = liveState.findings || [];

    const criticalCount = findings.filter(f => f.severity === 'HIGH').length;
    const highCount = findings.filter(f => f.severity === 'MEDIUM').length;
    const lowCount = findings.filter(f => f.severity === 'LOW').length;

    let overallStatus = 'PENDING REVIEW';
    if (findings.length > 0 && findings.every(f => f.review_status === 'APPROVED')) {
      overallStatus = 'APPROVED';
    } else if (findings.length === 0 && analysis?.validation?.is_valid) {
      overallStatus = 'PASSED';
    }

    const inc = st.income_statement || {};
    const bs = st.balance_sheet || {};
    const cf = st.cash_flow || {};

    // Real per-line-item status, derived from the engine's actual
    // validation issues - not a blanket "PASSED" regardless of what was
    // actually checked. 'NOT VALIDATED' when no analysis has run at all,
    // so we never claim something passed a check that never happened.
    const validationIssues = analysis?.validation?.issues || [];
    const hasAnalysis = Boolean(analysis);
    const statusForCodes = (codes) => {
      if (!hasAnalysis) return 'NOT VALIDATED';
      return validationIssues.some(i => codes.includes(i.code)) ? 'FLAGGED' : 'PASSED';
    };

    const financialMetrics = [
      {
        id: 'rev',
        metric: 'Total Revenue',
        currentYear: inc.revenue ?? '—',
        previousYear: analysis?.yoy?.line_items?.find(l => l.field === 'income_statement.revenue')?.prior_value ?? '—',
        absoluteChange: analysis?.yoy?.line_items?.find(l => l.field === 'income_statement.revenue')?.absolute_change ?? '—',
        status: statusForCodes(['NEGATIVE_REVENUE', 'COGS_EXCEEDS_REVENUE'])
      },
      {
        id: 'cogs',
        metric: 'Cost of Goods Sold (COGS)',
        currentYear: inc.cogs ?? '—',
        previousYear: analysis?.yoy?.line_items?.find(l => l.field === 'income_statement.cogs')?.prior_value ?? '—',
        absoluteChange: analysis?.yoy?.line_items?.find(l => l.field === 'income_statement.cogs')?.absolute_change ?? '—',
        status: statusForCodes(['COGS_EXCEEDS_REVENUE', 'GROSS_PROFIT_MISMATCH'])
      },
      {
        id: 'net_inc',
        metric: 'Net Income',
        currentYear: inc.net_income ?? '—',
        previousYear: analysis?.yoy?.line_items?.find(l => l.field === 'income_statement.net_income')?.prior_value ?? '—',
        absoluteChange: analysis?.yoy?.line_items?.find(l => l.field === 'income_statement.net_income')?.absolute_change ?? '—',
        status: !hasAnalysis ? 'NOT VALIDATED' : inc.net_income < 0 ? 'CRITICAL' : 'PASSED'
      },
      {
        id: 'tot_assets',
        metric: 'Total Assets',
        currentYear: bs.total_assets ?? '—',
        previousYear: analysis?.yoy?.line_items?.find(l => l.field === 'balance_sheet.total_assets')?.prior_value ?? '—',
        absoluteChange: analysis?.yoy?.line_items?.find(l => l.field === 'balance_sheet.total_assets')?.absolute_change ?? '—',
        status: statusForCodes(['BALANCE_SHEET_DOES_NOT_BALANCE', 'CURRENT_ASSETS_EXCEED_TOTAL_ASSETS'])
      },
      {
        id: 'tot_liab',
        metric: 'Total Liabilities',
        currentYear: bs.total_liabilities ?? '—',
        previousYear: analysis?.yoy?.line_items?.find(l => l.field === 'balance_sheet.total_liabilities')?.prior_value ?? '—',
        absoluteChange: analysis?.yoy?.line_items?.find(l => l.field === 'balance_sheet.total_liabilities')?.absolute_change ?? '—',
        status: statusForCodes(['BALANCE_SHEET_DOES_NOT_BALANCE', 'CURRENT_LIABILITIES_EXCEED_TOTAL_LIABILITIES'])
      },
      {
        id: 'equity',
        metric: 'Shareholder Equity',
        currentYear: bs.shareholder_equity ?? '—',
        previousYear: analysis?.yoy?.line_items?.find(l => l.field === 'balance_sheet.shareholder_equity')?.prior_value ?? '—',
        absoluteChange: analysis?.yoy?.line_items?.find(l => l.field === 'balance_sheet.shareholder_equity')?.absolute_change ?? '—',
        status: statusForCodes(['NEGATIVE_SHAREHOLDER_EQUITY'])
      }
    ];

    return {
      company: {
        reviewId: `STMT-${st.id}`,
        companyName: st.company,
        registrationNumber: st.ticker ? `Ticker: ${st.ticker}` : 'Listed Entity',
        currentYear: `FY ${st.fiscal_year}`,
        previousYear: analysis?.yoy ? `FY ${analysis.yoy.prior_fiscal_year}` : 'Prior Year',
        currency: st.currency || 'USD',
        reportingStandard: 'US GAAP / IFRS',
        reviewer: 'Lead Financial Reviewer',
        currentYearFileName: st.source?.file_name || 'financial_statement.csv',
        analyzedAt: st.source?.ingested_at || new Date().toISOString()
      },
      summary: {
        overview: `Comprehensive financial statement analysis for ${st.company} (FY ${st.fiscal_year}). Arithmetic accounting validation: ${analysis?.validation?.is_valid ? 'PASSED with 0 errors' : `FLAGGED ${analysis?.validation?.issues?.length || 0} issues`}. Total findings identified: ${findings.length}.`,
        riskLevel: criticalCount > 0 ? 'HIGH RISK' : highCount > 0 ? 'MEDIUM RISK' : 'LOW RISK'
      },
      reviewStatus: {
        overallStatus,
        totalFindings: findings.length,
        criticalCount,
        highCount,
        mediumCount: lowCount,
        lowCount: 0
      },
      financialMetrics,
      varianceItems: analysis?.yoy?.line_items || [],
      findings,
      generatedAt: new Date().toISOString()
    };
  }

  return {
    company: DEMO_COMPANY_INFO,
    summary: DEMO_EXECUTIVE_SUMMARY,
    reviewStatus: DEMO_REVIEW_STATUS,
    financialMetrics: DEMO_FINANCIAL_METRICS,
    findings: [],
    generatedAt: new Date().toISOString()
  };
}
