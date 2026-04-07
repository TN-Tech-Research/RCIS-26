import { useState, useEffect, useRef } from 'react';
import { ProjectRecord } from '../types';
import { getDepartmentColor } from '../utils/colorMap';
import { parsePeople, Person } from '../utils/nameParser';

interface DetailPanelProps {
  record: ProjectRecord;
  onClose: () => void;
}

// ── Styles (injected once) ────────────────────────────────────────────────────

const PANEL_CSS = `
  @keyframes drawerSlideIn {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  @keyframes drawerSlideOut {
    from { transform: translateX(0); }
    to   { transform: translateX(100%); }
  }
  .dp-enter { animation: drawerSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .dp-exit  { animation: drawerSlideOut 0.22s cubic-bezier(0.4, 0, 0.8, 1) forwards; }

  .dp-scroll::-webkit-scrollbar { width: 4px; }
  .dp-scroll::-webkit-scrollbar-track { background: transparent; }
  .dp-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.13); border-radius: 4px; }

  .dp-close:hover { background: rgba(0,0,0,0.07) !important; color: #111 !important; }
  .dp-close:focus-visible { outline: 2px solid #4b2e83; outline-offset: 2px; }

  .dp-chip { background: none; border: none; padding: 0 2px; margin: 0; cursor: pointer;
    font-family: inherit; font-size: inherit; color: #5b3eab;
    text-decoration: none; border-radius: 3px; transition: background 0.12s; }
  .dp-chip:hover { background: rgba(91,62,171,0.08); }

  .dp-popup-btn { display: block; width: 100%; box-sizing: border-box;
    border-radius: 6px; padding: 7px 12px; font-family: inherit; font-size: 12px;
    font-weight: 500; cursor: pointer; border: 1px solid rgba(0,0,0,0.1);
    transition: background 0.12s; }
`;

let styleInjected = false;
function ensureStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const el = document.createElement('style');
  el.textContent = PANEL_CSS;
  document.head.appendChild(el);
}

// ── Envelope icon ─────────────────────────────────────────────────────────────

function EnvelopeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm2 0 6 4.5L16 5H4zm0 2.5V15h12V7.5l-6 4.5-6-4.5z"/>
    </svg>
  );
}

// ── Person chip ───────────────────────────────────────────────────────────────

interface PopupPos { x: number; y: number }

