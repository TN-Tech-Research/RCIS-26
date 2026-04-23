import { useState, useMemo } from 'react';
import { ProjectRecord } from '../types';
import type { AvgScoreMap } from '../utils/avgScoreParser';
import type { JudgeInfo, JudgesByProject } from '../utils/judgesParser';
import {
  calcAwards,
  bucketClassification,
  type AwardGroup,
  type ClassBucket,
} from '../utils/awardsCalc';
import { COLLEGES, getDepartmentCollege } from '../utils/colorMap';
import { parsePeople } from '../utils/nameParser';

const FONT = "'Nohemi', system-ui, -apple-system, sans-serif";

const CLASS_COLS: ClassBucket[] = ['Undergraduate', "Master's", 'PhD'];
const CLASS_LABELS: Record<ClassBucket, string> = {
  'Undergraduate': 'Undergrad',
  "Master's": "Master's",
  'PhD': 'PhD',
};

// ── Local styled helpers ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, color: '#aaa',
      textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function StatPill({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 20,
      background: `${color}18`, border: `1.5px solid ${color}44`,
      fontSize: 11.5,
    }}>
      <span style={{ fontWeight: 700, color }}>{value}</span>
      <span style={{ color: '#777' }}>{label}</span>
    </div>
  );
}

function CollegeBadge({ college }: { college: string }) {
  const info = COLLEGES.find(c => c.prefix === college);
  if (!info) return <span style={{ fontSize: 9.5, color: '#bbb' }}>?</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '1px 6px',
      borderRadius: 4, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em',
      background: info.headerColor, color: '#1a1228', flexShrink: 0,
    }}>
      {college}
    </span>
  );
}

// ── Award classification cell ─────────────────────────────────────────────────

