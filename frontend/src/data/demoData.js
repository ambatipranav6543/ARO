export const DEMO_COMPANY_INFO = {
  reviewId: 'REV-2025-089',
  companyName: 'Acme Global Technologies Ltd',
  registrationNumber: 'CIN: L72200MH2008PLC183492',
  industry: 'Enterprise Software & IT Services',
  currency: 'INR',
  currencySymbol: '₹',
  unit: 'Cr',
  currentYear: 'FY 2024-25',
  previousYear: 'FY 2023-24',
  reportingStandard: 'Ind AS / IFRS',
  auditor: 'Deloitte Haskins & Sells LLP',
  currentYearFileName: 'Acme_Annual_Financial_Statement_FY25.pdf',
  previousYearFileName: 'Acme_Audited_Financial_Statement_FY24.pdf',
  analyzedAt: '2026-09-11T14:30:00.000Z',
  reviewer: 'Cognizant Reviewer',
  reviewStatus: 'REVIEW REQUIRED',
  riskScore: 78,
  riskLevel: 'HIGH RISK'
};

export const DEMO_KPIS = [
  {
    id: 'kpi-revenue',
    title: 'Revenue',
    currentValue: 150,
    previousValue: 100,
    unit: 'Cr',
    changePercent: 50.0,
    changeType: 'positive',
    status: 'Verified',
    statusType: 'verified'
  },
  {
    id: 'kpi-opex',
    title: 'Operating Expenses',
    currentValue: 110,
    previousValue: 60,
    unit: 'Cr',
    changePercent: 83.3,
    changeType: 'negative',
    status: 'Critical Variance',
    statusType: 'critical'
  },
  {
    id: 'kpi-netprofit',
    title: 'Net Profit',
    currentValue: 40,
    previousValue: 40,
    unit: 'Cr',
    changePercent: 0.0,
    changeType: 'neutral',
    status: 'Calculation Review',
    statusType: 'warning'
  },
  {
    id: 'kpi-findings',
    title: 'Audit Findings',
    currentValue: 5,
    previousValue: 2,
    unit: 'Identified',
    changePercent: 150.0,
    changeType: 'negative',
    status: 'Review Required',
    statusType: 'warning'
  }
];

export const DEMO_EXECUTIVE_SUMMARY = {
  overview: 'Revenue increased significantly from ₹100 Cr to ₹150 Cr (+50.0% YoY), while operating expenses expanded at a disproportionate rate to ₹110 Cr (+83.3% YoY). The automated review identified critical calculation inconsistencies requiring reviewer attention.',
  keyMovements: [
    'Revenue expanded by +50.0% YoY (₹150 Cr vs ₹100 Cr), driven by software license renewals.',
    'Operating expenses surged by +83.3% YoY (₹110 Cr vs ₹60 Cr), causing severe EBITDA margin compression.',
    'Operating profit computed at ₹40 Cr does not reconcile with the reported net profit of ₹50 Cr on line 14.'
  ],
  majorRisks: [
    '₹10 Cr unreconciled profit variance between operating profit line item and reported earnings.',
    'Uncapitalized operating lease obligations of ₹18.5 Cr omitted from liability schedule.',
    'Ballooning Accounts Receivable DSO from 55 days to 93 days without bad-debt provisioning.'
  ],
  recommendedActions: [
    'Request formal reconciliation statement for the ₹10 Cr net profit discrepancy from finance controller.',
    'Examine Note 22 ledger breakdown for the ₹50 Cr escalation in operating overheads.',
    'Issue formal audit query regarding non-compliance with Ind AS 116 lease capitalization.'
  ]
};

export const DEMO_REVIEW_STATUS = {
  overallStatus: 'REVIEW REQUIRED',
  totalFindings: 5,
  criticalCount: 1,
  highCount: 2,
  mediumCount: 1,
  lowCount: 1,
  reviewedCount: 2,
  pendingCount: 3
};

