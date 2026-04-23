import { ProjectRecord } from '../types';
import type { AvgScoreMap } from './avgScoreParser';
import { getDepartmentCollege } from './colorMap';
import { parsePeople } from './nameParser';

export type ClassBucket = 'Undergraduate' | "Master's" | 'PhD';

export const CLASS_ORDER: ClassBucket[] = ['Undergraduate', "Master's", 'PhD'];
export const COLLEGE_ORDER = ['AHE', 'ASC', 'CEI', 'COB', 'EDU', 'ENG', 'NUR'];

export function bucketClassification(raw: string): ClassBucket | null {
  if (raw.includes('Undergraduate')) return 'Undergraduate';
  if (raw.includes('Master')) return "Master's";
  if (raw.includes('Doctor')) return 'PhD';
  return null;
}

function countUniqueAuthors(record: ProjectRecord): number {
  const seen = new Set<string>();
  for (const p of [...parsePeople(record.primaryAuthor), ...parsePeople(record.projectAuthors)]) {
    seen.add(p.email ?? p.displayName);
  }
  return Math.max(1, seen.size);
}

export interface WinnerEntry {
  record: ProjectRecord;
  score: number;
  authorCount: number;
  isTied: boolean;
}

export interface AwardGroup {
  department: string;
  college: string;
  classification: ClassBucket;
  allProjects: ProjectRecord[];
  numBaseAwards: number;
  eligibleCount: number;
  scoredCount: number;
  noShowCount: number;
  winners: WinnerEntry[];
  isComplete: boolean;
}

export function calcAwards(
  records: ProjectRecord[],
  avgScoreMap: AvgScoreMap,
): AwardGroup[] {
  const isNoShow = (footer: string) => {
    const e = avgScoreMap.get(footer);
    return e != null && e.avgScore === null;
  };
  const getScore = (footer: string) => avgScoreMap.get(footer)?.avgScore ?? null;

  const groups = new Map<string, ProjectRecord[]>();
  for (const r of records) {
    const bucket = bucketClassification(r.classification);
    if (!bucket) continue;
    const key = `${r.primaryAuthorDepartment}|||${bucket}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const result: AwardGroup[] = [];

  for (const [key, projects] of groups) {
    const sep = key.indexOf('|||');
    const dept = key.slice(0, sep);
    const classification = key.slice(sep + 3) as ClassBucket;
    const college = getDepartmentCollege(dept);
    const numBaseAwards = Math.ceil(projects.length / 10);
    const noShowCount = projects.filter(p => isNoShow(p.footer)).length;
    const eligible = projects.filter(p => !isNoShow(p.footer));
    const scored = eligible.filter(p => getScore(p.footer) !== null);
    const isComplete = eligible.length > 0 && scored.length === eligible.length;

    const withScores = scored
      .map(r => ({ record: r, score: getScore(r.footer)!, authorCount: countUniqueAuthors(r) }))
      .sort((a, b) => b.score - a.score);

    let winners: WinnerEntry[];
    if (withScores.length === 0) {
      winners = [];
    } else if (withScores.length <= numBaseAwards) {
      winners = withScores.map(w => ({ ...w, isTied: false }));
    } else {
      const cutoff = withScores[numBaseAwards - 1].score;
      const allAtOrAbove = withScores.filter(w => w.score >= cutoff);
      const hasExpansion = allAtOrAbove.length > numBaseAwards;
      winners = allAtOrAbove.map(w => ({
        ...w,
        isTied: hasExpansion && w.score === cutoff,
      }));
    }

    result.push({
      department: dept,
      college,
      classification,
      allProjects: projects,
      numBaseAwards,
      eligibleCount: eligible.length,
      scoredCount: scored.length,
      noShowCount,
      winners,
      isComplete,
    });
  }

  result.sort((a, b) => {
    const ca = COLLEGE_ORDER.indexOf(a.college);
    const cb = COLLEGE_ORDER.indexOf(b.college);
    const caI = ca === -1 ? 99 : ca;
    const cbI = cb === -1 ? 99 : cb;
    if (caI !== cbI) return caI - cbI;
    if (a.department !== b.department) return a.department.localeCompare(b.department);
    return CLASS_ORDER.indexOf(a.classification) - CLASS_ORDER.indexOf(b.classification);
  });

  return result;
}
