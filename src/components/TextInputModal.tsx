import { useState, useRef, useCallback } from 'react';

interface TextInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export function TextInputModal({ isOpen, onClose, onSubmit }: TextInputModalProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleRef = useCallback((node: HTMLTextAreaElement | null) => {
    (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    if (node && isOpen) {
      node.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setText('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') handleClose();
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Ajouter du texte</h3>
        <textarea
          ref={handleRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Entrez votre texte..."
          className="text-input text-input--multiline"
          rows={4}
        />
        <div className="modal-actions">
          <button onClick={handleClose} className="btn-secondary">
            Annuler
          </button>
          <button onClick={handleSubmit} className="btn-primary" disabled={!text.trim()}>
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
