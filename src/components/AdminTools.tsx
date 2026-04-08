import { useMemo, useRef, useState } from 'react';
import { ProjectRecord } from '../types';
import { parsePeople } from '../utils/nameParser';
import { COLLEGES, getDepartmentCollege } from '../utils/colorMap';

interface AdminToolsProps {
  filteredRecords: ProjectRecord[];
  allRecords: ProjectRecord[];
  hasActiveFilters: boolean;
  onExit: () => void;
}

function collectEmails(records: ProjectRecord[]): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const r of records) {
    const people = [
      ...parsePeople(r.primaryAuthor),
      ...parsePeople(r.projectAuthors),
    ];
    for (const p of people) {
      if (p.email && !seen.has(p.email)) {
        seen.add(p.email);
        emails.push(p.email);
      }
    }
  }
  return emails;
}

interface AdvisorEntry {
  name: string;
  projects: ProjectRecord[];
  count: number;
  college: string | null; // majority college for color hint
}

interface TooltipInfo {
  name: string;
  projects: ProjectRecord[];
  anchorY: number;
  anchorX: number;
}

export function AdminTools({ filteredRecords, allRecords, hasActiveFilters, onExit }: AdminToolsProps) {
  const [copied, setCopied] = useState(false);
  const [advisorTooltip, setAdvisorTooltip] = useState<TooltipInfo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const emails = useMemo(() => collectEmails(filteredRecords), [filteredRecords]);

  const stats = useMemo(() => {
    const byType = new Map<string, number>();
    const byClass = new Map<string, number>();
    const byDept = new Map<string, number>();
    let irbCount = 0;
    let iacucCount = 0;
    let aiCount = 0;
    let pubCount = 0;

    for (const r of filteredRecords) {
      if (r.projectType && r.projectType !== '—')
        byType.set(r.projectType, (byType.get(r.projectType) ?? 0) + 1);
      if (r.classification && r.classification !== '—')
        byClass.set(r.classification, (byClass.get(r.classification) ?? 0) + 1);
      if (r.primaryAuthorDepartment && r.primaryAuthorDepartment !== '—')
        byDept.set(r.primaryAuthorDepartment, (byDept.get(r.primaryAuthorDepartment) ?? 0) + 1);
      if (r.irbNumber) irbCount++;
      if (r.iacucNo) iacucCount++;
      if (r.useOfAI === 'Yes') aiCount++;
      if (r.publicationConsent === 'Yes') pubCount++;
    }

    return {
      byType: Array.from(byType.entries()).sort((a, b) => b[1] - a[1]),
      byClass: Array.from(byClass.entries()).sort((a, b) => b[1] - a[1]),
      byDept: Array.from(byDept.entries()).sort((a, b) => b[1] - a[1]),
      irbCount,
      iacucCount,
      aiCount,
      pubCount,
    };
  }, [filteredRecords]);

  const advisorData = useMemo((): AdvisorEntry[] => {
    const map = new Map<string, ProjectRecord[]>();
    for (const r of filteredRecords) {
      const advisor = r.facultyAdvisor && r.facultyAdvisor !== '—' ? r.facultyAdvisor.trim() : null;
      if (!advisor) continue;
      if (!map.has(advisor)) map.set(advisor, []);
      map.get(advisor)!.push(r);
    }
    return Array.from(map.entries())
      .map(([name, projects]) => {
        // Determine majority college for this advisor's current set of projects
        const collegeCounts = new Map<string, number>();
        for (const p of projects) {
          const c = getDepartmentCollege(p.primaryAuthorDepartment);
          if (c !== '?') collegeCounts.set(c, (collegeCounts.get(c) ?? 0) + 1);
        }
        let majorityCollege: string | null = null;
        let maxC = 0;
        for (const [c, cnt] of collegeCounts) {
          if (cnt > maxC) { maxC = cnt; majorityCollege = c; }
        }
        return { name, projects, count: projects.length, college: majorityCollege };
      })
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  const maxAdvisorCount = advisorData.length > 0 ? advisorData[0].count : 1;

  const advisedCount = filteredRecords.filter(r => r.facultyAdvisor && r.facultyAdvisor !== '—').length;

  async function copyEmails() {
    try {
      await navigator.clipboard.writeText(emails.join('; '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) { /* ignore */ }
  }

  const mailtoHref = emails.length > 0 && emails.length <= 50
    ? `mailto:${emails.join(',')}`
    : null;

  const viewLabel = hasActiveFilters
    ? `${filteredRecords.length} of ${allRecords.length} projects`
    : `${allRecords.length} projects (all)`;

  return (
    <div
      ref={containerRef}
      onClick={e => e.stopPropagation()}
      style={{
        width: '100%',
        maxWidth: 760,
        background: '#fff',
        borderRadius: '0 0 14px 14px',
        boxShadow: '0 12px 48px rgba(20,8,60,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid rgba(75,46,131,0.1)',
        borderTop: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        background: 'linear-gradient(135deg, #251558 0%, #4b2e83 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Admin Tools
          </span>
          <span style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.55)',
            background: 'rgba(255,255,255,0.1)',
            padding: '2px 8px',
            borderRadius: 10,
          }}>
            {viewLabel}
          </span>
        </div>
        <button
          onClick={onExit}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            color: 'rgba(255,255,255,0.8)',
            fontSize: 11.5,
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: '4px 12px',
            fontWeight: 500,
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
        >
          Exit Admin Mode
        </button>
      </div>

      {/* ── Faculty Advisor Load Report ──────────────────────────────────────── */}
      {advisorData.length > 0 && (
        <div style={{ borderBottom: '1px solid #ede9f6', padding: '14px 18px 16px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <SectionLabel>Faculty Advisor Load</SectionLabel>
            <span style={{ fontSize: 11, color: '#aaa' }}>
              {advisorData.length} advisor{advisorData.length !== 1 ? 's' : ''}
              {' · '}
              {advisedCount} project{advisedCount !== 1 ? 's' : ''} advised
            </span>
          </div>

          {/* Advisor bar rows */}
          <div
            style={{ maxHeight: 292, overflowY: 'auto', paddingRight: 2 }}
            onMouseLeave={() => setAdvisorTooltip(null)}
          >
            {advisorData.map(({ name, projects, count, college }) => {
              const pct = maxAdvisorCount > 0 ? (count / maxAdvisorCount) * 100 : 0;
              const intensity = maxAdvisorCount > 1 ? (count - 1) / (maxAdvisorCount - 1) : 1;
              const collegeInfo = college ? COLLEGES.find(c => c.prefix === college) : null;
              let barHue = 261;
              let barSat = 56;
              if (collegeInfo?.headerColor) {
                const m = collegeInfo.headerColor.match(/hsl\((\d+),\s*([\d.]+)%/);
                if (m) { barHue = parseInt(m[1]); barSat = parseFloat(m[2]); }
              }
              const barL = Math.round(70 - intensity * 28);
              const barColor = `hsl(${barHue}, ${barSat}%, ${barL}%)`;
              const isHovered = advisorTooltip?.name === name;

              return (
                <div
                  key={name}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, cursor: 'default' }}
                  onMouseEnter={e => {
                    const row = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const panelLeft = containerRef.current?.getBoundingClientRect().left ?? row.left;
                    setAdvisorTooltip({ name, projects, anchorY: row.top + row.height / 2, anchorX: panelLeft });
                  }}
                >
                  {/* Advisor name */}
                  <div style={{
                    width: 148,
                    fontSize: 11,
                    color: isHovered ? '#4b2e83' : '#444',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flexShrink: 0,
                    fontWeight: isHovered ? 600 : 400,
                    transition: 'color 0.1s, font-weight 0.1s',
                  }}>
                    {name}
                  </div>

                  {/* Bar track */}
                  <div style={{ flex: 1, height: 14, background: '#ede9f6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: barColor,
                      borderRadius: 4,
                      transition: 'width 0.35s ease, filter 0.1s',
                      filter: isHovered ? 'brightness(1.12)' : 'none',
                    }} />
                  </div>

                  {/* Count badge */}
                  <div style={{
                    fontSize: 11.5,
                    color: isHovered ? '#4b2e83' : '#666',
                    fontWeight: isHovered ? 700 : 500,
                    width: 22,
                    textAlign: 'right',
                    flexShrink: 0,
                    transition: 'color 0.1s',
                  }}>
                    {count}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating tooltip — position: fixed so it escapes scroll overflow */}
          {advisorTooltip && (
            <AdvisorTooltip
              name={advisorTooltip.name}
              projects={advisorTooltip.projects}
              anchorY={advisorTooltip.anchorY}
              anchorX={advisorTooltip.anchorX}
            />
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 0 }}>
        {/* Email tools column */}
        <div style={{ flex: 1, padding: '16px 18px', borderRight: '1px solid #ede9f6' }}>
          <SectionLabel>Mass Email</SectionLabel>
          {emails.length === 0 ? (
            <div style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>
              No email addresses in current view.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#555' }}>
                <strong style={{ color: '#333' }}>{emails.length}</strong> unique author email{emails.length !== 1 ? 's' : ''} in current view
              </div>

              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                <button
                  onClick={copyEmails}
                  style={{
                    padding: '6px 13px',
                    borderRadius: 7,
                    border: '1.5px solid #4b2e83',
                    background: copied ? '#e8f5e9' : '#f0eeff',
                    color: copied ? '#2e7d32' : '#4b2e83',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {copied ? '✓ Copied!' : 'Copy all emails'}
                </button>
                {mailtoHref && (
                  <a
                    href={mailtoHref}
                    style={{
                      padding: '6px 13px',
                      borderRadius: 7,
                      border: '1.5px solid #ddd',
                      background: '#fafafe',
                      color: '#444',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                  >
                    Open in mail client
                  </a>
                )}
              </div>

              {emails.length > 50 && (
                <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>
                  "Open in mail client" disabled for large lists — use Copy instead.
                </div>
              )}

              <textarea
                readOnly
                value={emails.join(';\n')}
                rows={4}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                  fontSize: 10.5,
                  color: '#555',
                  border: '1px solid #e0daea',
                  borderRadius: 6,
                  padding: '6px 8px',
                  resize: 'vertical',
                  background: '#faf8ff',
                  lineHeight: 1.6,
                }}
              />
            </div>
          )}
        </div>

        {/* Stats column */}
        <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <SectionLabel>Flags</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <StatPill label="IRB" count={stats.irbCount} total={filteredRecords.length} color="#2563eb" />
              <StatPill label="IACUC" count={stats.iacucCount} total={filteredRecords.length} color="#9a3b12" />
              <StatPill label="AI Use" count={stats.aiCount} total={filteredRecords.length} color="#c47b00" />
              <StatPill label="Pub. Consent" count={stats.pubCount} total={filteredRecords.length} color="#16a34a" />
            </div>
          </div>

          <div>
            <SectionLabel>By Project Type</SectionLabel>
            <PieChart items={stats.byType} total={filteredRecords.length} />
          </div>

          <div>
            <SectionLabel>By Classification</SectionLabel>
            <BarList items={stats.byClass} total={filteredRecords.length} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10.5,
      fontWeight: 700,
      color: '#aaa',
      textTransform: 'uppercase',
      letterSpacing: '0.09em',
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function StatPill({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{
      padding: '4px 10px',
      borderRadius: 20,
      background: `${color}12`,
      border: `1.5px solid ${color}44`,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11.5,
    }}>
      <span style={{ fontWeight: 700, color }}>{count}</span>
      <span style={{ color: '#777' }}>{label}</span>
      <span style={{ color: '#bbb', fontSize: 10 }}>({pct}%)</span>
    </div>
  );
}

function BarList({ items, total }: { items: [string, number][]; total: number }) {
  if (items.length === 0) return <div style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>—</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map(([label, count]) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 90, fontSize: 11, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
              {label}
            </div>
            <div style={{ flex: 1, height: 6, background: '#ede9f6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#4b2e83', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#888', width: 24, textAlign: 'right', flexShrink: 0 }}>
              {count}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PieChart({ items, total }: { items: [string, number][]; total: number }) {
  if (items.length === 0) return <div style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>—</div>;

  // Two lavender gradient tones: dark fill → light fill
  const DARK = { inner: '#b39ddb', outer: '#6b46b5' };
  const LIGHT = { inner: '#f0ecff', outer: '#c9bbec' };
  const tones = [DARK, LIGHT];

  const size = 90;
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  let angle = -Math.PI / 2;

  const segments = items.map(([label, count], i) => {
    const fraction = total > 0 ? count / total : 0;
    const sweep = fraction * 2 * Math.PI;
    const start = angle;
    angle += sweep;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const path = fraction >= 1
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const tone = tones[i % tones.length];
    const gradId = `pie-grad-${i}`;
    return { label, count, path, tone, gradId };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <defs>
          {segments.map(({ tone, gradId }) => (
            <radialGradient key={gradId} id={gradId} cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor={tone.inner} />
              <stop offset="100%" stopColor={tone.outer} />
            </radialGradient>
          ))}
        </defs>
        {segments.map(({ path, gradId }) => (
          <path key={gradId} d={path} fill={`url(#${gradId})`} />
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map(({ label, count, tone }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: tone.outer, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#555' }}>{label}</span>
            <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdvisorTooltip({
  name, projects, anchorY, anchorX,
}: {
  name: string;
  projects: ProjectRecord[];
  anchorY: number;
  anchorX: number;
}) {
  const tooltipW = 310;
  // Clamp so tooltip stays within viewport vertically
  const tooltipH = Math.min(projects.length * 22 + 44, 280);
  const top = Math.min(Math.max(anchorY - tooltipH / 2, 8), window.innerHeight - tooltipH - 8);
  // Right edge of tooltip + its shadow clears the admin tools panel left edge
  const left = Math.max(anchorX - 20 - tooltipW, 4);

  return (
    <div style={{
      position: 'fixed',
      left,
      top,
      width: tooltipW,
      background: '#fff',
      border: '1px solid #d0c8ee',
      borderRadius: 10,
      boxShadow: '0 6px 24px rgba(75,46,131,0.2), 0 1px 4px rgba(0,0,0,0.08)',
      padding: '10px 12px',
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      {/* Tooltip header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#4b2e83', flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#4b2e83',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {name}
        </span>
        <div style={{
          marginLeft: 'auto',
          fontSize: 10.5,
          fontWeight: 700,
          color: '#4b2e83',
          background: 'rgba(75,46,131,0.1)',
          padding: '1px 7px',
          borderRadius: 10,
          flexShrink: 0,
        }}>
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Project list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 220, overflowY: 'auto' }}>
        {projects.map(p => (
          <div key={p.footer} style={{ display: 'flex', gap: 7, alignItems: 'baseline' }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: 9.5,
              color: '#888',
              flexShrink: 0,
              letterSpacing: '0.02em',
            }}>
              {p.footer}
            </span>
            <span style={{
              fontSize: 10.5,
              color: '#333',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {p.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
