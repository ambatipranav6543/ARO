import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useReview } from '../../context/ReviewContext';
import { FindingDetailModal } from '../findings/FindingDetailModal';
import { HumanReviewModal } from '../review/HumanReviewModal';

export function Layout({ children }) {
  const {
    isFindingModalOpen,
    closeFindingDetails,
    isReviewModalOpen,
    closeReviewActionModal
  } = useReview();

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          {children}
        </main>
      </div>

      <FindingDetailModal
        isOpen={isFindingModalOpen}
        onClose={closeFindingDetails}
      />

      <HumanReviewModal
        isOpen={isReviewModalOpen}
        onClose={closeReviewActionModal}
      />
    </div>
  );
}
