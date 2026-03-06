import { useEffect, useRef, useState } from 'react';
import { pdfjsLib } from '../utils/pdfWorker';
import type { Annotation, Tool, FontFamily } from '../types';
import DrawingCanvas from './DrawingCanvas';

interface PdfViewerProps {
  pdfBytes: Uint8Array | null;
  getFreshBytes: () => Uint8Array | null;
  currentPage: number;
  scale: number;
  annotations: Annotation[];
  activeTool: Tool;
  onAddAnnotation: (annotation: Omit<Annotation, 'id'>) => string;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onOpenSignature: (callback: (dataUrl: string) => void) => void;
  onOpenTextInput: (callback: (text: string) => void) => void;
  textColor: string;
  fontSize: number;
  fontFamily: FontFamily;
  selectedAnnotationId: string | null;
  onSelectionChange: (id: string | null) => void;
  stampType?: string;
}

export function PdfViewer({
  pdfBytes,
  getFreshBytes,
  currentPage,
  scale,
  annotations,
  activeTool,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onOpenSignature,
  onOpenTextInput,
  textColor,
  fontSize,
  fontFamily,
  selectedAnnotationId,
  onSelectionChange,
  stampType = 'approved',
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [redactStart, setRedactStart] = useState<{ x: number; y: number } | null>(null);
  const [redactCurrent, setRedactCurrent] = useState<{ x: number; y: number } | null>(null);
  const [pdfReady, setPdfReady] = useState(0);

  // Load PDF document once when pdfBytes change
  useEffect(() => {
    if (!pdfBytes) {
      pdfDocRef.current = null;
      return;
    }

    let cancelled = false;
    const loadPdf = async () => {
      const freshBytes = getFreshBytes();
      if (!freshBytes) return;
      // Destroy previous document to free memory
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
      const pdf = await pdfjsLib.getDocument({ data: freshBytes }).promise;
      if (!cancelled) {
        pdfDocRef.current = pdf;
        setPdfReady((c) => c + 1);
      } else {
        pdf.destroy();
      }
    };

    loadPdf();
    return () => {
      cancelled = true;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [pdfBytes, getFreshBytes]);

  // Render current page
  useEffect(() => {
    if (!pdfBytes || !canvasRef.current) return;

    const renderPage = async () => {
      // Cancel any ongoing render
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      // Wait for PDF to be loaded by the first effect
      if (!pdfDocRef.current) return;

      const pdf = pdfDocRef.current;
      const page = await pdf.getPage(currentPage + 1);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;

      // Clear canvas before rendering
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      context.clearRect(0, 0, canvas.width, canvas.height);

      setPageSize({ width: viewport.width, height: viewport.height });

      renderTaskRef.current = page.render({ canvasContext: context, viewport, canvas });
      await renderTaskRef.current.promise;
      // Guard: component may have unmounted during async render
      if (!canvasRef.current) return;
    };

    renderPage().catch((err) => {
      if (err.name !== 'RenderingCancelledException') {
        console.error('PDF render error:', err);
      }
    });
  }, [pdfBytes, currentPage, scale, getFreshBytes, pdfReady]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'draw' || activeTool === 'redact' || activeTool === 'highlight') return;

    if (activeTool === 'select') {
      onSelectionChange(null);
      return;
    }

    const rect = containerRef.current!.getBoundingClientRect();
    // Store coordinates in PDF space (not scaled)
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    switch (activeTool) {
      case 'text': {
        onOpenTextInput((text) => {
          onAddAnnotation({
            type: 'text',
            page: currentPage,
            x,
            y,
            width: 200 / scale,
            height: 20 / scale,
            content: text,
            fontSize,
            fontColor: textColor,
            fontFamily,
          });
        });
        break;
      }
      case 'signature': {
        onOpenSignature((dataUrl) => {
          onAddAnnotation({
            type: 'signature',
            page: currentPage,
            x,
            y,
            width: 150 / scale,
            height: 60 / scale,
            content: dataUrl,
          });
        });
        break;
      }
      case 'checkbox': {
        onAddAnnotation({
          type: 'checkbox',
          page: currentPage,
          x,
          y,
          width: 16 / scale,
          height: 16 / scale,
          content: '',
          checked: true,
        });
        break;
      }
      case 'form-text': {
        onOpenTextInput((text) => {
          onAddAnnotation({
            type: 'form-text',
            page: currentPage,
            x,
            y,
            width: 200 / scale,
            height: 24 / scale,
            content: text,
            fontSize,
            fontColor: textColor,
            fontFamily,
          });
        });
        break;
      }
      case 'form-checkbox': {
        onAddAnnotation({
          type: 'form-checkbox',
          page: currentPage,
          x,
          y,
          width: 18 / scale,
          height: 18 / scale,
          content: '',
          checked: false,
        });
        break;
      }
      case 'form-dropdown': {
        onOpenTextInput((options) => {
          const optionsArray = options.split(',').map((s) => s.trim());
          onAddAnnotation({
            type: 'form-dropdown',
            page: currentPage,
            x,
            y,
            width: 180 / scale,
            height: 28 / scale,
            content: optionsArray[0] || '',
            options: optionsArray,
          });
        });
        break;
      }
      case 'image': {
        // Create file input to select an image
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/png,image/jpeg,image/webp';
        fileInput.onchange = async () => {
          const file = fileInput.files?.[0];
          if (!file) return;
          // Validate MIME type to prevent SVG XSS
          if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
            alert('Format non supporté. Utilisez PNG, JPG ou WEBP.');
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            onAddAnnotation({
              type: 'image',
              page: currentPage,
              x,
              y,
              width: 200 / scale,
              height: 150 / scale,
              content: '',
              imageDataUrl: dataUrl,
            });
          };
          reader.readAsDataURL(file);
        };
        fileInput.click();
        break;
      }
      case 'stamp': {
        onAddAnnotation({
          type: 'stamp',
          page: currentPage,
          x,
          y,
          width: 180 / scale,
          height: 50 / scale,
          content: '',
          stampType,
        });
        break;
      }
      case 'sticky-note': {
        onOpenTextInput((text) => {
          onAddAnnotation({
            type: 'sticky-note',
            page: currentPage,
            x,
            y,
            width: 24 / scale,
            height: 24 / scale,
            content: text,
            stickyNoteColor: '#FFF176',
          });
        });
        break;
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'redact' && activeTool !== 'highlight') return;

    const rect = containerRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setRedactStart({ x, y });
    setRedactCurrent({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((activeTool !== 'redact' && activeTool !== 'highlight') || !redactStart) return;

    const rect = containerRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setRedactCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if ((activeTool !== 'redact' && activeTool !== 'highlight') || !redactStart || !redactCurrent) {
      setRedactStart(null);
      setRedactCurrent(null);
      return;
    }

    const x = Math.min(redactStart.x, redactCurrent.x);
    const y = Math.min(redactStart.y, redactCurrent.y);
    const width = Math.abs(redactCurrent.x - redactStart.x);
    const height = Math.abs(redactCurrent.y - redactStart.y);

    if (width > 5 && height > 5) {
      onAddAnnotation({
        type: activeTool === 'highlight' ? 'highlight' : 'redact',
        page: currentPage,
        x,
        y,
        width,
        height,
        content: '',
        highlightColor: activeTool === 'highlight' ? '#FFFF00' : undefined,
      });
    }

    setRedactStart(null);
    setRedactCurrent(null);
  };

  const currentAnnotations = annotations.filter((a) => a.page === currentPage);

  // Compute redact rectangle display dimensions
  let redactDisplayRect: React.CSSProperties | null = null;
  if (redactStart && redactCurrent && (activeTool === 'redact' || activeTool === 'highlight')) {
    const x = Math.min(redactStart.x, redactCurrent.x) * scale;
    const y = Math.min(redactStart.y, redactCurrent.y) * scale;
    const width = Math.abs(redactCurrent.x - redactStart.x) * scale;
    const height = Math.abs(redactCurrent.y - redactStart.y) * scale;

    redactDisplayRect = {
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      background: activeTool === 'highlight' ? 'rgba(255, 255, 0, 0.35)' : 'rgba(0, 0, 0, 0.3)',
      border: activeTool === 'highlight' ? '1px solid rgba(255, 200, 0, 0.5)' : '1px solid rgba(0, 0, 0, 0.5)',
      pointerEvents: 'none',
    };
  }

  return (
    <div className="pdf-viewer-container">
      <div
        ref={containerRef}
        className="pdf-page-wrapper"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (activeTool === 'redact' || activeTool === 'highlight') {
            setRedactStart(null);
            setRedactCurrent(null);
          }
        }}
        style={{ position: 'relative', display: 'inline-block' }}
      >
        <canvas ref={canvasRef} />

        {/* Drawing canvas overlay */}
        {activeTool === 'draw' && (
          <DrawingCanvas
            width={pageSize.width}
            height={pageSize.height}
            scale={scale}
            strokeColor="#000000"
            strokeWidth={2}
            isActive={true}
            onDrawingComplete={(dataUrl) => {
              onAddAnnotation({
                type: 'drawing',
                page: currentPage,
                x: 0,
                y: 0,
                width: pageSize.width / scale,
                height: pageSize.height / scale,
                content: dataUrl,
              });
            }}
          />
        )}

        {/* Redact rectangle overlay during dragging */}
        {redactDisplayRect && <div style={redactDisplayRect} />}

        {/* Render annotations overlay */}
        <div
          className="annotations-layer"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: pageSize.width,
            height: pageSize.height,
            pointerEvents: 'none',
          }}
        >
          {currentAnnotations.map((annotation) => (
            <AnnotationItem
              key={annotation.id}
              annotation={annotation}
              scale={scale}
              isSelected={selectedAnnotationId === annotation.id}
              onSelect={() => onSelectionChange(annotation.id)}
              onUpdate={(updates) => onUpdateAnnotation(annotation.id, updates)}
              onDelete={() => onDeleteAnnotation(annotation.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface AnnotationItemProps {
  annotation: Annotation;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Annotation>) => void;
  onDelete: () => void;
}

function AnnotationItem({
  annotation,
  scale,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: AnnotationItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  // Display coordinates (scaled for canvas)
  const displayX = annotation.x * scale;
  const displayY = annotation.y * scale;
  const displayWidth = annotation.width * scale;
  const displayHeight = annotation.height * scale;

  // Handle drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    setDragStart({ x: e.clientX - displayX, y: e.clientY - displayY });
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Convert screen coordinates back to PDF coordinates
        const newX = (e.clientX - dragStart.x) / scale;
        const newY = (e.clientY - dragStart.y) / scale;
        onUpdate({ x: Math.max(0, newX), y: Math.max(0, newY) });
      } else if (isResizing) {
        const deltaX = (e.clientX - dragStart.x) / scale;
        const deltaY = (e.clientY - dragStart.y) / scale;
        const newWidth = Math.max(20, annotation.width + deltaX);
        const newHeight = Math.max(15, annotation.height + deltaY);

        if (annotation.type === 'text' || annotation.type === 'form-text') {
          const newFontSize = Math.max(8, Math.min(72, Math.round(newHeight * 0.8)));
          onUpdate({ fontSize: newFontSize });
        } else {
          onUpdate({ width: newWidth, height: newHeight });
        }
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, annotation, onUpdate, scale]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Supprimer cette annotation ?')) {
      onDelete();
    }
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: displayX,
    top: displayY,
    pointerEvents: 'auto',
    cursor: isDragging ? 'grabbing' : 'grab',
    border: isSelected ? '2px solid #007bff' : '2px solid transparent',
    borderRadius: 4,
    background: isSelected ? 'rgba(0,123,255,0.1)' : 'transparent',
    userSelect: 'none',
  };

  return (
    <div ref={elementRef} style={style} onMouseDown={handleMouseDown}>
      {annotation.type === 'text' && (
        <div
          style={{
            fontSize: annotation.fontSize,
            color: annotation.fontColor,
            fontFamily: annotation.fontFamily,
            whiteSpace: 'nowrap',
            padding: '2px 4px',
          }}
        >
          {annotation.content}
        </div>
      )}

      {annotation.type === 'signature' && (
        <img
          src={annotation.content}
          alt="Signature"
          style={{ width: displayWidth, height: displayHeight }}
          draggable={false}
        />
      )}

      {annotation.type === 'checkbox' && (
        <div
          style={{
            width: displayWidth,
            height: displayHeight,
            border: '2px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ checked: !annotation.checked });
          }}
        >
          {annotation.checked && <span style={{ fontSize: displayHeight * 0.8 }}>✓</span>}
        </div>
      )}

      {annotation.type === 'drawing' && (
        <img
          src={annotation.content}
          alt="Drawing"
          style={{ width: displayWidth, height: displayHeight }}
          draggable={false}
        />
      )}

      {annotation.type === 'redact' && (
        <div
          style={{
            width: displayWidth,
            height: displayHeight,
            background: 'black',
          }}
        />
      )}

      {annotation.type === 'form-text' && (
        <div
          style={{
            width: displayWidth,
            height: displayHeight,
            border: '1px solid #999',
            padding: '2px 4px',
            fontSize: annotation.fontSize,
            fontFamily: annotation.fontFamily,
            color: annotation.fontColor,
            background: 'white',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {annotation.content}
        </div>
      )}

      {annotation.type === 'form-checkbox' && (
        <div
          style={{
            width: displayWidth,
            height: displayHeight,
            border: '1px solid #999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ checked: !annotation.checked });
          }}
        >
          {annotation.checked && <span style={{ fontSize: displayHeight * 0.8 }}>✓</span>}
        </div>
      )}

      {annotation.type === 'form-dropdown' && (
        <div
          style={{
            width: displayWidth,
            height: displayHeight,
            border: '1px solid #999',
            padding: '2px',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: annotation.fontSize || 12,
            fontFamily: annotation.fontFamily,
          }}
        >
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {annotation.content}
          </span>
          <span style={{ marginLeft: '4px', color: '#666' }}>▼</span>
        </div>
      )}

      {annotation.type === 'highlight' && (
        <div
          style={{
            width: displayWidth,
            height: displayHeight,
            background: annotation.highlightColor || 'rgba(255, 255, 0, 0.35)',
            opacity: 0.5,
            borderRadius: 2,
          }}
        />
      )}

      {annotation.type === 'image' && annotation.imageDataUrl && (
        <img
          src={annotation.imageDataUrl}
          alt="Image"
          style={{ width: displayWidth, height: displayHeight, objectFit: 'contain' }}
          draggable={false}
        />
      )}

      {annotation.type === 'stamp' && (
        <div
          style={{
            width: displayWidth,
            height: displayHeight,
            border: '3px solid',
            borderColor: annotation.stampType === 'approved' ? '#009900' :
                         annotation.stampType === 'rejected' ? '#cc0000' :
                         annotation.stampType === 'urgent' ? '#e66600' :
                         annotation.stampType === 'confidential' ? '#800080' : '#888',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: Math.min(displayWidth / 8, displayHeight * 0.5),
            color: annotation.stampType === 'approved' ? '#009900' :
                   annotation.stampType === 'rejected' ? '#cc0000' :
                   annotation.stampType === 'urgent' ? '#e66600' :
                   annotation.stampType === 'confidential' ? '#800080' : '#888',
            opacity: 0.85,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          {annotation.stampType === 'approved' ? 'APPROUVÉ' :
           annotation.stampType === 'rejected' ? 'REJETÉ' :
           annotation.stampType === 'urgent' ? 'URGENT' :
           annotation.stampType === 'confidential' ? 'CONFIDENTIEL' : 'BROUILLON'}
        </div>
      )}

      {annotation.type === 'sticky-note' && (
        <div
          style={{
            width: 24 * scale,
            height: 24 * scale,
            background: annotation.stickyNoteColor || '#FFF176',
            border: '1px solid #ccaa00',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14 * scale,
            cursor: 'pointer',
            position: 'relative',
          }}
          title={annotation.content}
        >
          📝
        </div>
      )}

      {isSelected && (
        <>
          {/* Delete button */}
          <button
            onClick={handleDelete}
            style={{
              position: 'absolute',
              top: -12,
              right: -12,
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: 'none',
              background: '#dc3545',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>

          {/* Resize handle */}
          <div
            className="resize-handle"
            onMouseDown={handleResizeStart}
            style={{
              position: 'absolute',
              bottom: -6,
              right: -6,
              width: 12,
              height: 12,
              background: '#007bff',
              borderRadius: 2,
              cursor: 'nwse-resize',
            }}
          />

          {/* Font size indicator for text */}
          {(annotation.type === 'text' || annotation.type === 'form-text') && (
            <div
              style={{
                position: 'absolute',
                bottom: -20,
                left: 0,
                fontSize: 10,
                color: '#007bff',
                background: 'white',
                padding: '1px 4px',
                borderRadius: 2,
              }}
            >
              {annotation.fontSize}px
            </div>
          )}
        </>
      )}
    </div>
  );
}
