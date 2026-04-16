import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ProjectRecord } from '../types';
import { getDepartmentColor } from '../utils/colorMap';
import { parsePeople, Person } from '../utils/nameParser';
import { useAdmin } from '../contexts/AdminContext';
import { useMobile } from '../hooks/useMobile';

interface DetailPanelProps {
  record: ProjectRecord;
  onClose: () => void;
  /** Mobile only: called when user taps "View on Map" inside the panel */
  onViewOnMap?: () => void;
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

  @keyframes drawerSlideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes drawerSlideDown {
    from { transform: translateY(0); }
    to   { transform: translateY(100%); }
  }
  .dp-mobile-enter { animation: drawerSlideUp 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .dp-mobile-exit  { animation: drawerSlideDown 0.2s cubic-bezier(0.4, 0, 1, 1) forwards; }

  .dp-map-btn:active { opacity: 0.72 !important; }

  .dp-scroll { -ms-overflow-style: none; scrollbar-width: none; }
  .dp-scroll::-webkit-scrollbar { display: none; }

  .dp-close:hover { background: rgba(0,0,0,0.07) !important; color: #111 !important; }
  .dp-close:focus-visible { outline: 2px solid #4b2e83; outline-offset: 2px; }

  .dp-chip { background: none; border: none; padding: 0 2px; margin: 0; cursor: pointer;
    font-family: inherit; font-size: inherit; color: #5b3eab;
    text-decoration: none; border-radius: 3px; transition: background 0.12s; }
  .dp-chip:hover { background: rgba(91,62,171,0.08); }

  .dp-popup-btn { display: block; width: 100%; box-sizing: border-box;
    border-radius: 6px; padding: 7px 12px; font-family: 'Nohemi', system-ui, -apple-system, sans-serif; font-size: 12px;
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
  const isAdmin = useAdmin();

  if (!person.email || !isAdmin) {
    return <span style={{ color: '#1a1a2e' }}>{person.displayName}</span>;
  }

  function openPopup(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuH = 96;
    const y = rect.bottom + 4 + menuH > window.innerHeight
      ? rect.top - menuH - 4
      : rect.bottom + 4;
    setPopup({ x: rect.left, y });
  }

  async function copyEmail() {
    try { await navigator.clipboard.writeText(person.email!); } catch (_) { /* ignore */ }
    setPopup(null);
  }

  const menu = popup && createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9000 }}
        onClick={() => setPopup(null)}
      />
      <div style={{
        position: 'fixed', left: popup.x, top: popup.y, zIndex: 9001,
        background: '#fff', border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        padding: '6px', minWidth: 180,
      }}>
        <button
          className="dp-popup-btn"
          onClick={copyEmail}
          style={{ background: 'none', color: '#1a1a2e', border: 'none',
            textAlign: 'left', borderRadius: 6, marginBottom: 2 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f0eeff')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          Copy
        </button>
        <a
          href={`mailto:${person.email}`}
          onClick={() => setPopup(null)}
          className="dp-popup-btn"
          style={{ background: 'none', color: '#1a1a2e', border: 'none',
            textDecoration: 'none', display: 'block', borderRadius: 6 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f0eeff')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          Compose Message
        </a>
      </div>
    </>,
    document.body
  );

  return (
    <>
      <button className="dp-chip" onClick={openPopup} title={`Email: ${person.email}`}>
        {person.displayName}
      </button>
      {menu}
    </>
  );
}

// ── Person field ──────────────────────────────────────────────────────────────

function PersonField({ label, raw, emailAll = false }: { label: string; raw: string; emailAll?: boolean }) {
  const isAdmin = useAdmin();
  if (raw === '—') return null;
  const people = parsePeople(raw);
  if (people.length === 0) return null;

  const emails = people.map(p => p.email).filter(Boolean) as string[];
  const mailtoHref = emails.length > 0 ? `mailto:${emails.join(',')}` : null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <span style={LABEL_STYLE}>{label}</span>
        {isAdmin && emailAll && mailtoHref && (
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

export function DetailPanel({ record, onClose, onViewOnMap }: DetailPanelProps) {
  ensureStyles();

  const isMobile = useMobile();
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

  const enterClass = isMobile ? 'dp-mobile-enter' : 'dp-enter';
  const exitClass  = isMobile ? 'dp-mobile-exit'  : 'dp-exit';

  const desktopContainerStyle: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 0,
    zIndex: 10,
    width: 360,
    minWidth: 300,
    borderLeft: '1px solid rgba(75,46,131,0.18)',
    borderRadius: '12px 0 0 12px',
    boxShadow: '-6px 0 32px rgba(45,26,94,0.13)',
  };

  const mobileContainerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 50,
    width: '100%',
    minWidth: 'unset',
    borderLeft: 'none',
    borderRadius: 0,
    boxShadow: '0 -8px 32px rgba(45,26,94,0.2)',
  };

  return (
    <div
      id="detail-panel-root"
      ref={panelRef}
      role="complementary"
      aria-label="Project details"
      className={closing ? exitClass : enterClass}
      onAnimationEnd={handleAnimationEnd}
      style={{
        ...(isMobile ? mobileContainerStyle : desktopContainerStyle),
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(160deg, #ede9f8 0%, #e0daf0 60%, #d8d2ec 100%)',
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

        {/* Dept badge + footer ID + mobile View on Map */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ ...BADGE_STYLE, background: badgeBg, color: badgeText }}>
            {record.primaryAuthorDepartment}
          </span>
          <span style={{ ...BADGE_STYLE, background: 'rgba(45,26,94,0.1)', color: '#2d1a5e' }}>
            {record.footer}
          </span>
          {isMobile && onViewOnMap && (
            <button
              className="dp-map-btn"
              onClick={onViewOnMap}
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                height: 28,
                padding: '0 10px',
                borderRadius: 20,
                border: '1px solid rgba(75,46,131,0.28)',
                background: 'rgba(75,46,131,0.08)',
                color: '#4b2e83',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              View on Map
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="dp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 24px', overscrollBehavior: 'contain' }}>
        <PersonField label="Primary Author" raw={record.primaryAuthor} />
        <PersonField label="Project Authors" raw={record.projectAuthors} emailAll />
        <PersonField label="Faculty Advisor" raw={record.facultyAdvisor} />

        <Divider />

        <Field label="Classification" value={record.classification} />

        {record.abstract !== '—' && record.publicationConsent !== 'No' && (
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

        {/* Safe-area bottom padding on mobile */}
        {isMobile && <div style={{ height: 'env(safe-area-inset-bottom)', minHeight: 12 }} />}
      </div>
    </div>
  );
}
