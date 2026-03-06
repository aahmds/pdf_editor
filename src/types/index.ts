export type Tool = 'select' | 'text' | 'signature' | 'checkbox' | 'draw' | 'redact' | 'form-text' | 'form-checkbox' | 'form-dropdown' | 'highlight' | 'image' | 'stamp' | 'sticky-note';

export type FontFamily = 'Helvetica' | 'TimesRoman' | 'Courier';

export interface Annotation {
  id: string;
  type: 'text' | 'signature' | 'checkbox' | 'drawing' | 'redact' | 'form-text' | 'form-checkbox' | 'form-dropdown' | 'highlight' | 'image' | 'stamp' | 'sticky-note';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: FontFamily;
  checked?: boolean;
  options?: string[]; // for dropdown form fields
  strokeColor?: string; // for drawing
  strokeWidth?: number; // for drawing
  highlightColor?: string; // for highlight annotations
  stickyNoteColor?: string; // for sticky notes
  stickyNoteExpanded?: boolean; // for sticky notes toggle
  stampType?: string; // for stamps (e.g., 'approved', 'rejected', 'urgent', 'confidential', 'draft')
  imageDataUrl?: string; // for image annotations (the actual image data)
}

export interface PDFState {
  file: File | null;
  pdfBytes: Uint8Array | null;
  numPages: number;
  currentPage: number;
  scale: number;
  annotations: Annotation[];
  isLoading: boolean;
  error: string | null;
}

export interface SavedSignature {
  id: string;
  dataUrl: string;
  createdAt: number;
}

export type ThemeMode = 'light' | 'dark';
