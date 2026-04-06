import { useMemo, useState } from 'react';
import { ProjectRecord } from '../types';
import { parsePeople } from '../utils/nameParser';
import { getDepartmentColor } from '../utils/colorMap';

interface MobileViewProps {
  records: ProjectRecord[];
  logoSrc: string;
}

interface ListItemProps {
  record: ProjectRecord;
  isExpanded: boolean;
  onToggle: () => void;
}

function MobileListItem({ record, isExpanded, onToggle }: ListItemProps) {
  const color = getDepartmentColor(record.primaryAuthorDepartment);
  const primaryAuthor = parsePeople(record.primaryAuthor)[0]?.displayName ?? '—';
  const allAuthors = [
    ...parsePeople(record.primaryAuthor),
    ...parsePeople(record.projectAuthors),
  ];
  const uniqueAuthors = Array.from(new Map(allAuthors.map(p => [p.displayName, p])).values());

  return (
    <div
      className="mobile-list-item"
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={onToggle}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid #e8e8ec',
        cursor: 'pointer',
        userSelect: 'none',
        background: isExpanded ? '#f7f7fb' : '#fff',
      }}
    >
      {/* Collapsed row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: color.bg,
            flexShrink: 0,
            border: '1px solid rgba(0,0,0,0.15)',
          }}
        />
        <span style={{
          fontFamily: 'monospace',
          fontWeight: 700,
          fontSize: 12,
          flexShrink: 0,
          color: '#444',
        }}>
          {record.footer}
        </span>
        <span style={{
          fontSize: 13,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: '#111',
        }}>
          {record.title !== '—' ? record.title : '(no title)'}
        </span>
        <span style={{
          fontSize: 11,
          color: '#888',
          flexShrink: 0,
          maxWidth: 110,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {primaryAuthor}
        </span>
        <span aria-hidden="true" style={{ flexShrink: 0, color: '#aaa', fontSize: 12 }}>
          {isExpanded ? '▾' : '▸'}
        </span>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          paddingLeft: 13,
          borderTop: '1px solid rgba(0,0,0,0.08)',
          borderLeft: `3px solid ${color.bg}`,
        }}>
          {/* Department */}
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#777',
            marginBottom: 6,
          }}>
            {record.primaryAuthorDepartment !== '—' ? record.primaryAuthorDepartment : 'Unknown Department'}
          </div>

          {/* Full title */}
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 8, lineHeight: 1.4 }}>
            {record.title !== '—' ? record.title : '(no title)'}
          </div>

          {/* Authors */}
          {uniqueAuthors.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Authors:{' '}
              </span>
              <span style={{ fontSize: 13, color: '#333' }}>
                {uniqueAuthors.map(p => p.displayName).join(', ')}
              </span>
            </div>
          )}

          {/* Faculty advisor */}
          {record.facultyAdvisor !== '—' && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Advisor:{' '}
              </span>
              <span style={{ fontSize: 13, color: '#333' }}>
                {parsePeople(record.facultyAdvisor).map(p => p.displayName).join(', ') || record.facultyAdvisor}
              </span>
            </div>
          )}

          {/* Classification + type */}
          {(record.classification !== '—' || record.projectType !== '—') && (
            <div style={{ marginBottom: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {record.classification !== '—' && (
                <span style={{ fontSize: 12, color: '#666' }}>{record.classification}</span>
              )}
              {record.projectType !== '—' && (
                <span style={{ fontSize: 12, color: '#666' }}>• {record.projectType}</span>
              )}
            </div>
          )}

          {/* Abstract */}
          {record.abstract !== '—' && (
            <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5, marginTop: 6 }}>
              {record.abstract}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MobileView({ records, logoSrc }: MobileViewProps) {
  const [mobileSearch, setMobileSearch] = useState('');
  const [expandedFooter, setExpandedFooter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = mobileSearch.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => {
      if (r.title !== '—' && r.title.toLowerCase().includes(q)) return true;
      const people = [...parsePeople(r.primaryAuthor), ...parsePeople(r.projectAuthors)];
      return people.some(p => p.displayName.toLowerCase().includes(q));
    });
  }, [records, mobileSearch]);

  function handleToggle(footer: string) {
    setExpandedFooter(prev => prev === footer ? null : footer);
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#fff',
    }}>
      <style>{`
        #mobile-search::placeholder { color: rgba(255,255,255,0.55); }
        #mobile-search::-webkit-search-cancel-button { cursor: pointer; }
        .mobile-list-item:active { background: #f0f0f5 !important; }
      `}</style>

      {/* Header */}
      <header style={{
        height: 56,
        padding: '0 12px',
        background: '#4b2e83',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <img
          src={logoSrc}
          alt="Research and Creative Inquiry Symposium"
          style={{ height: 40, width: 'auto', display: 'block', flexShrink: 0 }}
        />
        <input
          id="mobile-search"
          type="search"
          placeholder="Search projects or authors…"
          value={mobileSearch}
          onChange={e => setMobileSearch(e.target.value)}
          style={{
            flex: 1,
            height: 34,
            paddingLeft: 10,
            paddingRight: 10,
            borderRadius: 8,
            border: 'none',
            background: 'rgba(255,255,255,0.18)',
            color: '#fff',
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </header>

      {/* Result count */}
      <div style={{
        padding: '6px 16px',
        fontSize: 12,
        color: '#888',
        borderBottom: '1px solid #e0e0e8',
        flexShrink: 0,
      }}>
        {filtered.length === records.length
          ? `${records.length} projects`
          : `${filtered.length} of ${records.length} projects`}
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {filtered.map(record => (
          <MobileListItem
            key={record.footer}
            record={record}
            isExpanded={expandedFooter === record.footer}
            onToggle={() => handleToggle(record.footer)}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#999', fontSize: 14 }}>
            No projects match your search.
          </div>
        )}
      </div>
    </div>
  );
}
