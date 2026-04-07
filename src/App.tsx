import { useMemo, useState } from 'react';
import { ProjectRecord } from './types';
import { parseCSV } from './utils/csvParser';
import { buildDepartmentStats } from './utils/colorMap';
import { parsePeople } from './utils/nameParser';
import { TableMap } from './components/TableMap';
import { DetailPanel } from './components/DetailPanel';
import { Legend } from './components/Legend';
import MobileView from './components/MobileView';
import { useMobile } from './hooks/useMobile';
import { ParticleBackground } from './components/ParticleBackground';
import rawCsv from '../Table_numbers.csv?raw';
import rcisLogo from '../RCIS.png';

const records: ProjectRecord[] = parseCSV(rawCsv);

// Current header natural height is ~42px; 50% more = 63px.
const HEADER_H = 63;
const LOGO_H = HEADER_H - 16; // 8px breathing room top+bottom

export default function App() {
  const [selectedRecord, setSelectedRecord] = useState<ProjectRecord | null>(null);
  const [highlightedDept, setHighlightedDept] = useState<string | null>(null);

  // inputValue: what is typed in the box (controls display + datalist)
  // authorFilter: the applied filter (only set when an exact author name is selected)
  const [inputValue, setInputValue] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');

  const deptStats = useMemo(() => buildDepartmentStats(records), []);

  const authorNames = useMemo(() => {
    const names = new Set<string>();
    for (const r of records) {
      for (const p of parsePeople(r.primaryAuthor)) names.add(p.displayName);
      for (const p of parsePeople(r.projectAuthors)) names.add(p.displayName);
    }
    return Array.from(names).sort();
  }, []);

  const authorSet = useMemo(() => new Set(authorNames), [authorNames]);

  const isMobile = useMobile();

  function handleAuthorInput(value: string) {
    setInputValue(value);
    if (value === '') {
      setAuthorFilter('');
    } else if (authorSet.has(value)) {
      // Exact match → user selected from datalist; apply filter
      setAuthorFilter(value);
    } else {
      // Still typing; don't apply filter yet
      setAuthorFilter('');
    }
  }

  function clearAuthorFilter() {
    setInputValue('');
    setAuthorFilter('');
  }

  function handleSelect(record: ProjectRecord) {
    setSelectedRecord(prev => prev?.footer === record.footer ? null : record);
  }

  // Only show datalist options after at least one character has been typed
  const showSuggestions = inputValue.length >= 1;

  if (isMobile) {
    return <MobileView records={records} logoSrc={rcisLogo} />;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif', background: 'transparent',
    }}>
      {/* Placeholder colour — can't be set inline, needs a real CSS rule */}
      <style>{`#author-search::placeholder { color: rgba(255,255,255,0.65); }`}</style>

      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 1,
        height: HEADER_H,
        padding: '0 20px',
        background: '#4b2e83',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
      }}>
        <img
          src={rcisLogo}
          alt="Research and Creative Inquiry Symposium"
          style={{ height: LOGO_H, width: 'auto', display: 'block' }}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Author search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id="author-search"
              type="text"
              list={showSuggestions ? 'author-datalist' : undefined}
              placeholder="Filter by author…"
              value={inputValue}
              onChange={e => handleAuthorInput(e.target.value)}
              style={{
                height: 30,
                paddingLeft: 10,
                paddingRight: inputValue ? 28 : 10,
                borderRadius: 6,
                border: authorFilter ? '1.5px solid rgba(255,255,255,0.6)' : 'none',
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: 13,
                width: 200,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {showSuggestions && (
              <datalist id="author-datalist">
                {authorNames.map(name => <option key={name} value={name} />)}
              </datalist>
            )}
            {inputValue && (
              <button
                onClick={clearAuthorFilter}
                aria-label="Clear author filter"
                style={{
                  position: 'absolute',
                  right: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 16,
                  lineHeight: 1,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                ×
              </button>
            )}
          </div>

          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
            {records.length} projects
          </span>
        </div>
      </header>

      {/* Legend */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Legend
          items={deptStats}
          highlightedDept={highlightedDept}
          onHighlight={setHighlightedDept}
        />
      </div>

      {/* Main content */}
      <div style={{ position: 'relative', display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ParticleBackground />
        <div style={{ flex: 1, overflow: 'auto', padding: 16, boxSizing: 'border-box' }}>
          {records.length === 0 ? (
            <div style={{ padding: 32, color: '#888', fontSize: 14 }}>No records found in CSV.</div>
          ) : (
            <TableMap
              records={records}
              selectedRecord={selectedRecord}
              highlightedDept={highlightedDept}
              authorFilter={authorFilter}
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
