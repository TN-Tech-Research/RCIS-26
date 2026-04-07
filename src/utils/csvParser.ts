import { ProjectRecord } from '../types';

function parseCSVRaw(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        currentField += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
      } else if (ch === '\r' && text[i + 1] === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i += 2;
      } else if (ch === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
      } else {
        currentField += ch;
        i++;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function extractFooterNumber(footer: string): number | null {
  const match = footer.match(/(\d+)$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function fallback(value: string): string {
  return value.trim() || '—';
}

export function parseCSV(rawText: string): ProjectRecord[] {
  const allRows = parseCSVRaw(rawText);
  if (allRows.length < 2) return [];

  const rawHeaders = allRows[0];
  const headers = rawHeaders.map(normalizeHeader);

  function idx(name: string): number {
    return headers.indexOf(name);
  }

  const iFooter = idx('Footer');
  const iTitle = idx('What is the title of your project?');
  const iCreatedBy = idx('Created By');
  const iProjectAuthors = idx('Project Authors');
  const iClassification = idx("Primary Author's Classification");
  const iFacultyAdvisor = idx('Faculty advisor');
  const iProjectType = idx('Project Type');
  const iAbstract = idx('Abstract');
  const iPrimaryAuthorDept = idx("Primary Author's Department");
  const iDepartment = idx('Department');
  const iUnitName = idx('Unit:UnitName');
  const iPublicationConsent = idx('Publication Consent');
  const iUseOfAI = idx('Use of AI');
  const iAIDetails = idx('AI Details');
  const iIRBNumber = idx('IRB number');
  const iIACUCNo = idx('IACUC No.');

  const records: ProjectRecord[] = [];

  for (let r = 1; r < allRows.length; r++) {
    const row = allRows[r];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    const get = (i: number): string => (i >= 0 && i < row.length ? row[i].trim() : '');

    const footer = get(iFooter);
    if (!footer) continue;

    const footerNumber = extractFooterNumber(footer);
    if (footerNumber === null) continue;

    const primaryAuthorDepartment = get(iPrimaryAuthorDept) || get(iDepartment);

    records.push({
      footer,
      footerNumber,
      title: fallback(get(iTitle)),
      primaryAuthor: fallback(get(iCreatedBy)),
      projectAuthors: fallback(get(iProjectAuthors)),
      classification: fallback(get(iClassification)),
      facultyAdvisor: fallback(get(iFacultyAdvisor)),
      projectType: fallback(get(iProjectType)),
      abstract: fallback(get(iAbstract)),
      primaryAuthorDepartment: primaryAuthorDepartment || '—',
      department: get(iDepartment),
      unitName: get(iUnitName),
      publicationConsent: get(iPublicationConsent),
      useOfAI: get(iUseOfAI),
      aiDetails: get(iAIDetails),
      irbNumber: get(iIRBNumber),
      iacucNo: get(iIACUCNo),
    });
  }

  records.sort((a, b) => a.footerNumber - b.footerNumber);
  return records;
}
