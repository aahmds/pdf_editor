import { useCallback, useState } from 'react';
import { convertToPdf, isPdfFile, ACCEPTED_EXTENSIONS } from '../utils/fileConverter';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)`;
  const ext = file.name.toLowerCase().split('.').pop();
  const supportedExts = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'docx'];
  if (!supportedExts.includes(ext || '')) return 'Format non supporté. Formats acceptés: PDF, PNG, JPG, WEBP, TXT, DOCX';
  return null;
}

export function FileDropzone({ onFileSelect }: FileDropzoneProps) {
  const [isConverting, setIsConverting] = useState(false);

  const processFile = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }
    if (isPdfFile(file)) {
      onFileSelect(file);
    } else {
      setIsConverting(true);
      try {
        const pdfBytes = await convertToPdf(file);
        const pdfFile = new File([pdfBytes.buffer as ArrayBuffer], file.name.replace(/\.[^.]+$/, '.pdf'), { type: 'application/pdf' });
        onFileSelect(pdfFile);
      } catch (err) {
        alert('Erreur de conversion: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
      } finally {
        setIsConverting(false);
      }
    }
  }, [onFileSelect]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="dropzone" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="dropzone-content">
        <svg className="dropzone-icon" width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="4" width="24" height="32" rx="2" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
          <rect x="16" y="12" width="24" height="32" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M28 12V24M22 18H34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <h2>Glissez votre fichier ici</h2>
        <p className="dropzone-formats">PDF, Images (PNG, JPG, WEBP), Documents (TXT, DOCX)</p>
        {isConverting ? (
          <div className="converting-indicator">
            <span className="loading-spinner" /> Conversion en PDF...
          </div>
        ) : (
          <>
            <p>ou</p>
            <label className="file-input-label">
              <input
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
              <span className="btn-primary">Sélectionner un fichier</span>
            </label>
          </>
        )}
      </div>
    </div>
  );
}
