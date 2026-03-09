import { useState, useCallback, useEffect } from 'react';
import { usePdfEditor } from '../hooks/usePdfEditor';
import type { FontFamily, ThemeMode } from '../types';
import { Toolbar } from './Toolbar';
import { FileDropzone } from './FileDropzone';
import { PdfViewer } from './PdfViewer';
import { SignatureModal } from './SignatureModal';
import { TextInputModal } from './TextInputModal';
import PageThumbnails from './PageThumbnails';
import AnnotationPanel from './AnnotationPanel';
import {
  mergePdfs,
  splitPdf,
  deletePage,
  reorderPages,
  exportPageAsImage,
  protectPdf,
  runOcr,
  rotatePage,
  compressPdf,
  addWatermark,
  addPageNumbers,
  cropPage,
  exportPageAsJpeg,
} from '../utils/pdfOperations';
import { ACCEPTED_EXTENSIONS, convertToPdf, isPdfFile } from '../utils/fileConverter';
import { addToFileHistory, getFileHistory, clearFileHistory, type FileHistoryEntry } from '../utils/fileHistory';
import { SearchBar } from './SearchBar';
import { MenuBar } from './MenuBar';
import type { MenuGroup } from './MenuBar';
import { saveAs } from 'file-saver';
import { PDFDocument } from 'pdf-lib';

