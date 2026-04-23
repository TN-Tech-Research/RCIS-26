import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ProjectRecord } from '../types';
import { parsePeople } from '../utils/nameParser';
import { useAdmin } from '../contexts/AdminContext';
import type { ProjectFeedback, JudgeEntry, CategoryFeedback } from '../utils/scorecardParser';
import particleIconUrl from '../assets/particle-icon.svg';
import bubblePUrl from '../assets/bubble_p.svg';
import bubbleYUrl from '../assets/bubble_y.svg';
import bubbleIconUrl from '../assets/bubble_icon.svg';
import feedbackIconUrl from '../assets/feedback_icon.svg';

const FONT = "'Nohemi', system-ui, -apple-system, sans-serif";

// ── Styles ────────────────────────────────────────────────────────────────────

const CSS = `
  @keyframes fbSlideUp {
    from { opacity: 0; transform: translateY(18px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .fb-modal { animation: fbSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .fb-tab { transition: background 0.14s, color 0.14s, border-color 0.14s; }
  .fb-tab:hover:not(.fb-tab-active) { background: rgba(75,46,131,0.08) !important; }
  .fb-close:hover { background: rgba(0,0,0,0.07) !important; }
  .fb-score-card { scrollbar-width: none; }
  .fb-score-card::-webkit-scrollbar { display: none; }
  .fb-netid-input:focus { outline: none; border-color: #4b2e83 !important; box-shadow: 0 0 0 3px rgba(75,46,131,0.14); }
  .particle-bulb {
    position: relative;
    width: 14px; height: 14px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .particle-bulb-empty img { filter: brightness(0) opacity(0.12); }
  @keyframes bulbGlow {
    0%,  100% { background: rgba(255,215,100,0.22); box-shadow: 0 0 5px 2px rgba(255,215,100,0.52); }
    50%       { background: rgba(255,215,100,0.42); box-shadow: 0 0 9px 4px rgba(255,215,100,0.82); }
  }
  .particle-bulb-filled::before {
    content: '';
    position: absolute;
    width: 10px; height: 10px;
    border-radius: 50%;
    top: -1px;
    left: 50%;
    transform: translateX(-50%);
    animation: bulbGlow 1.8s ease-in-out infinite;
    pointer-events: none;
  }
`;

let styleInjected = false;
function ensureStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
}

// ── Particle icon rating ──────────────────────────────────────────────────────

function ParticleRating({ score, maxScore }: { score: number; maxScore: 3 | 5 }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: maxScore }, (_, i) => (
        <div
          key={i}
          className={`particle-bulb ${i < score ? 'particle-bulb-filled' : 'particle-bulb-empty'}`}
        >
          <img src={particleIconUrl} width={14} height={14} alt="" style={{ display: 'block' }} />
        </div>
      ))}
    </div>
  );
}

// ── Score item row ────────────────────────────────────────────────────────────

function ScoreRow({ label, score, maxScore }: { label: string; score: number; maxScore: 3 | 5 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: '#3a3252', lineHeight: 1.3, flex: 1 }}>{label}</span>
      <ParticleRating score={score} maxScore={maxScore} />
    </div>
  );
}

// ── Category section ─────────────────────────────────────────────────────────

function CategorySection({ title, data, accentColor }: {
  title: string;
  data: CategoryFeedback;
  accentColor: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: accentColor,
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 700, color: accentColor,
          background: `${accentColor}18`, borderRadius: 10,
          padding: '2px 8px',
        }}>
          {data.total}
        </span>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 8, padding: '8px 10px' }}>
        {data.items.map((item, i) => (
          <ScoreRow key={i} label={item.label} score={item.score} maxScore={item.maxScore} />
        ))}
      </div>

      {data.comment ? (
        <div style={{
          marginTop: 7,
          fontSize: 12,
          color: '#5a4a7a',
          fontStyle: 'italic',
          lineHeight: 1.55,
          padding: '6px 10px',
          background: 'rgba(255,255,255,0.4)',
          borderRadius: 6,
          borderLeft: `2px solid ${accentColor}60`,
        }}>
          {data.comment}
        </div>
      ) : null}
    </div>
  );
}

// ── Judge card ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<JudgeEntry['type'], string> = {
  research:     'Research Project',
  lit_review:   'Literature Review',
  ai_assisted:  'AI-Assisted Project',
};

