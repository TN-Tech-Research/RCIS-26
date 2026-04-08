import { useRef, useState, useCallback } from 'react';
import { ProjectRecord, FilterState, TooltipState } from '../types';
import { getDepartmentColor } from '../utils/colorMap';
import { formatPeopleForTooltip, parsePeople } from '../utils/nameParser';
import { useAdmin } from '../contexts/AdminContext';
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

const FOCUS_RING = '#d4920c';
const SELECTED_COLOR = '#d4920c';

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
}: TableMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const isAdmin = useAdmin();

  const layout = buildLayout(records);
  const rows = numRows(records.length);
  const yPositions = rowYPositions(rows);
  const svgH = svgHeight(rows);

  const handleMouseEnter = useCallback((e: React.MouseEvent, record: ProjectRecord) => {
    setTooltip({ x: e.clientX, y: e.clientY, record });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleFocus = useCallback((e: React.FocusEvent<SVGGElement>, record: ProjectRecord) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ x: rect.left + rect.width / 2, y: rect.bottom + 4, record });
  }, []);

  const handleBlur = useCallback(() => {
    setTooltip(null);
  }, []);

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
        {Array.from({ length: rows }, (_, rowIdx) => {
          const isLTR = rowIdx % 2 === 0;
          const y = yPositions[rowIdx] + BLOCK_H / 2;
          const arrowColor = '#bbb';
          const arrowSize = 8;
          const x = PADDING + HALF_W + CENTER_GAP / 2;

          return (
            <g key={`arrow-${rowIdx}`} aria-hidden="true">
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

        {/* Blocks */}
        {layout.map((block) => {
          const { record, side, col, row } = block;
          const color = getDepartmentColor(record.primaryAuthorDepartment);
          const x = blockX(side, col);
          const y = blockY(row, yPositions);
          const isSelected = selectedRecord?.footer === record.footer;

          const isDimmed =
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

          // Vertical center shifts up when we have badges (to leave room at bottom)
          const labelY = badgeLines.length > 0
            ? y + BLOCK_H / 2 - 5
            : y + BLOCK_H / 2 + 1;

          return (
            <g
              key={record.footer}
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
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <Tooltip state={tooltip} showAIDetails={filters.useOfAI} />
      )}

      <style>{`
        svg g[role="button"] { outline: none; }
        @keyframes selectedGlow {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(212,146,12,0.55)); }
          50%       { filter: drop-shadow(0 0 8px rgba(212,146,12,1)); }
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
}: {
  state: TooltipState;
  showAIDetails: boolean;
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
        fontSize: 12,
        lineHeight: 1.55,
        pointerEvents: 'none',
        zIndex: 1000,
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
