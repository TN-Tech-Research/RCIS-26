import { ColorInfo } from '../types';

// College definitions: each college has a hue range and a display name.
// Departments within the same college share that hue family (nearby hues, varied lightness).
//
// College → prefix mapping (from Footer values):
//   AHE  College of Agriculture and Human Ecology     hue ~105  yellow-green
//   ASC  College of Arts and Sciences                 hue ~225  blue
//   CEI  College of Interdisciplinary Studies         hue ~155  teal
//   COB  College of Business                          hue ~36   amber/orange
//   EDU  College of Education and Human Sciences      hue ~322  rose/pink
//   ENG  College of Engineering                       hue ~198  steel blue
//   NUR  Whitson-Hester School of Nursing             hue ~283  purple
//
// Cross-college departments resolved by majority records:
//   Environmental Studies  → CEI (11 records vs AHE 3, ASC 2)
//   Business Analytics     → COB (2 records vs ASC 1)
//   Chemical Engineering   → ENG (18 records vs ASC 1)

export interface CollegeInfo {
  name: string;
  prefix: string;
  headerColor: string; // mid-range hue for the college header swatch
}

const DARK = '#1a1a2e';

// Department → { color, college prefix }
// Colors use HSL with L 68–76%, S 52–60%, so dark text always readable.
const DEPT_PALETTE: Record<string, { color: ColorInfo; college: string }> = {
  // ── AHE ──────────────────────────────────────────────
  'Agriculture':                          { color: { bg: 'hsl(95, 54%, 72%)',  text: DARK }, college: 'AHE' },
  'Human Ecology':                        { color: { bg: 'hsl(112, 52%, 74%)', text: DARK }, college: 'AHE' },

  // ── ASC ──────────────────────────────────────────────
  'Biology':                              { color: { bg: 'hsl(220, 58%, 74%)', text: DARK }, college: 'ASC' },
  'Chemistry':                            { color: { bg: 'hsl(232, 55%, 71%)', text: DARK }, college: 'ASC' },
  'Earth Sciences':                       { color: { bg: 'hsl(212, 58%, 76%)', text: DARK }, college: 'ASC' },
  'History':                              { color: { bg: 'hsl(238, 48%, 72%)', text: DARK }, college: 'ASC' },
  'Interdisciplinary Studies':            { color: { bg: 'hsl(215, 50%, 77%)', text: DARK }, college: 'ASC' },
  'Physics':                              { color: { bg: 'hsl(226, 58%, 71%)', text: DARK }, college: 'ASC' },

  // ── CEI ──────────────────────────────────────────────
  'Environmental Studies':                { color: { bg: 'hsl(152, 50%, 69%)', text: DARK }, college: 'CEI' },

  // ── COB ──────────────────────────────────────────────
  'Accounting':                           { color: { bg: 'hsl(38, 62%, 72%)',  text: DARK }, college: 'COB' },
  'Business Analytics':                   { color: { bg: 'hsl(28, 62%, 70%)',  text: DARK }, college: 'COB' },
  'Finance':                              { color: { bg: 'hsl(48, 62%, 74%)',  text: DARK }, college: 'COB' },

  // ── EDU ──────────────────────────────────────────────
  'Counseling & Psychology':              { color: { bg: 'hsl(318, 52%, 74%)', text: DARK }, college: 'EDU' },
  'Curriculum and Instruction':           { color: { bg: 'hsl(332, 52%, 72%)', text: DARK }, college: 'EDU' },

  // ── ENG ──────────────────────────────────────────────
  'Chemical Engineering':                 { color: { bg: 'hsl(195, 56%, 69%)', text: DARK }, college: 'ENG' },
  'Civil & Environmental Engineering':    { color: { bg: 'hsl(202, 54%, 72%)', text: DARK }, college: 'ENG' },
  'Computer Science':                     { color: { bg: 'hsl(188, 56%, 73%)', text: DARK }, college: 'ENG' },
  'Electrical and Computer Engineering':  { color: { bg: 'hsl(207, 54%, 69%)', text: DARK }, college: 'ENG' },
  'Manufacturing & Engineering Technology': { color: { bg: 'hsl(182, 54%, 71%)', text: DARK }, college: 'ENG' },
  'Mechanical Engineering':               { color: { bg: 'hsl(210, 56%, 74%)', text: DARK }, college: 'ENG' },
  'Nuclear Engineering':                  { color: { bg: 'hsl(178, 54%, 68%)', text: DARK }, college: 'ENG' },

  // ── NUR ──────────────────────────────────────────────
  'Nursing':                              { color: { bg: 'hsl(283, 52%, 73%)', text: DARK }, college: 'NUR' },
};

// College display info (sorted by prefix for legend ordering)
export const COLLEGES: CollegeInfo[] = [
  { prefix: 'AHE', name: 'Agriculture & Human Ecology', headerColor: 'hsl(103, 53%, 70%)' },
  { prefix: 'ASC', name: 'Arts & Sciences',             headerColor: 'hsl(224, 57%, 72%)' },
  { prefix: 'CEI', name: 'Interdisciplinary Studies',   headerColor: 'hsl(152, 50%, 67%)' },
  { prefix: 'COB', name: 'Business',                    headerColor: 'hsl(38, 62%, 70%)'  },
  { prefix: 'EDU', name: 'Education & Human Sciences',  headerColor: 'hsl(325, 52%, 72%)' },
  { prefix: 'ENG', name: 'Engineering',                 headerColor: 'hsl(197, 55%, 70%)' },
  { prefix: 'NUR', name: 'Nursing',                     headerColor: 'hsl(283, 52%, 71%)' },
];

export function getDepartmentColor(dept: string): ColorInfo {
  if (!dept || dept === '—') return { bg: '#d0d0d0', text: '#444' };
  return DEPT_PALETTE[dept]?.color ?? { bg: 'hsl(0, 0%, 78%)', text: DARK };
}

export function getDepartmentCollege(dept: string): string {
  return DEPT_PALETTE[dept]?.college ?? '?';
}

export interface DeptStat {
  dept: string;
  count: number;
  color: ColorInfo;
  college: string;
}

export function buildDepartmentStats(
  records: { primaryAuthorDepartment: string }[]
): DeptStat[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    const d = r.primaryAuthorDepartment;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }

  // College ordering from COLLEGES array
  const collegeOrder = Object.fromEntries(COLLEGES.map((c, i) => [c.prefix, i]));

  return Array.from(counts.entries())
    .map(([dept, count]) => ({
      dept,
      count,
      color: getDepartmentColor(dept),
      college: getDepartmentCollege(dept),
    }))
    .sort((a, b) => {
      const ca = collegeOrder[a.college] ?? 99;
      const cb = collegeOrder[b.college] ?? 99;
      if (ca !== cb) return ca - cb;
      return a.dept.localeCompare(b.dept);
    });
}
