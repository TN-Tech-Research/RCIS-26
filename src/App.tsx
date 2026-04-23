import { useMemo, useState, useEffect, useRef } from 'react';
import { ProjectRecord, FilterState, DEFAULT_FILTERS } from './types';
import { parseCSV } from './utils/csvParser';
import { buildDepartmentStats } from './utils/colorMap';
import { parsePeople } from './utils/nameParser';
import { TableMap } from './components/TableMap';
import { DetailPanel } from './components/DetailPanel';
import { FilterMenu, FilterTab } from './components/FilterMenu';
import { AdminTools } from './components/AdminTools';
import { TutorialModal } from './components/TutorialModal';
import MobileView from './components/MobileView';
import { useMobile } from './hooks/useMobile';
import { ParticleBackground } from './components/ParticleBackground';
import { AdminContext } from './contexts/AdminContext';
import rawCsv from '../Table_numbers.enc?raw';
import rcisLogo from '../RCIS.png';
import secretAudio from './assets/secret.mp3';
import { parseScorecard } from './utils/scorecardParser';
import type { FeedbackMap } from './utils/scorecardParser';
import { parseJudges } from './utils/judgesParser';
import type { JudgesByProject } from './utils/judgesParser';
import { parseAvgScores } from './utils/avgScoreParser';
import { calcAwards } from './utils/awardsCalc';
import rawAvgScore from '../AvgScore.enc?raw';

const records: ProjectRecord[] = parseCSV(rawCsv);

// Admin scorecard (gitignored — admin-only preview during judging)
const _sg = import.meta.glob<string>('/scorecard.csv', { query: '?raw', import: 'default', eager: true });
const _rawScorecard: string = (_sg['/scorecard.csv'] as string) ?? '';
const adminFeedbackMap: FeedbackMap = parseScorecard(_rawScorecard);

// Public scorecard (gitignored until released; add final_scorecard.csv at build time to enable student access)
const _fsg = import.meta.glob<string>('/final_scorecard.csv', { query: '?raw', import: 'default', eager: true });
const _rawFinalScorecard: string = (_fsg['/final_scorecard.csv'] as string) ?? '';
const publicFeedbackMap: FeedbackMap = parseScorecard(_rawFinalScorecard);

// Judges data (gracefully empty if file absent)
const _jg = import.meta.glob<string>('/Judges.csv', { query: '?raw', import: 'default', eager: true });
const _rawJudges: string = (_jg['/Judges.csv'] as string) ?? '';
const { byProject: judgesByProject }: { byProject: JudgesByProject } = parseJudges(_rawJudges);

// Average scores (encrypted — bundled via AvgScore.enc, decrypted at build time)
const avgScoreMap = parseAvgScores(rawAvgScore);
const winnersSet = new Set(calcAwards(records, avgScoreMap).flatMap(g => g.winners.map(w => w.record.footer)));

const HEADER_H = 68;
const LOGO_H = HEADER_H - 18;

const _SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

const SPARKLE_PAD = 40;
const SPARKLE_PX = 3;
const SPARKLE_COLORS = ['#fff9fe','#e879f9','#c084fc','#fde68a','#f0abfc','#a78bfa','#ffffff','#fbbf24'];

function recordHasAuthor(record: ProjectRecord, filter: string): boolean {
  const f = filter.toLowerCase();
  return [...parsePeople(record.primaryAuthor), ...parsePeople(record.projectAuthors)]
    .some(p => p.displayName.toLowerCase() === f);
}

