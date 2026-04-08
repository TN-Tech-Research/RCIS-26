import { useMemo, useState } from 'react';
import { FilterState, DEFAULT_FILTERS, ProjectRecord } from '../types';
import { DeptStat, CollegeInfo, COLLEGES } from '../utils/colorMap';

type FilterTab = 'dept' | 'college' | 'project';

interface FilterMenuProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  deptStats: DeptStat[];
  records: ProjectRecord[];
  onClose: () => void;
}

export function FilterMenu({ filters, onChange, deptStats, records, onClose }: FilterMenuProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('dept');

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
              onClick={() => setActiveTab(tab)}
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', alignItems: 'flex-start' }}>
      {COLLEGES.map((college: CollegeInfo) => {
        const depts = byCollege.get(college.prefix);
        if (!depts || depts.length === 0) return null;
        return (
          <div key={college.prefix} style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#fff',
              background: college.headerColor,
              padding: '2px 7px', borderRadius: 4,
              whiteSpace: 'nowrap', letterSpacing: '0.04em',
            }}>
              {college.prefix}
            </span>
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
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [records]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {collegeCounts.map(([name, count]) => {
        const isActive = filters.college === name;
        const isDimmed = filters.college !== null && !isActive;
        return (
          <button
            key={name}
            onClick={() => onChange({ ...filters, college: isActive ? null : name })}
            aria-pressed={isActive}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: isActive ? '2px solid #4b2e83' : '1.5px solid #e0daea',
              background: isActive ? '#ede8ff' : '#fafafe',
              color: isActive ? '#3a2070' : '#555',
              fontWeight: isActive ? 600 : 400,
              fontSize: 12.5,
              cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: isDimmed ? 0.35 : 1,
              transition: 'all 0.15s',
            }}
          >
            {name}
            <span style={{ marginLeft: 7, opacity: 0.55, fontSize: 11 }}>({count})</span>
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
      <FilterSection label="Project Type">
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
      <FilterSection label="Highlights">
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

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
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