export const DEMO_FINANCIAL_METRICS = [
  {
    id: 'm-rev',
    category: 'Income Statement',
    metric: 'Revenue from Operations',
    previousYear: 100,
    currentYear: 150,
    absoluteChange: 50,
    percentageChange: 50.0,
    status: 'Verified',
    statusType: 'verified'
  },
  {
    id: 'm-cos',
    category: 'Income Statement',
    metric: 'Cost of Sales',
    previousYear: 45,
    currentYear: 62,
    absoluteChange: 17,
    percentageChange: 37.8,
    status: 'Normal Variance',
    statusType: 'verified'
  },
  {
    id: 'm-opex',
    category: 'Income Statement',
    metric: 'Operating Expenses',
    previousYear: 60,
    currentYear: 110,
    absoluteChange: 50,
    percentageChange: 83.3,
    status: 'Critical Variance',
    statusType: 'critical'
  },
  {
    id: 'm-op',
    category: 'Income Statement',
    metric: 'Operating Profit (EBIT)',
    previousYear: 40,
    currentYear: 40,
    absoluteChange: 0,
    percentageChange: 0.0,
    status: 'Margin Compression',
    statusType: 'warning'
  },
  {
    id: 'm-np',
    category: 'Income Statement',
    metric: 'Reported Net Profit',
    previousYear: 40,
    currentYear: 50,
    absoluteChange: 10,
    percentageChange: 25.0,
    status: 'Calculation Discrepancy',
    statusType: 'critical'
  },
  {
    id: 'm-assets',
    category: 'Balance Sheet',
    metric: 'Total Assets',
    previousYear: 280,
    currentYear: 345,
    absoluteChange: 65,
    percentageChange: 23.2,
    status: 'Verified',
    statusType: 'verified'
  },
  {
    id: 'm-liab',
    category: 'Balance Sheet',
    metric: 'Total Liabilities',
    previousYear: 120,
    currentYear: 175,
    absoluteChange: 55,
    percentageChange: 45.8,
    status: 'Understatement Risk',
    statusType: 'warning'
  },
  {
    id: 'm-equity',
    category: 'Balance Sheet',
    metric: 'Total Shareholder Equity',
    previousYear: 160,
    currentYear: 170,
    absoluteChange: 10,
    percentageChange: 6.25,
    status: 'Verified',
    statusType: 'verified'
  }
];

export const DEMO_YOY_DATA = [
  { metric: 'Revenue', previous: 100, current: 150, change: 50, changePercent: 50.0 },
  { metric: 'Operating Expenses', previous: 60, current: 110, change: 50, changePercent: 83.3 },
  { metric: 'Operating Profit', previous: 40, current: 40, change: 0, changePercent: 0.0 },
  { metric: 'Reported Profit', previous: 40, current: 50, change: 10, changePercent: 25.0 },
  { metric: 'Assets', previous: 280, current: 345, change: 65, changePercent: 23.2 },
  { metric: 'Liabilities', previous: 120, current: 175, change: 55, changePercent: 45.8 },
  { metric: 'Equity', previous: 160, current: 170, change: 10, changePercent: 6.3 }
];

