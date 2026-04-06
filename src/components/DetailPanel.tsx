import { useState } from 'react';
import { ProjectRecord } from '../types';
import { getDepartmentColor } from '../utils/colorMap';
import { parsePeople, Person } from '../utils/nameParser';

interface DetailPanelProps {
  record: ProjectRecord;
  onClose: () => void;
}

// ── Person chip with copy/compose popup ─────────────────────────────────────

interface PopupPos { x: number; y: number }

function PersonChip({ person }: { person: Person }) {
  const [popup, setPopup] = useState<PopupPos | null>(null);

  if (!person.email) {
    return <span style={{ color: '#222' }}>{person.displayName}</span>;
  }

  function openPopup(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Prefer below the button; if near bottom of viewport, flip above
    const estimatedH = 80;
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
      <button
        onClick={openPopup}
        title={`Email: ${person.email}`}
        style={{
          background: 'none',
          border: 'none',
          padding: '1px 3px',
          margin: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          color: '#0057b7',
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textUnderlineOffset: 2,
          borderRadius: 3,
        }}
      >
        {person.displayName}
      </button>

      {popup && (
        <>
          {/* Backdrop to dismiss */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 900 }}
            onClick={() => setPopup(null)}
          />
          {/* Popup card */}
          <div
            style={{
              position: 'fixed',
              left: popup.x,
              top: popup.y,
              zIndex: 901,
              background: '#fff',
              border: '1px solid #d0d0d8',
              borderRadius: 8,
              boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
              padding: '10px 12px',
              minWidth: 220,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 8 }}>
              {person.displayName}
            </div>
            <div style={{ fontSize: 11, color: '#777', marginBottom: 10, fontFamily: 'monospace' }}>
              {person.email}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={copyEmail}
                style={popupBtnStyle('#f0f4ff', '#0057b7')}
              >
                Copy email address
              </button>
              <a
                href={`mailto:${person.email}`}
                onClick={() => setPopup(null)}
                style={{
                  ...popupBtnStyle('#f5f5f5', '#333'),
                  textDecoration: 'none',
                  textAlign: 'center',
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

function popupBtnStyle(bg: string, color: string): React.CSSProperties {
  return {
    background: bg,
    border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: 5,
    padding: '6px 12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12,
    color,
    fontWeight: 500,
    display: 'block',
    width: '100%',
  };
}

// ── Person field ─────────────────────────────────────────────────────────────

function PersonField({ label, raw }: { label: string; raw: string }) {
  if (raw === '—') return null;
  const people = parsePeople(raw);
  if (people.length === 0) return null;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 6px', fontSize: 14, lineHeight: 1.6 }}>
        {people.map((p, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <PersonChip person={p} />
            {i < people.length - 1 && (
              <span style={{ color: '#bbb', marginLeft: 2 }}>,</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Plain text field ──────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  if (value === '—') return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 14, color: '#222', lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 3,
};

// ── Panel ────────────────────────────────────────────────────────────────────

export function DetailPanel({ record, onClose }: DetailPanelProps) {
  const color = getDepartmentColor(record.primaryAuthorDepartment);

  return (
    <div
      role="complementary"
      aria-label="Project details"
      style={{
        width: 340,
        minWidth: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid #d0d0d8',
        background: '#fafafa',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: color.bg,
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: color.text, lineHeight: 1, marginBottom: 4 }}>
            {record.footer}
          </div>
          <div style={{ fontSize: 12, color: color.text, opacity: 0.8 }}>
            {record.primaryAuthorDepartment}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          style={{
            background: 'rgba(0,0,0,0.15)',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: color.text,
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <Field label="Title" value={record.title} />
        <PersonField label="Primary Author" raw={record.primaryAuthor} />
        <PersonField label="Project Authors" raw={record.projectAuthors} />
        <Field label="Classification" value={record.classification} />
        <PersonField label="Faculty Advisor" raw={record.facultyAdvisor} />
        <Field label="Project Type" value={record.projectType} />

        {record.abstract !== '—' && (
          <div style={{ marginTop: 4 }}>
            <div style={labelStyle}>Abstract</div>
            <div style={{ fontSize: 13, color: '#333', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
              {record.abstract}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