export function Editor() {
  const {
    state,
    activeTool,
    setActiveTool,
    isSaving,
    loadFile,
    getFreshBytes,
    setNumPages,
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
  } = usePdfEditor();

  // UI state
  const [darkMode, setDarkMode] = useState<ThemeMode>('light');
  const [operationError, setOperationError] = useState<string | null>(null);
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState<FontFamily>('Helvetica');
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false);

  // Modal states
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showOcrResult, setShowOcrResult] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [fileHistory, setFileHistory] = useState<FileHistoryEntry[]>([]);
  const [stampType, setStampType] = useState('approved');

  // Modal input states
  const [splitRange, setSplitRange] = useState({ start: 1, end: 1 });
  const [passwordInput, setPasswordInput] = useState('');
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIEL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkFontSize, setWatermarkFontSize] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clipboardAnnotation, setClipboardAnnotation] = useState<typeof state.annotations[0] | null>(null);

  // Helper to reload PDF from modified bytes
  const reloadFromBytes = useCallback(
    async (bytes: Uint8Array, fileName: string) => {
      const file = new File([bytes], fileName, { type: 'application/pdf' });
      await loadFile(file);
    },
    [loadFile]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (!e.shiftKey) {
            undo();
          }
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          redo();
        } else if (e.key === 's') {
          e.preventDefault();
          savePdf();
        } else if (e.key === 'f') {
          e.preventDefault();
          setShowSearch(true);
        } else if (e.key === 'c' && selectedAnnotationId) {
          e.preventDefault();
          const ann = state.annotations.find((a) => a.id === selectedAnnotationId);
          if (ann) setClipboardAnnotation(ann);
        } else if (e.key === 'v' && clipboardAnnotation) {
          e.preventDefault();
          addAnnotation({
            ...clipboardAnnotation,
            page: state.currentPage,
            x: clipboardAnnotation.x + 20,
            y: clipboardAnnotation.y + 20,
          });
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId && activeTool === 'select') {
          e.preventDefault();
          deleteAnnotation(selectedAnnotationId);
          setSelectedAnnotationId(null);
        }
      } else if (e.key === 'Escape') {
        setSelectedAnnotationId(null);
        setActiveTool('select');
      } else if (e.key === 'ArrowLeft') {
        if (state.currentPage > 0) {
          setCurrentPage(state.currentPage - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (state.currentPage < state.numPages - 1) {
          setCurrentPage(state.currentPage + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedAnnotationId,
    activeTool,
    state.currentPage,
    state.numPages,
    state.annotations,
    undo,
    redo,
    savePdf,
    deleteAnnotation,
    setCurrentPage,
    setActiveTool,
    clipboardAnnotation,
    addAnnotation,
  ]);

  // Load file history on mount
  useEffect(() => {
    setFileHistory(getFileHistory());
  }, []);

  // Signature modal handlers
  const [signatureCallback, setSignatureCallback] = useState<
    ((dataUrl: string) => void) | null
  >(null);

  const handleOpenSignature = useCallback((callback: (dataUrl: string) => void) => {
    setSignatureCallback(() => callback);
  }, []);

  const handleSignatureSave = useCallback(
    (dataUrl: string) => {
      if (signatureCallback) {
        signatureCallback(dataUrl);
        setSignatureCallback(null);
      }
    },
    [signatureCallback]
  );

  // Text input modal handlers
  const [textInputCallback, setTextInputCallback] = useState<
    ((text: string) => void) | null
  >(null);

  const handleOpenTextInput = useCallback((callback: (text: string) => void) => {
    setTextInputCallback(() => callback);
  }, []);

  const handleTextSubmit = useCallback(
    (text: string) => {
      if (textInputCallback) {
        textInputCallback(text);
        setTextInputCallback(null);
      }
    },
    [textInputCallback]
  );

  // Annotation panel handlers
  const handleSelectAnnotation = useCallback((id: string, page: number) => {
    setSelectedAnnotationId(id);
    setCurrentPage(page);
  }, [setCurrentPage]);

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      deleteAnnotation(id);
      if (selectedAnnotationId === id) {
        setSelectedAnnotationId(null);
      }
    },
    [deleteAnnotation, selectedAnnotationId]
  );

  // Page operations handlers
  const handleDeletePage = useCallback(
    async (pageNum: number) => {
      if (state.numPages <= 1) return; // Can't delete the only page
      try {
        const bytes = getFreshBytes();
        if (!bytes) return;
        // deletePage expects 0-indexed page index
        const modifiedBytes = await deletePage(bytes, pageNum - 1);
        await reloadFromBytes(modifiedBytes, state.file?.name || 'document.pdf');
      } catch (err) {
        console.error('Failed to delete page:', err);
        setOperationError('Échec de la suppression de la page.');
      }
    },
    [getFreshBytes, state.file?.name, state.numPages, reloadFromBytes]
  );

  const handleMovePage = useCallback(
    async (fromPage: number, toPage: number) => {
      try {
        const bytes = getFreshBytes();
        if (!bytes) return;
        // reorderPages expects a newOrder array (0-indexed)
        // Build the new order by swapping from and to
        const order = Array.from({ length: state.numPages }, (_, i) => i);
        const fromIdx = fromPage - 1;
        const toIdx = toPage - 1;
        order.splice(fromIdx, 1);
        order.splice(toIdx, 0, fromIdx);
        const modifiedBytes = await reorderPages(bytes, order);
        await reloadFromBytes(modifiedBytes, state.file?.name || 'document.pdf');
      } catch (err) {
        console.error('Failed to move page:', err);
        setOperationError('Échec du déplacement de la page.');
      }
    },
    [getFreshBytes, state.file?.name, state.numPages, reloadFromBytes]
  );

  // PDF operations handlers
  const handleMerge = useCallback(async () => {
    if (mergeFiles.length === 0 || isConverting) return;
    setIsConverting(true);
    try {
      // Deduplicate files by name
      const seen = new Set<string>();
      const uniqueFiles = mergeFiles.filter((f) => {
        if (seen.has(f.name)) return false;
        seen.add(f.name);
        return true;
      });

      // Convert all selected files to PDF bytes
      const pdfBytesList: Uint8Array[] = [];
      const failedFiles: string[] = [];

      for (const file of uniqueFiles) {
        try {
          const pdfBytes = await convertToPdf(file);
          pdfBytesList.push(pdfBytes);
        } catch (err) {
          console.error(`Conversion failed for ${file.name}:`, err);
          failedFiles.push(file.name);
        }
      }
      if (failedFiles.length > 0) {
        alert(`Conversion échouée pour: ${failedFiles.join(', ')}. Les autres fichiers seront fusionnés.`);
      }
      if (pdfBytesList.length < 1) return;

      // Merge all PDF bytes using pdf-lib
      console.log(`[Merge] Fusion de ${pdfBytesList.length} PDFs...`);
      const mergedDoc = await PDFDocument.create();
      for (let i = 0; i < pdfBytesList.length; i++) {
        const srcDoc = await PDFDocument.load(pdfBytesList[i]);
        console.log(`[Merge]  PDF ${i}: ${srcDoc.getPageCount()} pages`);
        const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        for (const page of pages) {
          mergedDoc.addPage(page);
        }
      }
      console.log(`[Merge] Résultat: ${mergedDoc.getPageCount()} pages`);
      const mergedBytes = await mergedDoc.save();

      const timestamp = new Date().toISOString().slice(0, 10);
      saveAs(
        new Blob([mergedBytes], { type: 'application/pdf' }),
        `merged_${timestamp}.pdf`
      );

      setShowMergeModal(false);
      setMergeFiles([]);
    } catch (err) {
      console.error('Merge failed:', err);
      alert('La fusion a échoué: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setIsConverting(false);
    }
  }, [mergeFiles, getFreshBytes, isConverting]);

  const handleSplit = useCallback(async () => {
    setIsProcessing(true);
    try {
      const bytes = getFreshBytes();
      if (!bytes) return;
      // Validate split range bounds
      if (splitRange.start < 1 || splitRange.end > state.numPages || splitRange.start > splitRange.end) return;
      // splitPdf expects (pdfBytes, ranges: [number, number][]) with 0-indexed pages
      const ranges: [number, number][] = [[splitRange.start - 1, splitRange.end - 1]];
      const parts = await splitPdf(bytes, ranges);

      parts.forEach((part, index) => {
        const timestamp = new Date().toISOString().slice(0, 10);
        saveAs(
          new Blob([part], { type: 'application/pdf' }),
          `split_${timestamp}_part${index + 1}.pdf`
        );
      });

      setShowSplitModal(false);
      setSplitRange({ start: 1, end: 1 });
    } catch (err) {
      console.error('Split failed:', err);
      setOperationError('Échec de la division du PDF.');
    } finally {
      setIsProcessing(false);
    }
  }, [getFreshBytes, splitRange, state.numPages]);

  const handleExportImages = useCallback(async () => {
    setIsProcessing(true);
    try {
      const bytes = getFreshBytes();
      if (!bytes) return;

      for (let i = 0; i < state.numPages; i++) {
        // exportPageAsImage returns a Blob
        const blob = await exportPageAsImage(bytes, i, 2);
        saveAs(blob, `page_${i + 1}.png`);
        // progress: ((i + 1) / state.numPages) * 100
      }

    } catch (err) {
      console.error('Export images failed:', err);
      setOperationError('Échec de l\'export des images.');
    } finally {
      setIsProcessing(false);
    }
  }, [getFreshBytes, state.numPages]);

  const handlePasswordProtect = useCallback(async () => {
    if (!passwordInput) return;
    setIsProcessing(true);
    try {
      const bytes = getFreshBytes();
      if (!bytes) return;
      const protectedBytes = await protectPdf(bytes, passwordInput);

      const timestamp = new Date().toISOString().slice(0, 10);
      saveAs(
        new Blob([protectedBytes], { type: 'application/pdf' }),
        `protected_${timestamp}.pdf`
      );

      setShowPasswordModal(false);
      setPasswordInput('');
    } catch (err) {
      console.error('Password protection failed:', err);
      setOperationError('Échec de la protection par mot de passe.');
    } finally {
      setIsProcessing(false);
    }
  }, [getFreshBytes, passwordInput]);

  const handleOcr = useCallback(async () => {
    setIsProcessing(true);
    try {
      const bytes = getFreshBytes();
      if (!bytes) return;
      // exportPageAsImage returns a Blob directly
      const blob = await exportPageAsImage(bytes, state.currentPage, 2);
      const ocrText = await runOcr(blob);

      setShowOcrResult(ocrText);
    } catch (err) {
      console.error('OCR failed:', err);
      setOperationError('Échec de la reconnaissance OCR.');
    } finally {
      setIsProcessing(false);
    }
  }, [getFreshBytes, state.currentPage]);

  const handlePreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  // Track file history when loading
  const handleFileSelect = useCallback(async (file: File) => {
    addToFileHistory(file);
    setFileHistory(getFileHistory());
    await loadFile(file);
  }, [loadFile]);

  // New feature handlers
  const handleRotatePage = useCallback(async () => {
    setIsProcessing(true);
    try {
      const bytes = getFreshBytes();
      if (!bytes) return;
      const rotatedBytes = await rotatePage(bytes, state.currentPage, 90);
      await reloadFromBytes(rotatedBytes, state.file?.name || 'document.pdf');
    } catch (err) {
      console.error('Rotation failed:', err);
      setOperationError('Échec de la rotation.');
    } finally {
      setIsProcessing(false);
    }
  }, [getFreshBytes, state.currentPage, state.file?.name, reloadFromBytes]);

  const handleCompress = useCallback(async () => {
    setIsProcessing(true);
    try {
      const bytes = getFreshBytes();
      if (!bytes) return;
      const originalSize = bytes.length;
      const compressedBytes = await compressPdf(bytes);
      const newSize = compressedBytes.length;
      const reduction = Math.round((1 - newSize / originalSize) * 100);
      const timestamp = new Date().toISOString().slice(0, 10);
      saveAs(
        new Blob([compressedBytes], { type: 'application/pdf' }),
        `compressed_${timestamp}.pdf`
      );
      alert(`PDF compressé ! Réduction: ${reduction}% (${(originalSize / 1024).toFixed(0)} Ko → ${(newSize / 1024).toFixed(0)} Ko)`);
    } catch (err) {
      console.error('Compression failed:', err);
      setOperationError('Échec de la compression.');
    } finally {
      setIsProcessing(false);
    }
  }, [getFreshBytes]);

  const handleWatermark = useCallback(async () => {
    if (!watermarkText.trim()) return;
    setIsProcessing(true);
    try {
      const bytes = getFreshBytes();
      if (!bytes) return;
      const watermarkedBytes = await addWatermark(bytes, watermarkText, {
        opacity: watermarkOpacity,
        fontSize: watermarkFontSize,
      });
      const timestamp = new Date().toISOString().slice(0, 10);
      saveAs(
        new Blob([watermarkedBytes], { type: 'application/pdf' }),
        `watermarked_${timestamp}.pdf`
      );
      setShowWatermarkModal(false);
    } catch (err) {
      console.error('Watermark failed:', err);
      setOperationError('Échec de l\'ajout du filigrane.');
    } finally {
      setIsProcessing(false);
    }
  }, [getFreshBytes, watermarkText, watermarkOpacity, watermarkFontSize]);

  const handleAddPageNumbers = useCallback(async () => {
    setIsProcessing(true);
    try {
      const bytes = getFreshBytes();
      if (!bytes) return;
      const numberedBytes = await addPageNumbers(bytes);
      const timestamp = new Date().toISOString().slice(0, 10);
      saveAs(
        new Blob([numberedBytes], { type: 'application/pdf' }),
        `numbered_${timestamp}.pdf`
      );
    } catch (err) {
      console.error('Page numbers failed:', err);
      setOperationError('Échec de la numérotation.');
    } finally {
      setIsProcessing(false);
    }
  }, [getFreshBytes]);

  const handleCropPage = useCallback(async () => {
    setIsProcessing(true);
    try {
      const bytes = getFreshBytes();
      if (!bytes) return;
      // Crop to 80% center area
      const tempDoc = await PDFDocument.load(bytes);
      const page = tempDoc.getPage(state.currentPage);
      const { width, height } = page.getSize();
      const margin = 0.1;
      if (width * (1 - 2 * margin) <= 0 || height * (1 - 2 * margin) <= 0) {
        alert('Page trop petite pour être recadrée.');
        return;
      }
      const croppedBytes = await cropPage(bytes, state.currentPage, {
        x: width * margin,
        y: height * margin,
        width: width * (1 - 2 * margin),
        height: height * (1 - 2 * margin),
      });
      await reloadFromBytes(croppedBytes, state.file?.name || 'document.pdf');
    } catch (err) {
      console.error('Crop failed:', err);
      setOperationError('Échec du recadrage.');
    } finally {
      setIsProcessing(false);
    }
  }, [getFreshBytes, state.currentPage, state.file?.name, reloadFromBytes]);

  const handleExportJpeg = useCallback(async () => {
    setIsProcessing(true);
    try {
      const bytes = getFreshBytes();
      if (!bytes) return;
      for (let i = 0; i < state.numPages; i++) {
        const blob = await exportPageAsJpeg(bytes, i, 2);
        saveAs(blob, `page_${i + 1}.jpg`);
      }
    } catch (err) {
      console.error('JPEG export failed:', err);
      setOperationError('Échec de l\'export JPEG.');
    } finally {
      setIsProcessing(false);
    }
  }, [getFreshBytes, state.numPages]);

  const handlePrint = useCallback(async () => {
    try {
      const bytes = getFreshBytes();
      if (!bytes) return;
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      const cleanup = () => {
        if (iframe.parentNode) document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      };
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(cleanup, 1000);
      };
      iframe.onerror = cleanup;
      // Safety timeout: cleanup even if onload/onerror never fire
      setTimeout(cleanup, 10000);
    } catch (err) {
      console.error('Print failed:', err);
      setOperationError('Échec de l\'impression.');
    }
  }, [getFreshBytes]);

  const hasFile = !!state.pdfBytes;
  const isDark = darkMode === 'dark';

  const menuGroups: MenuGroup[] = [
    {
      label: 'Fichier',
      items: [
        { label: 'Nouveau', shortcut: '', onClick: () => { if (hasFile && window.confirm('Voulez-vous vraiment réinitialiser ?')) reset(); }, disabled: !hasFile },
        { label: 'Sauvegarder', shortcut: '⌘S', onClick: savePdf, disabled: !hasFile || isSaving },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Fusionner des fichiers…', onClick: () => setShowMergeModal(true), disabled: !hasFile },
        { label: 'Diviser le PDF…', onClick: () => setShowSplitModal(true), disabled: !hasFile },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Exporter en images (PNG)', onClick: handleExportImages, disabled: !hasFile },
        { label: 'Exporter en JPEG', onClick: handleExportJpeg, disabled: !hasFile },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Imprimer', shortcut: '⌘P', onClick: handlePrint, disabled: !hasFile },
      ],
    },
    {
      label: 'Édition',
      items: [
        { label: 'Annuler', shortcut: '⌘Z', onClick: undo, disabled: !canUndo },
        { label: 'Rétablir', shortcut: '⌘⇧Z', onClick: redo, disabled: !canRedo },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Copier annotation', shortcut: '⌘C', onClick: () => {
          const ann = state.annotations.find((a) => a.id === selectedAnnotationId);
          if (ann) setClipboardAnnotation(ann);
        }, disabled: !selectedAnnotationId },
        { label: 'Coller annotation', shortcut: '⌘V', onClick: () => {
          if (clipboardAnnotation) {
            addAnnotation({ ...clipboardAnnotation, page: state.currentPage, x: clipboardAnnotation.x + 20, y: clipboardAnnotation.y + 20 });
          }
        }, disabled: !clipboardAnnotation },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Supprimer annotation', shortcut: 'Suppr', onClick: () => {
          if (selectedAnnotationId) { deleteAnnotation(selectedAnnotationId); setSelectedAnnotationId(null); }
        }, disabled: !selectedAnnotationId },
      ],
    },
    {
      label: 'Affichage',
      items: [
        { label: 'Zoom avant', shortcut: '⌘+', onClick: () => setScale(Math.min(3, state.scale + 0.25)), disabled: !hasFile || state.scale >= 3 },
        { label: 'Zoom arrière', shortcut: '⌘-', onClick: () => setScale(Math.max(0.5, state.scale - 0.25)), disabled: !hasFile || state.scale <= 0.5 },
        { label: 'Zoom 100%', onClick: () => setScale(1), disabled: !hasFile },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Mode sombre', type: 'toggle', checked: isDark, onClick: () => setDarkMode(isDark ? 'light' : 'dark') },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Panneau des pages', type: 'toggle', checked: showThumbnails, onClick: () => setShowThumbnails(!showThumbnails) },
        { label: 'Panneau annotations', type: 'toggle', checked: showAnnotationPanel, onClick: () => setShowAnnotationPanel(!showAnnotationPanel) },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Aperçu', onClick: handlePreview, disabled: !hasFile },
      ],
    },
    {
      label: 'Insertion',
      items: [
        { label: 'Texte', onClick: () => setActiveTool('text'), disabled: !hasFile },
        { label: 'Signature', onClick: () => setActiveTool('signature'), disabled: !hasFile },
        { label: 'Image', onClick: () => setActiveTool('image'), disabled: !hasFile },
        { label: 'Tampon', onClick: () => setActiveTool('stamp'), disabled: !hasFile },
        { label: 'Note adhésive', onClick: () => setActiveTool('sticky-note'), disabled: !hasFile },
        { label: 'Case à cocher', onClick: () => setActiveTool('checkbox'), disabled: !hasFile },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Dessin libre', onClick: () => setActiveTool('draw'), disabled: !hasFile },
        { label: 'Surlignage', onClick: () => setActiveTool('highlight'), disabled: !hasFile },
        { label: 'Caviardage', onClick: () => setActiveTool('redact'), disabled: !hasFile },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Champ formulaire texte', onClick: () => setActiveTool('form-text'), disabled: !hasFile },
        { label: 'Case formulaire', onClick: () => setActiveTool('form-checkbox'), disabled: !hasFile },
        { label: 'Liste déroulante', onClick: () => setActiveTool('form-dropdown'), disabled: !hasFile },
      ],
    },
    {
      label: 'Outils',
      items: [
        { label: 'Rechercher…', shortcut: '⌘F', onClick: () => setShowSearch(true), disabled: !hasFile },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Reconnaissance OCR', onClick: handleOcr, disabled: !hasFile },
        { label: 'Rotation de page', onClick: handleRotatePage, disabled: !hasFile },
        { label: 'Compresser le PDF', onClick: handleCompress, disabled: !hasFile },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Filigrane…', onClick: () => setShowWatermarkModal(true), disabled: !hasFile },
        { label: 'Numéroter les pages', onClick: handleAddPageNumbers, disabled: !hasFile },
        { label: 'Recadrer la page', onClick: handleCropPage, disabled: !hasFile },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Protection mot de passe…', onClick: () => setShowPasswordModal(true), disabled: !hasFile },
      ],
    },
    {
      label: 'Aide',
      items: [
        { label: 'Raccourcis clavier', onClick: () => alert('⌘Z Annuler\n⌘⇧Z Rétablir\n⌘S Sauvegarder\n⌘F Rechercher\n⌘C Copier annotation\n⌘V Coller annotation\nSuppr Supprimer annotation\n← → Navigation pages\nEchap Désélectionner') },
        { label: 'Dépôt GitHub', onClick: () => window.open('https://github.com/aahmds/pdf_editor', '_blank') },
        { label: 'À propos de PDF Editor Pro', onClick: () => alert('PDF Editor Pro\nVersion 1.0\n\nÉditeur PDF complet avec annotations, fusion, OCR, et plus.') },
      ],
    },
  ];

  return (
    <div className={`editor ${isDark ? 'dark-mode' : ''}`}>
      <MenuBar menus={menuGroups} darkMode={isDark} />
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        currentPage={state.currentPage}
        numPages={state.numPages}
        scale={state.scale}
        onPageChange={setCurrentPage}
        onScaleChange={setScale}
        onSave={savePdf}
        onReset={reset}
        isSaving={isSaving}
        hasFile={hasFile}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        textColor={textColor}
        onTextColorChange={setTextColor}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        fontFamily={fontFamily}
        onFontFamilyChange={setFontFamily}
        darkMode={isDark}
        onToggleDarkMode={() => setDarkMode(isDark ? 'light' : 'dark')}
        onPreview={handlePreview}
        annotationCount={state.annotations.length}
        onMerge={() => setShowMergeModal(true)}
        onSplit={() => setShowSplitModal(true)}
        onExportImages={handleExportImages}
        onPasswordProtect={() => setShowPasswordModal(true)}
        onOcr={handleOcr}
        onRotatePage={handleRotatePage}
        onCompress={handleCompress}
        onWatermark={() => setShowWatermarkModal(true)}
        onAddPageNumbers={handleAddPageNumbers}
        onCropPage={handleCropPage}
        onExportJpeg={handleExportJpeg}
        onSearch={() => setShowSearch(true)}
        onPrint={handlePrint}
        stampType={stampType}
        onStampTypeChange={setStampType}
      />

      <div className="editor-content">
        <PageThumbnails
          pdfBytes={state.pdfBytes}
          pdfUrl={state.pdfUrl}
          getFreshBytes={getFreshBytes}
          numPages={state.numPages}
          currentPage={state.currentPage + 1}
          onPageSelect={(page) => setCurrentPage(page - 1)}
          isOpen={showThumbnails}
          onToggle={() => setShowThumbnails(!showThumbnails)}
          onDeletePage={handleDeletePage}
          onMovePage={handleMovePage}
        />

        <div className="editor-main">
          {state.isLoading ? (
            <div className="loading-state">
              <span className="loading-spinner" />
              <p>Chargement du PDF...</p>
            </div>
          ) : state.error && !state.pdfBytes ? (
            <div className="error-state">
              <span className="error-icon">⚠️</span>
              <p>{state.error}</p>
              <button className="btn-primary" onClick={() => window.location.reload()}>
                Réessayer
              </button>
            </div>
          ) : !state.pdfBytes ? (
            <>
              <FileDropzone onFileSelect={handleFileSelect} />
              {fileHistory.length > 0 && (
                <div className="file-history">
                  <div className="file-history-header">
                    <span>Fichiers récents</span>
                    <button className="file-history-clear" onClick={() => { clearFileHistory(); setFileHistory([]); }} aria-label="Effacer l'historique">Effacer</button>
                  </div>
                  <ul className="file-history-list">
                    {fileHistory.map((entry) => (
                      <li key={entry.name + entry.lastOpened} className="file-history-item">
                        <span className="file-history-name">{entry.name}</span>
                        <span className="file-history-size">{(entry.size / 1024).toFixed(0)} Ko</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              {(state.error || operationError) && (
                <div className="error-banner">
                  <p>{state.error || operationError}</p>
                  <button className="error-banner-close" aria-label="Fermer le message d'erreur" onClick={() => { clearError(); setOperationError(null); }}>×</button>
                </div>
              )}
              {isProcessing && (
                <div className="processing-overlay">
                  <span className="loading-spinner" />
                  <p>Traitement en cours...</p>
                </div>
              )}
              <PdfViewer
                pdfBytes={state.pdfBytes}
                pdfUrl={state.pdfUrl}
                getFreshBytes={getFreshBytes}
                currentPage={state.currentPage}
                scale={state.scale}
                annotations={state.annotations}
                activeTool={activeTool}
                onAddAnnotation={addAnnotation}
                onUpdateAnnotation={updateAnnotation}
                onDeleteAnnotation={deleteAnnotation}
                onOpenSignature={handleOpenSignature}
                onOpenTextInput={handleOpenTextInput}
                textColor={textColor}
                fontSize={fontSize}
                fontFamily={fontFamily}
                selectedAnnotationId={selectedAnnotationId}
                onSelectionChange={setSelectedAnnotationId}
                stampType={stampType}
                onNumPages={setNumPages}
              />
            </>
          )}
        </div>

        <AnnotationPanel
          annotations={state.annotations}
          currentPage={state.currentPage}
          numPages={state.numPages}
          selectedId={selectedAnnotationId}
          onSelectAnnotation={handleSelectAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          isOpen={showAnnotationPanel}
          onToggle={() => setShowAnnotationPanel(!showAnnotationPanel)}
        />
      </div>

      <SignatureModal
        isOpen={signatureCallback !== null}
        onClose={() => setSignatureCallback(null)}
        onSave={handleSignatureSave}
      />

      <TextInputModal
        isOpen={textInputCallback !== null}
        onClose={() => setTextInputCallback(null)}
        onSubmit={handleTextSubmit}
      />

      {/* Merge Modal */}
      <div className={`modal ${showMergeModal ? 'modal-open' : ''}`} role="dialog" aria-modal="true" aria-label="Fusionner des fichiers">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Fusionner des fichiers</h2>
            <button className="modal-close" onClick={() => setShowMergeModal(false)} aria-label="Fermer">×</button>
          </div>
          <div className="modal-body">
            <p>Sélectionnez les fichiers PDF, images (PNG, JPG, WEBP) ou documents (TXT, DOCX) à fusionner ensemble.</p>
            <input
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS}
              onChange={(e) => setMergeFiles(Array.from(e.target.files || []))}
              className="file-input"
              disabled={isConverting}
            />
            {mergeFiles.length > 0 && (
              <div className="file-list">
                {mergeFiles.map((f) => (
                  <div key={f.name} className="file-item">
                    <span className="file-item-icon">{isPdfFile(f) ? '📄' : f.type.startsWith('image/') ? '🖼️' : '📝'}</span>
                    {f.name}
                    <span className="file-item-size">({(f.size / 1024).toFixed(0)} Ko)</span>
                  </div>
                ))}
              </div>
            )}
            {isConverting && (
              <div className="converting-indicator">
                <span className="loading-spinner" /> Conversion et fusion en cours...
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setShowMergeModal(false)} disabled={isConverting}>Annuler</button>
            <button className="btn-primary" onClick={handleMerge} disabled={mergeFiles.length === 0 || isConverting}>
              {isConverting ? 'Conversion...' : 'Fusionner'}
            </button>
          </div>
        </div>
      </div>

      {/* Split Modal */}
      <div className={`modal ${showSplitModal ? 'modal-open' : ''}`} role="dialog" aria-modal="true" aria-label="Diviser le PDF">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Diviser le PDF</h2>
            <button className="modal-close" onClick={() => setShowSplitModal(false)} aria-label="Fermer">×</button>
          </div>
          <div className="modal-body">
            <label>
              Page de départ (1-{state.numPages}):
              <input type="number" min="1" max={state.numPages} value={splitRange.start}
                onChange={(e) => setSplitRange({ ...splitRange, start: parseInt(e.target.value) || 1 })} className="input-field" />
            </label>
            <label>
              Page de fin (1-{state.numPages}):
              <input type="number" min="1" max={state.numPages} value={splitRange.end}
                onChange={(e) => setSplitRange({ ...splitRange, end: parseInt(e.target.value) || 1 })} className="input-field" />
            </label>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setShowSplitModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSplit} disabled={splitRange.start > splitRange.end}>Diviser</button>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      <div className={`modal ${showPasswordModal ? 'modal-open' : ''}`} role="dialog" aria-modal="true" aria-label="Protéger par mot de passe">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Protéger par mot de passe</h2>
            <button className="modal-close" onClick={() => setShowPasswordModal(false)} aria-label="Fermer">×</button>
          </div>
          <div className="modal-body">
            <label>
              Mot de passe:
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
                className="input-field" placeholder="Entrez le mot de passe" />
            </label>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setShowPasswordModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={handlePasswordProtect} disabled={!passwordInput}>Protéger</button>
          </div>
        </div>
      </div>

      {/* OCR Result Modal */}
      <div className={`modal ${showOcrResult ? 'modal-open' : ''}`} role="dialog" aria-modal="true" aria-label="Résultat OCR">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Résultat OCR</h2>
            <button className="modal-close" onClick={() => setShowOcrResult(null)} aria-label="Fermer">×</button>
          </div>
          <div className="modal-body">
            <textarea readOnly value={showOcrResult || ''} className="textarea-field" rows={10} />
          </div>
          <div className="modal-footer">
            <button className="btn-primary" onClick={() => { if (showOcrResult) navigator.clipboard.writeText(showOcrResult); }}>Copier</button>
            <button className="btn-secondary" onClick={() => setShowOcrResult(null)}>Fermer</button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        pdfBytes={state.pdfBytes}
        numPages={state.numPages}
        onNavigateToPage={setCurrentPage}
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />

      {/* Watermark Modal */}
      <div className={`modal ${showWatermarkModal ? 'modal-open' : ''}`} role="dialog" aria-modal="true" aria-label="Ajouter un filigrane">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Ajouter un filigrane</h2>
            <button className="modal-close" onClick={() => setShowWatermarkModal(false)} aria-label="Fermer">×</button>
          </div>
          <div className="modal-body">
            <label>
              Texte du filigrane:
              <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)}
                className="input-field" placeholder="Ex: CONFIDENTIEL" />
            </label>
            <label>
              Opacité ({Math.round(watermarkOpacity * 100)}%):
              <input type="range" min="0.05" max="1" step="0.05" value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))} className="input-range" />
            </label>
            <label>
              Taille de police:
              <input type="number" min="10" max="200" value={watermarkFontSize}
                onChange={(e) => setWatermarkFontSize(parseInt(e.target.value) || 50)} className="input-field" />
            </label>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setShowWatermarkModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleWatermark} disabled={!watermarkText.trim()}>Appliquer</button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Aperçu du document">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>Aperçu du document</h2>
              <button className="modal-close" onClick={() => setShowPreview(false)} aria-label="Fermer">×</button>
            </div>
            <div className="modal-body">
              {state.pdfBytes && (
                <PdfViewer
                  pdfBytes={state.pdfBytes}
                  pdfUrl={state.pdfUrl}
                  getFreshBytes={getFreshBytes}
                  currentPage={state.currentPage}
                  scale={1}
                  annotations={state.annotations}
                  activeTool="select"
                  onAddAnnotation={() => ''}
                  onUpdateAnnotation={() => {}}
                  onDeleteAnnotation={() => {}}
                  onOpenSignature={() => {}}
                  onOpenTextInput={() => {}}
                  textColor={textColor}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  selectedAnnotationId={null}
                  onSelectionChange={() => {}}
                  stampType={stampType}
                />
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowPreview(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
