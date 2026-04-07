import { useMemo, useState } from 'react';
import { ProjectRecord, FilterState, DEFAULT_FILTERS } from './types';
import { parseCSV } from './utils/csvParser';
import { buildDepartmentStats } from './utils/colorMap';
import { parsePeople } from './utils/nameParser';
import { TableMap } from './components/TableMap';
import { DetailPanel } from './components/DetailPanel';
import { FilterMenu } from './components/FilterMenu';
import MobileView from './components/MobileView';
import { useMobile } from './hooks/useMobile';
import { ParticleBackground } from './components/ParticleBackground';
import rawCsv from '../Table_numbers.csv?raw';
import rcisLogo from '../RCIS.png';

const records: ProjectRecord[] = parseCSV(rawCsv);

const HEADER_H = 68;
const LOGO_H = HEADER_H - 18;

export default function App() {
  const [selectedRecord, setSelectedRecord] = useState<ProjectRecord | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [authorInput, setAuthorInput] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');

  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorFilter, setAdvisorFilter] = useState('');

  const deptStats = useMemo(() => buildDepartmentStats(records), []);

  const authorNames = useMemo(() => {
    const names = new Set<string>();
    for (const r of records) {
      for (const p of parsePeople(r.primaryAuthor)) names.add(p.displayName);
      for (const p of parsePeople(r.projectAuthors)) names.add(p.displayName);
    }
    return Array.from(names).sort();
  }, []);

  const advisorNames = useMemo(() => {
    const names = new Set<string>();
    for (const r of records) {
      if (r.facultyAdvisor && r.facultyAdvisor !== '—') names.add(r.facultyAdvisor);
    }
    return Array.from(names).sort();
  }, []);

  const authorSet = useMemo(() => new Set(authorNames), [authorNames]);
  const advisorSet = useMemo(() => new Set(advisorNames), [advisorNames]);

  const isMobile = useMobile();

  function handleAuthorInput(value: string) {
    setAuthorInput(value);
    if (value === '') setAuthorFilter('');
    else if (authorSet.has(value)) setAuthorFilter(value);
    else setAuthorFilter('');
  }

  function handleAdvisorInput(value: string) {
    setAdvisorInput(value);
    if (value === '') setAdvisorFilter('');
    else if (advisorSet.has(value)) setAdvisorFilter(value);
    else setAdvisorFilter('');
  }

  function handleSelect(record: ProjectRecord) {
    setSelectedRecord(prev => prev?.footer === record.footer ? null : record);
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== null && v !== false);
  const showAuthorSuggestions = authorInput.length >= 1;
  const showAdvisorSuggestions = advisorInput.length >= 1;

  if (isMobile) {
    return <MobileView records={records} logoSrc={rcisLogo} />;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'transparent',
    }}>
      <style>{`
        html, body { overflow: hidden; margin: 0; padding: 0; }
        .search-input::placeholder { color: rgba(255,255,255,0.5); }
        .search-input:focus {
          border-color: rgba(255,255,255,0.48) !important;
          background: rgba(255,255,255,0.17) !important;
          outline: none;
        }
        .filter-toggle-btn:hover { background: rgba(255,255,255,0.17) !important; }
        .filter-toggle-btn:focus-visible { outline: 2px solid rgba(255,255,255,0.5); outline-offset: 2px; }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'relative',
        zIndex: 200,
        height: HEADER_H,
        padding: '0 22px',
        background: 'linear-gradient(135deg, #251558 0%, #4b2e83 55%, #5d3b9a 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.32)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
      }}>
        <img
          src={rcisLogo}
          alt="Research and Creative Inquiry Symposium"
          style={{ height: LOGO_H, width: 'auto', display: 'block', flexShrink: 0 }}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Search by Author */}
          <SearchInput
            id="author-search"
            datalistId="author-datalist"
            placeholder="Search by Author…"
            value={authorInput}
            isActive={!!authorFilter}
            showSuggestions={showAuthorSuggestions}
            suggestions={authorNames}
            onChange={handleAuthorInput}
            onClear={() => { setAuthorInput(''); setAuthorFilter(''); }}
          />

          {/* Search by Advisor */}
          <SearchInput
            id="advisor-search"
            datalistId="advisor-datalist"
            placeholder="Search by Advisor…"
            value={advisorInput}
            isActive={!!advisorFilter}
            showSuggestions={showAdvisorSuggestions}
            suggestions={advisorNames}
            onChange={handleAdvisorInput}
            onClear={() => { setAdvisorInput(''); setAdvisorFilter(''); }}
          />

          {/* Filters button */}
          <button
            className="filter-toggle-btn"
            onClick={() => setFiltersOpen(o => !o)}
            aria-expanded={filtersOpen}
            aria-haspopup="dialog"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              height: 34,
              padding: '0 15px',
              borderRadius: 8,
              border: `1px solid ${filtersOpen || hasActiveFilters
                ? 'rgba(255,255,255,0.42)'
                : 'rgba(255,255,255,0.18)'}`,
              background: filtersOpen
                ? 'rgba(255,255,255,0.2)'
                : hasActiveFilters
                  ? 'rgba(255,255,255,0.14)'
                  : 'rgba(255,255,255,0.09)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'inherit',
              fontWeight: 500,
              letterSpacing: '0.02em',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            {/* Funnel icon */}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M1 2h11l-4.5 5v4l-2-1V7L1 2z" stroke="white" strokeWidth="1.4"
                strokeLinejoin="round" fill="none" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span style={{
                width: 7, height: 7,
                borderRadius: '50%',
                background: '#d4920c',
                display: 'block',
                flexShrink: 0,
                boxShadow: '0 0 4px rgba(212,146,12,0.6)',
              }} />
            )}
          </button>

          <span style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.42)',
            whiteSpace: 'nowrap',
            paddingLeft: 4,
            letterSpacing: '0.01em',
          }}>
            {records.length} projects
          </span>
        </div>
      </header>

      {/* ── Filter menu dropdown ─────────────────────────────────────────────── */}
      {filtersOpen && (
        <>
          {/* Backdrop — click to close */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              top: HEADER_H,
              zIndex: 140,
            }}
            onClick={() => setFiltersOpen(false)}
          />
          {/* Panel anchor — zero height, allows absolute child to overlay content */}
          <div style={{ position: 'relative', height: 0, overflow: 'visible', zIndex: 150, flexShrink: 0 }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              padding: '0 22px',
            }}>
              <FilterMenu
                filters={filters}
                onChange={setFilters}
                deptStats={deptStats}
                records={records}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <ParticleBackground />
        {/* Map always fills the full area — panel overlays it, never shrinks it */}
        <div style={{ position: 'absolute', inset: 0, padding: 12, boxSizing: 'border-box' }}>
          {records.length === 0 ? (
            <div style={{ padding: 32, color: '#888', fontSize: 14 }}>
              No records found in CSV.
            </div>
          ) : (
            <TableMap
              records={records}
              selectedRecord={selectedRecord}
              filters={filters}
              authorFilter={authorFilter}
              advisorFilter={advisorFilter}
              onSelect={handleSelect}
            />
          )}
        </div>

        {selectedRecord && (
          <DetailPanel record={selectedRecord} onClose={() => setSelectedRecord(null)} />
        )}
      </div>
    </div>
  );
}

// ─── SearchInput ──────────────────────────────────────────────────────────────

interface SearchInputProps {
  id: string;
  datalistId: string;
  placeholder: string;
  value: string;
  isActive: boolean;
  showSuggestions: boolean;
  suggestions: string[];
  onChange: (v: string) => void;
  onClear: () => void;
}

function SearchInput({
  id,
  datalistId,
  placeholder,
  value,
  isActive,
  showSuggestions,
  suggestions,
  onChange,
  onClear,
}: SearchInputProps) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        id={id}
        type="text"
        list={showSuggestions ? datalistId : undefined}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="search-input"
        style={{
          height: 34,
          paddingLeft: 11,
          paddingRight: value ? 30 : 11,
          borderRadius: 8,
          border: isActive
            ? '1.5px solid rgba(255,255,255,0.55)'
            : '1px solid rgba(255,255,255,0.16)',
          background: 'rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: 13,
          width: 196,
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      />
      {showSuggestions && (
        <datalist id={datalistId}>
          {suggestions.map(name => <option key={name} value={name} />)}
        </datalist>
      )}
      {value && (
        <button
          onClick={onClear}
          aria-label={`Clear ${id}`}
          style={{
            position: 'absolute', right: 7,
            background: 'none', border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.65)',
            fontSize: 17, lineHeight: 1, padding: 0,
            display: 'flex', alignItems: 'center',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
