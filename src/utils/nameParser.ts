const EMAIL_DOMAIN = '@tntech.edu';

export interface Person {
  displayName: string; // "First Last"
  email: string | null; // "prefix@tntech.edu" or null if no prefix in source
}

function parseSinglePerson(raw: string): Person | null {
  const s = raw.trim();
  if (!s) return null;

  // Match "Last, First (emailprefix)" or "Last, First"
  const m = s.match(/^([^,]+),\s*(.+?)(?:\s*\(([^)]+)\))?\s*$/);
  if (m) {
    const last = m[1].trim();
    const first = m[2].trim();
    const prefix = m[3]?.trim() ?? null;
    return {
      displayName: `${first} ${last}`,
      email: prefix ? `${prefix}${EMAIL_DOMAIN}` : null,
    };
  }

  // Fallback: no "Last, First" structure — display as-is
  return { displayName: s, email: null };
}

export function parsePeople(raw: string): Person[] {
  if (!raw || raw === '—') return [];
  return raw
    .split(';')
    .map(parseSinglePerson)
    .filter((p): p is Person => p !== null && p.displayName !== '');
}

export function formatPeopleForTooltip(raw: string): string {
  const people = parsePeople(raw);
  return people.length > 0 ? people.map(p => p.displayName).join(', ') : '';
}