function PersonChip({ person }: { person: Person }) {
  const [popup, setPopup] = useState<PopupPos | null>(null);

  if (!person.email) {
    return <span style={{ color: '#1a1a2e' }}>{person.displayName}</span>;
  }

  function openPopup(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const estimatedH = 110;
    const y = rect.bottom + 4 + estimatedH > window.innerHeight
      ? rect.top - estimatedH - 4
      : rect.bottom + 4;
    setPopup({ x: rect.left, y });
  }

  async function copyEmail() {
    try { await navigator.clipboard.writeText(person.email!); } catch (_) { /* ignore */ }
    setPopup(null);
  }

  return (
    <>
      <button className="dp-chip" onClick={openPopup} title={`Email: ${person.email}`}>
        {person.displayName}
      </button>

      {popup && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 900 }}
            onClick={() => setPopup(null)}
          />
          <div style={{
            position: 'fixed', left: popup.x, top: popup.y, zIndex: 901,
            background: '#fff', border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
            padding: '12px 14px', minWidth: 224,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111', marginBottom: 4 }}>
              {person.displayName}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 10, fontFamily: 'monospace' }}>
              {person.email}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                className="dp-popup-btn"
                onClick={copyEmail}
                style={{ background: '#f0eeff', color: '#4b2e83' }}
              >
                Copy email address
              </button>
              <a
                href={`mailto:${person.email}`}
                onClick={() => setPopup(null)}
                className="dp-popup-btn"
                style={{
                  background: '#f5f5f7', color: '#333',
                  textDecoration: 'none', textAlign: 'center',
                }}
              >
                Compose email
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Person field ──────────────────────────────────────────────────────────────

function PersonField({ label, raw, emailAll = false }: { label: string; raw: string; emailAll?: boolean }) {
  if (raw === '—') return null;
  const people = parsePeople(raw);
  if (people.length === 0) return null;

  const emails = people.map(p => p.email).filter(Boolean) as string[];
  const mailtoHref = emails.length > 0 ? `mailto:${emails.join(',')}` : null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <span style={LABEL_STYLE}>{label}</span>
        {emailAll && mailtoHref && (
          <a
            href={mailtoHref}
            title={`Email all ${label.toLowerCase()}`}
            style={{ display: 'inline-flex', alignItems: 'center', color: '#5b3eab', opacity: 0.65, textDecoration: 'none', lineHeight: 1, transition: 'opacity 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.65')}
          >
            <EnvelopeIcon />
          </a>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 4px', fontSize: 14, lineHeight: 1.6, color: '#1a1a2e' }}>
        {people.map((p, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <PersonChip person={p} />
            {i < people.length - 1 && <span style={{ color: '#ccc', marginLeft: 2 }}>,</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Plain field ───────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  if (value === '—') return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={LABEL_STYLE}>{label}</div>
      <div style={{ fontSize: 14, color: '#1a1a2e', lineHeight: 1.5, marginTop: 3 }}>{value}</div>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '4px 0 16px' }} />;
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: '#9990b0',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
};

// ── Panel ─────────────────────────────────────────────────────────────────────

export function DetailPanel({ record, onClose }: DetailPanelProps) {
  ensureStyles();

  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const color = getDepartmentColor(record.primaryAuthorDepartment);

  // Reset closing state when record changes
  useEffect(() => { setClosing(false); }, [record]);

  function handleClose() {
    setClosing(true);
  }

  function handleAnimationEnd() {
    if (closing) onClose();
  }

  // Badge: slightly darkened version of the dept hue for text legibility
  const badgeBg = color.bg;
  const badgeText = color.text;

  const BADGE_STYLE: React.CSSProperties = {
    display: 'inline-block',
    padding: '3px 9px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.02em',
    lineHeight: 1.4,
  };

  return (
    <div
      ref={panelRef}
      role="complementary"
      aria-label="Project details"
      className={closing ? 'dp-exit' : 'dp-enter'}
      onAnimationEnd={handleAnimationEnd}
      style={{
        position: 'relative',
        zIndex: 10,
        width: 360,
        minWidth: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid rgba(75,46,131,0.18)',
        borderRadius: '12px 0 0 12px',
        background: 'linear-gradient(160deg, #ede9f8 0%, #e0daf0 60%, #d8d2ec 100%)',
        boxShadow: '-6px 0 32px rgba(45,26,94,0.13)',
        marginTop: 8,
        height: 'calc(100% - 8px)',
        overflow: 'hidden',
        willChange: 'transform',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '16px 18px 14px',
        borderBottom: '1px solid rgba(75,46,131,0.12)',
        flexShrink: 0,
      }}>
        {/* Title row + close */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: record.title !== '—' ? 6 : 0 }}>
          {record.title !== '—' ? (
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#1a1228',
              lineHeight: 1.35,
            }}>
              {record.title}
            </div>
          ) : <div />}
          <button
            className="dp-close"
            onClick={handleClose}
            aria-label="Close detail panel"
            style={{
              background: 'none',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              color: 'rgba(75,46,131,0.5)',
              flexShrink: 0,
              lineHeight: 1,
              marginTop: -2,
              transition: 'background 0.12s, color 0.12s',
            }}
          >
            ×
          </button>
        </div>

        {/* Project type (no label) */}
        {record.projectType !== '—' && (
          <div style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'rgba(45,26,94,0.55)',
            letterSpacing: '0.01em',
            marginBottom: 10,
          }}>
            {record.projectType}
          </div>
        )}

        {/* Dept badge + footer ID */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ ...BADGE_STYLE, background: badgeBg, color: badgeText }}>
            {record.primaryAuthorDepartment}
          </span>
          <span style={{ ...BADGE_STYLE, background: 'rgba(45,26,94,0.1)', color: '#2d1a5e' }}>
            {record.footer}
          </span>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="dp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 24px' }}>
        <PersonField label="Primary Author" raw={record.primaryAuthor} />
        <PersonField label="Project Authors" raw={record.projectAuthors} emailAll />
        <PersonField label="Faculty Advisor" raw={record.facultyAdvisor} />

        <Divider />

        <Field label="Classification" value={record.classification} />

        {record.abstract !== '—' && (
          <>
            <Divider />
            <div>
              <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Abstract</div>
              <div style={{
                fontSize: 13,
                color: '#3a3252',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}>
                {record.abstract}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
