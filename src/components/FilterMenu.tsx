import { useMemo } from 'react';
import { FilterState, DEFAULT_FILTERS, ProjectRecord } from '../types';
import { DeptStat, CollegeInfo, COLLEGES } from '../utils/colorMap';

import aheIcon from '../assets/AHE.png';
import ascIcon from '../assets/ASC.png';
import ceiIcon from '../assets/CEI.png';
import cobIcon from '../assets/COB.png';
import eduIcon from '../assets/EDU.png';
import engIcon from '../assets/ENG.png';
import nurIcon from '../assets/NUR.png';

export type FilterTab = 'dept' | 'college' | 'project';

interface FilterMenuProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  deptStats: DeptStat[];
  records: ProjectRecord[];
  onClose: () => void;
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
}

// ─── College icon helpers ──────────────────────────────────────────────────────

const COLLEGE_ICON_MAP: Record<string, string> = {
  AHE: aheIcon,
  ASC: ascIcon,
  CEI: ceiIcon,
  COB: cobIcon,
  EDU: eduIcon,
  ENG: engIcon,
  NUR: nurIcon,
};

// The icon PNGs use a consistent purple palette (~hue 265).
// hue-rotate shifts to the target hue; saturate + brightness tighten the match.
const ICON_BASE_HUE = 265;

