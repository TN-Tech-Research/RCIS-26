import { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ProjectRecord, FilterState, TooltipState } from '../types';
import { getDepartmentColor } from '../utils/colorMap';
import { formatPeopleForTooltip, parsePeople } from '../utils/nameParser';
import { useAdmin } from '../contexts/AdminContext';
import { useMobile } from '../hooks/useMobile';
import {
  buildLayout,
  blockX,
  blockY,
  svgHeight,
  numRows,
  rowYPositions,
  SVG_W,
  BLOCK_W,
  BLOCK_H,
  HALF_W,
  CENTER_GAP,
  PADDING,
} from '../utils/layoutEngine';

interface TableMapProps {
  records: ProjectRecord[];
  selectedRecord: ProjectRecord | null;
  filters: FilterState;
  authorFilter: string;
  advisorFilter: string;
  onSelect: (record: ProjectRecord) => void;
  tutorialHoverRecord?: ProjectRecord | null;
  /** When set, all blocks except this footer are dimmed (mobile "View on Map" focus) */
  focusFooter?: string | null;
}

function recordMatchesAuthor(record: ProjectRecord, filter: string): boolean {
  const f = filter.toLowerCase();
  const people = [
    ...parsePeople(record.primaryAuthor),
    ...parsePeople(record.projectAuthors),
  ];
  return people.some(p => p.displayName.toLowerCase() === f);
}

function recordMatchesAdvisor(record: ProjectRecord, filter: string): boolean {
  return record.facultyAdvisor.toLowerCase() === filter.toLowerCase();
}

const FOCUS_RING = '#ffd764';
const SELECTED_COLOR = '#ffd764';

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

