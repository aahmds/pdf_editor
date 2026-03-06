import React, { useEffect, useRef, useState } from 'react';
import { pdfjsLib } from '../utils/pdfWorker';

interface PageThumbnailsProps {
  pdfBytes: Uint8Array | null;
  getFreshBytes: () => Uint8Array | null;
  numPages: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
  isOpen: boolean;
  onToggle: () => void;
  onDeletePage: (page: number) => void;
  onMovePage: (from: number, to: number) => void;
}

const THUMBNAIL_WIDTH = 150;

const PageThumbnails: React.FC<PageThumbnailsProps> = ({
  pdfBytes,
  getFreshBytes,
  numPages,
  currentPage,
  onPageSelect,
  isOpen,
  onToggle,
  onDeletePage,
  onMovePage,
}) => {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [hoveredPage, setHoveredPage] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    canvasRefs.current = canvasRefs.current.slice(0, numPages);
  }, [numPages]);

  useEffect(() => {
    if (!isOpen) return;

    const bytes = getFreshBytes() ?? pdfBytes;
    if (!bytes || numPages === 0) return;

    let cancelled = false;

    const renderThumbnails = async () => {
      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) });
      let pdfDoc: pdfjsLib.PDFDocumentProxy;

      try {
        pdfDoc = await loadingTask.promise;
      } catch {
        return;
      }

      for (let i = 1; i <= numPages; i++) {
        if (cancelled) break;

        const canvas = canvasRefs.current[i - 1];
        if (!canvas) continue;

        try {
          const page = await pdfDoc.getPage(i);
          if (cancelled) break;

          const viewport = page.getViewport({ scale: 1 });
          const scale = THUMBNAIL_WIDTH / viewport.width;
          const scaledViewport = page.getViewport({ scale });

          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        } catch {
          // skip page on error
        }
      }

      pdfDoc.destroy();
    };

    renderThumbnails();

    return () => {
      cancelled = true;
    };
  }, [pdfBytes, numPages, isOpen, getFreshBytes]);

  const handleDeleteClick = (e: React.MouseEvent, pageNum: number) => {
    e.stopPropagation();
    if (confirmDelete === pageNum) {
      onDeletePage(pageNum);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(pageNum);
    }
  };

  const handleMoveUp = (e: React.MouseEvent, pageNum: number) => {
    e.stopPropagation();
    if (pageNum > 1) {
      onMovePage(pageNum, pageNum - 1);
    }
  };

  const handleMoveDown = (e: React.MouseEvent, pageNum: number) => {
    e.stopPropagation();
    if (pageNum < numPages) {
      onMovePage(pageNum, pageNum + 1);
    }
  };

  const handleThumbnailClick = (pageNum: number) => {
    setConfirmDelete(null);
    onPageSelect(pageNum);
  };

  return (
    <div className={`page-thumbnails-sidebar${isOpen ? ' page-thumbnails-sidebar--open' : ''}`}>
      <button className="page-thumbnails-toggle" onClick={onToggle} title={isOpen ? 'Hide pages' : 'Show pages'}>
        <span className="page-thumbnails-toggle-icon">{isOpen ? '◀' : '▶'}</span>
      </button>

      {isOpen && (
        <div className="page-thumbnails-panel">
          <div className="page-thumbnails-header">
            Pages ({numPages})
          </div>

          <div className="page-thumbnails-list">
            {Array.from({ length: numPages }, (_, i) => {
              const pageNum = i + 1;
              const isActive = pageNum === currentPage;
              const isHovered = hoveredPage === pageNum;
              const isPendingDelete = confirmDelete === pageNum;

              return (
                <div
                  key={pageNum}
                  className={`page-thumbnails-item${isActive ? ' page-thumbnails-item--active' : ''}${isPendingDelete ? ' page-thumbnails-item--confirm-delete' : ''}`}
                  onClick={() => handleThumbnailClick(pageNum)}
                  onMouseEnter={() => setHoveredPage(pageNum)}
                  onMouseLeave={() => {
                    setHoveredPage(null);
                    if (confirmDelete === pageNum) setConfirmDelete(null);
                  }}
                >
                  <div className="page-thumbnails-canvas-wrapper">
                    <canvas
                      ref={(el) => { canvasRefs.current[i] = el; }}
                      className="page-thumbnails-canvas"
                    />

                    {(isHovered || isPendingDelete) && (
                      <div className="page-thumbnails-actions">
                        <button
                          className="page-thumbnails-btn page-thumbnails-btn--move"
                          onClick={(e) => handleMoveUp(e, pageNum)}
                          disabled={pageNum === 1}
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          className="page-thumbnails-btn page-thumbnails-btn--move"
                          onClick={(e) => handleMoveDown(e, pageNum)}
                          disabled={pageNum === numPages}
                          title="Move down"
                        >
                          ▼
                        </button>
                        <button
                          className={`page-thumbnails-btn page-thumbnails-btn--delete${isPendingDelete ? ' page-thumbnails-btn--confirm' : ''}`}
                          onClick={(e) => handleDeleteClick(e, pageNum)}
                          title={isPendingDelete ? 'Click again to confirm delete' : 'Delete page'}
                        >
                          {isPendingDelete ? '✓?' : '✕'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="page-thumbnails-page-number">
                    {pageNum}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PageThumbnails;
