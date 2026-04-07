export interface ProjectRecord {
  footer: string;
  footerNumber: number;
  title: string;
  primaryAuthor: string;
  projectAuthors: string;
  classification: string;
  facultyAdvisor: string;
  projectType: string;
  abstract: string;
  primaryAuthorDepartment: string;
  department: string;
  unitName: string;
  publicationConsent: string;
  useOfAI: string;
  aiDetails: string;
  irbNumber: string;
  iacucNo: string;
}

export interface FilterState {
  dept: string | null;
  college: string | null;
  projectType: string | null;
  classification: string | null;
  publicationConsent: boolean;
  useOfAI: boolean;
  humanSubjects: boolean;
  animalSubjects: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  dept: null,
  college: null,
  projectType: null,
  classification: null,
  publicationConsent: false,
  useOfAI: false,
  humanSubjects: false,
  animalSubjects: false,
};

export interface LayoutBlock {
  record: ProjectRecord;
  seqIndex: number;
  row: number;
  side: 'left' | 'right';
  col: number;
}

export interface ColorInfo {
  bg: string;
  text: string;
}

export interface TooltipState {
  x: number;
  y: number;
  record: ProjectRecord;
}
