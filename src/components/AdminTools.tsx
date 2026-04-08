import { useMemo, useState } from 'react';
import { ProjectRecord } from '../types';
import { parsePeople } from '../utils/nameParser';

interface AdminToolsProps {
  filteredRecords: ProjectRecord[];
  allRecords: ProjectRecord[];
  hasActiveFilters: boolean;
  onExit: () => void;
}

function collectEmails(records: ProjectRecord[]): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const r of records) {
    const people = [
      ...parsePeople(r.primaryAuthor),
      ...parsePeople(r.projectAuthors),
    ];
    for (const p of people) {
      if (p.email && !seen.has(p.email)) {
        seen.add(p.email);
        emails.push(p.email);
      }
    }
  }
  return emails;
}

export function AdminTools({ filteredRecords, allRecords, hasActiveFilters, onExit }: AdminToolsProps) {
  const [copied, setCopied] = useState(false);

  const emails = useMemo(() => collectEmails(filteredRecords), [filteredRecords]);

  const stats = useMemo(() => {
    const byType = new Map<string, number>();
    const byClass = new Map<string, number>();
    const byDept = new Map<string, number>();
    let irbCount = 0;
    let iacucCount = 0;
    let aiCount = 0;
    let pubCount = 0;

    for (const r of filteredRecords) {
      if (r.projectType && r.projectType !== '—')
        byType.set(r.projectType, (byType.get(r.projectType) ?? 0) + 1);
      if (r.classification && r.classification !== '—')
        byClass.set(r.classification, (byClass.get(r.classification) ?? 0) + 1);
      if (r.primaryAuthorDepartment && r.primaryAuthorDepartment !== '—')
        byDept.set(r.primaryAuthorDepartment, (byDept.get(r.primaryAuthorDepartment) ?? 0) + 1);
      if (r.irbNumber) irbCount++;
      if (r.iacucNo) iacucCount++;
      if (r.useOfAI === 'Yes') aiCount++;
      if (r.publicationConsent === 'Yes') pubCount++;
    }

    return {
      byType: Array.from(byType.entries()).sort((a, b) => b[1] - a[1]),
      byClass: Array.from(byClass.entries()).sort((a, b) => b[1] - a[1]),
      byDept: Array.from(byDept.entries()).sort((a, b) => b[1] - a[1]),
      irbCount,
      iacucCount,
      aiCount,
      pubCount,
    };
  }, [filteredRecords]);

  async function copyEmails() {
    try {
      await navigator.clipboard.writeText(emails.join('; '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) { /* ignore */ }
  }

  const mailtoHref = emails.length > 0 && emails.length <= 50
    ? `mailto:${emails.join(',')}`
    : null;

  const viewLabel = hasActiveFilters
    ? `${filteredRecords.length} of ${allRecords.length} projects`
    : `${allRecords.length} projects (all)`;

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        width: '100%',
        maxWidth: 760,
        background: '#fff',
        borderRadius: '0 0 14px 14px',
        boxShadow: '0 12px 48px rgba(20,8,60,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid rgba(75,46,131,0.1)',
        borderTop: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        background: 'linear-gradient(135deg, #251558 0%, #4b2e83 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Admin Tools
          </span>
          <span style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.55)',
            background: 'rgba(255,255,255,0.1)',
            padding: '2px 8px',
            borderRadius: 10,
          }}>
            {viewLabel}
          </span>
        </div>
        <button
          onClick={onExit}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            color: 'rgba(255,255,255,0.8)',
            fontSize: 11.5,
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: '4px 12px',
            fontWeight: 500,
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
        >
          Exit Admin Mode
        </button>
      </div>

      <div style={{ display: 'flex', gap: 0 }}>
        {/* Email tools column */}
        <div style={{ flex: 1, padding: '16px 18px', borderRight: '1px solid #ede9f6' }}>
          <SectionLabel>Mass Email</SectionLabel>
          {emails.length === 0 ? (
            <div style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>
              No email addresses in current view.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#555' }}>
                <strong style={{ color: '#333' }}>{emails.length}</strong> unique author email{emails.length !== 1 ? 's' : ''} in current view
              </div>

              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                <button
                  onClick={copyEmails}
                  style={{
                    padding: '6px 13px',
                    borderRadius: 7,
                    border: '1.5px solid #4b2e83',
                    background: copied ? '#e8f5e9' : '#f0eeff',
                    color: copied ? '#2e7d32' : '#4b2e83',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {copied ? '✓ Copied!' : 'Copy all emails'}
                </button>
                {mailtoHref && (
                  <a
                    href={mailtoHref}
                    style={{
                      padding: '6px 13px',
                      borderRadius: 7,
                      border: '1.5px solid #ddd',
                      background: '#fafafe',
                      color: '#444',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                  >
                    Open in mail client
                  </a>
                )}
              </div>

              {emails.length > 50 && (
                <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>
                  "Open in mail client" disabled for large lists — use Copy instead.
                </div>
              )}

              <textarea
                readOnly
                value={emails.join(';\n')}
                rows={4}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                  fontSize: 10.5,
                  color: '#555',
                  border: '1px solid #e0daea',
                  borderRadius: 6,
                  padding: '6px 8px',
                  resize: 'vertical',
                  background: '#faf8ff',
                  lineHeight: 1.6,
                }}
              />
            </div>
          )}
        </div>

        {/* Stats column */}
        <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <SectionLabel>Flags</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <StatPill label="IRB" count={stats.irbCount} total={filteredRecords.length} color="#2563eb" />
              <StatPill label="IACUC" count={stats.iacucCount} total={filteredRecords.length} color="#9a3b12" />
              <StatPill label="AI Use" count={stats.aiCount} total={filteredRecords.length} color="#c47b00" />
              <StatPill label="Pub. Consent" count={stats.pubCount} total={filteredRecords.length} color="#16a34a" />
            </div>
          </div>

          <div>
            <SectionLabel>By Project Type</SectionLabel>
            <BarList items={stats.byType} total={filteredRecords.length} />
          </div>

          <div>
            <SectionLabel>By Classification</SectionLabel>
            <BarList items={stats.byClass} total={filteredRecords.length} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10.5,
      fontWeight: 700,
      color: '#aaa',
      textTransform: 'uppercase',
      letterSpacing: '0.09em',
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function StatPill({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{
      padding: '4px 10px',
      borderRadius: 20,
      background: `${color}12`,
      border: `1.5px solid ${color}44`,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11.5,
    }}>
      <span style={{ fontWeight: 700, color }}>{count}</span>
      <span style={{ color: '#777' }}>{label}</span>
      <span style={{ color: '#bbb', fontSize: 10 }}>({pct}%)</span>
    </div>
  );
}

function BarList({ items, total }: { items: [string, number][]; total: number }) {
  if (items.length === 0) return <div style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>—</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map(([label, count]) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 90, fontSize: 11, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
              {label}
            </div>
            <div style={{ flex: 1, height: 6, background: '#ede9f6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#4b2e83', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#888', width: 24, textAlign: 'right', flexShrink: 0 }}>
              {count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
