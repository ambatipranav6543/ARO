import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useReview } from '../../context/ReviewContext';
import { PenLine, Copy, Check, ShieldCheck, XCircle } from 'lucide-react';
import * as reviewService from '../../services/reviewService';

export function HumanReviewModal({ isOpen, onClose }) {
  const { selectedFinding, updateFindingStatus, isDemoMode, activeReviewId } = useReview();
  const [commentText, setCommentText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!selectedFinding) return null;

  const handleAction = async (action) => {
    await updateFindingStatus(selectedFinding.id, action, commentText);
    onClose();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await reviewService.generateReviewComment(
        activeReviewId,
        selectedFinding.id,
        isDemoMode,
        selectedFinding
      );
      setCommentText(res.comment || '');
    } catch {
      setCommentText(`Auditor verification recorded for ${selectedFinding.title || selectedFinding.metric}. Working paper review completed.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (commentText) {
      navigator.clipboard.writeText(commentText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const status = selectedFinding.review_status || selectedFinding.status || 'PENDING';
  const severity = selectedFinding.severity || 'MEDIUM';
  const title = selectedFinding.title || (selectedFinding.metric ? `Variance in ${selectedFinding.metric}` : 'Audit Observation');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Human-in-the-Loop Audit Review"
      subtitle={`Take decisive review action on finding: ${selectedFinding.id ? selectedFinding.id.slice(0, 12) : ''}`}
      maxWidth="620px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {title}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Severity: <strong style={{ color: severity === 'HIGH' ? '#dc2626' : '#d97706' }}>{severity}</strong> • Current Status: <strong>{status}</strong>
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>
              Review Comment & Justification
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <PenLine size={12} color="#2563eb" />
                <span>{isGenerating ? 'Inserting...' : 'Insert Draft Comment'}</span>
              </button>
              {commentText && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopy}
                >
                  {isCopied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
          </div>
          <textarea
            className="form-input"
            rows={4}
            placeholder="Document your professional assessment, management inquiries, or audit conclusion..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => handleAction('REJECTED')}
          >
            <XCircle size={14} />
            <span>Reject Finding</span>
          </button>
          <button
            className="btn btn-success btn-sm"
            onClick={() => handleAction('APPROVED')}
          >
            <ShieldCheck size={14} />
            <span>Approve Finding</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