function getIconFilter(headerColor: string): string {
  const m = headerColor.match(/hsl\(\s*(\d+)/);
  const targetHue = m ? parseInt(m[1]) : ICON_BASE_HUE;
  const rotation = targetHue - ICON_BASE_HUE;
  return `hue-rotate(${rotation}deg) saturate(1.4) brightness(0.97)`;
}

// Speech-bubble icon tinted to the college colour.
// The badge prefix sits in the transparent area left of the bottom tail.
function CollegeIcon({
  prefix,
  headerColor,
  size = 32,
  showLabel = true,
}: {
  prefix: string;
  headerColor: string;
  size?: number;
  showLabel?: boolean;
}) {
  const icon = COLLEGE_ICON_MAP[prefix];
  if (!icon) return null;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <img
        src={icon}
        alt={prefix}
        draggable={false}
        style={{
          width: size,
          height: size,
          display: 'block',
          filter: getIconFilter(headerColor),
          userSelect: 'none',
        }}
      />
      {showLabel && (
        <span style={{
          position: 'absolute',
          bottom: Math.round(size * -0.08),
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(52,20,98,0.92)',
          color: '#fff',
          borderRadius: 99,
          padding: `${Math.round(size * 0.025)}px ${Math.round(size * 0.09)}px`,
          fontSize: Math.round(size * 0.21),
          fontWeight: 700,
          lineHeight: 1.4,
          letterSpacing: '0.04em',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {prefix}
        </span>
      )}
    </div>
  );
}

// ─── FilterMenu ───────────────────────────────────────────────────────────────

export function FilterMenu({ filters, onChange, deptStats, records, onClose, activeTab, onTabChange }: FilterMenuProps) {

  const hasActive = Object.values(filters).some(v => v !== null && v !== false);

  const tabs: [FilterTab, string][] = [
    ['dept', 'Advisor Department'],
    ['college', 'College'],
    ['project', 'Project Type'],
  ];

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        width: '100%',
        maxWidth: 940,
        background: '#fff',
        borderRadius: '0 0 14px 14px',
        boxShadow: '0 12px 48px rgba(20,8,60,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid rgba(75,46,131,0.1)',
        borderTop: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: '1px solid #ede9f6',
        padding: '0 8px',
        background: '#faf8ff',
      }}>
        {tabs.map(([tab, label]) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              id={`filter-tab-${tab}`}
              onClick={() => onTabChange(tab)}
              style={{
                padding: '11px 20px 10px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2.5px solid #4b2e83' : '2.5px solid transparent',
                marginBottom: '-1px',
                color: isActive ? '#4b2e83' : '#999',
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.01em',
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          );
        })}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {hasActive && (
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              style={{
                alignSelf: 'center',
                padding: '5px 12px',
                background: 'none',
                border: '1px solid #e0daea',
                borderRadius: 6,
                color: '#999',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close filters"
            style={{
              background: 'none',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              color: 'rgba(0,0,0,0.3)',
              lineHeight: 1,
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.07)'; e.currentTarget.style.color = '#111'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(0,0,0,0.3)'; }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '14px 18px 18px' }}>
        {activeTab === 'dept' && (
          <DeptTab deptStats={deptStats} filters={filters} onChange={onChange} />
        )}
        {activeTab === 'college' && (
          <CollegeTab records={records} filters={filters} onChange={onChange} />
        )}
        {activeTab === 'project' && (
          <ProjectTab records={records} filters={filters} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

// ─── Advisor Department tab ───────────────────────────────────────────────────

function DeptTab({
  deptStats,
  filters,
  onChange,
}: {
  deptStats: DeptStat[];
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const byCollege = useMemo(() => {
    const map = new Map<string, DeptStat[]>();
    for (const item of deptStats) {
      const list = map.get(item.college) ?? [];
      list.push(item);
      map.set(item.college, list);
    }
    return map;
  }, [deptStats]);

  return (
    <div id="filter-dept-content" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {COLLEGES.map((college: CollegeInfo) => {
        const depts = byCollege.get(college.prefix);
        if (!depts || depts.length === 0) return null;
        return (
          <div key={college.prefix} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <div style={{ flexShrink: 0, paddingTop: 2 }}>
              <CollegeIcon prefix={college.prefix} headerColor={college.headerColor} size={32} showLabel={true} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {depts.map(({ dept, count, color }) => {
              const isActive = filters.dept === dept;
              const isDimmed = filters.dept !== null && !isActive;
              return (
                <button
                  key={dept}
                  onClick={() => onChange({ ...filters, dept: isActive ? null : dept })}
                  title={`${dept} — ${count} project${count !== 1 ? 's' : ''}`}
                  aria-pressed={isActive}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px',
                    borderRadius: 5,
                    border: isActive ? '2px solid rgba(0,0,0,0.4)' : '1px solid rgba(0,0,0,0.18)',
                    background: color.bg,
                    cursor: 'pointer',
                    opacity: isDimmed ? 0.3 : 1,
                    fontFamily: 'inherit', fontSize: 11, color: color.text,
                    transition: 'opacity 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dept}
                  <span style={{ opacity: 0.6 }}>({count})</span>
                </button>
              );
            })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── College tab ──────────────────────────────────────────────────────────────

function CollegeTab({
  records,
  filters,
  onChange,
}: {
  records: ProjectRecord[];
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const collegeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of records) {
      if (r.unitName) counts.set(r.unitName, (counts.get(r.unitName) ?? 0) + 1);
    }
    return counts;
  }, [records]);

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      overflowX: 'auto',
      paddingBottom: 4,
      scrollbarWidth: 'thin',
    }}>
      {COLLEGES.map(college => {
        const count = collegeCounts.get(college.unitName) ?? 0;
        if (!count) return null;
        const isActive = filters.college === college.unitName;
        const isDimmed = filters.college !== null && !isActive;
        return (
          <button
            key={college.prefix}
            onClick={() => onChange({ ...filters, college: isActive ? null : college.unitName })}
            aria-pressed={isActive}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              padding: '10px 10px 8px',
              borderRadius: 10,
              border: isActive ? `2.5px solid ${college.headerColor}` : '1.5px solid #e0daea',
              background: isActive ? `color-mix(in srgb, ${college.headerColor} 18%, #fff)` : '#d9c6f7',
              cursor: 'pointer',
              opacity: isDimmed ? 0.3 : 1,
              fontFamily: 'inherit',
              minWidth: 92,
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            <CollegeIcon prefix={college.prefix} headerColor={college.headerColor} size={82} showLabel={true} />
            <div style={{
              fontSize: 10.5,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#1a1a2e' : '#555',
              textAlign: 'center',
              lineHeight: 1.3,
              maxWidth: 108,
            }}>
              {college.name}
            </div>
            <div style={{ fontSize: 10, color: '#999' }}>({count})</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Project Type tab ─────────────────────────────────────────────────────────

function ProjectTab({
  records,
  filters,
  onChange,
}: {
  records: ProjectRecord[];
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const projectTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of records) {
      if (r.projectType && r.projectType !== '—')
        counts.set(r.projectType, (counts.get(r.projectType) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [records]);

  const classificationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of records) {
      if (r.classification && r.classification !== '—')
        counts.set(r.classification, (counts.get(r.classification) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [records]);

  const pubConsentCount = useMemo(
    () => records.filter(r => r.publicationConsent === 'Yes').length,
    [records]
  );
  const useOfAICount = useMemo(
    () => records.filter(r => r.useOfAI === 'Yes').length,
    [records]
  );
  const humanSubjectsCount = useMemo(
    () => records.filter(r => !!r.irbNumber).length,
    [records]
  );
  const animalSubjectsCount = useMemo(
    () => records.filter(r => !!r.iacucNo).length,
    [records]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Project Type */}
      <FilterSection id="filter-project-type-section" label="Project Type">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {projectTypeCounts.map(([type, count]) => (
            <SelectChip
              key={type}
              label={type}
              count={count}
              isActive={filters.projectType === type}
              isDimmed={filters.projectType !== null && filters.projectType !== type}
              onClick={() =>
                onChange({ ...filters, projectType: filters.projectType === type ? null : type })
              }
            />
          ))}
        </div>
      </FilterSection>

      {/* Classification */}
      <FilterSection label="Primary Author's Classification">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {classificationCounts.map(([cls, count]) => (
            <SelectChip
              key={cls}
              label={cls}
              count={count}
              isActive={filters.classification === cls}
              isDimmed={filters.classification !== null && filters.classification !== cls}
              onClick={() =>
                onChange({ ...filters, classification: filters.classification === cls ? null : cls })
              }
            />
          ))}
        </div>
      </FilterSection>

      {/* Highlight toggles */}
      <FilterSection id="filter-highlights-section" label="Highlights">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <ToggleChip
            label="Publication Consent"
            count={pubConsentCount}
            hint="Highlights projects with publication consent"
            accentColor="#16a34a"
            isActive={filters.publicationConsent}
            onClick={() => onChange({ ...filters, publicationConsent: !filters.publicationConsent })}
          />
          <ToggleChip
            label="Use of AI"
            count={useOfAICount}
            hint="Highlights AI-assisted projects — hover blocks to see AI details"
            accentColor="#c47b00"
            isActive={filters.useOfAI}
            onClick={() => onChange({ ...filters, useOfAI: !filters.useOfAI })}
          />
          <ToggleChip
            label="Human Subjects"
            count={humanSubjectsCount}
            hint="Highlights projects with IRB approval — shows IRB number on table block"
            accentColor="#2563eb"
            isActive={filters.humanSubjects}
            onClick={() => onChange({ ...filters, humanSubjects: !filters.humanSubjects })}
          />
          <ToggleChip
            label="Animal Subjects"
            count={animalSubjectsCount}
            hint="Highlights projects with IACUC approval — shows IACUC number on table block"
            accentColor="#9a3b12"
            isActive={filters.animalSubjects}
            onClick={() => onChange({ ...filters, animalSubjects: !filters.animalSubjects })}
          />
        </div>
      </FilterSection>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function FilterSection({ label, children, id }: { label: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id}>
      <div style={{
        fontSize: 10.5,
        fontWeight: 700,
        color: '#aaa',
        textTransform: 'uppercase',
        letterSpacing: '0.09em',
        marginBottom: 8,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function SelectChip({
  label,
  count,
  isActive,
  isDimmed,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  isDimmed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      style={{
        padding: '5px 13px',
        borderRadius: 20,
        border: isActive ? '2px solid #4b2e83' : '1.5px solid #e0daea',
        background: isActive ? '#ede8ff' : '#fafafe',
        color: isActive ? '#3a2070' : '#555',
        fontWeight: isActive ? 600 : 400,
        fontSize: 12.5,
        cursor: 'pointer',
        fontFamily: 'inherit',
        opacity: isDimmed ? 0.3 : 1,
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {label}
      <span style={{ opacity: 0.55, fontSize: 11 }}>({count})</span>
    </button>
  );
}

function ToggleChip({
  label,
  count,
  isActive,
  onClick,
  accentColor,
  hint,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  accentColor: string;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={hint}
      aria-pressed={isActive}
      style={{
        padding: '5px 13px',
        borderRadius: 20,
        border: isActive ? `2px solid ${accentColor}` : '1.5px solid #e0daea',
        background: isActive ? `${accentColor}18` : '#fafafe',
        color: isActive ? accentColor : '#555',
        fontWeight: isActive ? 600 : 400,
        fontSize: 12.5,
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.15s',
      }}
    >
      {isActive && (
        <span style={{
          width: 7, height: 7,
          borderRadius: '50%',
          background: accentColor,
          display: 'block',
          flexShrink: 0,
        }} />
      )}
      {label}
      <span style={{ opacity: 0.55, fontSize: 11 }}>({count})</span>
    </button>
  );
}
