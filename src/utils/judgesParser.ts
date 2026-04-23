export interface JudgeInfo {
  displayName: string;
  netid: string;
  email: string;
  department: string;
  projects: string[];
}

export type JudgesByProject = Map<string, JudgeInfo[]>;

function parseRow(line: string): string[] {
  const fields: string[] = [];
  let pos = 0;
  while (pos <= line.length) {
    if (pos === line.length) { fields.push(''); break; }
    if (line[pos] === '"') {
      let field = '';
      pos++;
      while (pos < line.length) {
        if (line[pos] === '"' && pos + 1 < line.length && line[pos + 1] === '"') {
          field += '"'; pos += 2;
        } else if (line[pos] === '"') {
          pos++; break;
        } else {
          field += line[pos++];
        }
      }
      fields.push(field);
      if (pos < line.length && line[pos] === ',') pos++;
    } else {
      const comma = line.indexOf(',', pos);
      if (comma === -1) { fields.push(line.slice(pos)); break; }
      fields.push(line.slice(pos, comma));
      pos = comma + 1;
    }
  }
  return fields;
}

export function parseJudges(raw: string): { judges: JudgeInfo[]; byProject: JudgesByProject } {
  if (!raw.trim()) return { judges: [], byProject: new Map() };

  const lines = raw
    .replace(/^﻿/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim());

  if (lines.length < 2) return { judges: [], byProject: new Map() };

  // columns: Judge, Title, Projs, Discipline1, JudgeDepartment, JudgeEmail
  const judges: JudgeInfo[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    if (cols.length < 6) continue;

    const [judgeRaw, titleRaw, projsRaw, , department, email] = cols;
    const netidMatch = judgeRaw.match(/\(([^)]+)\)\s*$/);
    const netid = netidMatch?.[1]?.trim() ?? '';
    const displayName = titleRaw.replace(/\s+/g, ' ').trim() || judgeRaw;
    const projects = projsRaw.split(',').map(p => p.trim()).filter(Boolean);

    judges.push({ displayName, netid, email: email.trim(), department: department.trim(), projects });
  }

  const byProject: JudgesByProject = new Map();
  for (const judge of judges) {
    for (const proj of judge.projects) {
      if (!byProject.has(proj)) byProject.set(proj, []);
      byProject.get(proj)!.push(judge);
    }
  }

  return { judges, byProject };
}
