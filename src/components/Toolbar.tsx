import { useState, useRef } from 'react';
import type { Tool, FontFamily } from '../types';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  currentPage: number;
  numPages: number;
  scale: number;
  onPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  hasFile: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  textColor: string;
  onTextColorChange: (color: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  fontFamily: FontFamily;
  onFontFamilyChange: (font: FontFamily) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onPreview: () => void;
  annotationCount: number;
  onMerge: () => void;
  onSplit: () => void;
  onExportImages: () => void;
  onPasswordProtect: () => void;
  onOcr: () => void;
  onRotatePage: () => void;
  onCompress: () => void;
  onWatermark: () => void;
  onAddPageNumbers: () => void;
  onCropPage: () => void;
  onExportJpeg: () => void;
  onSearch: () => void;
  onPrint: () => void;
  stampType: string;
  onStampTypeChange: (type: string) => void;
}

const primaryTools: { id: Tool; label: string; icon: string }[] = [
  { id: 'select', label: 'Sélection', icon: '👆' },
  { id: 'text', label: 'Texte', icon: '📝' },
  { id: 'signature', label: 'Signature', icon: '✍️' },
  { id: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { id: 'draw', label: 'Dessin', icon: '🖊️' },
  { id: 'redact', label: 'Caviardage', icon: '⬛' },
  { id: 'highlight', label: 'Surligner', icon: '🖍️' },
  { id: 'image', label: 'Image', icon: '🖼️' },
  { id: 'stamp', label: 'Tampon', icon: '🔖' },
  { id: 'sticky-note', label: 'Note', icon: '📌' },
];

const formTools: { id: Tool; label: string; icon: string }[] = [
  { id: 'form-text', label: 'Champ texte', icon: '🔤' },
  { id: 'form-checkbox', label: 'Case à cocher', icon: '🗹' },
  { id: 'form-dropdown', label: 'Liste déroulante', icon: '🔽' },
];

const stampTypes = [
  { value: 'approved', label: 'Approuvé', color: '#009900' },
  { value: 'rejected', label: 'Rejeté', color: '#cc0000' },
  { value: 'urgent', label: 'Urgent', color: '#e66600' },
  { value: 'confidential', label: 'Confidentiel', color: '#800080' },
  { value: 'draft', label: 'Brouillon', color: '#888888' },
];

const zoomPresets = [
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2.0 },
  { label: '300%', value: 3.0 },
];

const fontFamilies: { value: FontFamily; label: string }[] = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'TimesRoman', label: 'Times' },
  { value: 'Courier', label: 'Courier' },
];

const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

