import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, X, Eye, EyeOff, Mail, Lock, Check } from 'lucide-react';
import { AroMark } from '../components/common/AroMark';
import { SparklesCore, SparklesProvider } from '../components/common/Sparkles';
import { useAuth } from '../context/AuthContext';

// The word-reveal mechanic below (sticky header + a fixed-attachment
// gradient clipped to text, each <li> exactly one line-height tall) is a
// pure-CSS scroll effect: as the page scrolls, a fixed-viewport highlight
// band lights up whichever word is currently passing through it. No
// scroll-position JS is needed for it - "top: calc((count-1)*-1lh)" is
// what keeps the list parked so each line's transition happens at
// --start. ARO's palette/copy replace the original's hue-rotated accent
// and word list; the reveal math is unchanged.
const HERO_CSS = `
  .aro-hero {
    position: relative;
    width: 100%;
    background: #000000;
    --start: 46vh;
    --space: 65vh;
    --accent: #9BC7F5;
    --dimmed: rgba(255, 255, 255, 0.14);
  }

  /* Soft, silk-like drifting glow field behind the whole scroll - fixed to
     the viewport (not the page) so it reads as ambient backdrop lighting
     rather than content that scrolls past. */
  .aro-hero-silk {
    position: fixed;
    inset: -10%;
    z-index: 0;
    pointer-events: none;
    filter: blur(90px);
  }

  .aro-hero-silk span {
    position: absolute;
    border-radius: 50%;
    display: block;
  }

  .aro-hero-silk span:nth-child(1) {
    top: -12%;
    left: -8%;
    width: 60vw;
    height: 60vw;
    background: radial-gradient(circle, rgba(73, 106, 145, 0.5) 0%, rgba(73, 106, 145, 0) 70%);
    animation: aro-silk-drift-a 22s ease-in-out infinite;
  }

  .aro-hero-silk span:nth-child(2) {
    bottom: -18%;
    right: -12%;
    width: 65vw;
    height: 65vw;
    background: radial-gradient(circle, rgba(156, 199, 245, 0.32) 0%, rgba(156, 199, 245, 0) 70%);
    animation: aro-silk-drift-b 26s ease-in-out infinite;
  }

  .aro-hero-silk span:nth-child(3) {
    top: 38%;
    left: 32%;
    width: 40vw;
    height: 40vw;
    background: radial-gradient(circle, rgba(220, 235, 250, 0.16) 0%, rgba(220, 235, 250, 0) 70%);
    animation: aro-silk-drift-c 30s ease-in-out infinite;
  }

  @keyframes aro-silk-drift-a {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(6vw, 8vh) scale(1.12); }
  }

  @keyframes aro-silk-drift-b {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-7vw, -6vh) scale(1.08); }
  }

  @keyframes aro-silk-drift-c {
    0%, 100% { transform: translate(-4vw, 3vh) scale(0.95); }
    50% { transform: translate(4vw, -4vh) scale(1.1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .aro-hero-silk span {
      animation: none !important;
    }
  }

  .aro-hero-brand {
    position: fixed;
    top: 24px;
    left: 24px;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0.85;
  }

  .aro-hero-brand span {
    font-family: 'Space Grotesk', var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: #FAFAF9;
  }

  .aro-hero-header {
    position: sticky;
    top: calc(-2 * 1lh);
    z-index: 1;
    display: flex;
    align-items: flex-start;
    width: 100%;
    margin-bottom: var(--space);
    /* font-size/line-height live here, not just on .aro-hero-words below:
       "top" above is in lh units, and lh always resolves against the
       element it's declared on - it has to match the words' actual line
       height or the sticky offset undershoots and the reveal collapses
       into an instant, barely-scrollable jump. */
    font-size: clamp(3rem, 6vw + 1.5rem, 8rem);
    line-height: 1.15;
  }

  .aro-hero-header .aro-hero-col {
    display: flex;
    width: 100%;
    align-items: flex-start;
    justify-content: center;
    padding-top: calc(var(--start) - 0.5lh);
  }

  .aro-hero-words {
    list-style: none;
    margin: 0;
    padding: 0;
    text-align: center;
    font-weight: 700;
    font-size: inherit;
    letter-spacing: -0.01em;
  }

  .aro-hero-words li {
    background: linear-gradient(
      180deg,
      var(--dimmed) 0 calc(var(--start) - 0.55lh),
      var(--accent) calc(var(--start) - 0.5lh) calc(var(--start) + 0.5lh),
      var(--dimmed) calc(var(--start) + 0.55lh)
    );
    background-attachment: fixed;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
  }

  .aro-hero-main {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100vh;
  }

  .aro-hero-main::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: #000000;
    border-radius: 32px 32px 0 0;
    box-shadow: 0 -30px 80px rgba(0, 0, 0, 0.6);
  }

  /* Stardust is now the tsParticles-backed <SparklesCore> component
     rather than a CSS tiled dot field - see components/common/Sparkles. */

  .aro-hero-main section {
    position: relative;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px;
    overflow: hidden;
  }

  /* Illuminated showcase: two soft glow blobs (stacked so they overlap at
     center, like the two-lobe glow behind the reference component) plus an
     SVG-filtered glow on the "ARO." wordmark - recolored from the
     reference's warm amber into ARO's ice-blue/navy so it stays on-brand
     rather than introducing a new palette. */
  .aro-illum-hero {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 640px;
    padding: 0 16px;
  }

  .aro-illum-text {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* The wordmark gets its own glowing lockup here (the same SVG filter
     that lights up "ARO." below) rather than staying confined to the
     small fixed brand chip - this is the one place in the scroll where
     the mark itself, not just the name, is the hero. Sized large and
     given a slow breathing pulse (after its entrance) so it reads as the
     focal point that leads the eye down through the tagline to the CTA,
     rather than a small icon sitting quietly above the headline. */
  .aro-illum-mark {
    width: clamp(84px, 13vw, 160px);
    height: auto;
    display: block;
    margin-bottom: 16px;
    filter: url(#aro-illum-glow);
    opacity: 0;
    animation: aro-illum-text-in 1s ease-out 0.05s forwards, aro-illum-mark-breathe 4.5s ease-in-out 1.2s infinite;
    transform-origin: center;
  }

  @keyframes aro-illum-mark-breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.035); }
  }

  /* Typography here matches the logo's own wordmark (see
     aro_logo_with_name.png) rather than the app's default Inter - a
     geometric sans (Space Grotesk) gets far closer to that lockup's
     proportions than a humanist grotesk would. */
  .aro-illum-tagline {
    font-family: 'Space Grotesk', var(--font-sans);
    font-size: clamp(18px, 2.6vw, 26px);
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #FAFAF9;
  }

  .aro-illum-glow-text {
    font-family: 'Space Grotesk', var(--font-sans);
    font-size: clamp(40px, 7vw, 76px);
    font-weight: 700;
    letter-spacing: 0.01em;
    color: #fffaf6;
    margin: 4px 0;
    filter: url(#aro-illum-glow);
    opacity: 0;
    animation: aro-illum-text-in 1s ease-out 0.3s forwards;
  }

  .aro-illum-subline {
    font-family: 'Space Grotesk', var(--font-sans);
    font-size: clamp(24px, 4.2vw, 44px);
    font-weight: 600;
    letter-spacing: 0.01em;
    background: linear-gradient(180deg, #64748B 0%, #94A3B8 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  @keyframes aro-illum-text-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .aro-illum-copy {
    position: relative;
    z-index: 1;
    margin-top: 24px;
    max-width: 460px;
    font-size: clamp(14px, 1.4vw, 16px);
    line-height: 1.6;
    color: #94A3B8;
  }

  .aro-illum-copy-strong {
    font-weight: 700;
    color: #DCEBFA;
  }

  @media (prefers-reduced-motion: reduce) {
    .aro-illum-mark,
    .aro-illum-glow-text {
      animation: none !important;
      opacity: 1 !important;
    }
  }

  /* The panel's corner-radius/scale "grow" is cosmetic (progressive
     enhancement only, safe to skip). Content inside is deliberately NOT
     gated behind a view-timeline animation: animation-range: entry 100%
     only finishes once .aro-hero-main has fully scrolled past its own
     height, which depends on total document height matching up exactly -
     get that arithmetic even slightly wrong (as this did with a bigger
     --space) and the "from" keyframe (opacity: 0) never resolves,
     permanently hiding the Sign In button. Real content stays opacity: 1
     unconditionally; only the backdrop plays along with scroll. */
  @supports (animation-timeline: view()) {
    .aro-hero-main {
      view-timeline: --aro-reveal;
    }
    .aro-hero-main::before {
      transform-origin: 50% 100%;
      scale: 0.92;
      animation: aro-grow both ease-in-out;
      animation-timeline: --aro-reveal;
      animation-range: entry 65%;
    }
    @keyframes aro-grow {
      from { scale: 0.92; border-radius: 32px 32px 0 0; }
      to { scale: 1; border-radius: 0; }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .aro-hero-main::before {
      animation: none !important;
    }
  }

  /* Custom "Remember me" checkbox: a visually-hidden real checkbox (still
     the thing that's focusable and keyboard-toggleable) drawn over a
     styled box via the adjacent-sibling combinator, so it matches the
     rest of the app's controls instead of the browser's default square. */
  .aro-checkbox-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    margin: 0;
    cursor: pointer;
  }

  .aro-checkbox-box {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    border: 1.5px solid #CBD5E1;
    background: #ffffff;
    color: transparent;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .aro-checkbox-input:checked + .aro-checkbox-box {
    background: linear-gradient(135deg, #0B1220, #1E293B);
    border-color: #0B1220;
    color: #DCEBFA;
  }

  .aro-checkbox-input:focus-visible + .aro-checkbox-box {
    box-shadow: 0 0 0 3px rgba(11, 18, 32, 0.14);
  }
`;

