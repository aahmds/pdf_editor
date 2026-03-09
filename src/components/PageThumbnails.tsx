import React, { useEffect, useRef, useState } from 'react';
import { pdfjsLib } from '../utils/pdfWorker';

interface PageThumbnailsProps {
  pdfBytes: Uint8Array | null;
  pdfUrl?: string | null;
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
const BATCH_SIZE = 5; // Render thumbnails in batches to avoid memory spikes

const PageThumbnails: React.FC<PageThumbnailsProps> = ({
  pdfBytes,
  pdfUrl,
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
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    canvasRefs.current = canvasRefs.current.slice(0, numPages);
  }, [numPages]);

  // Load PDF document once for thumbnails
  useEffect(() => {
    if (!isOpen || !pdfBytes || numPages === 0) return;

    let cancelled = false;

    const loadDoc = async () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
      try {
        const source = pdfUrl ? { url: pdfUrl } : { data: pdfBytes!.slice(0) };
        const doc = await pdfjsLib.getDocument(source).promise;
        if (!cancelled) {
          pdfDocRef.current = doc;
          setRenderedPages(new Set());
        } else {
          doc.destroy();
        }
      } catch { /* ignore */ }
    };

    loadDoc();

    return () => {
      cancelled = true;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [pdfBytes, numPages, isOpen]);

  // Render a batch of visible thumbnails
  const renderBatch = React.useCallback(async (pages: number[]) => {
    const doc = pdfDocRef.current;
    if (!doc) return;

    for (const pageNum of pages) {
      const canvas = canvasRefs.current[pageNum - 1];
      if (!canvas) continue;

      try {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const scale = THUMBNAIL_WIDTH / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        setRenderedPages((prev) => new Set(prev).add(pageNum));
      } catch {
        // skip page on error
      }
    }
  }, []);

  // Render initial batch around current page + observe scroll for lazy loading
  useEffect(() => {
    if (!isOpen || !pdfDocRef.current || numPages === 0) return;

    // Render a batch around the current page first
    const start = Math.max(1, currentPage - BATCH_SIZE);
    const end = Math.min(numPages, currentPage + BATCH_SIZE);
    const initialPages: number[] = [];
    for (let i = start; i <= end; i++) initialPages.push(i);
    renderBatch(initialPages);
  }, [isOpen, currentPage, numPages, renderBatch, renderedPages.size === 0 ? 0 : 1]);

  // IntersectionObserver for lazy rendering of thumbnails as they scroll into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const toRender: number[] = [];
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = Number((entry.target as HTMLElement).dataset.page);
            if (pageNum && !renderedPages.has(pageNum)) {
              toRender.push(pageNum);
            }
          }
        }
        if (toRender.length > 0) renderBatch(toRender);
      },
      { root: listRef.current, rootMargin: '200px' }
    );

    const items = listRef.current.querySelectorAll('[data-page]');
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [isOpen, numPages, renderedPages, renderBatch]);

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

          <div className="page-thumbnails-list" ref={listRef}>
            {Array.from({ length: numPages }, (_, i) => {
              const pageNum = i + 1;
              const isActive = pageNum === currentPage;
              const isHovered = hoveredPage === pageNum;
              const isPendingDelete = confirmDelete === pageNum;

              return (
                <div
                  key={pageNum}
                  data-page={pageNum}
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
