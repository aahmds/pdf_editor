import React, { useState } from 'react';
import type { Annotation } from '../types';

interface AnnotationPanelProps {
  annotations: Annotation[];
  currentPage: number;
  numPages: number;
  selectedId: string | null;
  onSelectAnnotation: (id: string, page: number) => void;
  onDeleteAnnotation: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const TYPE_ICONS: Record<Annotation['type'], string> = {
  'text': 'T',
  'signature': '✍',
  'checkbox': '☑',
  'drawing': '✏',
  'redact': '▬',
  'form-text': 'Tf',
  'form-checkbox': '☐',
  'form-dropdown': '▾',
  'highlight': '🖍',
  'image': '🖼',
  'stamp': '🔖',
  'sticky-note': '📌',
};

function truncate(str: string, max: number): string {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  annotations,
  currentPage,
  numPages,
  selectedId,
  onSelectAnnotation,
  onDeleteAnnotation,
  isOpen,
  onToggle,
}) => {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const groupedByPage: Record<number, Annotation[]> = {};
  for (let p = 0; p < numPages; p++) {
    const items = annotations.filter((a) => a.page === p);
    if (items.length > 0) {
      groupedByPage[p] = items;
    }
  }

  const pageNumbers = Object.keys(groupedByPage)
    .map(Number)
    .sort((a, b) => a - b);

  function handleDeleteClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (pendingDelete === id) {
      onDeleteAnnotation(id);
      setPendingDelete(null);
    } else {
      setPendingDelete(id);
    }
  }

  function handleItemClick(annotation: Annotation) {
    setPendingDelete(null);
    onSelectAnnotation(annotation.id, annotation.page);
  }

  return (
    <div className={`annotation-panel-root${isOpen ? ' annotation-panel-root--open' : ' annotation-panel-root--closed'}`}>
      <button
        className="annotation-panel-toggle-btn"
        onClick={onToggle}
        aria-label={isOpen ? 'Close annotation panel' : 'Open annotation panel'}
        title={isOpen ? 'Close annotation panel' : 'Open annotation panel'}
      >
        {isOpen ? '◀' : '▶'}
      </button>

      {isOpen && (
        <div className="annotation-panel-content">
          <div className="annotation-panel-header">
            <span className="annotation-panel-title">Annotations</span>
            <span className="annotation-panel-total-badge">{annotations.length}</span>
          </div>

          <div className="annotation-panel-list">
            {annotations.length === 0 ? (
              <p className="annotation-panel-empty">Aucune annotation</p>
            ) : (
              pageNumbers.map((page) => (
                <div key={page} className="annotation-panel-page-group">
                  <div className="annotation-panel-page-header">
                    <span className="annotation-panel-page-label">Page {page + 1}</span>
                    <span className={`annotation-panel-page-badge${page === currentPage ? ' annotation-panel-page-badge--current' : ''}`}>
                      {groupedByPage[page].length}
                    </span>
                  </div>

                  <ul className="annotation-panel-items">
                    {groupedByPage[page].map((annotation) => {
                      const isSelected = annotation.id === selectedId;
                      const isConfirming = annotation.id === pendingDelete;

                      return (
                        <li
                          key={annotation.id}
                          className={`annotation-panel-item${isSelected ? ' annotation-panel-item--selected' : ''}${isConfirming ? ' annotation-panel-item--confirming' : ''}`}
                          onClick={() => handleItemClick(annotation)}
                        >
                          <span className="annotation-panel-item-icon" title={annotation.type}>
                            {TYPE_ICONS[annotation.type] ?? '?'}
                          </span>

                          <span className="annotation-panel-item-content">
                            <span className="annotation-panel-item-text">
                              {truncate(annotation.content, 20)}
                            </span>
                            <span className="annotation-panel-item-position">
                              x:{Math.round(annotation.x)} y:{Math.round(annotation.y)}
                            </span>
                          </span>

                          <button
                            className={`annotation-panel-delete-btn${isConfirming ? ' annotation-panel-delete-btn--confirm' : ''}`}
                            onClick={(e) => handleDeleteClick(e, annotation.id)}
                            title={isConfirming ? 'Click again to confirm delete' : 'Delete annotation'}
                            aria-label={isConfirming ? 'Confirm delete' : 'Delete annotation'}
                          >
                            {isConfirming ? '?' : '×'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationPanel;
