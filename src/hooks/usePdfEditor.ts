import { useState, useCallback, useRef, useReducer, useEffect } from 'react';
import type { PDFState, Annotation, Tool } from '../types';
import { getPageCount, applyAnnotations, downloadPdf } from '../utils/pdfUtils';

const initialState: PDFState = {
  file: null,
  pdfBytes: null,
  numPages: 0,
  currentPage: 0,
  scale: 1.5,
  annotations: [],
  isLoading: false,
  error: null,
};

// Undo/Redo history for annotations
interface AnnotationHistory {
  past: Annotation[][];
  present: Annotation[];
  future: Annotation[][];
}

type HistoryAction =
  | { type: 'SET'; annotations: Annotation[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' };

const MAX_HISTORY = 50;

function historyReducer(state: AnnotationHistory, action: HistoryAction): AnnotationHistory {
  switch (action.type) {
    case 'SET':
      return {
        past: [...state.past.slice(-MAX_HISTORY), state.present],
        present: action.annotations,
        future: [],
      };
    case 'UNDO':
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      };
    case 'REDO':
      if (state.future.length === 0) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      };
    case 'RESET':
      return { past: [], present: [], future: [] };
  }
}

const AUTOSAVE_KEY = 'pdf-editor-autosave';

export function usePdfEditor() {
  const [state, setState] = useState<PDFState>(initialState);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [isSaving, setIsSaving] = useState(false);
  const originalBytesRef = useRef<ArrayBuffer | null>(null);

  const [history, dispatchHistory] = useReducer(historyReducer, {
    past: [],
    present: [],
    future: [],
  });

  // Sync history.present → state.annotations
  useEffect(() => {
    setState((prev) => {
      if (prev.annotations === history.present) return prev;
      return { ...prev, annotations: history.present };
    });
  }, [history.present]);

  // Autosave annotations to localStorage
  useEffect(() => {
    if (!state.file || history.present.length === 0) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          AUTOSAVE_KEY,
          JSON.stringify({
            fileName: state.file?.name,
            annotations: history.present,
            savedAt: Date.now(),
          })
        );
      } catch { /* localStorage full, ignore */ }
    }, 1000);
    return () => clearTimeout(timer);
  }, [history.present, state.file]);

  const loadFile = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const arrayBuffer = await file.arrayBuffer();
      originalBytesRef.current = arrayBuffer.slice(0);
      const pdfBytes = new Uint8Array(arrayBuffer.slice(0));
      const numPages = await getPageCount(new Uint8Array(arrayBuffer.slice(0)));

      // Try to restore autosaved annotations
      let restoredAnnotations: Annotation[] = [];
      try {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.fileName === file.name) {
            restoredAnnotations = parsed.annotations;
          }
        }
      } catch { /* ignore */ }

      setState({
        file,
        pdfBytes,
        numPages,
        currentPage: 0,
        scale: 1.5,
        annotations: restoredAnnotations,
        isLoading: false,
        error: null,
      });
      dispatchHistory({ type: 'RESET' });
      if (restoredAnnotations.length > 0) {
        dispatchHistory({ type: 'SET', annotations: restoredAnnotations });
      }
    } catch (error) {
      console.error('Load error:', error);
      originalBytesRef.current = null;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Impossible de charger ce fichier PDF. Vérifiez qu\'il n\'est pas corrompu.',
      }));
    }
  }, []);

  const getFreshBytes = useCallback(() => {
    if (!originalBytesRef.current) return null;
    return new Uint8Array(originalBytesRef.current.slice(0));
  }, []);

  const setCurrentPage = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      currentPage: Math.max(0, Math.min(page, prev.numPages - 1)),
    }));
  }, []);

  const setScale = useCallback((scale: number) => {
    setState((prev) => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, scale)),
    }));
  }, []);

  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id'>) => {
    const id = crypto.randomUUID();
    const newAnnotations = [...history.present, { ...annotation, id }];
    dispatchHistory({ type: 'SET', annotations: newAnnotations });
    return id;
  }, [history.present]);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    const newAnnotations = history.present.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    );
    dispatchHistory({ type: 'SET', annotations: newAnnotations });
  }, [history.present]);

  const deleteAnnotation = useCallback((id: string) => {
    const newAnnotations = history.present.filter((a) => a.id !== id);
    dispatchHistory({ type: 'SET', annotations: newAnnotations });
  }, [history.present]);

  const undo = useCallback(() => {
    dispatchHistory({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatchHistory({ type: 'REDO' });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const savePdf = useCallback(async () => {
    if (!originalBytesRef.current || !state.file) return;

    setIsSaving(true);
    try {
      const freshBytes = new Uint8Array(originalBytesRef.current.slice(0));
      const modifiedPdfBytes = await applyAnnotations(freshBytes, state.annotations);
      const filename = state.file.name.replace(/\.pdf$/i, '_edited.pdf');
      downloadPdf(modifiedPdfBytes, filename);
    } catch (error) {
      console.error('Save error:', error);
      setState((prev) => ({
        ...prev,
        error: 'Erreur lors de la sauvegarde du PDF.',
      }));
    } finally {
      setIsSaving(false);
    }
  }, [state.file, state.annotations]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    setActiveTool('select');
    originalBytesRef.current = null;
    dispatchHistory({ type: 'RESET' });
    localStorage.removeItem(AUTOSAVE_KEY);
  }, []);

  return {
    state,
    activeTool,
    setActiveTool,
    isSaving,
    loadFile,
    getFreshBytes,
    setCurrentPage,
    setScale,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    undo,
    redo,
    canUndo,
    canRedo,
    savePdf,
    clearError,
    reset,
  };
}