export const DEMO_VARIANCE_ITEMS = [
  {
    id: 'var-1',
    metric: 'Reported Net Profit vs Operating Math',
    previousValue: '₹40.0 Cr',
    currentValue: '₹50.0 Cr',
    expectedValue: '₹40.0 Cr',
    variance: '₹10.0 Cr',
    percentage: 25.0,
    severity: 'CRITICAL',
    materiality: 'MATERIAL',
    status: 'Action Required',
    rationale: 'Revenue (₹150 Cr) - Expenses (₹110 Cr) = ₹40 Cr. Reported profit of ₹50 Cr has an unaccounted ₹10 Cr variance.'
  },
  {
    id: 'var-2',
    metric: 'Operating Expenses Escalation',
    previousValue: '₹60.0 Cr',
    currentValue: '₹110.0 Cr',
    expectedValue: '₹75.0 Cr',
    variance: '₹50.0 Cr',
    percentage: 83.3,
    severity: 'HIGH',
    materiality: 'MATERIAL',
    status: 'Under Review',
    rationale: 'Expense expansion exceeded top-line expansion rate by 33.3 percentage points, degrading operating margin from 40% to 26.7%.'
  },
  {
    id: 'var-3',
    metric: 'Off-Balance Sheet Lease Commitments',
    previousValue: '₹0.0 Cr',
    currentValue: '₹18.5 Cr',
    expectedValue: '₹18.5 Cr',
    variance: '₹18.5 Cr',
    percentage: 100.0,
    severity: 'HIGH',
    materiality: 'MATERIAL',
    status: 'Action Required',
    rationale: 'Non-cancellable operating lease obligations disclosed in Note 18 were not capitalized onto Balance Sheet.'
  },
  {
    id: 'var-4',
    metric: 'Accounts Receivable DSO Expansion',
    previousValue: '₹23.1 Cr',
    currentValue: '₹38.2 Cr',
    expectedValue: '₹30.0 Cr',
    variance: '₹15.1 Cr',
    percentage: 65.4,
    severity: 'MEDIUM',
    materiality: 'NON-MATERIAL',
    status: 'Reviewed',
    rationale: 'DSO prolonged to 93 days from 55 days in FY24, pointing to collection bottlenecks in enterprise accounts.'
  },
  {
    id: 'var-5',
    metric: 'IT Equipment Depreciation Revision',
    previousValue: '₹10.0 Cr',
    currentValue: '₹12.1 Cr',
    expectedValue: '₹10.0 Cr',
    variance: '₹2.1 Cr',
    percentage: 21.0,
    severity: 'LOW',
    materiality: 'NON-MATERIAL',
    status: 'Approved',
    rationale: 'Shift in asset lifespan assumption from 5 years to 3 years without transitional note disclosure.'
  }
];