export default function App() {
  const [selectedRecord, setSelectedRecord] = useState<ProjectRecord | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const [authorInput, setAuthorInput] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');

  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorFilter, setAdvisorFilter] = useState('');

  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('rcis_admin') === 'true');
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [filterMenuTab, setFilterMenuTab] = useState<FilterTab>('dept');
  const [tutorialHoverRecord, setTutorialHoverRecord] = useState<ProjectRecord | null>(null);
  const tutorialSavedFilters = useRef<FilterState | null>(null);
  const seqPos = useRef(0);
  const listening = useRef(false);
  const seqTimeout = useRef<ReturnType<typeof setTimeout>>();
  const logoWrapperRef = useRef<HTMLDivElement>(null);
  const sparkleCanvasRef = useRef<HTMLCanvasElement>(null);
  const sparkleAnimRef = useRef<number | null>(null);
  const prevIsAdminRef = useRef(isAdmin);

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

  // Admins see the live scorecard; everyone else sees the public release (if present)
  const feedbackMap = isAdmin ? adminFeedbackMap : publicFeedbackMap;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!listening.current) return;
      if (e.key === _SEQ[seqPos.current]) {
        seqPos.current++;
        if (seqPos.current === _SEQ.length) {
          localStorage.setItem('rcis_admin', 'true');
          setIsAdmin(true);
          listening.current = false;
          seqPos.current = 0;
          clearTimeout(seqTimeout.current);
        }
      } else {
        seqPos.current = 0;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (isAdmin && !prevIsAdminRef.current) {
      // Play audio
      const audio = new Audio(secretAudio);
      audio.play().catch(() => {});

      // Sparkle animation
      const canvas = sparkleCanvasRef.current;
      const wrapper = logoWrapperRef.current;
      if (canvas && wrapper) {
        const bw = wrapper.offsetWidth;
        const bh = wrapper.offsetHeight;
        canvas.width  = bw + SPARKLE_PAD * 2;
        canvas.height = bh + SPARKLE_PAD * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          type Particle = {
            x: number; y: number; vx: number; vy: number;
            life: number; decay: number; color: string;
            size: number; twinkle: boolean; twinklePhase: number;
          };
          const particles: Particle[] = [];
          for (let i = 0; i < 90; i++) {
            const edge = Math.random();
            let px, py;
            if      (edge < 0.25) { px = Math.random() * bw; py = 0; }
            else if (edge < 0.5)  { px = bw; py = Math.random() * bh; }
            else if (edge < 0.75) { px = Math.random() * bw; py = bh; }
            else                  { px = 0; py = Math.random() * bh; }
            px += SPARKLE_PAD; py += SPARKLE_PAD;
            const angle = Math.atan2(py - (bh / 2 + SPARKLE_PAD), px - (bw / 2 + SPARKLE_PAD))
              + (Math.random() - 0.5) * 1.2;
            const speed = 0.8 + Math.random() * 2.5;
            particles.push({
              x: px, y: py,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1,
              decay: 0.016 + Math.random() * 0.02,
              color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
              size: SPARKLE_PX * (1 + Math.floor(Math.random() * 3)),
              twinkle: Math.random() > 0.6,
              twinklePhase: Math.random() * Math.PI * 2,
            });
          }
          if (sparkleAnimRef.current !== null) cancelAnimationFrame(sparkleAnimRef.current);
          function drawFrame() {
            ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
            let alive = false;
            for (const p of particles) {
              p.life -= p.decay;
              if (p.life <= 0) continue;
              alive = true;
              p.x += p.vx;
              p.y += p.vy;
              p.vy += 0.04;
              let alpha = p.life;
              if (p.twinkle) { p.twinklePhase += 0.3; alpha *= 0.5 + 0.5 * Math.sin(p.twinklePhase); }
              ctx!.globalAlpha = Math.max(0, alpha);
              ctx!.fillStyle = p.color;
              ctx!.fillRect(
                Math.round(p.x / SPARKLE_PX) * SPARKLE_PX,
                Math.round(p.y / SPARKLE_PX) * SPARKLE_PX,
                p.size, p.size,
              );
            }
            ctx!.globalAlpha = 1;
            if (alive) { sparkleAnimRef.current = requestAnimationFrame(drawFrame); }
            else { ctx!.clearRect(0, 0, canvas!.width, canvas!.height); sparkleAnimRef.current = null; }
          }
          sparkleAnimRef.current = requestAnimationFrame(drawFrame);
        }
      }
    }
    prevIsAdminRef.current = isAdmin;
  }, [isAdmin]);

  function handleLogoClick() {
    if (isAdmin) return;
    listening.current = true;
    seqPos.current = 0;
    clearTimeout(seqTimeout.current);
    seqTimeout.current = setTimeout(() => {
      listening.current = false;
      seqPos.current = 0;
    }, 12000);
  }

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

  function handleTutorialStep(key: string) {
    switch (key) {
      case 'color-blocks':
        setFiltersOpen(false);
        setSelectedRecord(null);
        setTutorialHoverRecord(null);
        break;
      case 'hover-tooltip':
        setFiltersOpen(false);
        setSelectedRecord(null);
        setTutorialHoverRecord(records[0]);
        break;
      case 'click-to-open':
        setTutorialHoverRecord(null);
        setFiltersOpen(false);
        setSelectedRecord(records[0]);
        break;
      case 'table-layout':
        setTutorialHoverRecord(null);
        setSelectedRecord(null);
        setFiltersOpen(false);
        break;
      case 'author-search':
      case 'advisor-search':
      case 'clear-search':
      case 'filters-overview':
        setTutorialHoverRecord(null);
        setSelectedRecord(null);
        setFiltersOpen(false);
        break;
      case 'dept-college':
        setTutorialHoverRecord(null);
        setSelectedRecord(null);
        setFiltersOpen(true);
        setFilterMenuTab('dept');
        break;
      case 'project-type':
        setFiltersOpen(true);
        setFilterMenuTab('project');
        break;
      case 'highlight-toggles':
        setFiltersOpen(true);
        setFilterMenuTab('project');
        break;
      case 'irb-labels':
        setFiltersOpen(false);
        if (tutorialSavedFilters.current === null) tutorialSavedFilters.current = filters;
        setFilters({ ...DEFAULT_FILTERS, humanSubjects: true });
        break;
      case 'ai-tooltip': {
        setFiltersOpen(false);
        if (tutorialSavedFilters.current === null) tutorialSavedFilters.current = filters;
        setFilters({ ...DEFAULT_FILTERS, useOfAI: true });
        const aiRec = records.find(r => r.useOfAI === 'Yes') ?? null;
        setTutorialHoverRecord(aiRec);
        break;
      }
      case 'admin-unlock':
        setTutorialHoverRecord(null);
        setFiltersOpen(false);
        setAdminOpen(false);
        break;
      case 'admin-load':
      case 'admin-email':
      case 'admin-stats':
      case 'admin-chips':
        setTutorialHoverRecord(null);
        setFiltersOpen(false);
        setAdminOpen(true);
        break;
      case 'admin-irb-numbers':
        setTutorialHoverRecord(null);
        setFiltersOpen(false);
        setAdminOpen(false);
        if (tutorialSavedFilters.current === null) tutorialSavedFilters.current = filters;
        setFilters({ ...DEFAULT_FILTERS, humanSubjects: true });
        break;
      default:
        setTutorialHoverRecord(null);
        setFiltersOpen(false);
        break;
    }
  }

  function handleTutorialClose() {
    setTutorialOpen(false);
    setFiltersOpen(false);
    setAdminOpen(false);
    setSelectedRecord(null);
    setTutorialHoverRecord(null);
    setFilterMenuTab('dept');
    if (tutorialSavedFilters.current !== null) {
      setFilters(tutorialSavedFilters.current);
      tutorialSavedFilters.current = null;
    }
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== null && v !== false);
  const showAuthorSuggestions = authorInput.length >= 1;
  const showAdvisorSuggestions = advisorInput.length >= 1;

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (filters.dept !== null && record.primaryAuthorDepartment !== filters.dept) return false;
      if (filters.college !== null && record.unitName !== filters.college) return false;
      if (filters.projectType !== null && record.projectType !== filters.projectType) return false;
      if (filters.classification !== null && record.classification !== filters.classification) return false;
      if (filters.publicationConsent && record.publicationConsent !== 'Yes') return false;
      if (filters.useOfAI && record.useOfAI !== 'Yes') return false;
      if (filters.humanSubjects && !record.irbNumber) return false;
      if (filters.animalSubjects && !record.iacucNo) return false;
      if (authorFilter.trim() !== '' && !recordHasAuthor(record, authorFilter)) return false;
      if (advisorFilter.trim() !== '' && record.facultyAdvisor.toLowerCase() !== advisorFilter.toLowerCase()) return false;
      return true;
    });
  }, [filters, authorFilter, advisorFilter]);

  if (isMobile) {
    return (
      <AdminContext.Provider value={isAdmin}>
        <MobileView
          records={records}
          filteredRecords={filteredRecords}
          logoSrc={rcisLogo}
          filters={filters}
          onFiltersChange={setFilters}
          deptStats={deptStats}
          authorInput={authorInput}
          authorFilter={authorFilter}
          onAuthorInput={handleAuthorInput}
          onClearAuthor={() => { setAuthorInput(''); setAuthorFilter(''); }}
          advisorInput={advisorInput}
          advisorFilter={advisorFilter}
          onAdvisorInput={handleAdvisorInput}
          onClearAdvisor={() => { setAdvisorInput(''); setAdvisorFilter(''); }}
          authorNames={authorNames}
          advisorNames={advisorNames}
          selectedRecord={selectedRecord}
          onSelect={handleSelect}
          onClearSelected={() => setSelectedRecord(null)}
          feedback={feedbackMap}
          winnersSet={isAdmin ? winnersSet : undefined}
        />
      </AdminContext.Provider>
    );
  }

  return (
    <AdminContext.Provider value={isAdmin}>
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        fontFamily: "'Nohemi', system-ui, -apple-system, sans-serif",
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
          .admin-btn:hover { background: rgba(255,215,100,0.22) !important; }
          .logo-btn { background: none; border: none; padding: 0; cursor: default; display: flex; align-items: center; }
          #tutorial-btn:hover { background: rgba(255,255,255,0.2) !important; border-color: rgba(255,255,255,0.5) !important; color: rgba(255,255,255,0.95) !important; }
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
          <div ref={logoWrapperRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              id="header-logo-btn"
              className="logo-btn"
              onClick={handleLogoClick}
              tabIndex={-1}
              aria-hidden="true"
            >
              <img
                src={rcisLogo}
                alt="Research and Creative Inquiry Symposium"
                style={{ height: LOGO_H, width: 'auto', display: 'block' }}
              />
            </button>
            <canvas
              ref={sparkleCanvasRef}
              style={{
                position: 'absolute',
                top: -SPARKLE_PAD,
                left: -SPARKLE_PAD,
                pointerEvents: 'none',
                zIndex: 10,
                imageRendering: 'pixelated',
              }}
            />
          </div>

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
              id="filter-toggle-btn"
              className="filter-toggle-btn"
              onClick={() => { setFiltersOpen(o => !o); setAdminOpen(false); }}
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

            {/* Admin tools button — only visible in admin mode */}
            {isAdmin && (
              <button
                id="admin-btn"
                className="admin-btn"
                onClick={() => { setAdminOpen(o => !o); setFiltersOpen(false); }}
                aria-expanded={adminOpen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 34,
                  padding: '0 13px',
                  borderRadius: 8,
                  border: adminOpen
                    ? '1.5px solid rgba(255,215,100,0.7)'
                    : '1.5px solid rgba(255,215,100,0.35)',
                  background: adminOpen
                    ? 'rgba(255,215,100,0.18)'
                    : 'rgba(255,215,100,0.1)',
                  color: '#ffd764',
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Admin
              </button>
            )}

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, paddingLeft: 4, flexShrink: 0,
            }}>
              <span style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.42)',
                whiteSpace: 'nowrap',
                letterSpacing: '0.01em',
              }}>
                {records.length} projects
              </span>
              <button
                id="tutorial-btn"
                onClick={() => setTutorialOpen(true)}
                aria-label="Open feature guide"
                style={{
                  width: 16, height: 16,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.28)',
                  background: 'rgba(255,255,255,0.09)',
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                  fontFamily: 'inherit',
                  lineHeight: 1,
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                }}
              >
                ?
              </button>
            </div>
          </div>
        </header>

        {/* ── Filter menu dropdown ─────────────────────────────────────────────── */}
        {filtersOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, top: HEADER_H, zIndex: 140 }}
              onClick={() => setFiltersOpen(false)}
            />
            <div style={{ position: 'relative', height: 0, overflow: 'visible', zIndex: 150, flexShrink: 0 }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                display: 'flex', justifyContent: 'center', padding: '0 22px',
              }}>
                <FilterMenu
                  filters={filters}
                  onChange={setFilters}
                  deptStats={deptStats}
                  records={records}
                  onClose={() => setFiltersOpen(false)}
                  activeTab={filterMenuTab}
                  onTabChange={setFilterMenuTab}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Admin tools dropdown ─────────────────────────────────────────────── */}
        {adminOpen && isAdmin && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, top: HEADER_H, zIndex: 140 }}
              onClick={() => setAdminOpen(false)}
            />
            <div style={{ position: 'relative', height: 0, overflow: 'visible', zIndex: 250, flexShrink: 0 }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                display: 'flex', justifyContent: 'center', padding: '0 22px',
              }}>
                <AdminTools
                  filteredRecords={filteredRecords}
                  allRecords={records}
                  hasActiveFilters={hasActiveFilters || !!authorFilter || !!advisorFilter}
                  avgScoreMap={avgScoreMap}
                  judgesByProject={judgesByProject}
                  onExit={() => { localStorage.removeItem('rcis_admin'); setIsAdmin(false); setAdminOpen(false); }}
                  onClose={() => setAdminOpen(false)}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Main content ─────────────────────────────────────────────────────── */}
        <div id="table-map-root" style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <ParticleBackground />
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
                tutorialHoverRecord={tutorialHoverRecord}
                winnersSet={isAdmin ? winnersSet : undefined}
              />
            )}
          </div>

          {selectedRecord && (
            <DetailPanel
              record={selectedRecord}
              onClose={() => setSelectedRecord(null)}
              feedback={feedbackMap}
            />
          )}
        </div>
      </div>

      <TutorialModal
        isOpen={tutorialOpen}
        onClose={handleTutorialClose}
        onStepEnter={handleTutorialStep}
      />
    </AdminContext.Provider>
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
