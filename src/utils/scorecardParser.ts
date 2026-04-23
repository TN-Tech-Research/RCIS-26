export interface ScoreItem {
  label: string;
  score: number;
  maxScore: 3 | 5;
}

export interface CategoryFeedback {
  items: ScoreItem[];
  total: number;
  comment: string;
}

export interface JudgeEntry {
  type: 'research' | 'lit_review' | 'ai_assisted';
  appearance: CategoryFeedback;
  content: CategoryFeedback;
  ai?: CategoryFeedback;
  total: number;
}

export interface ProjectFeedback {
  projectNumber: string;
  judges: JudgeEntry[];
}

export type FeedbackMap = Record<string, ProjectFeedback>;

// ── Column indices ────────────────────────────────────────────────────────────
const C = {
  projectNumber: 1,
  resApp:        [6, 7, 8, 9, 10]  as const,
  resAppComment: 11,
  litApp:        [12, 13, 14, 15, 16] as const,
  litAppComment: 17,
  resCont:       [18, 19, 20, 21, 22, 23, 24] as const,
  resContComment: 25,
  litCont:       [26, 27, 28, 29, 30, 31, 32] as const,
  litContComment: 33,
  aiApp:         [34, 35, 36, 37, 38] as const,
  aiAppComment:  39,
  aiCont:        [40, 41, 42, 43, 44, 45, 46] as const,
  aiContComment: 47,
  aiScores:      [48, 49, 50] as const,
  appearanceTotal: 51,
  contentTotal:    52,
  total:           53,
  appearanceComment: 54,
  contentComment:    55,
  aiTotal:           56,
};

const APP_LABELS = [
  'Readable from 3–4 feet',
  'Figures & diagrams legible',
  'Cohesive design & colors',
  'No spelling/grammar errors',
  'Well-organized, logical flow',
];

const RES_CONTENT_LABELS = [
  'Intro / Significance / Research Question',
  'Methods',
  'Results',
  'Discussion',
  'Conclusions & Recommendations',
  'References',
  'Acknowledgements',
];

const LIT_CONTENT_LABELS = [
  'Introduction',
  'Coverage',
  'Results',
  'Significance',
  'Conclusions',
  'References',
  'Acknowledgements',
];

const AI_LABELS = [
  'Role of AI in the Project',
  'Ability to Explain AI Use',
  'Impact on Quality / Improvement',
];

function parseCSVRaw(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQ = false;
  let i = 0;

  const ch = () => text[i];

  while (i < text.length) {
    if (inQ) {
      if (ch() === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
      else if (ch() === '"') { inQ = false; i++; }
      else { field += ch(); i++; }
    } else {
      if (ch() === '"') { inQ = true; i++; }
      else if (ch() === ',') { row.push(field); field = ''; i++; }
      else if (ch() === '\r' && text[i + 1] === '\n') {
        row.push(field); field = ''; rows.push(row); row = []; i += 2;
      } else if (ch() === '\n') {
        row.push(field); field = ''; rows.push(row); row = []; i++;
      } else { field += ch(); i++; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function num(s: string | undefined): number {
  const n = parseFloat(s ?? '');
  return isNaN(n) ? 0 : n;
}

function parseRow(row: string[]): JudgeEntry | null {
  const get = (i: number) => (row[i] ?? '').trim();
  const total = num(get(C.total));
  if (!total) return null;

  // Detect branch type
  const hasResApp = C.resApp.some(i => !!get(i));
  const hasLitApp = C.litApp.some(i => !!get(i));
  const hasAiApp  = C.aiApp.some(i => !!get(i));

  let type: JudgeEntry['type'];
  let appCols: readonly number[];
  let appComment: string;
  let contCols: readonly number[];
  let contLabels: string[];
  let contComment: string;

  if (hasResApp) {
    type = 'research';
    appCols = C.resApp;
    appComment = get(C.appearanceComment) || get(C.resAppComment);
    contCols = C.resCont;
    contLabels = RES_CONTENT_LABELS;
    contComment = get(C.contentComment) || get(C.resContComment);
  } else if (hasLitApp) {
    type = 'lit_review';
    appCols = C.litApp;
    appComment = get(C.appearanceComment) || get(C.litAppComment);
    contCols = C.litCont;
    contLabels = LIT_CONTENT_LABELS;
    contComment = get(C.contentComment) || get(C.litContComment);
  } else if (hasAiApp) {
    type = 'ai_assisted';
    appCols = C.aiApp;
    appComment = get(C.appearanceComment) || get(C.aiAppComment);
    contCols = C.aiCont;
    contLabels = RES_CONTENT_LABELS;
    contComment = get(C.contentComment) || get(C.aiContComment);
  } else {
    return null;
  }

  const appearance: CategoryFeedback = {
    items: APP_LABELS.map((label, idx) => ({
      label,
      score: num(get(appCols[idx])),
      maxScore: 3,
    })),
    total: num(get(C.appearanceTotal)),
    comment: appComment,
  };

  const content: CategoryFeedback = {
    items: contLabels.map((label, idx) => ({
      label,
      score: num(get(contCols[idx])),
      maxScore: 5,
    })),
    total: num(get(C.contentTotal)),
    comment: contComment,
  };

  let ai: CategoryFeedback | undefined;
  if (type === 'ai_assisted') {
    ai = {
      items: AI_LABELS.map((label, idx) => ({
        label,
        score: num(get(C.aiScores[idx])),
        maxScore: 5,
      })),
      total: num(get(C.aiTotal)),
      comment: '',
    };
  }

  return { type, appearance, content, ai, total };
}

export function parseScorecard(raw: string): FeedbackMap {
  if (!raw.trim()) return {};
  const allRows = parseCSVRaw(raw.replace(/^﻿/, ''));
  if (allRows.length < 2) return {};

  const map: FeedbackMap = {};

  for (let r = 1; r < allRows.length; r++) {
    const row = allRows[r];
    const projectNumber = (row[C.projectNumber] ?? '').trim();
    if (!projectNumber) continue;

    const entry = parseRow(row);
    if (!entry) continue;

    if (!map[projectNumber]) {
      map[projectNumber] = { projectNumber, judges: [] };
    }
    map[projectNumber].judges.push(entry);
  }

  return map;
}
