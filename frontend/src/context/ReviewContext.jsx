import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEMO_COMPANY_INFO, DEMO_FINDINGS } from '../data/demoData';
import * as reviewService from '../services/reviewService';

const ReviewContext = createContext(null);

export function ReviewProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const saved = localStorage.getItem('finreview_demo_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';
  });

  const [backendAvailable, setBackendAvailable] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [activeReviewId, setActiveReviewId] = useState('REV-2025-089');
  
  const [liveStatements, setLiveStatements] = useState([]);
  const [selectedStatementId, setSelectedStatementId] = useState(null);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [activeAnalysis, setActiveAnalysis] = useState(null);

  const [companyInfo, setCompanyInfo] = useState(() => isDemoMode ? DEMO_COMPANY_INFO : null);
  const [findings, setFindings] = useState(() => isDemoMode ? DEMO_FINDINGS : []);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [lastUploadedReview, setLastUploadedReview] = useState(null);
  const [recentNotification, setRecentNotification] = useState(null);

  // The 50/30/20 scorecard from the most recent agent review. It only
  // comes back on the POST /api/agent/review response - refetching stored
  // findings later does not reproduce it - so it is held here rather than
  // re-derived from the findings list.
  const [scorecard, setScorecard] = useState(null);

  useEffect(() => {
    localStorage.setItem('finreview_demo_mode', String(isDemoMode));
  }, [isDemoMode]);

  const verifyHealth = async () => {
    try {
      await reviewService.checkBackendHealth();
      setBackendAvailable(true);
      return true;
    } catch {
      setBackendAvailable(false);
      return false;
    }
  };

  const loadLiveStatementData = async (stmtId, companyName = null, year = null) => {
    try {
      let st = null;
      if (stmtId) {
        st = await reviewService.getStatementById(stmtId);
        setSelectedStatement(st);
        setSelectedStatementId(stmtId);
      }

      const targetCompany = companyName || st?.company;
      const targetYear = year || st?.fiscal_year;

      if (stmtId) {
        try {
          const analysisData = await reviewService.analyzeStatement(stmtId);
          setActiveAnalysis(analysisData);
        } catch {
          setActiveAnalysis(null);
        }
      }

      if (targetCompany) {
        try {
          // Scoped to this entity and nothing else. Falling back to every
          // stored finding put another company's numbers on this company's
          // dashboard - in a review tool that is a misattribution, not a
          // helpful default, so an entity with no findings shows none.
          const findingsList = await reviewService.getAgentFindings({
            company: targetCompany,
            year: targetYear
          });
          setFindings(findingsList || []);
        } catch {
          setFindings([]);
        }

        if (st) {
          setCompanyInfo({
            companyName: st.company,
            registrationNumber: st.ticker ? `Ticker: ${st.ticker}` : 'Entity',
            currentYear: `FY ${st.fiscal_year}`,
            previousYear: `FY ${st.fiscal_year - 1}`,
            reportingStandard: 'US GAAP / IFRS',
            currency: st.currency || 'USD',
            reviewer: 'Lead Financial Reviewer',
            currentYearFileName: st.source?.file_name || 'financial_statement.csv',
            previousYearFileName: 'prior_year_statement.csv',
            analyzedAt: st.source?.ingested_at || new Date().toISOString()
          });
        }
      }
    } catch (err) {
      setRecentNotification({
        type: 'error',
        message: err.message || 'Failed to load statement details'
      });
    }
  };

  const refreshLiveStatements = async () => {
    const isOnline = await verifyHealth();
    if (!isOnline) return;

    try {
      const statementsList = await reviewService.getStatements();
      setLiveStatements(statementsList || []);

      if (statementsList && statementsList.length > 0 && !selectedStatementId) {
        const first = statementsList[0];
        await loadLiveStatementData(first.id, first.company, first.fiscal_year);
      }
    } catch {
      setLiveStatements([]);
    }
  };

  useEffect(() => {
    verifyHealth();
  }, []);

  useEffect(() => {
    setScorecard(null);
    if (!isDemoMode) {
      setCompanyInfo(null);
      setFindings([]);
      refreshLiveStatements();
    } else {
      setCompanyInfo(DEMO_COMPANY_INFO);
      setFindings(DEMO_FINDINGS);
      setSelectedStatement(null);
      setActiveAnalysis(null);
    }
  }, [isDemoMode]);

  const openFindingDetails = (finding) => {
    setSelectedFinding(finding);
    setIsFindingModalOpen(true);
  };

  const closeFindingDetails = () => {
    setIsFindingModalOpen(false);
  };

  const openReviewActionModal = (finding) => {
    setSelectedFinding(finding);
    setIsReviewModalOpen(true);
  };

  const closeReviewActionModal = () => {
    setIsReviewModalOpen(false);
  };

  const updateFindingStatus = async (findingId, action, comment = '') => {
    try {
      const res = await reviewService.updateFindingReview(activeReviewId, findingId, action, comment, isDemoMode);
      
      const newStatus = (action === 'APPROVE' || action === 'APPROVED') ? 'APPROVED' : (action === 'DISMISS' || action === 'REJECT' || action === 'REJECTED') ? 'REJECTED' : 'REVIEWED';

      setFindings(prevFindings =>
        prevFindings.map(item => {
          if (item.id === findingId) {
            return {
              ...item,
              status: newStatus,
              review_status: newStatus,
              reviewComment: comment || item.reviewComment
            };
          }
          return item;
        })
      );

      if (selectedFinding && selectedFinding.id === findingId) {
        setSelectedFinding(prev => ({
          ...prev,
          status: newStatus,
          review_status: newStatus,
          reviewComment: comment || prev.reviewComment
        }));
      }

      setRecentNotification({
        type: 'success',
        message: `Finding ${findingId.slice(0, 8)} marked as ${newStatus}`
      });

      return true;
    } catch (error) {
      setRecentNotification({
        type: 'error',
        message: error.message || 'Failed to update finding status'
      });
      return false;
    }
  };

  const runAgentReview = async ({ company, year = null, ...options }) => {
    const result = await reviewService.runAgentReview({ company, year, ...options });
    setScorecard(result?.scorecard || null);
    return result;
  };

  const selectStatement = async (stmtId) => {
    const found = liveStatements.find(s => s.id === stmtId);
    if (found) {
      await loadLiveStatementData(stmtId, found.company, found.fiscal_year);
    }
  };

  const startNewReviewSession = async (reviewResult) => {
    setLastUploadedReview(reviewResult);
    if (isDemoMode) {
      if (reviewResult.reviewId) {
        setActiveReviewId(reviewResult.reviewId);
      }
    } else {
      await refreshLiveStatements();
    }
  };

  return (
    <ReviewContext.Provider
      value={{
        isDemoMode,
        setIsDemoMode,
        backendAvailable,
        verifyHealth,
        activePage,
        setActivePage,
        activeReviewId,
        setActiveReviewId,
        liveStatements,
        selectedStatementId,
        selectedStatement,
        activeAnalysis,
        selectStatement,
        loadLiveStatementData,
        refreshLiveStatements,
        companyInfo,
        setCompanyInfo,
        findings,
        setFindings,
        selectedFinding,
        setSelectedFinding,
        isFindingModalOpen,
        openFindingDetails,
        closeFindingDetails,
        isReviewModalOpen,
        openReviewActionModal,
        closeReviewActionModal,
        updateFindingStatus,
        scorecard,
        setScorecard,
        runAgentReview,
        lastUploadedReview,
        startNewReviewSession,
        recentNotification,
        setRecentNotification
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return context;
}