export const DEMO_FINDINGS = [
  {
    id: 'FND-001',
    title: 'Profit Calculation Mismatch',
    category: 'Calculation Inconsistency',
    severity: 'CRITICAL',
    materiality: 'MATERIAL',
    financialImpact: '₹10 Cr',
    status: 'PENDING',
    hasEvidence: true,
    reportedValue: '₹50.00 Cr',
    expectedValue: '₹40.00 Cr',
    difference: '₹10.00 Cr',
    variancePercentage: '+25.0%',
    whyFlagged: 'Operating revenue of ₹150 Cr minus operating expenses of ₹110 Cr yields operating profit of ₹40 Cr. However, the reported net profit on page 4 reflects ₹50 Cr without any other comprehensive income line item to account for the ₹10 Cr variance.',
    evidence: {
      sourceDocument: 'Acme_Annual_Financial_Statement_FY25.pdf',
      pageNumber: 4,
      section: 'Consolidated Statement of Profit & Loss, Line 14',
      relevantText: 'Line 1: Revenue from Operations: ₹150.00 Cr | Line 8: Total Expenses: ₹110.00 Cr | Line 14: Reported Net Profit for the Period: ₹50.00 Cr',
      referenceId: 'REF-PL-2025-L14',
      confidence: '99.4%'
    },
    aiExplanation: 'The reported net profit exceeds calculated operating profit by ₹10 Cr. Cross-examination of Schedule III notes and non-operating income disclosures did not reveal any non-recurring gain, extraordinary credit, or tax rebate explaining the differential. This indicates an internal summation error or omission of an offsetting charge.',
    recommendedAction: 'Request revised profit & loss reconciliation schedule from controller and inspect tax provision line item.',
    reviewComment: ''
  },
  {
    id: 'FND-002',
    title: 'Operating Expenses Critical Surge',
    category: 'Expense Anomaly',
    severity: 'HIGH',
    materiality: 'MATERIAL',
    financialImpact: '₹50 Cr',
    status: 'PENDING',
    hasEvidence: true,
    reportedValue: '₹110.00 Cr',
    expectedValue: '₹75.00 Cr',
    difference: '₹35.00 Cr',
    variancePercentage: '+83.3%',
    whyFlagged: 'Operating expenses increased from ₹60 Cr to ₹110 Cr (+83.3%), far exceeding the revenue growth rate of 50.0%. This margin compression was not accompanied by explanatory management commentary.',
    evidence: {
      sourceDocument: 'Acme_Annual_Financial_Statement_FY25.pdf',
      pageNumber: 7,
      section: 'Note 22: Other Operating Expenses Breakdown',
      relevantText: 'Administrative and general expenses increased to ₹68.50 Cr from ₹32.00 Cr, driven primarily by consulting, contractor retainers, and outsourced technology charges.',
      referenceId: 'REF-NOTE22-P07',
      confidence: '96.2%'
    },
    aiExplanation: 'The expense trajectory indicates declining operational efficiency or one-off transition expenses booked under routine operational heads. EBITDA margins shrank from 40% to 26.7% without corresponding capacity growth.',
    recommendedAction: 'Request itemized breakdown of consulting and outsourced professional fees.',
    reviewComment: ''
  },
  {
    id: 'FND-003',
    title: 'Undisclosed Lease Liabilities Omission',
    category: 'Accounting Standard Non-Compliance',
    severity: 'HIGH',
    materiality: 'MATERIAL',
    financialImpact: '₹18.5 Cr',
    status: 'PENDING',
    hasEvidence: true,
    reportedValue: '₹0.00 Cr',
    expectedValue: '₹18.50 Cr',
    difference: '₹18.50 Cr',
    variancePercentage: '-100.0%',
    whyFlagged: 'Operating lease contractual commitments disclosed in Note 18 have not been recognized on the balance sheet as Right-of-Use (ROU) assets or lease liabilities pursuant to Ind AS 116 / IFRS 16.',
    evidence: {
      sourceDocument: 'Acme_Annual_Financial_Statement_FY25.pdf',
      pageNumber: 12,
      section: 'Note 18: Commitments and Contingencies',
      relevantText: 'Total undiscounted future lease payments under non-cancellable operating leases amount to ₹18.50 Cr payable over the next 3 fiscal years.',
      referenceId: 'REF-NOTE18-P12',
      confidence: '94.8%'
    },
    aiExplanation: 'Failure to capitalize eligible operating leases understates total reported liabilities and assets, artificially inflating Return on Capital Employed (ROCE) and leverage ratios.',
    recommendedAction: 'Verify whether the lease contracts meet exemption criteria for short-term or low-value leases under Ind AS 116.',
    reviewComment: ''
  },
  {
    id: 'FND-004',
    title: 'Accounts Receivable DSO Divergence',
    category: 'Working Capital',
    severity: 'MEDIUM',
    materiality: 'NON-MATERIAL',
    financialImpact: '₹8.2 Cr',
    status: 'REVIEWED',
    hasEvidence: true,
    reportedValue: '₹38.20 Cr',
    expectedValue: '₹30.00 Cr',
    difference: '₹8.20 Cr',
    variancePercentage: '+27.3%',
    whyFlagged: 'Trade receivables increased by 65%, expanding Days Sales Outstanding (DSO) from 55 days to 93 days, indicating working capital collection slowdown.',
    evidence: {
      sourceDocument: 'Acme_Annual_Financial_Statement_FY25.pdf',
      pageNumber: 9,
      section: 'Note 11: Trade Receivables Aging Schedule',
      relevantText: 'Trade receivables exceeding six months overdue amounted to ₹8.20 Cr (FY24: ₹1.40 Cr). Provision for doubtful debts maintained at ₹0.80 Cr.',
      referenceId: 'REF-NOTE11-P09',
      confidence: '91.0%'
    },
    aiExplanation: 'Aging schedule indicates ballooning receivables past due 180 days with no corresponding increase in expected credit loss allowance.',
    recommendedAction: 'Assess adequacy of bad debt provisions with external audit partner.',
    reviewComment: 'Verified with controller. ₹6 Cr received post balance sheet date on April 14.'
  },
  {
    id: 'FND-005',
    title: 'Depreciation Useful Life Policy Change',
    category: 'Accounting Policy',
    severity: 'LOW',
    materiality: 'NON-MATERIAL',
    financialImpact: '₹2.1 Cr',
    status: 'APPROVED',
    hasEvidence: true,
    reportedValue: '₹12.10 Cr',
    expectedValue: '₹10.00 Cr',
    difference: '₹2.10 Cr',
    variancePercentage: '+21.0%',
    whyFlagged: 'Useful life assumptions for computer hardware shortened from 5 years to 3 years without explicit transitional disclosure footnote.',
    evidence: {
      sourceDocument: 'Acme_Annual_Financial_Statement_FY25.pdf',
      pageNumber: 15,
      section: 'Note 2: Summary of Accounting Policies',
      relevantText: 'Depreciation on IT equipment has been provided on straight line method over 3 years based on internal technical evaluation.',
      referenceId: 'REF-NOTE2-P15',
      confidence: '88.5%'
    },
    aiExplanation: 'Prospective change in accounting estimate is permissible under accounting standards; minor impact on current year earnings.',
    recommendedAction: 'Confirm note disclosure meets statutory disclosure requirements.',
    reviewComment: 'Standardized policy across subsidiary entities. Impact confirmed non-material.'
  }
];

