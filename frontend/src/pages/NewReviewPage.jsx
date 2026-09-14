import React, { useState } from 'react';
import { FileUploader } from '../components/upload/FileUploader';
import { ProcessingScreen } from '../components/upload/ProcessingScreen';
import { useReview } from '../context/ReviewContext';
import * as reviewService from '../services/reviewService';
import { Check, ArrowRight } from 'lucide-react';

const STEPS = [
  { number: '01', title: 'Upload & Ingest' },
  { number: '02', title: 'Deterministic Analysis' },
  { number: '03', title: 'Review & Verify' },
  { number: '04', title: 'Executive Report' }
];

export function NewReviewPage() {
  const {
    isDemoMode,
    liveStatements,
    startNewReviewSession,
    setActivePage,
    loadLiveStatementData,
    refreshLiveStatements,
    setRecentNotification,
    runAgentReview
  } = useReview();

  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleUpload = async (file, instruction) => {
    setIsProcessing(true);
    setCurrentStep(2);
    setErrorMessage('');

    try {
      if (isDemoMode) {
        const uploadResult = await reviewService.uploadStatements(file, null, true);
        startNewReviewSession(uploadResult);
      } else {
        const uploadResult = await reviewService.uploadStatements(file, null, false);
        await refreshLiveStatements();

        const firstIngested = uploadResult?.ingested?.[0]?.statement;
        if (firstIngested) {
          await loadLiveStatementData(firstIngested.id, firstIngested.company, firstIngested.fiscal_year);
          try {
            await runAgentReview({
              company: firstIngested.company,
              year: firstIngested.fiscal_year,
              instruction: instruction || null
            });
            await loadLiveStatementData(firstIngested.id, firstIngested.company, firstIngested.fiscal_year);
          } catch {
          }
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Ingestion failed. Ensure statement file matches required schema.');
      setIsProcessing(false);
      setCurrentStep(1);
    }
  };

  const handleSelectCompany = async (companyName, instruction) => {
    setIsProcessing(true);
    setCurrentStep(2);
    setErrorMessage('');

    try {
      if (!isDemoMode) {
        const matching = liveStatements.filter(s => s.company.toLowerCase() === companyName.toLowerCase());
        const latest = matching.length > 0 ? matching.reduce((max, s) => s.fiscal_year > max.fiscal_year ? s : max, matching[0]) : null;

        try {
          await runAgentReview({
            company: companyName,
            year: latest ? latest.fiscal_year : null,
            instruction: instruction || null
          });
        } catch {
        }

        if (latest) {
          await loadLiveStatementData(latest.id, companyName, latest.fiscal_year);
        } else {
          await loadLiveStatementData(null, companyName, null);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to run review on selected company.');
      setIsProcessing(false);
      setCurrentStep(1);
    }
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setCurrentStep(3);
    setActivePage('financial-summary');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1080px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Start New Financial Review</h1>
          <p className="page-subtitle">
            Ingest corporate financial disclosures to run automated cross-statement validation math, YoY variance checks, and evidence-grounded audit findings.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-subtle)'
        }}
      >
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;

          return (
            <div
              key={step.number}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? '#16a34a' : isCurrent ? '#2563eb' : '#f1f5f9',
                  color: isCompleted || isCurrent ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0
                }}
              >
                {isCompleted ? <Check size={16} /> : step.number}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: isCurrent ? '#2563eb' : '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  STEP {step.number}
                </div>
                <div style={{ fontSize: '13px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {step.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {currentStep === 1 && (
        <FileUploader
          onUploadFile={handleUpload}
          onSelectExistingCompany={handleSelectCompany}
          existingStatements={liveStatements}
          isUploading={isProcessing}
          backendError={errorMessage}
        />
      )}

      {currentStep === 2 && (
        <ProcessingScreen onComplete={handleProcessingComplete} />
      )}
    </div>
  );
}