export function TableMap({
  records,
  selectedRecord,
  filters,
  authorFilter,
  advisorFilter,
  onSelect,
  tutorialHoverRecord,
  focusFooter,
}: TableMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [tutorialTooltip, setTutorialTooltip] = useState<TooltipState | null>(null);
  const isAdmin = useAdmin();
  const isMobile = useMobile();

  useEffect(() => {
    if (!tutorialHoverRecord) { setTutorialTooltip(null); return; }
    const timer = setTimeout(() => {
      const el = svgRef.current?.querySelector(`g[data-block-id="${tutorialHoverRecord.footer}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setTutorialTooltip({ x: r.left, y: r.bottom, record: tutorialHoverRecord });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [tutorialHoverRecord]);

  const layout = buildLayout(records);
  const rows = numRows(records.length);
  const yPositions = rowYPositions(rows);
  const svgH = svgHeight(rows);

  const handleMouseEnter = useCallback((e: React.MouseEvent, record: ProjectRecord) => {
    if (isMobile) return;
    setTooltip({ x: e.clientX, y: e.clientY, record });
  }, [isMobile]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    setTooltip(null);
  }, [isMobile]);

  const handleFocus = useCallback((e: React.FocusEvent<SVGGElement>, record: ProjectRecord) => {
    if (isMobile) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ x: rect.left + rect.width / 2, y: rect.bottom + 4, record });
  }, [isMobile]);

  const handleBlur = useCallback(() => {
    if (isMobile) return;
    setTooltip(null);
  }, [isMobile]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, record: ProjectRecord) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(record);
    }
  }, [onSelect]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Table layout map"
        role="img"
        style={{ display: 'block', userSelect: 'none' }}
      >
        {/* Row direction arrows */}
        <g id="row-arrows" aria-hidden="true">
          {Array.from({ length: rows }, (_, rowIdx) => {
            const isLTR = rowIdx % 2 === 0;
            const y = yPositions[rowIdx] + BLOCK_H / 2;
            const arrowColor = '#bbb';
            const arrowSize = 8;
            const x = PADDING + HALF_W + CENTER_GAP / 2;

            return (
              <g key={`arrow-${rowIdx}`}>
                <line x1={x - 8} y1={y} x2={x + 8} y2={y} stroke={arrowColor} strokeWidth={1.5} />
                <polygon
                  points={
                    isLTR
                      ? `${x + arrowSize},${y} ${x + arrowSize - 5},${y - 3} ${x + arrowSize - 5},${y + 3}`
                      : `${x - arrowSize},${y} ${x - arrowSize + 5},${y - 3} ${x - arrowSize + 5},${y + 3}`
                  }
                  fill={arrowColor}
                />
              </g>
            );
          })}
        </g>

        {/* Blocks */}
        {layout.map((block) => {
          const { record, side, col, row } = block;
          const color = getDepartmentColor(record.primaryAuthorDepartment);
          const x = blockX(side, col);
          const y = blockY(row, yPositions);
          const isSelected = selectedRecord?.footer === record.footer;

          const isDimmed =
            (focusFooter != null && record.footer !== focusFooter) ||
            (filters.dept !== null && record.primaryAuthorDepartment !== filters.dept) ||
            (filters.college !== null && record.unitName !== filters.college) ||
            (filters.projectType !== null && record.projectType !== filters.projectType) ||
            (filters.classification !== null && record.classification !== filters.classification) ||
            (filters.publicationConsent && record.publicationConsent !== 'Yes') ||
            (filters.useOfAI && record.useOfAI !== 'Yes') ||
            (filters.humanSubjects && !record.irbNumber) ||
            (filters.animalSubjects && !record.iacucNo) ||
            (authorFilter.trim() !== '' && !recordMatchesAuthor(record, authorFilter)) ||
            (advisorFilter.trim() !== '' && !recordMatchesAdvisor(record, advisorFilter));

          const label = truncate(record.footer, 9);

          // Badge lines for IRB / IACUC when those filters are active and record matches
          const badgeLines: string[] = [];
          if (filters.humanSubjects && record.irbNumber)
            badgeLines.push(isAdmin ? `IRB ${record.irbNumber.replace(/,/g, '')}` : 'IRB');
          if (filters.animalSubjects && record.iacucNo)
            badgeLines.push(isAdmin ? `IACUC ${record.iacucNo.replace(/,/g, '')}` : 'IACUC');

          // Publication consent icons when filter is active and record lacks consent
          const showPubIcon = filters.publicationConsent && record.publicationConsent !== 'Yes';
          const isExplicitNo = record.publicationConsent === 'No';

          // Vertical center shifts up when we have badges (to leave room at bottom)
          const labelY = badgeLines.length > 0
            ? y + BLOCK_H / 2 - 5
            : y + BLOCK_H / 2 + 1;

          return (
            <g
              key={record.footer}
              id={block.seqIndex === 0 ? 'tutorial-target-block' : undefined}
              data-block-id={record.footer}
              data-irb-block={badgeLines.length > 0 ? '' : undefined}
              data-ai-block={record.useOfAI === 'Yes' ? '' : undefined}
              role="button"
              tabIndex={0}
              aria-label={`${record.footer}: ${record.title}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(record)}
              onKeyDown={(e) => handleKeyDown(e, record)}
              onMouseEnter={(e) => handleMouseEnter(e, record)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onFocus={(e) => handleFocus(e, record)}
              onBlur={handleBlur}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              <rect
                x={x} y={y} width={BLOCK_W} height={BLOCK_H} rx={3}
                fill={color.bg}
                fillOpacity={isDimmed ? 0.22 : 1}
                stroke={isSelected ? SELECTED_COLOR : 'rgba(0,0,0,0.25)'}
                strokeWidth={isSelected ? 2.5 : 1}
                className={isSelected ? 'selected-block-rect' : undefined}
                style={{ transition: 'fill-opacity 0.15s' }}
              />

              {/* Selected indicator: top bar */}
              {isSelected && (
                <rect
                  x={x + 1} y={y + 1} width={BLOCK_W - 2} height={4} rx={2}
                  fill={SELECTED_COLOR}
                  className="selected-block-bar"
                />
              )}

              {/* Focus ring */}
              <rect
                x={x - 2} y={y - 2} width={BLOCK_W + 4} height={BLOCK_H + 4} rx={5}
                fill="none" stroke={FOCUS_RING} strokeWidth={2.5}
                style={{ visibility: 'hidden' }}
                className="focus-ring"
              />

              {/* Footer label */}
              <text
                x={x + BLOCK_W / 2}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={isSelected ? 700 : 600}
                fontFamily="Nohemi, system-ui, sans-serif"
                fill={color.text}
                fillOpacity={isDimmed ? 0.3 : 1}
                style={{ pointerEvents: 'none' }}
              >
                {label}
              </text>

              {/* IRB / IACUC badge lines */}
              {badgeLines.map((line, i) => (
                <text
                  key={line}
                  x={x + BLOCK_W / 2}
                  y={y + BLOCK_H - 4 - (badgeLines.length - 1 - i) * 10}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fontSize={8}
                  fontFamily="system-ui, monospace"
                  fill={color.text}
                  fillOpacity={isDimmed ? 0.2 : 0.82}
                  style={{ pointerEvents: 'none' }}
                >
                  {line}
                </text>
              ))}

              {/* Publication consent icons on dimmed blocks */}
              {showPubIcon && isExplicitNo && (
                <g style={{ pointerEvents: 'none' }}>
                  <line x1={x + BLOCK_W - 11} y1={y + 4} x2={x + BLOCK_W - 5} y2={y + 10}
                    stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" />
                  <line x1={x + BLOCK_W - 5} y1={y + 4} x2={x + BLOCK_W - 11} y2={y + 10}
                    stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" />
                </g>
              )}
              {showPubIcon && !isExplicitNo && (
                <circle
                  cx={x + BLOCK_W - 8} cy={y + 7} r={3.5}
                  fill="#eab308"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {tooltip && <Tooltip state={tooltip} showAIDetails={filters.useOfAI} />}
      {tutorialTooltip && createPortal(
        <Tooltip state={tutorialTooltip} showAIDetails={filters.useOfAI} zIndex={9070} />,
        document.body,
      )}

      <style>{`
        svg g[role="button"] { outline: none; }
        @keyframes selectedGlow {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(255,215,100,0.55)); }
          50%       { filter: drop-shadow(0 0 8px rgba(255,215,100,1)); }
        }
        .selected-block-rect {
          animation: selectedGlow 1.8s ease-in-out infinite;
        }
        @keyframes barShimmer {
          0%   { opacity: 0.7; }
          50%  { opacity: 1;   }
          100% { opacity: 0.7; }
        }
        .selected-block-bar {
          animation: barShimmer 1.8s ease-in-out infinite;
        }
        svg g[role="button"]:focus .focus-ring {
          visibility: visible !important;
        }
        svg g[role="button"]:hover rect:first-child {
          stroke: rgba(0,0,0,0.5) !important;
        }
      `}</style>
    </div>
  );
}

function Tooltip({
  state,
  showAIDetails,
  zIndex = 1000,
}: {
  state: TooltipState;
  showAIDetails: boolean;
  zIndex?: number;
}) {
  const { x, y, record } = state;
  const title = record.title !== '—' ? record.title : record.footer;
  const authors = record.projectAuthors !== '—'
    ? formatPeopleForTooltip(record.projectAuthors)
    : '';
  const hasAIDetails = showAIDetails && record.useOfAI === 'Yes' && record.aiDetails;

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const estW = 300;
  const estH = hasAIDetails ? 100 : 70;

  let left = x + 12;
  let top = y + 12;
  if (left + estW > viewportW - 8) left = x - estW - 8;
  if (top + estH > viewportH - 8) top = y - estH - 8;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left, top,
        width: estW,
        background: 'rgba(52,20,98,0.95)',
        color: '#f0eef8',
        borderRadius: 8,
        padding: '9px 13px',
        fontFamily: "'Nohemi', system-ui, -apple-system, sans-serif",
        fontSize: 12,
        lineHeight: 1.55,
        pointerEvents: 'none',
        zIndex,
        boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: authors || hasAIDetails ? 4 : 0 }}>
        {truncate(title, 80)}
      </div>
      {authors && (
        <div style={{ opacity: 0.75, fontSize: 11 }}>
          {truncate(authors, 80)}
        </div>
      )}
      {hasAIDetails && (
        <div style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          opacity: 0.85,
          fontSize: 11,
          fontStyle: 'italic',
          color: '#f5c842',
        }}>
          AI: {truncate(record.aiDetails, 120)}
        </div>
      )}
    </div>
  );
}
