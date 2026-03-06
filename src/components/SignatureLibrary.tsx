import { useState } from 'react';
import type { SavedSignature } from '../types';
import { loadSignatures, saveSignatures } from '../utils/signatureStorage';

interface SignatureLibraryProps {
  onSelect: (dataUrl: string) => void;
  onClose: () => void;
}

export function SignatureLibrary({ onSelect, onClose }: SignatureLibraryProps) {
  const [signatures, setSignatures] = useState<SavedSignature[]>(loadSignatures);

  const handleDelete = (id: string) => {
    const updated = signatures.filter((s) => s.id !== id);
    setSignatures(updated);
    saveSignatures(updated);
  };

  return (
    <div className="signature-library">
      {signatures.length === 0 ? (
        <p className="signature-library-empty">Aucune signature sauvegardée</p>
      ) : (
        <div className="signature-library-grid">
          {signatures.map((sig) => (
            <div key={sig.id} className="signature-library-item">
              <img
                src={sig.dataUrl}
                alt="Signature sauvegardée"
                className="signature-library-thumb"
                onClick={() => onSelect(sig.dataUrl)}
              />
              <button
                className="signature-library-delete btn-secondary"
                onClick={() => handleDelete(sig.id)}
                title="Supprimer"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="modal-actions">
        <button onClick={onClose} className="btn-secondary">
          Fermer
        </button>
      </div>
    </div>
  );
}
