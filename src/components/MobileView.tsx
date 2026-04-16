import { useMemo, useState, useRef, useEffect } from 'react';
import { ProjectRecord, FilterState, DEFAULT_FILTERS } from '../types';
import { parsePeople } from '../utils/nameParser';
import { getDepartmentColor, DeptStat } from '../utils/colorMap';
import { FilterMenu, FilterTab } from './FilterMenu';
import { DetailPanel } from './DetailPanel';
import { TableMap } from './TableMap';
import {
  buildLayout, rowYPositions, blockX, blockY, numRows,
  BLOCK_W, BLOCK_H,
} from '../utils/layoutEngine';

// ─── Types ─────────────────────────────────────────────────────────────────────

type SearchScope = 'all' | 'author' | 'advisor';

interface MobileViewProps {
  records: ProjectRecord[];
  filteredRecords: ProjectRecord[];
  logoSrc: string;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  deptStats: DeptStat[];
  authorInput: string;
  authorFilter: string;
  onAuthorInput: (v: string) => void;
  onClearAuthor: () => void;
  advisorInput: string;
  advisorFilter: string;
  onAdvisorInput: (v: string) => void;
  onClearAdvisor: () => void;
  authorNames: string[];
  advisorNames: string[];
  selectedRecord: ProjectRecord | null;
  onSelect: (r: ProjectRecord) => void;
  onClearSelected: () => void;
}

// ─── MobileListItem ─────────────────────────────────────────────────────────────

interface ListItemProps {
  record: ProjectRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: () => void;
  onViewOnMap: () => void;
}

const PIN_ICON = (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
  </svg>
);

const BADGE_STYLE: React.CSSProperties = {
  display: 'inline-block',
  padding: '3px 9px',
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.02em',
  lineHeight: 1.4,
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: '#9990b0',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
};

function MobileListItem({ record, isExpanded, onToggle, onViewDetails, onViewOnMap }: ListItemProps) {
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
      style={{ borderBottom: '1px solid #e8e8ec' }}
    >
      {/* Collapsed header row — always tappable */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          userSelect: 'none',
          background: isExpanded ? '#f0ecf9' : '#fff',
          transition: 'background 0.18s ease',
        }}
      >
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
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, flexShrink: 0, color: '#444' }}>
          {record.footer}
        </span>
        <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#111' }}>
          {record.title !== '—' ? record.title : '(no title)'}
        </span>
        <span style={{ fontSize: 11, color: '#888', flexShrink: 0, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {primaryAuthor}
        </span>
        {/* Chevron — rotates smoothly on expand/collapse */}
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            color: '#aaa',
            fontSize: 12,
            display: 'inline-block',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          ▸
        </span>
      </div>

      {/* Expanded detail — animated max-height accordion */}
      <div style={{
        overflow: 'hidden',
        maxHeight: isExpanded ? 480 : 0,
        transition: isExpanded
          ? 'max-height 0.32s cubic-bezier(0.16,1,0.3,1)'
          : 'max-height 0.22s cubic-bezier(0.4,0,1,1)',
      }}>
        <div style={{
          padding: '14px 16px 16px',
          background: 'linear-gradient(160deg, #ede9f8 0%, #e0daf0 60%, #d8d2ec 100%)',
          borderTop: '1px solid rgba(75,46,131,0.12)',
        }}>
          {/* Dept badge + footer badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ ...BADGE_STYLE, background: color.bg, color: color.text }}>
              {record.primaryAuthorDepartment !== '—' ? record.primaryAuthorDepartment : 'Unknown'}
            </span>
            <span style={{ ...BADGE_STYLE, background: 'rgba(45,26,94,0.1)', color: '#2d1a5e' }}>
              {record.footer}
            </span>
          </div>

          {/* Title */}
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1228', lineHeight: 1.35, marginBottom: 4 }}>
            {record.title !== '—' ? record.title : '(no title)'}
          </div>

          {/* Project type */}
          {record.projectType !== '—' && (
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(45,26,94,0.55)', marginBottom: 10 }}>
              {record.projectType}
            </div>
          )}

          {/* Authors (primary + co-authors) */}
          {uniqueAuthors.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={LABEL_STYLE}>Authors</div>
              <div style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.5, marginTop: 3 }}>
                {uniqueAuthors.map(p => p.displayName).join(', ')}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              className="mobile-action-btn"
              onClick={e => { e.stopPropagation(); onViewOnMap(); }}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 8,
                border: '1px solid rgba(75,46,131,0.3)',
                background: 'rgba(75,46,131,0.09)',
                color: '#4b2e83',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                fontFamily: 'inherit',
              }}
            >
              {PIN_ICON}
              View on Map
            </button>
            <button
              className="mobile-action-btn"
              onClick={e => { e.stopPropagation(); onViewDetails(); }}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 8,
                border: 'none',
                background: '#4b2e83',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MobileView ─────────────────────────────────────────────────────────────────

