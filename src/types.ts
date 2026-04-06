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
}

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
