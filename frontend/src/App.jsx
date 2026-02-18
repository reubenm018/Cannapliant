import { useState, useRef, useCallback } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/analyze`
  : '/api/analyze';

const LOADING_MESSAGES = [
  'Scanning for required label elements…',
  'Checking THC/CBD content disclosures…',
  'Verifying universal cannabis symbol…',
  'Reviewing warning statement compliance…',
  'Checking for prohibited claims…',
  'Analyzing minor-appeal elements…',
  'Validating license number presence…',
  'Cross-referencing 17 CCR § 5303 requirements…',
  'Generating compliance report…',
];

const CHECK_NAMES = {
  universal_symbol:    'Universal Cannabis Symbol',
  thc_content:         'THC Content Disclosure',
  cbd_content:         'CBD Content Disclosure',
  net_weight:          'Net Weight / Volume',
  serving_size:        'Serving Size & Count',
  health_warning:      'CA Health & Safety Warning',
  pregnancy_warning:   'Pregnancy / Children Warning',
  age_restriction:     '21+ Age Restriction',
  license_number:      'License Number',
  batch_lot:           'Batch / Lot Number',
  manufacturer_info:   'Manufacturer / Distributor Info',
  no_health_claims:    'No Prohibited Health Claims',
  no_minor_appeal:     'No Minor-Appeal Elements',
  no_alcohol_refs:     'No Alcohol / Tobacco References',
  font_readability:    'Font Legibility (≥6pt)',
  child_resistant_note:'Child-Resistant Notation',
  correct_category:    'Product Category Identified',
};

const DOT_ICONS = { pass: '✓', fail: '✗', warning: '!', na: '—' };

const VERDICT_META = {
  compliant:      { icon: '✅', title: 'Compliant' },
  'non-compliant':{ icon: '❌', title: 'Non-Compliant' },
  conditional:    { icon: '⚠️', title: 'Conditionally Compliant' },
};

const CA_REGS = [
  '17 CCR § 5303', '17 CCR § 5304', '17 CCR § 5305', '17 CCR § 5306',
  'Health & Safety Code § 26120', 'DCC Label Requirements',
  'Universal Symbol Mandate', 'Minor Appeal Prohibition',
  'Health Claim Restriction', 'THC/CBD Disclosure',
];

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function App() {
  const [fileData, setFileData] = useState(null);
  // phase: 'upload' | 'preview' | 'loading' | 'results' | 'error'
  const [phase, setPhase] = useState('upload');
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const intervalRef = useRef(null);

  const handleFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setFileData({
        base64: dataUrl.split(',')[1],
        type: file.type || 'image/jpeg',
        name: file.name,
        size: file.size,
        dataUrl,
      });
      setPhase('preview');
      setResults(null);
      setError('');
    };
    reader.readAsDataURL(file);
  }, []);

  const resetUpload = useCallback(() => {
    setFileData(null);
    setPhase('upload');
    setResults(null);
    setError('');
  }, []);

  const analyzeCompliance = useCallback(async () => {
    if (!fileData) return;
    setPhase('loading');
    setError('');

    let msgIdx = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    intervalRef.current = setInterval(() => {
      msgIdx++;
      setLoadingMsg(LOADING_MESSAGES[msgIdx % LOADING_MESSAGES.length]);
    }, 1800);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: fileData.base64, mediaType: fileData.type }),
      });
      clearInterval(intervalRef.current);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${response.status}`);
      }

      const result = await response.json();
      setResults(result);
      setPhase('results');
    } catch (err) {
      clearInterval(intervalRef.current);
      setError(err.message || String(err));
      setPhase('error');
    }
  }, [fileData]);

  const verdict = results ? (VERDICT_META[results.verdict] ?? VERDICT_META['non-compliant']) : null;

  return (
    <>
      <header>
        <div className="logo">
          <svg className="logo-icon" viewBox="0 0 32 32" fill="none">
            <path d="M16 3 C16 3 8 10 8 18 C8 22.4 11.6 26 16 26 C20.4 26 24 22.4 24 18 C24 10 16 3 16 3Z" stroke="#7eb87e" strokeWidth="1.5" fill="none"/>
            <path d="M16 12 L16 26" stroke="#7eb87e" strokeWidth="1" opacity="0.5"/>
            <path d="M16 16 L12 13" stroke="#7eb87e" strokeWidth="1" opacity="0.4"/>
            <path d="M16 19 L20 16" stroke="#7eb87e" strokeWidth="1" opacity="0.4"/>
            <circle cx="16" cy="28" r="1.5" fill="#c8a84b"/>
          </svg>
          <span className="logo-text">Canna<span>Label</span></span>
        </div>
        <div className="badge">CA Compliance v1.0</div>
      </header>

      <main>
        <div className="hero">
          <div className="hero-label">California Cannabis Packaging Compliance</div>
          <h1>Review artwork.<br /><em>Ensure compliance.</em></h1>
          <p>Upload your cannabis packaging label or artwork for an AI-powered compliance review against California DCC regulations.</p>
        </div>

        <div className="upload-card">
          {/* ── Upload zone ── */}
          {phase === 'upload' && (
            <div
              className={`upload-zone${dragOver ? ' drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
              }}
            >
              <input
                type="file"
                accept="image/*"
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }}
              />
              <svg className="upload-icon" viewBox="0 0 56 56" fill="none">
                <rect x="8" y="14" width="40" height="32" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M20 30 L28 22 L36 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M28 22 L28 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12 8 L44 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              </svg>
              <div className="upload-title">Drop artwork here or click to browse</div>
              <div className="upload-sub">PNG · JPG · WEBP — up to 20MB</div>
            </div>
          )}

          {/* ── Preview ── */}
          {(phase === 'preview' || phase === 'error') && fileData && (
            <div className="preview-area active">
              <div className="preview-img-wrap">
                <img src={fileData.dataUrl} alt="Preview" />
              </div>
              <div className="preview-meta">
                <div className="preview-filename">{fileData.name}</div>
                <div className="preview-filesize">{formatSize(fileData.size)}</div>
                <div className="btn-group">
                  <button className="btn btn-primary" onClick={analyzeCompliance}>
                    ▶ Run Compliance Check
                  </button>
                  <button className="btn btn-ghost" onClick={resetUpload}>Clear</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {phase === 'loading' && (
            <div className="loading-state active">
              <div className="spinner" />
              <div className="loading-text">Analyzing artwork against CA DCC regulations…</div>
              <div className="loading-progress">{loadingMsg}</div>
            </div>
          )}
        </div>

        {/* ── Error banner ── */}
        {phase === 'error' && error && (
          <div className="error-card active">
            <div className="error-title">⚠ Analysis Error</div>
            <div className="error-msg">{error}</div>
          </div>
        )}

        {/* ── Results ── */}
        {phase === 'results' && results && (
          <div className="results-section active">
            <div className={`verdict-banner ${results.verdict || 'non-compliant'}`}>
              <div className="verdict-left">
                <div className="verdict-icon">{verdict.icon}</div>
                <div>
                  <div className="verdict-status">California DCC Review</div>
                  <div className="verdict-title">{verdict.title}</div>
                </div>
              </div>
              <div className="verdict-score">
                <div className="score-num">{results.score ?? '--'}%</div>
                <div className="score-label">Compliance Score</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="section-header">Executive Summary</div>
              <div className="summary-text">{results.summary}</div>
            </div>

            <div className="section-header">
              Regulatory Checklist — 17 CCR § 5303 &amp; DCC Requirements
            </div>
            <div className="checks-grid">
              {(results.checks || []).map((check) => (
                <div key={check.id} className={`check-item ${check.status || 'na'}`}>
                  <div className="check-dot">{DOT_ICONS[check.status] || '—'}</div>
                  <div>
                    <div className="check-name">{CHECK_NAMES[check.id] || check.name || check.id}</div>
                    <div className="check-detail">{check.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {(results.recommendations || []).length > 0 && (
              <div className="summary-card">
                <div className="section-header">Required Corrections</div>
                {results.recommendations.map((rec, i) => (
                  <div key={i} className="rec-item">
                    <span className="rec-num">{String(i + 1).padStart(2, '0')}.</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="reg-card">
              <div className="reg-title">California Regulations Checked</div>
              <div className="reg-list">
                {CA_REGS.map((r) => <span key={r} className="reg-tag">{r}</span>)}
              </div>
            </div>

            <div className="divider" />
            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace", lineHeight: 1.6 }}>
              This tool provides AI-assisted compliance guidance only. Always consult a licensed cannabis attorney<br />
              or DCC compliance specialist before printing and distributing packaging materials.
            </div>
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button className="btn btn-ghost" onClick={resetUpload}>Check Another Label</button>
            </div>
          </div>
        )}
      </main>

      <footer>
        CannaLabel Compliance Checker &nbsp;·&nbsp; For California cannabis operations &nbsp;·&nbsp;
        <a
          href="https://cannabis.ca.gov/licensees/requirements-cannabis-businesses/labeling/"
          target="_blank"
          rel="noreferrer"
        >
          DCC Labeling Rules ↗
        </a>
      </footer>
    </>
  );
}
