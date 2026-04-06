import { useRef, useState, useCallback } from 'react';
import { ProjectRecord, TooltipState } from '../types';
import { getDepartmentColor } from '../utils/colorMap';
import { formatPeopleForTooltip, parsePeople } from '../utils/nameParser';
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
  highlightedDept: string | null;
  authorFilter: string;
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

const FOCUS_RING = '#0057b7';
const SELECTED_STROKE = '#111';

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

export function TableMap({ records, selectedRecord, highlightedDept, authorFilter, onSelect }: TableMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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
    <div style={{ position: 'relative' }}>
      {/* Direction indicators */}
      <svg
        ref={svgRef}
        width={SVG_W}
        height={svgH}
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        aria-label="Table layout map"
        role="img"
        style={{ display: 'block', userSelect: 'none' }}
      >
        {/* Row direction arrows (subtle) */}
        {Array.from({ length: rows }, (_, rowIdx) => {
          const isLTR = rowIdx % 2 === 0;
          const y = yPositions[rowIdx] + BLOCK_H / 2;
          const arrowColor = '#bbb';
          const arrowSize = 8;

          if (isLTR) {
            const x = PADDING + HALF_W + CENTER_GAP / 2;
            return (
              <g key={`arrow-${rowIdx}`} aria-hidden="true">
                <line x1={x - 8} y1={y} x2={x + 8} y2={y} stroke={arrowColor} strokeWidth={1.5} />
                <polygon
                  points={`${x + arrowSize},${y} ${x + arrowSize - 5},${y - 3} ${x + arrowSize - 5},${y + 3}`}
                  fill={arrowColor}
                />
              </g>
            );
          } else {
            const x = PADDING + HALF_W + CENTER_GAP / 2;
            return (
              <g key={`arrow-${rowIdx}`} aria-hidden="true">
                <line x1={x - 8} y1={y} x2={x + 8} y2={y} stroke={arrowColor} strokeWidth={1.5} />
                <polygon
                  points={`${x - arrowSize},${y} ${x - arrowSize + 5},${y - 3} ${x - arrowSize + 5},${y + 3}`}
                  fill={arrowColor}
                />
              </g>
            );
          }
        })}

        {/* Blocks */}
        {layout.map((block) => {
          const { record, side, col, row } = block;
          const color = getDepartmentColor(record.primaryAuthorDepartment);
          const x = blockX(side, col);
          const y = blockY(row, yPositions);
          const isSelected = selectedRecord?.footer === record.footer;
          const isDimmed =
            (highlightedDept !== null && record.primaryAuthorDepartment !== highlightedDept) ||
            (authorFilter.trim() !== '' && !recordMatchesAuthor(record, authorFilter));
          const label = truncate(record.footer, 9);

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
                x={x}
                y={y}
                width={BLOCK_W}
                height={BLOCK_H}
                rx={3}
                fill={color.bg}
                fillOpacity={isDimmed ? 0.25 : 1}
                stroke={isSelected ? SELECTED_STROKE : 'rgba(0,0,0,0.25)'}
                strokeWidth={isSelected ? 2.5 : 1}
                style={{ transition: 'fill-opacity 0.15s' }}
              />
              {/* Selected indicator: top bar */}
              {isSelected && (
                <rect
                  x={x + 1}
                  y={y + 1}
                  width={BLOCK_W - 2}
                  height={4}
                  rx={2}
                  fill={SELECTED_STROKE}
                />
              )}
              {/* Focus ring via filter trick — drawn as overlay rect */}
              <rect
                x={x - 2}
                y={y - 2}
                width={BLOCK_W + 4}
                height={BLOCK_H + 4}
                rx={5}
                fill="none"
                stroke={FOCUS_RING}
                strokeWidth={2.5}
                style={{ visibility: 'hidden' }}
                className="focus-ring"
              />
              <text
                x={x + BLOCK_W / 2}
                y={y + BLOCK_H / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={isSelected ? 700 : 600}
                fontFamily="system-ui, sans-serif"
                fill={color.text}
                fillOpacity={isDimmed ? 0.35 : 1}
                style={{ pointerEvents: 'none' }}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <Tooltip state={tooltip} />
      )}

      <style>{`
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

function Tooltip({ state }: { state: TooltipState }) {
  const { x, y, record } = state;
  const title = record.title !== '—' ? record.title : record.footer;
  const authors = record.projectAuthors !== '—' ? formatPeopleForTooltip(record.projectAuthors) : '';

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const estW = 280;
  const estH = 70;

  let left = x + 12;
  let top = y + 12;
  if (left + estW > viewportW - 8) left = x - estW - 8;
  if (top + estH > viewportH - 8) top = y - estH - 8;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left,
        top,
        width: estW,
        background: 'rgba(20,20,30,0.92)',
        color: '#f0f0f5',
        borderRadius: 6,
        padding: '8px 12px',
        fontSize: 12,
        lineHeight: 1.5,
        pointerEvents: 'none',
        zIndex: 1000,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: authors ? 4 : 0 }}>
        {truncate(title, 80)}
      </div>
      {authors && (
        <div style={{ opacity: 0.8, fontSize: 11 }}>
          {truncate(authors, 80)}
        </div>
      )}
    </div>
  );
}
