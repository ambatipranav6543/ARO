import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, ArrowRight, Building2, Play } from 'lucide-react';
import { formatFileSize } from '../../utils/formatters';

// PDF is intentionally excluded: the backend's PDF loader is an
// unimplemented stub (raises NotImplementedError), so accepting .pdf
// here would let a user "successfully" select a file that then fails
// ingestion with a confusing error.
const ALLOWED_EXTENSIONS = ['csv', 'xlsx', 'xls', 'json'];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export function FileUploader({
  onUploadFile,
  onSelectExistingCompany,
  existingStatements = [],
  isUploading = false,
  errorMessage = '',
  backendError = ''
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [localError, setLocalError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedCompanyOption, setSelectedCompanyOption] = useState('');
  const [reviewInstruction, setReviewInstruction] = useState('');

  const fileInputRef = useRef(null);

  const validateSelectedFile = (file) => {
    if (!file) return 'Please select a valid file.';

    const extension = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `Unsupported file format (.${extension}). Accepted formats: CSV, Excel (.xlsx, .xls), and JSON.`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size exceeds the 25MB limit (${formatFileSize(file.size)}).`;
    }

    return null;
  };

  const handleFileChange = (file) => {
    setLocalError('');
    const error = validateSelectedFile(file);
    if (error) {
      setLocalError(error);
      return;
    }
    setSelectedFile(file);
  };

  const handleTriggerUpload = () => {
    if (!selectedFile) {
      setLocalError('Please select a financial statement file to upload.');
      return;
    }
    setLocalError('');
    onUploadFile(selectedFile, reviewInstruction);
  };

  const handleCompanySelect = (e) => {
    const val = e.target.value;
    setSelectedCompanyOption(val);
    if (val && onSelectExistingCompany) {
      onSelectExistingCompany(val, reviewInstruction);
    }
  };

  const uniqueCompanies = Array.from(new Set(existingStatements.map(s => s.company)));

  const displayError = localError || errorMessage || backendError;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {displayError && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            color: 'var(--color-danger)',
            fontSize: '13px',
            fontWeight: 500
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>Backend Validation / Ingestion Notice</div>
            <div style={{ wordBreak: 'break-word', lineHeight: 1.5 }}>{displayError}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '12px', fontWeight: 700 }}>
                1
              </span>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Upload Financial Statement File
              </h3>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb' }}>CSV / EXCEL / JSON</span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
            Upload tabular or reported statement files. The backend deterministic engine validates accounting equations upon receipt.
          </p>

          {!selectedFile ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                border: isDragOver ? '2px dashed var(--color-brand-accent)' : '2px dashed var(--color-border-dark)',
                backgroundColor: isDragOver ? '#eff6ff' : '#f8fafc',
                borderRadius: 'var(--radius-lg)',
                padding: '36px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <UploadCloud size={36} color="#2563eb" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Drag & drop financial statement document
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                or <span style={{ color: 'var(--color-brand-accent)', textDecoration: 'underline' }}>browse file from device</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                Supports CSV, Excel (.xlsx, .xls), and JSON up to 25MB
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <FileText size={26} color="#16a34a" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803d', display: 'flex', gap: '8px', marginTop: '3px' }}>
                    <span>{formatFileSize(selectedFile.size)}</span>
                    <span>•</span>
                    <span style={{ textTransform: 'uppercase' }}>{selectedFile.name.split('.').pop()}</span>
                    <span>•</span>
                    <span style={{ fontWeight: 600 }}>Ready for Ingestion</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#15803d',
                  padding: '4px'
                }}
                title="Remove file"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '12px', fontWeight: 700 }}>
                2
              </span>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Select Stored Enterprise Entity
              </h3>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a' }}>DATABASE</span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
            Or immediately run an automated financial review on any entity already seeded in the backend repository.
          </p>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Available Stored Companies</label>
            <select
              className="form-input"
              value={selectedCompanyOption}
              onChange={handleCompanySelect}
              disabled={isUploading}
            >
              <option value="">-- Choose Company from Database --</option>
              {uniqueCompanies.map(comp => (
                <option key={comp} value={comp}>
                  {comp} ({existingStatements.filter(s => s.company === comp).map(s => `FY${s.fiscal_year}`).join(', ')})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Review Focus Instruction (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Focus on debt, margin compression, or liquidity"
              value={reviewInstruction}
              onChange={(e) => setReviewInstruction(e.target.value)}
              disabled={isUploading}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          <CheckCircle2 size={16} color="#16a34a" />
          <span>Ingested statements are deterministically validated for balance sheet identities and profit subtotals.</span>
        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={handleTriggerUpload}
          disabled={!selectedFile || isUploading}
        >
          <span>{isUploading ? 'Ingesting Document...' : 'Ingest & Analyze Statement'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
