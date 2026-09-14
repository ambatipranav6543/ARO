import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, ShieldCheck, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useReview } from '../../context/ReviewContext';
import * as reviewService from '../../services/reviewService';

const DEMO_QUICK_ACTIONS = [
  'Explain the profit calculation mismatch',
  'Why was operating expenses flagged as critical?',
  'Explain the lease liability omission under Ind AS 116',
  'Summarize the primary audit risks',
  'What should I review first?'
];

const LIVE_QUICK_ACTIONS = [
  'What caused the revenue variance?',
  'Explain operating expense shifts',
  'Check debt and liquidity disclosures',
  'Are balance sheet identities reconciled?'
];

// The live-mode assistant only retrieves evidence (RAG) and shows it -
// it does not itself compute variances or evaluate consistency (that's
// the deterministic engine, elsewhere). The greeting says only what
// this chat actually does, so it isn't oversold ahead of the answers
// it actually gives.
const DEMO_GREETING = 'I am your AI Financial Review Assistant. I evaluate cross-statement consistency, compute numerical variance deltas, and retrieve audit evidence directly from your financial statements. How can I assist your review today?';
const LIVE_GREETING = 'I retrieve grounded evidence from the indexed financial statements and show you the most relevant matches, with their similarity score. Ask about a company or metric to get started.';

export function AiAssistant() {
  const { activeReviewId, isDemoMode, selectedStatement, liveStatements } = useReview();
  const [messages, setMessages] = useState([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: isDemoMode ? DEMO_GREETING : LIVE_GREETING,
      isEvidenceGrounded: true,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const activeCompanyName = selectedStatement?.company || liveStatements[0]?.company || null;
  const quickActions = isDemoMode ? DEMO_QUICK_ACTIONS : LIVE_QUICK_ACTIONS;

  const handleSendMessage = async (textToSend = inputMessage) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMessageId,
        sender: 'user',
        text: trimmed,
        timestamp: new Date().toISOString()
      }
    ];

    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await reviewService.askFinancialAssistant(
        activeReviewId,
        trimmed,
        null,
        isDemoMode,
        activeCompanyName
      );

      setMessages([
        ...newMessages,
        {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: response.answer,
          isEvidenceGrounded: response.isEvidenceGrounded,
          citations: response.citations || [],
          evidence: response.evidence || [],
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err) {
      setErrorMessage(err.message || 'AI assistant unavailable. Verify that backend is running and index is built.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '620px',
        padding: 0,
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}
          >
            <Bot size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {isDemoMode ? 'AI Financial Review Assistant' : 'Evidence Retrieval Assistant'}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {isDemoMode ? 'Demo Mode (Acme Global Technologies)' : `Live RAG Assistant (${activeCompanyName || 'Enterprise Entity'})`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16a34a', fontWeight: 600, backgroundColor: '#f0fdf4', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0' }}>
          <ShieldCheck size={14} />
          <span>Evidence Grounded</span>
        </div>
      </div>

      <div style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={12} color="#2563eb" />
          Quick Actions:
        </span>
        {quickActions.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 500,
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              color: '#334155',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg) => {
          const isAi = msg.sender === 'assistant';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '10px',
                alignSelf: isAi ? 'flex-start' : 'flex-end',
                maxWidth: '85%'
              }}
            >
              {isAi && (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb',
                    flexShrink: 0
                  }}
                >
                  <Bot size={16} />
                </div>
              )}

              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: isAi ? '#ffffff' : 'var(--color-brand-accent)',
                  color: isAi ? 'var(--color-text-primary)' : '#ffffff',
                  border: isAi ? '1px solid var(--color-border)' : 'none',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  boxShadow: 'var(--shadow-subtle)'
                }}
              >
                <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>

                {isAi && msg.citations && msg.citations.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      CITED AUDIT EVIDENCE:
                    </div>
                    {msg.citations.map((cite, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: '11px',
                          backgroundColor: '#f8fafc',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #cbd5e1',
                          color: '#334155'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <FileText size={12} color="#2563eb" />
                          <span>{cite.source} (Page {cite.page}) — {cite.section}</span>
                        </div>
                        <div style={{ fontStyle: 'italic', marginTop: '2px', color: '#475569' }}>
                          "{cite.quote}"
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isAi && msg.evidence && msg.evidence.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      RETRIEVED STATEMENT DISCLOSURES:
                    </div>
                    {msg.evidence.map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: '11px',
                          backgroundColor: '#f8fafc',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #cbd5e1',
                          color: '#334155'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, marginBottom: '2px' }}>
                          <span style={{ color: '#1e40af' }}>{ev.metadata?.company || 'Statement'}</span>
                          <span style={{ color: '#16a34a' }}>{(ev.similarity * 100).toFixed(1)}% Match</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#475569', wordBreak: 'break-word' }}>
                          "{ev.text}"
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}
            >
              <Bot size={16} />
            </div>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#ffffff',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--color-text-muted)'
              }}
            >
              <Loader2 size={16} className="animate-spin" color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Querying vector store disclosures and verifying evidence grounding...</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', fontSize: '12px' }}>
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border)', backgroundColor: '#ffffff' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{ display: 'flex', gap: '10px' }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="Ask AI Assistant about financial disclosures, math consistency, or variances..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!inputMessage.trim() || isLoading}
          >
            <Send size={15} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