function JudgeCard({ judge, judgeNum }: { judge: JudgeEntry; judgeNum: 1 | 2 }) {
  const isPrimary = judgeNum === 1;
  const bubbleSrc = isPrimary ? bubblePUrl : bubbleYUrl;
  const accentApp  = '#4b2e83';
  const accentCont = '#2e6b83';
  const accentAI   = '#b07c2e';

  return (
    <div
      className="fb-score-card"
      style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 20px', overscrollBehavior: 'contain' }}
    >
      {/* Judge header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <img src={bubbleSrc} width={32} height={32} alt="" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1228' }}>Judge {judgeNum}</div>
          <div style={{ fontSize: 10.5, color: '#9990b0' }}>{TYPE_LABELS[judge.type]}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#9990b0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Total</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1228', lineHeight: 1.1 }}>{judge.total}</div>
        </div>
      </div>

      <CategorySection title="Appearance" data={judge.appearance} accentColor={accentApp} />
      <CategorySection title="Content"    data={judge.content}    accentColor={accentCont} />

      {judge.ai && (
        <CategorySection title="AI Usage" data={judge.ai} accentColor={accentAI} />
      )}
    </div>
  );
}

// ── NetID Gate ────────────────────────────────────────────────────────────────

function extractNetIDs(record: ProjectRecord): Set<string> {
  const ids = new Set<string>();
  const people = [
    ...parsePeople(record.primaryAuthor),
    ...parsePeople(record.projectAuthors),
  ];
  for (const p of people) {
    if (p.email) {
      const prefix = p.email.split('@')[0];
      if (prefix) ids.add(prefix.toLowerCase());
    }
  }
  return ids;
}

function NetIDGate({ record, onSuccess, onCancel }: {
  record: ProjectRecord;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const validIDs = extractNetIDs(record);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = value.trim().toLowerCase();
    if (validIDs.has(input)) {
      onSuccess();
    } else {
      setError('netID not recognized for this project. Please check and try again.');
    }
  }

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,9,35,0.55)', backdropFilter: 'blur(2px)' }}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Enter netID to view feedback"
        className="fb-modal"
        style={{
          position: 'fixed',
          zIndex: 301,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(360px, calc(100vw - 32px))',
          background: 'linear-gradient(155deg, #ede9f8 0%, #e0daf0 100%)',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(15,9,35,0.35)',
          overflow: 'hidden',
          fontFamily: FONT,
        }}
      >
        {/* Header bar */}
        <div style={{
          background: 'linear-gradient(135deg, #251558 0%, #4b2e83 55%, #5d3b9a 100%)',
          padding: '14px 18px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <img src={bubbleIconUrl} width={30} height={30} alt="" />
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '0.01em', marginLeft: 2 }}>
            View Your Feedback
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="fb-close"
            style={{
              marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 18,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 20px 24px' }}>
          <p style={{ fontSize: 13, color: '#3a3252', margin: '0 0 16px', lineHeight: 1.55 }}>
            Enter your <strong>netID</strong> to access judge scores for <em>{record.footer}</em>.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="fb-netid-input"
              placeholder="e.g. awesomeeagle42"
              value={value}
              onChange={e => { setValue(e.target.value); setError(''); }}
              autoFocus
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%', boxSizing: 'border-box',
                height: 40, padding: '0 12px',
                borderRadius: 8, border: error ? '1.5px solid #c0392b' : '1.5px solid rgba(75,46,131,0.28)',
                background: 'rgba(255,255,255,0.7)',
                fontSize: 14, fontFamily: 'inherit',
                color: '#1a1228',
                transition: 'border-color 0.15s',
                marginBottom: 6,
              }}
            />

            {error && (
              <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 8, lineHeight: 1.4 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%', height: 40,
                background: 'linear-gradient(135deg, #ffd764 0%, #f0b429 100%)',
                color: '#251558', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', marginTop: 6,
              }}
            >
              View Feedback
            </button>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Main FeedbackModal ────────────────────────────────────────────────────────

interface FeedbackModalProps {
  record: ProjectRecord;
  feedback: ProjectFeedback;
  onClose: () => void;
  isMobile: boolean;
}

export function FeedbackModal({ record, feedback, onClose, isMobile }: FeedbackModalProps) {
  ensureStyles();

  const isAdmin = useAdmin();
  const [authed, setAuthed] = useState(false);
  const [activeJudge, setActiveJudge] = useState<0 | 1>(0);

  const judges = feedback.judges;
  const hasTwo = judges.length >= 2;

  // Admins skip the netID gate; students must authenticate
  if (!authed && !isAdmin) {
    return <NetIDGate record={record} onSuccess={() => setAuthed(true)} onCancel={onClose} />;
  }

  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(160deg, #ede9f8 0%, #e0daf0 60%, #d8d2ec 100%)',
      }
    : {
        // Fills the DetailPanel container absolutely, overlaying it
        position: 'absolute', inset: 0, zIndex: 20,
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(160deg, #ede9f8 0%, #e0daf0 60%, #d8d2ec 100%)',
      };

  return (
    <div style={containerStyle} role="complementary" aria-label="Judge feedback">
      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #251558 0%, #4b2e83 55%, #5d3b9a 100%)',
        padding: '12px 14px 10px',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <img src={bubbleIconUrl} width={28} height={28} alt="" />
        <div style={{ flex: 1, marginLeft: 2 }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>
            Judge Feedback
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
            {record.footer}
          </div>
        </div>
        <button
          onClick={onClose}
          className="fb-close"
          aria-label="Close feedback"
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6,
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 18, flexShrink: 0,
          }}
        >×</button>
      </div>

      {/* ── Judge tabs (if 2 judges) ── */}
      {hasTwo && (
        <div style={{
          display: 'flex', borderBottom: '1px solid rgba(75,46,131,0.14)',
          background: 'rgba(255,255,255,0.2)', flexShrink: 0,
        }}>
          {([0, 1] as const).map(idx => (
            <button
              key={idx}
              className={`fb-tab${activeJudge === idx ? ' fb-tab-active' : ''}`}
              onClick={() => setActiveJudge(idx)}
              style={{
                flex: 1, height: 38, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                background: activeJudge === idx ? 'rgba(75,46,131,0.12)' : 'transparent',
                color: activeJudge === idx ? '#4b2e83' : '#9990b0',
                borderBottom: activeJudge === idx ? '2px solid #4b2e83' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <img
                src={idx === 0 ? bubblePUrl : bubbleYUrl}
                width={16} height={16} alt=""
              />
              Judge {idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* ── Score content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {hasTwo ? (
          <JudgeCard key={activeJudge} judge={judges[activeJudge]} judgeNum={(activeJudge + 1) as 1 | 2} />
        ) : (
          <JudgeCard judge={judges[0]} judgeNum={1} />
        )}
      </div>

      {/* Mobile safe-area spacer */}
      {isMobile && <div style={{ height: 'env(safe-area-inset-bottom)', minHeight: 8, flexShrink: 0 }} />}
    </div>
  );
}
