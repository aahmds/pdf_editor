import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from './Toolbar';
import type { Tool, FontFamily } from '../types';

const defaultProps = {
  activeTool: 'select' as Tool,
  setActiveTool: vi.fn(),
  currentPage: 0,
  numPages: 5,
  scale: 1.5,
  onPageChange: vi.fn(),
  onScaleChange: vi.fn(),
  onSave: vi.fn(),
  onReset: vi.fn(),
  isSaving: false,
  hasFile: true,
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  canUndo: true,
  canRedo: true,
  textColor: '#000000',
  onTextColorChange: vi.fn(),
  fontSize: 12,
  onFontSizeChange: vi.fn(),
  fontFamily: 'Helvetica' as FontFamily,
  onFontFamilyChange: vi.fn(),
  darkMode: false,
  onToggleDarkMode: vi.fn(),
  onPreview: vi.fn(),
  annotationCount: 0,
  onMerge: vi.fn(),
  onSplit: vi.fn(),
  onExportImages: vi.fn(),
  onPasswordProtect: vi.fn(),
  onOcr: vi.fn(),
};

describe('Toolbar', () => {
  it('renders all primary tool buttons', () => {
    render(<Toolbar {...defaultProps} />);

    expect(screen.getByTitle('Sélection')).toBeInTheDocument();
    expect(screen.getByTitle('Texte')).toBeInTheDocument();
    expect(screen.getByTitle('Signature')).toBeInTheDocument();
    expect(screen.getByTitle('Checkbox')).toBeInTheDocument();
    expect(screen.getByTitle('Dessin')).toBeInTheDocument();
    expect(screen.getByTitle('Caviardage')).toBeInTheDocument();
  });

  it('calls setActiveTool when clicking a tool button', () => {
    const setActiveTool = vi.fn();
    render(<Toolbar {...defaultProps} setActiveTool={setActiveTool} />);

    const textToolButton = screen.getByTitle('Texte');
    fireEvent.click(textToolButton);

    expect(setActiveTool).toHaveBeenCalledWith('text');
  });

  it('disables buttons when hasFile is false', () => {
    render(<Toolbar {...defaultProps} hasFile={false} />);

    const selectionButton = screen.getByTitle('Sélection');
    const textButton = screen.getByTitle('Texte');
    const saveButton = screen.getByTitle('Sauvegarder');

    expect(selectionButton).toBeDisabled();
    expect(textButton).toBeDisabled();
    expect(saveButton).toBeDisabled();
  });

  it('calls onSave when clicking save button', () => {
    const onSave = vi.fn();
    render(<Toolbar {...defaultProps} onSave={onSave} />);

    const saveButton = screen.getByTitle('Sauvegarder');
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalled();
  });

  it('shows annotation count badge when annotationCount > 0', () => {
    const { rerender } = render(<Toolbar {...defaultProps} annotationCount={0} />);

    expect(screen.queryByTitle(/annotation\(s\)/)).not.toBeInTheDocument();

    rerender(<Toolbar {...defaultProps} annotationCount={3} />);

    const badge = screen.getByTitle('3 annotation(s)');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('3');
  });

  it('calls onUndo when clicking undo button', () => {
    const onUndo = vi.fn();
    render(<Toolbar {...defaultProps} onUndo={onUndo} />);

    const undoButton = screen.getByTitle('Annuler');
    fireEvent.click(undoButton);

    expect(onUndo).toHaveBeenCalled();
  });

  it('calls onRedo when clicking redo button', () => {
    const onRedo = vi.fn();
    render(<Toolbar {...defaultProps} onRedo={onRedo} />);

    const redoButton = screen.getByTitle('Rétablir');
    fireEvent.click(redoButton);

    expect(onRedo).toHaveBeenCalled();
  });

  it('disables undo button when canUndo is false', () => {
    render(<Toolbar {...defaultProps} canUndo={false} />);

    const undoButton = screen.getByTitle('Annuler');
    expect(undoButton).toBeDisabled();
  });

  it('disables redo button when canRedo is false', () => {
    render(<Toolbar {...defaultProps} canRedo={false} />);

    const redoButton = screen.getByTitle('Rétablir');
    expect(redoButton).toBeDisabled();
  });

  it('shows dark mode toggle text correctly', () => {
    const { rerender } = render(<Toolbar {...defaultProps} darkMode={false} />);

    expect(screen.getByTitle('Mode sombre')).toHaveTextContent('🌙 Sombre');

    rerender(<Toolbar {...defaultProps} darkMode={true} />);

    expect(screen.getByTitle('Mode clair')).toHaveTextContent('☀️ Clair');
  });

  it('calls onToggleDarkMode when clicking dark mode button', () => {
    const onToggleDarkMode = vi.fn();
    render(<Toolbar {...defaultProps} onToggleDarkMode={onToggleDarkMode} />);

    const darkModeButton = screen.getByTitle('Mode sombre');
    fireEvent.click(darkModeButton);

    expect(onToggleDarkMode).toHaveBeenCalled();
  });

  it('applies dark mode class to toolbar when darkMode is true', () => {
    const { container } = render(<Toolbar {...defaultProps} darkMode={true} />);

    const toolbar = container.querySelector('.toolbar');
    expect(toolbar).toHaveClass('toolbar--dark');
  });

  it('does not apply dark mode class when darkMode is false', () => {
    const { container } = render(<Toolbar {...defaultProps} darkMode={false} />);

    const toolbar = container.querySelector('.toolbar');
    expect(toolbar).not.toHaveClass('toolbar--dark');
  });

  it('highlights active tool button', () => {
    render(<Toolbar {...defaultProps} activeTool="text" />);

    const textButton = screen.getByTitle('Texte');
    expect(textButton).toHaveClass('active');
  });

  it('disables save button when isSaving is true', () => {
    render(<Toolbar {...defaultProps} isSaving={true} />);

    const saveButton = screen.getByTitle('Sauvegarder');
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent('⏳ Sauvegarde...');
  });

  it('shows save button with correct text when isSaving is false', () => {
    render(<Toolbar {...defaultProps} isSaving={false} />);

    const saveButton = screen.getByTitle('Sauvegarder');
    expect(saveButton).toHaveTextContent('💾 Sauvegarder');
  });

  it('displays current page and total pages', () => {
    render(<Toolbar {...defaultProps} currentPage={2} numPages={5} />);

    const pageInputs = screen.getAllByDisplayValue('3');
    expect(pageInputs.length).toBeGreaterThan(0);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays page info as dashes when hasFile is false', () => {
    render(<Toolbar {...defaultProps} hasFile={false} />);

    const pageInfoElements = screen.getAllByText('-');
    expect(pageInfoElements.length).toBeGreaterThan(0);
  });

  it('displays zoom percentage', () => {
    render(<Toolbar {...defaultProps} scale={1.5} />);

    expect(screen.getByText('150% ▾')).toBeInTheDocument();
  });

  it('calls onFontFamilyChange when font family select changes', () => {
    const onFontFamilyChange = vi.fn();
    render(
      <Toolbar {...defaultProps} onFontFamilyChange={onFontFamilyChange} />
    );

    const fontSelect = screen.getByDisplayValue('Helvetica');
    fireEvent.change(fontSelect, { target: { value: 'TimesRoman' } });

    expect(onFontFamilyChange).toHaveBeenCalledWith('TimesRoman');
  });

  it('calls onFontSizeChange when font size select changes', () => {
    const onFontSizeChange = vi.fn();
    render(
      <Toolbar {...defaultProps} fontSize={12} onFontSizeChange={onFontSizeChange} />
    );

    const sizeSelect = screen.getByDisplayValue('12');
    fireEvent.change(sizeSelect, { target: { value: '18' } });

    expect(onFontSizeChange).toHaveBeenCalledWith(18);
  });

  it('calls onTextColorChange when color picker changes', () => {
    const onTextColorChange = vi.fn();
    render(
      <Toolbar
        {...defaultProps}
        textColor="#FF0000"
        onTextColorChange={onTextColorChange}
      />
    );

    const colorInput = screen.getByTitle('Couleur du texte');
    fireEvent.input(colorInput, { target: { value: '#00FF00' } });

    expect(onTextColorChange).toHaveBeenCalledWith('#00ff00');
  });

  it('disables font family select when hasFile is false', () => {
    render(<Toolbar {...defaultProps} hasFile={false} />);

    const fontSelect = screen.getByLabelText('Police');
    expect(fontSelect).toBeDisabled();
  });

  it('disables font size select when hasFile is false', () => {
    render(<Toolbar {...defaultProps} hasFile={false} />);

    const sizeSelect = screen.getByLabelText('Taille');
    expect(sizeSelect).toBeDisabled();
  });

  it('disables color picker when hasFile is false', () => {
    render(<Toolbar {...defaultProps} hasFile={false} />);

    const colorInput = screen.getByLabelText('Couleur');
    expect(colorInput).toBeDisabled();
  });

  it('calls onPageChange when previous page button is clicked', () => {
    const onPageChange = vi.fn();
    render(<Toolbar {...defaultProps} onPageChange={onPageChange} currentPage={2} />);

    const prevButton = screen.getAllByText('◀')[0];
    fireEvent.click(prevButton);

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange when next page button is clicked', () => {
    const onPageChange = vi.fn();
    render(<Toolbar {...defaultProps} onPageChange={onPageChange} currentPage={2} />);

    const nextButton = screen.getAllByText('▶')[0];
    fireEvent.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables previous page button when on first page', () => {
    render(<Toolbar {...defaultProps} currentPage={0} />);

    const prevButton = screen.getAllByText('◀')[0];
    expect(prevButton).toBeDisabled();
  });

  it('disables next page button when on last page', () => {
    render(<Toolbar {...defaultProps} currentPage={4} numPages={5} />);

    const nextButton = screen.getAllByText('▶')[0];
    expect(nextButton).toBeDisabled();
  });

  it('calls onScaleChange when zoom out button is clicked', () => {
    const onScaleChange = vi.fn();
    render(<Toolbar {...defaultProps} onScaleChange={onScaleChange} scale={1.5} />);

    const zoomOutButton = screen.getByTitle('Dézoomer');
    fireEvent.click(zoomOutButton);

    expect(onScaleChange).toHaveBeenCalledWith(1.25);
  });

  it('calls onScaleChange when zoom in button is clicked', () => {
    const onScaleChange = vi.fn();
    render(<Toolbar {...defaultProps} onScaleChange={onScaleChange} scale={1.5} />);

    const zoomInButton = screen.getByTitle('Zoomer');
    fireEvent.click(zoomInButton);

    expect(onScaleChange).toHaveBeenCalledWith(1.75);
  });

  it('disables zoom out button when at minimum scale', () => {
    render(<Toolbar {...defaultProps} scale={0.5} />);

    const zoomOutButton = screen.getByTitle('Dézoomer');
    expect(zoomOutButton).toBeDisabled();
  });

  it('disables zoom in button when at maximum scale', () => {
    render(<Toolbar {...defaultProps} scale={3.0} />);

    const zoomInButton = screen.getByTitle('Zoomer');
    expect(zoomInButton).toBeDisabled();
  });

  it('renders forms button', () => {
    render(<Toolbar {...defaultProps} />);

    expect(screen.getByTitle('Formulaires')).toBeInTheDocument();
  });

  it('toggles forms menu when forms button is clicked', () => {
    render(<Toolbar {...defaultProps} />);

    const formsButton = screen.getByTitle('Formulaires');
    expect(screen.queryByText('Champ texte')).not.toBeInTheDocument();

    fireEvent.click(formsButton);
    expect(screen.getByText('Champ texte')).toBeInTheDocument();

    fireEvent.click(formsButton);
    expect(screen.queryByText('Champ texte')).not.toBeInTheDocument();
  });

  it('calls setActiveTool with form tool when form tool is selected', () => {
    const setActiveTool = vi.fn();
    render(<Toolbar {...defaultProps} setActiveTool={setActiveTool} />);

    const formsButton = screen.getByTitle('Formulaires');
    fireEvent.click(formsButton);

    const formTextButton = screen.getByText('Champ texte');
    fireEvent.click(formTextButton);

    expect(setActiveTool).toHaveBeenCalledWith('form-text');
  });

  it('renders PDF operation buttons', () => {
    render(<Toolbar {...defaultProps} />);

    expect(screen.getByTitle('Fusionner des PDFs')).toBeInTheDocument();
    expect(screen.getByTitle('Diviser le PDF')).toBeInTheDocument();
    expect(screen.getByTitle('Exporter en images')).toBeInTheDocument();
    expect(screen.getByTitle('Protéger par mot de passe')).toBeInTheDocument();
    expect(screen.getByTitle('Reconnaissance de texte (OCR)')).toBeInTheDocument();
  });

  it('calls onMerge when merge button is clicked', () => {
    const onMerge = vi.fn();
    render(<Toolbar {...defaultProps} onMerge={onMerge} />);

    const mergeButton = screen.getByTitle('Fusionner des PDFs');
    fireEvent.click(mergeButton);

    expect(onMerge).toHaveBeenCalled();
  });

  it('calls onSplit when split button is clicked', () => {
    const onSplit = vi.fn();
    render(<Toolbar {...defaultProps} onSplit={onSplit} />);

    const splitButton = screen.getByTitle('Diviser le PDF');
    fireEvent.click(splitButton);

    expect(onSplit).toHaveBeenCalled();
  });

  it('calls onExportImages when export images button is clicked', () => {
    const onExportImages = vi.fn();
    render(<Toolbar {...defaultProps} onExportImages={onExportImages} />);

    const exportButton = screen.getByTitle('Exporter en images');
    fireEvent.click(exportButton);

    expect(onExportImages).toHaveBeenCalled();
  });

  it('calls onPasswordProtect when protect button is clicked', () => {
    const onPasswordProtect = vi.fn();
    render(<Toolbar {...defaultProps} onPasswordProtect={onPasswordProtect} />);

    const protectButton = screen.getByTitle('Protéger par mot de passe');
    fireEvent.click(protectButton);

    expect(onPasswordProtect).toHaveBeenCalled();
  });

  it('calls onOcr when OCR button is clicked', () => {
    const onOcr = vi.fn();
    render(<Toolbar {...defaultProps} onOcr={onOcr} />);

    const ocrButton = screen.getByTitle('Reconnaissance de texte (OCR)');
    fireEvent.click(ocrButton);

    expect(onOcr).toHaveBeenCalled();
  });

  it('calls onPreview when preview button is clicked', () => {
    const onPreview = vi.fn();
    render(<Toolbar {...defaultProps} onPreview={onPreview} />);

    const previewButton = screen.getByTitle('Aperçu');
    fireEvent.click(previewButton);

    expect(onPreview).toHaveBeenCalled();
  });
});
