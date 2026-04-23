export interface AvgScoreEntry {
  submitted: number;
  avgScore: number | null; // null = no-show (pre-designated in CSV)
}

export type AvgScoreMap = Map<string, AvgScoreEntry>;

// columns: ProjectNo, Submitted, GrandTotal, AvgScore, AvgAppearance, AvgContent
// No-shows appear with Submitted=0 and AvgScore="null"
export function parseAvgScores(raw: string): AvgScoreMap {
  const map: AvgScoreMap = new Map();
  if (!raw.trim()) return map;
  const lines = raw.replace(/^﻿/, '').split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const projectNo = cols[0]?.trim();
    if (!projectNo) continue;
    const submitted = parseInt(cols[1] ?? '0', 10) || 0;
    const rawScore = cols[3]?.trim();
    const parsed = rawScore ? parseFloat(rawScore) : NaN;
    const avgScore =
      submitted === 0 || !rawScore || rawScore === 'null' || rawScore === '#DIV/0!' || parsed === 0 || isNaN(parsed)
        ? null
        : parsed;
    map.set(projectNo, { submitted, avgScore });
  }
  return map;
}