function AwardCell({ group }: { group: AwardGroup | undefined }) {
  if (!group) {
    return <div style={{ color: '#ddd', fontSize: 12, padding: '10px 0', textAlign: 'center' as const }}>—</div>;
  }

  const { numBaseAwards, allProjects, eligibleCount, scoredCount, winners, isComplete } = group;
  const pendingCount = eligibleCount - scoredCount;

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1228', marginBottom: 1 }}>
        {numBaseAwards} project award{numBaseAwards !== 1 ? 's' : ''}
      </div>
      <div style={{ fontSize: 10, color: '#999', marginBottom: 6 }}>
        {allProjects.length} project{allProjects.length !== 1 ? 's' : ''}
      </div>

      {winners.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 5 }}>
          {winners.map(w => (
            <div key={w.record.footer} style={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
              <span style={{ color: '#d4920c', fontSize: 9, flexShrink: 0, marginTop: 2 }}>★</span>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#4b2e83', fontFamily: 'monospace' }}>
                  {w.record.footer}
                </span>
                <span style={{ fontSize: 9.5, color: '#888', marginLeft: 4 }}>
                  {w.score}pts · {w.authorCount} auth.
                </span>
                {w.isTied && (
                  <span style={{
                    marginLeft: 4, fontSize: 8, fontWeight: 700,
                    color: '#92610a', background: '#fef3c7',
                    borderRadius: 3, padding: '0 3px',
                  }}>TIE</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isComplete ? (
        <div style={{ fontSize: 9.5, color: '#16a34a', fontWeight: 600 }}>✓ Final</div>
      ) : pendingCount > 0 ? (
        <div style={{ fontSize: 9.5, color: '#c47b00', fontStyle: 'italic' as const }}>
          {pendingCount} pending{winners.length > 0 ? ' · provisional' : ''}
        </div>
      ) : (
        <div style={{ fontSize: 9.5, color: '#bbb', fontStyle: 'italic' as const }}>Awaiting scores</div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AwardsTabProps {
  allRecords: ProjectRecord[];
  avgScoreMap: AvgScoreMap;
  judgesByProject: JudgesByProject;
}

function uniqueAuthors(record: ProjectRecord) {
  const seen = new Set<string>();
  return [...parsePeople(record.primaryAuthor), ...parsePeople(record.projectAuthors)].filter(p => {
    const key = p.email ?? p.displayName;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function csvField(s: string) {
  return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function AwardsTab({ allRecords, avgScoreMap, judgesByProject }: AwardsTabProps) {
  const [emailsOpen, setEmailsOpen] = useState(false);
  const [winnerEmailsOpen, setWinnerEmailsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  }

  const awardGroups = useMemo(
    () => calcAwards(allRecords, avgScoreMap),
    [allRecords, avgScoreMap],
  );

  // Not in map at all = pending scoring; in map with null avgScore = no-show (excluded)
  const needsJudging = useMemo(
    () => allRecords
      .filter(r => !avgScoreMap.has(r.footer))
      .sort((a, b) => a.footer.localeCompare(b.footer)),
    [allRecords, avgScoreMap],
  );

  const pendingByJudge = useMemo(() => {
    const map = new Map<string, { judge: JudgeInfo; projects: ProjectRecord[] }>();
    for (const project of needsJudging) {
      for (const judge of (judgesByProject.get(project.footer) ?? [])) {
        if (!map.has(judge.email)) map.set(judge.email, { judge, projects: [] });
        map.get(judge.email)!.projects.push(project);
      }
    }
    return [...map.values()].sort((a, b) => a.judge.displayName.localeCompare(b.judge.displayName));
  }, [needsJudging, judgesByProject]);

  const totalBaseAwards = awardGroups.reduce((s, g) => s + g.numBaseAwards, 0);
  const totalCertificates = awardGroups.reduce(
    (s, g) => s + g.winners.reduce((ws, w) => ws + w.authorCount, 0),
    0,
  );

  // Group awardGroups by department for the preview table
  const deptRows = useMemo(() => {
    const byDept = new Map<string, { college: string; groups: Map<ClassBucket, AwardGroup> }>();
    for (const g of awardGroups) {
      if (!byDept.has(g.department)) byDept.set(g.department, { college: g.college, groups: new Map() });
      byDept.get(g.department)!.groups.set(g.classification, g);
    }
    return [...byDept.entries()].map(([dept, { college, groups }]) => ({ dept, college, groups }));
  }, [awardGroups]);

  const winnerEmailEntries = useMemo(() =>
    awardGroups.flatMap(g =>
      g.winners.map(w => ({
        record: w.record,
        department: g.department,
        college: g.college,
        classification: g.classification,
        score: w.score,
        isTied: w.isTied,
        authors: uniqueAuthors(w.record),
      }))
    ),
    [awardGroups],
  );

  function downloadAwardsCsv() {
    const header = ['College', 'Department', 'Classification', 'Project', 'Avg Score', 'Title', 'Authors', 'Tied'];
    const dataRows = awardGroups.flatMap(g =>
      g.winners.map(w => {
        const authors = uniqueAuthors(w.record);
        return [
          g.college,
          g.department,
          g.classification,
          w.record.footer,
          String(w.score),
          w.record.title !== '—' ? w.record.title : '',
          authors.map(p => p.email ? `${p.displayName} (${p.email})` : p.displayName).join('; '),
          w.isTied ? 'Yes' : '',
        ];
      })
    );
    const csv = [header, ...dataRows].map(row => row.map(csvField).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rcis2026_awards.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function winnerEmailBody(record: ProjectRecord, authorNames: string, department: string, classification: ClassBucket): string {
    const title = record.title !== '—' ? `"${record.title}"` : record.footer;
    return `Dear ${authorNames},\n\nCongratulations! Your project ${title} (${record.footer}) has been selected to receive an award at RCIS 2026 in the ${classification} category for ${department}.\n\nWe will follow up with details about the award ceremony and certificate distribution.\n\nCongratulations,\nRCIS 2026 Committee`;
  }

  function judgeEmailBody(judge: JudgeInfo, projects: ProjectRecord[]): string {
    const projLines = projects
      .map(p => `  • ${p.footer}: ${p.title !== '—' ? p.title : '(no title)'}`)
      .join('\n');
    return `Dear ${judge.displayName},\n\nThis is a reminder that the following project(s) in your RCIS 2026 assignment have not yet been scored:\n\n${projLines}\n\nPlease submit your evaluations at your earliest convenience.\n\nThank you,\nRCIS 2026 Committee`;
  }

  function judgeTextBlock(judge: JudgeInfo, projects: ProjectRecord[]): string {
    return `To: ${judge.email}\nSubject: RCIS 2026 — Scoring Reminder\n\n${judgeEmailBody(judge, projects)}`;
  }

  const allJudgesText = pendingByJudge
    .map(({ judge, projects }) => judgeTextBlock(judge, projects))
    .join('\n\n────────────────────────────────────────\n\n');

  const allScored = needsJudging.length === 0;

  return (
    <div style={{ fontFamily: FONT }}>

      {/* ── Summary pills ── */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap' as const,
        padding: '12px 18px',
        borderBottom: '1px solid #ede9f6',
        background: 'rgba(248,246,255,0.6)',
      }}>
        <StatPill value={String(totalBaseAwards)} label="project awards" color="#4b2e83" />
        {totalCertificates > 0 && (
          <StatPill value={String(totalCertificates)} label="trophies" color="#d4920c" />
        )}
      </div>

      {/* ── Judging Status ── */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #ede9f6' }}>
        <SectionLabel>Judging Status</SectionLabel>

        {allScored ? (
          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✓</span>
            <span>All eligible projects have been scored</span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11.5, color: '#666', marginBottom: 8 }}>
              <strong style={{ color: '#c47b00' }}>{needsJudging.length}</strong>
              {' '}project{needsJudging.length !== 1 ? 's' : ''} pending scores
            </div>

            <div style={{
              maxHeight: 216, overflowY: 'auto',
              border: '1px solid #ede9f6', borderRadius: 8,
              background: '#faf8ff', marginBottom: 10,
            }}>
              {needsJudging.map(r => {
                const college = getDepartmentCollege(r.primaryAuthorDepartment);
                const bucket = bucketClassification(r.classification);
                return (
                  <div key={r.footer} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '6px 10px',
                    borderBottom: '1px solid rgba(75,46,131,0.05)',
                  }}>
                    <CollegeBadge college={college} />
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, color: '#4b2e83',
                      fontFamily: 'monospace', flexShrink: 0,
                    }}>
                      {r.footer}
                    </span>
                    <span style={{
                      fontSize: 10.5, color: '#555', flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                    }}>
                      {r.title !== '—' ? r.title : r.primaryAuthor}
                    </span>
                    {bucket && (
                      <span style={{
                        fontSize: 9, fontWeight: 600, color: '#9990b0',
                        background: 'rgba(75,46,131,0.08)', borderRadius: 3,
                        padding: '1px 5px', flexShrink: 0,
                      }}>
                        {CLASS_LABELS[bucket]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Reminder emails collapsible */}
        {pendingByJudge.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setEmailsOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                background: 'none', border: 'none', padding: 0,
                fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: '#4b2e83',
              }}
            >
              <span style={{
                fontSize: 8, display: 'inline-block',
                transition: 'transform 0.15s',
                transform: emailsOpen ? 'rotate(90deg)' : 'none',
              }}>▶</span>
              Compose Reminder Emails ({pendingByJudge.length} judge{pendingByJudge.length !== 1 ? 's' : ''})
            </button>

            {emailsOpen && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto', paddingRight: 2 }}>
                <button
                  onClick={() => copyText(allJudgesText, '_all')}
                  style={{
                    alignSelf: 'flex-start' as const,
                    padding: '5px 12px', borderRadius: 6,
                    border: '1.5px solid #4b2e83',
                    background: copiedKey === '_all' ? '#e8f5e9' : '#f0eeff',
                    color: copiedKey === '_all' ? '#2e7d32' : '#4b2e83',
                    fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {copiedKey === '_all' ? '✓ Copied all' : `Copy all ${pendingByJudge.length} judge emails`}
                </button>

                {pendingByJudge.map(({ judge, projects }) => {
                  const block = judgeTextBlock(judge, projects);
                  const body = judgeEmailBody(judge, projects);
                  const mailto = `mailto:${judge.email}?subject=${encodeURIComponent('RCIS 2026 — Scoring Reminder')}&body=${encodeURIComponent(body)}`;

                  return (
                    <div key={judge.email} style={{
                      border: '1px solid #ede9f6', borderRadius: 8,
                      background: '#faf8ff', overflow: 'hidden',
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderBottom: '1px solid #ede9f6',
                        background: 'rgba(75,46,131,0.04)',
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1a1228' }}>
                            {judge.displayName}
                          </div>
                          <div style={{ fontSize: 10, color: '#888' }}>
                            {judge.email} · {projects.length} pending project{projects.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => copyText(block, judge.email)}
                          style={{
                            padding: '3px 10px', borderRadius: 5,
                            border: '1px solid rgba(75,46,131,0.25)',
                            background: copiedKey === judge.email ? '#e8f5e9' : 'rgba(75,46,131,0.08)',
                            color: copiedKey === judge.email ? '#2e7d32' : '#4b2e83',
                            fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          {copiedKey === judge.email ? '✓' : 'Copy'}
                        </button>
                        <a
                          href={mailto}
                          style={{
                            padding: '3px 10px', borderRadius: 5,
                            border: '1px solid rgba(75,46,131,0.25)',
                            background: 'rgba(75,46,131,0.06)',
                            color: '#4b2e83', fontSize: 10.5, fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          Open
                        </a>
                      </div>
                      <div style={{ padding: '6px 10px' }}>
                        {projects.map(p => (
                          <div key={p.footer} style={{ fontSize: 10.5, color: '#555', marginBottom: 2 }}>
                            <span style={{ fontFamily: 'monospace', color: '#4b2e83', fontWeight: 700 }}>{p.footer}</span>
                            {' — '}
                            <span>
                              {p.title !== '—'
                                ? p.title.length > 65 ? p.title.slice(0, 65) + '…' : p.title
                                : '(no title)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Award Preview ── */}
      <div style={{ padding: '14px 18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <SectionLabel>Award Preview</SectionLabel>
          <span style={{ fontSize: 11, color: '#aaa', flex: 1 }}>
            {totalBaseAwards} award{totalBaseAwards !== 1 ? 's' : ''} · {deptRows.length} group{deptRows.length !== 1 ? 's' : ''}
            {totalCertificates > 0 && ` · ~${totalCertificates} trophies`}
          </span>
          {totalBaseAwards > 0 && (
            <button
              onClick={downloadAwardsCsv}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 11px', borderRadius: 6,
                border: '1px solid rgba(75,46,131,0.25)',
                background: 'rgba(75,46,131,0.07)',
                color: '#4b2e83', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(75,46,131,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(75,46,131,0.07)')}
            >
              ↓ Download CSV
            </button>
          )}
        </div>

        <div style={{
          border: '1px solid #e5e0f0', borderRadius: 10, overflow: 'hidden',
          maxHeight: 480, overflowY: 'auto',
        }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
            background: 'linear-gradient(135deg, #251558 0%, #4b2e83 100%)',
            padding: '8px 12px',
            position: 'sticky' as const, top: 0, zIndex: 1,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
              Department
            </div>
            {CLASS_COLS.map(c => (
              <div key={c} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
                {CLASS_LABELS[c]}
              </div>
            ))}
          </div>

          {deptRows.map(({ dept, college, groups }, i) => (
            <div
              key={dept}
              style={{
                display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                padding: '6px 12px',
                borderBottom: i < deptRows.length - 1 ? '1px solid #ede9f6' : 'none',
                background: i % 2 === 0 ? '#fff' : 'rgba(248,246,255,0.5)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 10, paddingTop: 8 }}>
                <CollegeBadge college={college} />
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1228', lineHeight: 1.3 }}>
                  {dept}
                </div>
              </div>

              {CLASS_COLS.map(c => (
                <div key={c} style={{ borderLeft: '1px solid #ede9f6', paddingLeft: 10 }}>
                  <AwardCell group={groups.get(c)} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── Winner notifications ── */}
        {winnerEmailEntries.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => setWinnerEmailsOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                background: 'none', border: 'none', padding: 0,
                fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: '#d4920c',
              }}
            >
              <span style={{
                fontSize: 8, display: 'inline-block', transition: 'transform 0.15s',
                transform: winnerEmailsOpen ? 'rotate(90deg)' : 'none',
              }}>▶</span>
              Email Winners ({winnerEmailEntries.length})
            </button>

            {winnerEmailsOpen && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(() => {
                  const allEmails = [...new Set(winnerEmailEntries.flatMap(e => e.authors.filter(p => p.email).map(p => p.email!)))];
                  const allEmailsText = winnerEmailEntries
                    .map(e => {
                      const toEmails = e.authors.filter(p => p.email).map(p => p.email!).join(', ');
                      const names = e.authors.map(p => p.displayName).join(', ');
                      const title = e.record.title !== '—' ? e.record.title : e.record.footer;
                      const body = winnerEmailBody(e.record, names, e.department, e.classification);
                      return `To: ${toEmails}\nSubject: RCIS 2026 — Award Notification\n\n${body}`;
                    })
                    .join('\n\n────────────────────────────────────────\n\n');

                  return (
                    <>
                      <button
                        onClick={() => copyText(allEmails.join('; '), '_winners_all')}
                        style={{
                          alignSelf: 'flex-start' as const,
                          padding: '5px 12px', borderRadius: 6,
                          border: '1.5px solid #d4920c',
                          background: copiedKey === '_winners_all' ? '#e8f5e9' : '#fffbf0',
                          color: copiedKey === '_winners_all' ? '#2e7d32' : '#92610a',
                          fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                      >
                        {copiedKey === '_winners_all' ? '✓ Copied' : `Copy all ${allEmails.length} winner emails`}
                      </button>

                      {winnerEmailEntries.map(entry => {
                        const toEmails = entry.authors.filter(p => p.email).map(p => p.email!);
                        const names = entry.authors.map(p => p.displayName).join(', ');
                        const body = winnerEmailBody(entry.record, names, entry.department, entry.classification);
                        const block = `To: ${toEmails.join(', ')}\nSubject: RCIS 2026 — Award Notification\n\n${body}`;
                        const mailto = toEmails.length > 0
                          ? `mailto:${toEmails.join(',')}?subject=${encodeURIComponent('RCIS 2026 — Award Notification')}&body=${encodeURIComponent(body)}`
                          : null;

                        return (
                          <div key={entry.record.footer} style={{
                            border: '1px solid #f0e8c8', borderRadius: 8,
                            background: '#fffdf5', overflow: 'hidden',
                          }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 10px', borderBottom: '1px solid #f0e8c8',
                              background: 'rgba(212,146,12,0.05)',
                            }}>
                              <span style={{ color: '#d4920c', fontSize: 11, flexShrink: 0 }}>★</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#4b2e83', fontFamily: 'monospace' }}>
                                    {entry.record.footer}
                                  </span>
                                  <CollegeBadge college={entry.college} />
                                  <span style={{
                                    fontSize: 9, fontWeight: 600, color: '#9990b0',
                                    background: 'rgba(75,46,131,0.08)', borderRadius: 3, padding: '1px 5px',
                                  }}>
                                    {CLASS_LABELS[entry.classification]}
                                  </span>
                                  {entry.isTied && (
                                    <span style={{
                                      fontSize: 8, fontWeight: 700, color: '#92610a',
                                      background: '#fef3c7', borderRadius: 3, padding: '0 3px',
                                    }}>TIE</span>
                                  )}
                                </div>
                                <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>
                                  {names}
                                </div>
                              </div>
                              <button
                                onClick={() => copyText(block, entry.record.footer)}
                                style={{
                                  padding: '3px 10px', borderRadius: 5,
                                  border: '1px solid rgba(212,146,12,0.3)',
                                  background: copiedKey === entry.record.footer ? '#e8f5e9' : 'rgba(212,146,12,0.08)',
                                  color: copiedKey === entry.record.footer ? '#2e7d32' : '#92610a',
                                  fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                }}
                              >
                                {copiedKey === entry.record.footer ? '✓' : 'Copy'}
                              </button>
                              {mailto && (
                                <a
                                  href={mailto}
                                  style={{
                                    padding: '3px 10px', borderRadius: 5,
                                    border: '1px solid rgba(212,146,12,0.3)',
                                    background: 'rgba(212,146,12,0.05)',
                                    color: '#92610a', fontSize: 10.5, fontWeight: 500,
                                    textDecoration: 'none',
                                  }}
                                >
                                  Open
                                </a>
                              )}
                            </div>
                            {toEmails.length > 0 && (
                              <div style={{ padding: '5px 10px', fontSize: 10, color: '#777', fontFamily: 'monospace' }}>
                                {toEmails.join('; ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