export default function MobileView({
  records,
  filteredRecords,
  logoSrc,
  filters,
  onFiltersChange,
  deptStats,
  authorInput,
  authorFilter,
  onAuthorInput,
  onClearAuthor,
  advisorInput,
  advisorFilter,
  onAdvisorInput,
  onClearAdvisor,
  authorNames,
  advisorNames,
  selectedRecord,
  onSelect,
  onClearSelected,
}: MobileViewProps) {
  const [textSearch, setTextSearch] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [expandedFooter, setExpandedFooter] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('dept');
  const [mapMode, setMapMode] = useState(false);
  const [mapFocusFooter, setMapFocusFooter] = useState<string | null>(null);
  const [mapDimFooter, setMapDimFooter] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Search scope ──────────────────────────────────────────────────────────────

  function handleScopeChange(scope: SearchScope) {
    setSearchScope(scope);
    // Clear the no-longer-active exact-match filters
    if (scope !== 'author') onClearAuthor();
    if (scope !== 'advisor') onClearAdvisor();
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  const searchValue =
    searchScope === 'author' ? authorInput :
    searchScope === 'advisor' ? advisorInput :
    textSearch;

  function handleSearchChange(value: string) {
    if (searchScope === 'author') onAuthorInput(value);
    else if (searchScope === 'advisor') onAdvisorInput(value);
    else setTextSearch(value);
  }

  function handleClearSearch() {
    if (searchScope === 'author') onClearAuthor();
    else if (searchScope === 'advisor') onClearAdvisor();
    else setTextSearch('');
  }

  const datalistId =
    searchScope === 'author' ? 'mobile-author-datalist' :
    searchScope === 'advisor' ? 'mobile-advisor-datalist' :
    undefined;
  const datalistOptions =
    searchScope === 'author' ? authorNames :
    searchScope === 'advisor' ? advisorNames :
    [];

  // ── Filtered display list ─────────────────────────────────────────────────────
  // filteredRecords already has dept/college/type/class/toggle/author/advisor filters applied.
  // For 'all' scope we additionally apply a local substring search.

  const displayRecords = useMemo(() => {
    if (searchScope !== 'all' || !textSearch.trim()) return filteredRecords;
    const q = textSearch.trim().toLowerCase();
    return filteredRecords.filter(r => {
      if (r.title !== '—' && r.title.toLowerCase().includes(q)) return true;
      const authors = [...parsePeople(r.primaryAuthor), ...parsePeople(r.projectAuthors)];
      if (authors.some(p => p.displayName.toLowerCase().includes(q))) return true;
      const advPeople = parsePeople(r.facultyAdvisor);
      if (advPeople.some(p => p.displayName.toLowerCase().includes(q))) return true;
      if (r.facultyAdvisor !== '—' && r.facultyAdvisor.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [filteredRecords, textSearch, searchScope]);

  // ── Active filter count (for badge) ──────────────────────────────────────────

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.dept !== null) n++;
    if (filters.college !== null) n++;
    if (filters.projectType !== null) n++;
    if (filters.classification !== null) n++;
    if (filters.publicationConsent) n++;
    if (filters.useOfAI) n++;
    if (filters.humanSubjects) n++;
    if (filters.animalSubjects) n++;
    return n;
  }, [filters]);

  // ── Map focus ─────────────────────────────────────────────────────────────────

  function focusOnMap(record: ProjectRecord) {
    setFilterSheetOpen(false);
    setExpandedFooter(null);
    setMapMode(true);
    setMapDimFooter(record.footer);  // dims all other blocks
    setMapFocusFooter(record.footer); // triggers scroll
  }

  // Scroll map container to focused block whenever mapFocusFooter is set.
  // Using state (not a ref) so this fires even when mapMode was already true.
  useEffect(() => {
    if (!mapFocusFooter || !mapContainerRef.current) return;
    setMapFocusFooter(null);
    const layout = buildLayout(records);
    const block = layout.find(b => b.record.footer === mapFocusFooter);
    if (!block) return;
    const yPos = rowYPositions(numRows(records.length));
    const x = blockX(block.side, block.col) + BLOCK_W / 2;
    const y = blockY(block.row, yPos) + BLOCK_H / 2;
    requestAnimationFrame(() => {
      if (!mapContainerRef.current) return;
      mapContainerRef.current.scrollLeft = x - mapContainerRef.current.clientWidth / 2;
      mapContainerRef.current.scrollTop = y - mapContainerRef.current.clientHeight / 2;
    });
  }, [mapFocusFooter, records]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleToggle(footer: string) {
    setExpandedFooter(prev => prev === footer ? null : footer);
  }

  const hasSearch = searchValue.trim().length > 0;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      fontFamily: "'Nohemi', system-ui, -apple-system, sans-serif",
      background: '#fff',
      overscrollBehavior: 'none',
    }}>
      <style>{`
        html, body { overscroll-behavior: none; }
        #mobile-search-input::placeholder { color: rgba(255,255,255,0.55); }
        #mobile-search-input::-webkit-search-cancel-button { display: none; }
        .mobile-list-item { -webkit-tap-highlight-color: transparent; }
        .mobile-list-item:active { background: #f0f0f5 !important; }
        .mobile-action-btn { -webkit-tap-highlight-color: transparent; }
        .mobile-action-btn:active { opacity: 0.72 !important; }
        .mobile-scope-btn { -webkit-tap-highlight-color: transparent; transition: background 0.12s, color 0.12s, border-color 0.12s; }
        .mobile-hdr-btn { -webkit-tap-highlight-color: transparent; transition: background 0.12s, border-color 0.12s; }
        @media (max-height: 500px) {
          .mobile-scope-row { display: none !important; }
        }
        @keyframes mobileSheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes mobileBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        flexShrink: 0,
        background: 'linear-gradient(135deg, #251558 0%, #4b2e83 55%, #5d3b9a 100%)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.28)',
        zIndex: 100,
        paddingTop: 'env(safe-area-inset-top)',
      }}>

        {/* Row 1: Logo | Search | Filter button | Map/List toggle */}
        <div style={{ height: 56, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>

          <img
            src={logoSrc}
            alt="Research and Creative Inquiry Symposium"
            style={{ height: 38, width: 'auto', display: 'block', flexShrink: 0 }}
          />

          {/* Search input */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              ref={searchInputRef}
              id="mobile-search-input"
              type="search"
              list={datalistId}
              placeholder={
                searchScope === 'author' ? 'Search by author name…' :
                searchScope === 'advisor' ? 'Search by advisor name…' :
                'Search projects…'
              }
              value={searchValue}
              onChange={e => handleSearchChange(e.target.value)}
              style={{
                width: '100%',
                height: 34,
                paddingLeft: 10,
                paddingRight: hasSearch ? 32 : 10,
                borderRadius: 8,
                border: 'none',
                background: 'rgba(255,255,255,0.18)',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            {datalistId && (
              <datalist id={datalistId}>
                {datalistOptions.map(name => <option key={name} value={name} />)}
              </datalist>
            )}
            {/* Clear button */}
            {hasSearch && (
              <button
                onClick={handleClearSearch}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: 18,
                  cursor: 'pointer',
                  padding: '0 2px',
                  lineHeight: 1,
                  fontFamily: 'inherit',
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Filter button */}
          <button
            className="mobile-hdr-btn"
            onClick={() => setFilterSheetOpen(o => !o)}
            aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
            style={{
              flexShrink: 0,
              position: 'relative',
              width: 36,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${activeFilterCount > 0 ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.22)'}`,
              background: filterSheetOpen
                ? 'rgba(255,255,255,0.22)'
                : activeFilterCount > 0
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(255,255,255,0.09)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M1 2h11l-4.5 5v4l-2-1V7L1 2z" stroke="white" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
            </svg>
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute',
                top: 5,
                right: 5,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#d4920c',
                boxShadow: '0 0 4px rgba(212,146,12,0.7)',
              }} />
            )}
          </button>

          {/* Map / List toggle */}
          <button
            className="mobile-hdr-btn"
            onClick={() => {
              if (mapMode) {
                setMapMode(false);
                setMapDimFooter(null);
                onClearSelected();
              } else {
                setMapMode(true);
              }
            }}
            aria-label={mapMode ? 'Switch to list view' : 'Switch to map view'}
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${mapMode ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.22)'}`,
              background: mapMode ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.09)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mapMode ? (
              /* Back to list — show list lines icon */
              <svg width="15" height="12" viewBox="0 0 18 14" fill="none" aria-hidden="true">
                <path d="M1 1h16M1 7h16M1 13h16" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              /* Go to map — show pin icon (same as View on Map) */
              <svg width="15" height="15" viewBox="0 0 20 20" fill="white" aria-hidden="true">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* Row 2: Search scope pills + result count */}
        <div
          className="mobile-scope-row"
          style={{
            height: 38,
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderTop: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          {(['all', 'author', 'advisor'] as SearchScope[]).map(scope => (
            <button
              key={scope}
              className="mobile-scope-btn"
              onClick={() => handleScopeChange(scope)}
              aria-pressed={searchScope === scope}
              style={{
                height: 26,
                padding: '0 11px',
                borderRadius: 13,
                border: '1px solid',
                borderColor: searchScope === scope ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.2)',
                background: searchScope === scope ? 'rgba(255,255,255,0.22)' : 'transparent',
                color: searchScope === scope ? '#fff' : 'rgba(255,255,255,0.58)',
                fontSize: 12,
                fontWeight: searchScope === scope ? 600 : 400,
                cursor: 'pointer',
                letterSpacing: '0.01em',
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              {scope === 'all' ? 'All' : scope === 'author' ? 'By Author' : 'By Advisor'}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.42)', whiteSpace: 'nowrap' }}>
            {displayRecords.length === records.length
              ? `${records.length} projects`
              : `${displayRecords.length} of ${records.length}`}
          </span>
        </div>
      </header>

      {/* ── Main content (list or map) ─────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {mapMode ? (
          /* ── Map view ── */
          <div
            ref={mapContainerRef}
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'auto',
              WebkitOverflowScrolling: 'touch',
              background: '#f4f1f9',
            } as React.CSSProperties}
          >
            <TableMap
              records={records}
              selectedRecord={selectedRecord}
              filters={filters}
              authorFilter={authorFilter}
              advisorFilter={advisorFilter}
              onSelect={r => { setMapDimFooter(null); onSelect(r); }}
              tutorialHoverRecord={null}
              focusFooter={mapDimFooter}
            />
          </div>
        ) : (
          /* ── List view ── */
          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            } as React.CSSProperties}
          >
            {displayRecords.map(record => (
              <MobileListItem
                key={record.footer}
                record={record}
                isExpanded={expandedFooter === record.footer}
                onToggle={() => handleToggle(record.footer)}
                onViewDetails={() => {
                  setFilterSheetOpen(false);
                  setExpandedFooter(null);
                  onSelect(record);
                }}
                onViewOnMap={() => focusOnMap(record)}
              />
            ))}
            {displayRecords.length === 0 && (
              <div style={{ padding: 48, textAlign: 'center', color: '#999', fontSize: 14 }}>
                No projects match your search.
              </div>
            )}
            <div style={{ height: 'env(safe-area-inset-bottom)', minHeight: 8 }} />
          </div>
        )}

        {/* ── Detail panel (full-screen overlay within content area) ── */}
        {selectedRecord && (
          <DetailPanel
            record={selectedRecord}
            onClose={onClearSelected}
            onViewOnMap={() => {
              // Close immediately (no animation) then switch to map
              onClearSelected();
              focusOnMap(selectedRecord);
            }}
          />
        )}
      </div>

      {/* ── Filter bottom sheet ───────────────────────────────────────────── */}
      {filterSheetOpen && (
        <>
          <div
            onClick={() => setFilterSheetOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 300,
              animation: 'mobileBackdropIn 0.2s ease',
            }}
          />
          <div style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '82vh',
            background: '#fff',
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
            zIndex: 310,
            display: 'flex',
            flexDirection: 'column',
            animation: 'mobileSheetUp 0.28s cubic-bezier(0.16,1,0.3,1)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d0ccd8' }} />
            </div>
            {/* Sheet header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 18px 10px',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Filters</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => onFiltersChange(DEFAULT_FILTERS)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4b2e83',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    padding: '4px 0',
                  }}
                >
                  Clear all ({activeFilterCount})
                </button>
              )}
            </div>
            {/* FilterMenu content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <FilterMenu
                filters={filters}
                onChange={onFiltersChange}
                deptStats={deptStats}
                records={records}
                onClose={() => setFilterSheetOpen(false)}
                activeTab={filterTab}
                onTabChange={setFilterTab}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