// Landing experience, three layers:
//  1. A scroll-driven word reveal (Review -> Validate -> Decide) that
//     introduces what ARO does, one word at a time, as the page scrolls.
//  2. The reveal resolves into a persistent product showcase panel that
//     slides up over it - the ARO wordmark plus a preview of real review
//     output.
//  3. Only from the showcase does clicking Sign In trigger the
//     button-into-panel morph (shared framer-motion layoutId), revealing
//     the real authentication form.
export function LandingPage() {
  const { login } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Preloaded per request: there's no real backend auth wired up yet
  // (login() accepts any password - see AuthContext), so this just saves a
  // manual retype every time the flow is tested.
  const [email, setEmail] = useState('reviewer@cognizant.com');
  const [password, setPassword] = useState('AroDemo#2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthOpen) return undefined;

    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsAuthOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAuthOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide a valid work email address.');
      return;
    }
    if (!password) {
      setError('Please provide your password.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, rememberMe);
      // isAuthenticated flips true; the parent (App.jsx) swaps away from
      // this page entirely - no manual navigation needed here.
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <SparklesProvider>
    <div className="aro-hero">
      <style>{HERO_CSS}</style>

      <div className="aro-hero-silk" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="aro-hero-brand">
        <AroMark size={20} gradientId="aro-mark-brand" />
        <span>ARO</span>
      </div>

      <header className="aro-hero-header">
        <div className="aro-hero-col">
          <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            ARO: review, validate, decide - financial statement review, powered by evidence-grounded AI.
          </h1>
          <ul className="aro-hero-words" aria-hidden="true">
            <li>Review.</li>
            <li>Validate.</li>
            <li>Decide.</li>
          </ul>
        </div>
      </header>

      <main className="aro-hero-main">
        <section>
          <SparklesCore id="aro-sparkles-hero" particleDensity={80} />

          <div className="aro-illum-hero">
            <div className="aro-illum-text">
              <img src="/aro_logo.png" alt="" aria-hidden="true" className="aro-illum-mark" />
              <span className="aro-illum-tagline">Introducing</span>
              <span className="aro-illum-glow-text">ARO.</span>
              <span className="aro-illum-subline">Review. Validate. Decide.</span>
            </div>

            <p className="aro-illum-copy">
              Every statement is checked against real accounting rules, cross-referenced for consistency, and handed to you with{' '}
              <span className="aro-illum-copy-strong">the evidence attached</span> - nothing invented, nothing guessed.
            </p>

            <AnimatePresence>
              {!isAuthOpen && (
                <motion.button
                  layoutId="aro-auth-surface"
                  layout
                  onClick={() => setIsAuthOpen(true)}
                  transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                  style={{
                    marginTop: '32px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    height: '52px',
                    padding: '0 28px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0B1220',
                    background: 'linear-gradient(135deg, #FAFAF9, #DCEBFA)',
                    border: 'none',
                    borderRadius: '100px',
                    cursor: 'pointer',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)'
                  }}
                >
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Recolored from the reference's warm amber into ARO's
              ice-blue/navy: each feColorMatrix below is an independent
              per-channel scale (no cross-mixing), so retinting means
              lowering R relative to G/B instead of the other way round. */}
          <svg aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
              <filter id="aro-illum-glow" colorInterpolationFilters="sRGB" x="-30%" y="-70%" width="160%" height="240%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur4" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur19" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur9" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur30" />

                <feColorMatrix in="blur4" result="color-0-blur" type="matrix" values="0.85 0 0 0 0  0 0.93 0 0 0  0 0 1 0 0  0 0 0 0.9 0" />
                <feOffset in="color-0-blur" result="layer-0-offsetted" dx="0" dy="0" />

                <feColorMatrix in="blur19" result="color-1-blur" type="matrix" values="0.42 0 0 0 0  0 0.65 0 0 0  0 0 0.96 0 0  0 0 0 1 0" />
                <feOffset in="color-1-blur" result="layer-1-offsetted" dx="0" dy="2" />

                <feColorMatrix in="blur9" result="color-2-blur" type="matrix" values="0.55 0 0 0 0  0 0.75 0 0 0  0 0 0.98 0 0  0 0 0 0.75 0" />
                <feOffset in="color-2-blur" result="layer-2-offsetted" dx="0" dy="2" />

                <feColorMatrix in="blur30" result="color-3-blur" type="matrix" values="0.35 0 0 0 0  0 0.58 0 0 0  0 0 0.9 0 0  0 0 0 1 0" />
                <feOffset in="color-3-blur" result="layer-3-offsetted" dx="0" dy="2" />

                <feColorMatrix in="blur30" result="color-4-blur" type="matrix" values="0.16 0 0 0 0  0 0.3 0 0 0  0 0 0.55 0 0  0 0 0 1 0" />
                <feOffset in="color-4-blur" result="layer-4-offsetted" dx="0" dy="6" />

                <feColorMatrix in="blur30" result="color-5-blur" type="matrix" values="0.08 0 0 0 0  0 0.16 0 0 0  0 0 0.32 0 0  0 0 0 1 0" />
                <feOffset in="color-5-blur" result="layer-5-offsetted" dx="0" dy="18" />

                <feColorMatrix in="blur30" result="color-6-blur" type="matrix" values="0.04 0 0 0 0  0 0.08 0 0 0  0 0 0.16 0 0  0 0 0 1 0" />
                <feOffset in="color-6-blur" result="layer-6-offsetted" dx="0" dy="18" />

                <feColorMatrix in="blur30" result="color-7-blur" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.68 0" />
                <feOffset in="color-7-blur" result="layer-7-offsetted" dx="0" dy="18" />

                <feMerge>
                  <feMergeNode in="layer-7-offsetted" />
                  <feMergeNode in="layer-6-offsetted" />
                  <feMergeNode in="layer-5-offsetted" />
                  <feMergeNode in="layer-4-offsetted" />
                  <feMergeNode in="layer-3-offsetted" />
                  <feMergeNode in="layer-2-offsetted" />
                  <feMergeNode in="layer-1-offsetted" />
                  <feMergeNode in="layer-0-offsetted" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>
        </section>
      </main>

      {/* Panel: morphs out of the Sign In button's shape and takes over
          the viewport, revealing the real sign-in form. */}
      <AnimatePresence>
        {isAuthOpen && (
          <motion.div
            layoutId="aro-auth-surface"
            layout
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              overflow: 'auto',
              background: '#000000',
              // Explicit target for the shared layoutId's border-radius
              // interpolation (from the button's 100px pill) - leaving it
              // unset lets framer-motion's projection settle on a stray
              // residual percentage instead of a clean 0, which reads as
              // a visible curve once the panel's box is very tall (e.g.
              // the two columns stacked on mobile).
              borderRadius: 0
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Sign in to ARO"
          >
            <button
              onClick={() => setIsAuthOpen(false)}
              aria-label="Close sign in"
              style={{
                position: 'absolute', right: '20px', top: '20px', zIndex: 20,
                width: '40px', height: '40px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#FAFAF9', cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.12, duration: 0.35 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              style={{
                position: 'relative', zIndex: 10, minHeight: '100%',
                display: 'flex', flexWrap: 'wrap', width: '100%'
              }}
            >
              {/* Left: the real sign-in form, on ARO's light surface - the
                  one place the full lockup (mark + wordmark) actually
                  reads, since its typography is dark navy. */}
              <div
                style={{
                  flex: '1 1 440px',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '64px 40px',
                  background: 'linear-gradient(160deg, #F1F5F9 0%, #DCEBFA 100%)'
                }}
              >
                {/* A faint brand mark, not a decoration borrowed from
                    elsewhere - the same wordmark glyph used throughout the
                    app, oversized and nearly invisible, so the panel reads
                    as branded rather than a bare, generic form on a
                    gradient. */}
                <img
                  src="/aro_logo.png"
                  alt=""
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    right: '-60px',
                    bottom: '-60px',
                    width: '320px',
                    height: '320px',
                    opacity: 0.05,
                    filter: 'grayscale(1)',
                    pointerEvents: 'none'
                  }}
                />

                <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                  <img src="/aro_logo_with_name.png" alt="ARO" style={{ height: '52px', width: 'auto' }} />

                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--color-brand-accent)',
                      opacity: 0.65,
                      marginTop: '28px'
                    }}
                  >
                    Reviewer Access
                  </p>
                  <h2 style={{ fontSize: '27px', fontWeight: 600, letterSpacing: '-0.01em', color: '#0B1220', marginTop: '6px' }}>
                    Welcome back
                  </h2>
                  <p style={{ fontSize: '14px', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
                    Sign in to continue reviewing financial statements with evidence-backed findings.
                  </p>

                  {error && (
                    <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '12px', marginTop: '20px' }}>
                      {error}
                    </div>
                  )}
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '28px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="work-email">Work Email</label>
                      <div style={{ position: 'relative' }}>
                        <Mail
                          size={16}
                          style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)', pointerEvents: 'none' }}
                        />
                        <input
                          id="work-email" type="email" className="form-input" autoFocus
                          style={{ paddingLeft: '38px' }}
                          value={email} onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@cognizant.com" required
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="password">Password</label>
                      <div style={{ position: 'relative' }}>
                        <Lock
                          size={16}
                          style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)', pointerEvents: 'none' }}
                        />
                        <input
                          id="password" type={showPassword ? 'text' : 'password'} className="form-input"
                          style={{ paddingLeft: '38px', paddingRight: '40px' }}
                          value={password} onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••" required
                        />
                        <button
                          type="button" onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      <span style={{ position: 'relative', width: '16px', height: '16px', flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          className="aro-checkbox-input"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span className="aro-checkbox-box" aria-hidden="true">
                          <Check size={11} strokeWidth={3} />
                        </span>
                      </span>
                      <span>Remember me on this device</span>
                    </label>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '4px' }} disabled={isLoading}>
                      <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </form>
                </div>
              </div>

              {/* Right: a dark recap of the story just scrolled through,
                  plus a small preview "window" built from the same real
                  sample figures used in the showcase - not a fabricated
                  screenshot or testimonial. */}
              <div style={{ flex: '1 1 440px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 40px', background: '#000000' }}>
                <SparklesCore id="aro-sparkles-auth" particleDensity={60} />

                <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px' }}>
                  <motion.div
                    initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* The showcase screen already made the "Review.
                        Validate. Decide." promise once - restating it here
                        would be the third time in three screens. This panel
                        instead names the actual mechanism behind it, so the
                        story advances instead of repeating. */}
                    <span className="aro-illum-subline" style={{ fontSize: 'clamp(26px, 3vw, 34px)', display: 'block' }}>
                      Built to show its work.
                    </span>
                    <p style={{ fontSize: '14px', color: '#94A3B8', marginTop: '14px', lineHeight: 1.6, maxWidth: '360px' }}>
                      Three rule-based checks recompute every figure, cross-check it against the rest of the
                      statement, and track it year over year{' '}
                      <span className="aro-illum-copy-strong">- each finding cited to the exact line it came from</span>.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    style={{ marginTop: '36px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.55)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
                      <span className="font-mono" style={{ marginLeft: '10px', fontSize: '10px', letterSpacing: '0.04em', color: '#64748B' }}>aro.app/dashboard</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', padding: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 100px', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', color: '#64748B', textTransform: 'uppercase' }}>Findings</div>
                        <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: '#FAFAF9', marginTop: '3px' }}>5</div>
                      </div>
                      <div style={{ flex: '1 1 100px', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', color: '#64748B', textTransform: 'uppercase' }}>Risk Score</div>
                        <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: '#FAFAF9', marginTop: '3px' }}>78/100</div>
                      </div>
                      <div style={{ flex: '1 1 100px', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', color: '#64748B', textTransform: 'uppercase' }}>Variance</div>
                        <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: '#FAFAF9', marginTop: '3px' }}>₹10 Cr</div>
                      </div>
                    </div>
                  </motion.div>
                  <p style={{ fontSize: '11px', color: '#475569', marginTop: '12px', letterSpacing: '0.02em' }}>
                    Illustrative sample review - Acme Global Technologies Ltd, FY 2024-25
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </SparklesProvider>
  );
}