export function Toolbar({
  activeTool,
  setActiveTool,
  currentPage,
  numPages,
  scale,
  onPageChange,
  onScaleChange,
  onSave,
  onReset,
  isSaving,
  hasFile,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  textColor,
  onTextColorChange,
  fontSize,
  onFontSizeChange,
  fontFamily,
  onFontFamilyChange,
  darkMode,
  onToggleDarkMode,
  onPreview,
  annotationCount,
  onMerge,
  onSplit,
  onExportImages,
  onPasswordProtect,
  onOcr,
  onRotatePage,
  onCompress,
  onWatermark,
  onAddPageNumbers,
  onCropPage,
  onExportJpeg,
  onSearch,
  onPrint,
  stampType,
  onStampTypeChange,
}: ToolbarProps) {
  const [formsMenuOpen, setFormsMenuOpen] = useState(false);
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false);
  const [pageInputValue, setPageInputValue] = useState('');
  const [pageInputActive, setPageInputActive] = useState(false);
  const formsMenuRef = useRef<HTMLDivElement>(null);
  const zoomMenuRef = useRef<HTMLDivElement>(null);

  const isFormToolActive = formTools.some((t) => t.id === activeTool);

  function handlePageInputFocus() {
    setPageInputActive(true);
    setPageInputValue(String(currentPage + 1));
  }

  function handlePageInputBlur() {
    setPageInputActive(false);
    const parsed = parseInt(pageInputValue, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
      onPageChange(parsed - 1);
    }
    setPageInputValue('');
  }

  function handlePageInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setPageInputActive(false);
      setPageInputValue('');
    }
  }

  function handleFitToWidth() {
    onScaleChange(1.0);
    setZoomMenuOpen(false);
  }

  function handleZoomPreset(value: number) {
    onScaleChange(value);
    setZoomMenuOpen(false);
  }

  function handleFormToolSelect(tool: Tool) {
    setActiveTool(tool);
    setFormsMenuOpen(false);
  }

  return (
    <div className={`toolbar${darkMode ? ' toolbar--dark' : ''}`}>

      {/* Section: History */}
      <div className="toolbar-section">
        <button
          className="toolbar-btn"
          onClick={onUndo}
          disabled={!hasFile || !canUndo}
          title="Annuler"
        >
          ↩ Annuler
        </button>
        <button
          className="toolbar-btn"
          onClick={onRedo}
          disabled={!hasFile || !canRedo}
          title="Rétablir"
        >
          ↪ Rétablir
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Section: Primary Tools */}
      <div className="toolbar-section">
        {primaryTools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn${activeTool === tool.id ? ' active' : ''}`}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
            disabled={!hasFile}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}

        {/* Forms dropdown */}
        <div className="toolbar-dropdown-wrapper" ref={formsMenuRef}>
          <button
            className={`tool-btn toolbar-dropdown-trigger${isFormToolActive ? ' active' : ''}`}
            onClick={() => setFormsMenuOpen((v) => !v)}
            disabled={!hasFile}
            title="Formulaires"
          >
            <span className="tool-icon">📋</span>
            <span className="tool-label">Formulaires ▾</span>
          </button>
          {formsMenuOpen && (
            <div className="toolbar-dropdown-menu">
              {formTools.map((tool) => (
                <button
                  key={tool.id}
                  className={`toolbar-dropdown-item${activeTool === tool.id ? ' active' : ''}`}
                  onClick={() => handleFormToolSelect(tool.id)}
                >
                  <span className="tool-icon">{tool.icon}</span>
                  <span>{tool.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stamp type selector (visible when stamp tool active) */}
        {activeTool === 'stamp' && (
          <select
            className="toolbar-select toolbar-select--narrow"
            value={stampType}
            onChange={(e) => onStampTypeChange(e.target.value)}
            title="Type de tampon"
          >
            {stampTypes.map((st) => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
        )}

        {/* Annotation count badge */}
        {annotationCount > 0 && (
          <span className="annotation-badge" title={`${annotationCount} annotation(s)`}>
            {annotationCount}
          </span>
        )}
      </div>

      <div className="toolbar-separator" />

      {/* Section: Text formatting */}
      <div className="toolbar-section">
        <label className="toolbar-label" htmlFor="font-family-select">Police</label>
        <select
          id="font-family-select"
          className="toolbar-select"
          value={fontFamily}
          onChange={(e) => onFontFamilyChange(e.target.value as FontFamily)}
          disabled={!hasFile}
        >
          {fontFamilies.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <label className="toolbar-label" htmlFor="font-size-select">Taille</label>
        <select
          id="font-size-select"
          className="toolbar-select toolbar-select--narrow"
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          disabled={!hasFile}
        >
          {fontSizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <label className="toolbar-label" htmlFor="text-color-input">Couleur</label>
        <input
          id="text-color-input"
          type="color"
          className="toolbar-color-picker"
          value={textColor}
          onChange={(e) => onTextColorChange(e.target.value)}
          disabled={!hasFile}
          title="Couleur du texte"
        />
      </div>

      <div className="toolbar-separator" />

      {/* Section: Page navigation */}
      <div className="toolbar-section">
        <button
          className="toolbar-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasFile || currentPage <= 0}
          title="Page précédente"
        >
          ◀
        </button>

        {hasFile ? (
          <input
            className="page-input"
            type="number"
            min={1}
            max={numPages}
            value={pageInputActive ? pageInputValue : currentPage + 1}
            onChange={(e) => setPageInputValue(e.target.value)}
            onFocus={handlePageInputFocus}
            onBlur={handlePageInputBlur}
            onKeyDown={handlePageInputKeyDown}
            title="Aller à la page"
          />
        ) : (
          <span className="page-info">-</span>
        )}

        <span className="page-info-separator">/</span>
        <span className="page-info">{hasFile ? numPages : '-'}</span>

        <button
          className="toolbar-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasFile || currentPage >= numPages - 1}
          title="Page suivante"
        >
          ▶
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Section: Zoom */}
      <div className="toolbar-section">
        <button
          className="toolbar-btn"
          onClick={() => onScaleChange(Math.max(0.5, scale - 0.25))}
          disabled={!hasFile || scale <= 0.5}
          title="Dézoomer"
        >
          −
        </button>

        <div className="toolbar-dropdown-wrapper" ref={zoomMenuRef}>
          <button
            className="toolbar-btn zoom-display"
            onClick={() => setZoomMenuOpen((v) => !v)}
            disabled={!hasFile}
            title="Préréglages de zoom"
          >
            {Math.round(scale * 100)}% ▾
          </button>
          {zoomMenuOpen && (
            <div className="toolbar-dropdown-menu toolbar-dropdown-menu--zoom">
              {zoomPresets.map((preset) => (
                <button
                  key={preset.value}
                  className={`toolbar-dropdown-item${scale === preset.value ? ' active' : ''}`}
                  onClick={() => handleZoomPreset(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
              <div className="toolbar-dropdown-divider" />
              <button
                className="toolbar-dropdown-item"
                onClick={handleFitToWidth}
              >
                Ajuster à la largeur
              </button>
            </div>
          )}
        </div>

        <button
          className="toolbar-btn"
          onClick={() => onScaleChange(Math.min(3, scale + 0.25))}
          disabled={!hasFile || scale >= 3}
          title="Zoomer"
        >
          +
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Section: PDF operations */}
      <div className="toolbar-section">
        <button
          className="toolbar-btn"
          onClick={onMerge}
          disabled={!hasFile}
          title="Fusionner des PDFs"
        >
          🔗 Fusionner
        </button>
        <button
          className="toolbar-btn"
          onClick={onSplit}
          disabled={!hasFile}
          title="Diviser le PDF"
        >
          ✂️ Diviser
        </button>
        <button
          className="toolbar-btn"
          onClick={onExportImages}
          disabled={!hasFile}
          title="Exporter en images"
        >
          🖼️ Images
        </button>
        <button
          className="toolbar-btn"
          onClick={onPasswordProtect}
          disabled={!hasFile}
          title="Protéger par mot de passe"
        >
          🔒 Protéger
        </button>
        <button
          className="toolbar-btn"
          onClick={onOcr}
          disabled={!hasFile}
          title="Reconnaissance de texte (OCR)"
        >
          🔍 OCR
        </button>
        <button className="toolbar-btn" onClick={onRotatePage} disabled={!hasFile} title="Tourner la page">
          🔄 Rotation
        </button>
        <button className="toolbar-btn" onClick={onCompress} disabled={!hasFile} title="Compresser le PDF">
          📦 Compresser
        </button>
        <button className="toolbar-btn" onClick={onWatermark} disabled={!hasFile} title="Ajouter un filigrane">
          💧 Filigrane
        </button>
        <button className="toolbar-btn" onClick={onAddPageNumbers} disabled={!hasFile} title="Numéroter les pages">
          🔢 Numéros
        </button>
        <button className="toolbar-btn" onClick={onCropPage} disabled={!hasFile} title="Recadrer la page">
          ✂️ Recadrer
        </button>
        <button className="toolbar-btn" onClick={onExportJpeg} disabled={!hasFile} title="Exporter en JPEG">
          📷 JPEG
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Section: View & actions */}
      <div className="toolbar-section">
        <button
          className="toolbar-btn"
          onClick={onPreview}
          disabled={!hasFile}
          title="Aperçu"
        >
          👁️ Aperçu
        </button>
        <button
          className="toolbar-btn"
          onClick={onToggleDarkMode}
          title={darkMode ? 'Mode clair' : 'Mode sombre'}
        >
          {darkMode ? '☀️ Clair' : '🌙 Sombre'}
        </button>
        <button className="toolbar-btn" onClick={onSearch} disabled={!hasFile} title="Rechercher (Ctrl+F)">
          🔍 Rechercher
        </button>
        <button className="toolbar-btn" onClick={onPrint} disabled={!hasFile} title="Imprimer">
          🖨️ Imprimer
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Section: Save & reset */}
      <div className="toolbar-section">
        <button
          className="toolbar-btn"
          onClick={() => {
            if (window.confirm('Voulez-vous vraiment réinitialiser ? Toutes les modifications seront perdues.')) {
              onReset();
            }
          }}
          disabled={!hasFile}
          title="Réinitialiser"
        >
          🗑️ Nouveau
        </button>
        <button
          className="toolbar-btn save-btn"
          onClick={onSave}
          disabled={!hasFile || isSaving}
          title="Sauvegarder"
        >
          {isSaving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
        </button>
      </div>
    </div>
  );
}
