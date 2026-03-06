import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { SignatureLibrary } from './SignatureLibrary';
import { saveSignatures, loadSignatures } from '../utils/signatureStorage';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export function SignatureModal({ isOpen, onClose, onSave }: SignatureModalProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [error, setError] = useState('');
  const [shouldSave, setShouldSave] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  if (!isOpen) return null;

  const handleClear = () => {
    sigRef.current?.clear();
    setError('');
  };

  const handleSave = () => {
    if (sigRef.current?.isEmpty()) {
      setError('Veuillez signer avant de sauvegarder');
      return;
    }
    const dataUrl = sigRef.current?.toDataURL('image/png');
    if (dataUrl) {
      if (shouldSave) {
        const existing = loadSignatures();
        const newSig = {
          id: `sig-${Date.now()}`,
          dataUrl,
          createdAt: Date.now(),
        };
        saveSignatures([...existing, newSig]);
      }
      onSave(dataUrl);
      onClose();
    }
  };

  const handleLibrarySelect = (dataUrl: string) => {
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Dessiner votre signature</h3>
        <div className="modal-tabs">
          <button
            className={!showLibrary ? 'tab-active' : 'tab-inactive'}
            onClick={() => setShowLibrary(false)}
          >
            Nouvelle signature
          </button>
          <button
            className={showLibrary ? 'tab-active' : 'tab-inactive'}
            onClick={() => setShowLibrary(true)}
          >
            Signatures sauvegardées
          </button>
        </div>
        {showLibrary ? (
          <SignatureLibrary onSelect={handleLibrarySelect} onClose={onClose} />
        ) : (
          <>
            {error && <p style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>}
            <div className="signature-pad-container">
              <SignatureCanvas
                ref={sigRef}
                penColor="black"
                canvasProps={{
                  width: 500,
                  height: 200,
                  className: 'signature-canvas',
                }}
              />
            </div>
            <label className="signature-save-checkbox">
              <input
                type="checkbox"
                checked={shouldSave}
                onChange={(e) => setShouldSave(e.target.checked)}
              />
              {' '}Sauvegarder
            </label>
            <div className="modal-actions">
              <button onClick={handleClear} className="btn-secondary">
                Effacer
              </button>
              <button onClick={onClose} className="btn-secondary">
                Annuler
              </button>
              <button onClick={handleSave} className="btn-primary">
                Valider
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
