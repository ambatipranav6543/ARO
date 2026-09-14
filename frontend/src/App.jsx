import React from 'react';
import { useAuth } from './context/AuthContext';
import { useReview } from './context/ReviewContext';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewReviewPage } from './pages/NewReviewPage';
import { FinancialSummaryPage } from './pages/FinancialSummaryPage';
import { YoYPage } from './pages/YoYPage';
import { VariancePage } from './pages/VariancePage';
import { FindingsPage } from './pages/FindingsPage';
import { AssistantPage } from './pages/AssistantPage';
import { ReviewHistoryPage } from './pages/ReviewHistoryPage';
import { ReportPage } from './pages/ReportPage';

export function App() {
  const { isAuthenticated } = useAuth();
  const { activePage } = useReview();

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'new-review':
        return <NewReviewPage />;
      case 'financial-summary':
        return <FinancialSummaryPage />;
      case 'yoy':
        return <YoYPage />;
      case 'variance':
        return <VariancePage />;
      case 'findings':
        return <FindingsPage />;
      case 'assistant':
        return <AssistantPage />;
      case 'history':
        return <ReviewHistoryPage />;
      case 'report':
        return <ReportPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout>
      {renderActivePage()}
    </Layout>
  );
}

export default App;