export const DEMO_AUDIT_ACTIVITIES = [
  {
    id: 'act-1',
    timestamp: '2026-09-11T14:32:10.000Z',
    user: 'Cognizant Reviewer',
    action: 'Review Initiated',
    detail: 'Uploaded Acme_Annual_Financial_Statement_FY25.pdf and FY24 statement'
  },
  {
    id: 'act-2',
    timestamp: '2026-09-11T14:32:45.000Z',
    user: 'ARO',
    action: 'Analysis Complete',
    detail: 'Identified 5 variances (1 Critical, 2 High, 1 Medium, 1 Low)'
  },
  {
    id: 'act-3',
    timestamp: '2026-09-11T14:40:15.000Z',
    user: 'Cognizant Reviewer',
    action: 'Finding Reviewed',
    detail: 'Marked FND-004 (Accounts Receivable DSO Divergence) as REVIEWED'
  },
  {
    id: 'act-4',
    timestamp: '2026-09-11T14:45:00.000Z',
    user: 'Cognizant Reviewer',
    action: 'Finding Approved',
    detail: 'Approved FND-005 (Depreciation Useful Life Policy Change)'
  }
];

export const DEMO_REVIEW_HISTORY = [
  {
    id: 'REV-2025-089',
    companyName: 'Acme Global Technologies Ltd',
    financialPeriod: 'FY 2024-25',
    reviewDate: '2026-09-11',
    findingsCount: 5,
    criticalCount: 1,
    status: 'REVIEW REQUIRED',
    reviewer: 'Cognizant Reviewer'
  },
  {
    id: 'REV-2025-082',
    companyName: 'BlueSky Logistics Corp',
    financialPeriod: 'FY 2024-25',
    reviewDate: '2026-09-04',
    findingsCount: 3,
    criticalCount: 0,
    status: 'PASSED',
    reviewer: 'Cognizant Reviewer'
  },
  {
    id: 'REV-2025-076',
    companyName: 'Zenith BioPharma Inc',
    financialPeriod: 'FY 2023-24',
    reviewDate: '2026-08-28',
    findingsCount: 7,
    criticalCount: 3,
    status: 'CRITICAL ISSUES',
    reviewer: 'Audit Team A'
  },
  {
    id: 'REV-2025-061',
    companyName: 'Apex Capital Holdings',
    financialPeriod: 'FY 2023-24',
    reviewDate: '2026-08-15',
    findingsCount: 1,
    criticalCount: 0,
    status: 'APPROVED',
    reviewer: 'Cognizant Reviewer'
  }
];

export const DEMO_AI_SUGGESTED_PROMPTS = [
  'Explain the profit calculation mismatch',
  'Why was operating expenses flagged as critical?',
  'Explain the lease liability omission under Ind AS 116',
  'Summarize the primary audit risks',
  'What should I review first?'
];
