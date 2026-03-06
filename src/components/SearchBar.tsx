import { useState, useCallback, useEffect, useRef } from 'react';
import { pdfjsLib } from '../utils/pdfWorker';

interface SearchBarProps {
  pdfBytes: Uint8Array | null;
  numPages: number;
  onNavigateToPage: (page: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  page: number;
  text: string;
}

export function SearchBar({ pdfBytes, numPages, onNavigateToPage, isOpen, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = useCallback(async () => {
    if (!pdfBytes || !query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']> | null = null;
    try {
      pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      const found: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      for (let i = 0; i < numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        if (pageText.toLowerCase().includes(lowerQuery)) {
          const idx = pageText.toLowerCase().indexOf(lowerQuery);
          const start = Math.max(0, idx - 30);
          const end = Math.min(pageText.length, idx + query.length + 30);
          const snippet = (start > 0 ? '...' : '') + pageText.slice(start, end) + (end < pageText.length ? '...' : '');
          found.push({ page: i, text: snippet });
        }
      }

      setResults(found);
      setCurrentResultIndex(0);
      if (found.length > 0) {
        onNavigateToPage(found[0].page);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      if (pdf) pdf.destroy();
      setIsSearching(false);
    }
  }, [pdfBytes, query, numPages, onNavigateToPage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey && results.length > 0) {
        // Previous result
        const newIdx = (currentResultIndex - 1 + results.length) % results.length;
        setCurrentResultIndex(newIdx);
        onNavigateToPage(results[newIdx].page);
      } else if (results.length > 0 && currentResultIndex < results.length - 1) {
        // Next result
        const newIdx = currentResultIndex + 1;
        setCurrentResultIndex(newIdx);
        onNavigateToPage(results[newIdx].page);
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const navigateResult = (direction: 1 | -1) => {
    if (results.length === 0) return;
    const newIdx = (currentResultIndex + direction + results.length) % results.length;
    setCurrentResultIndex(newIdx);
    onNavigateToPage(results[newIdx].page);
  };

  if (!isOpen) return null;

  return (
    <div className="search-bar" role="search">
      <div className="search-bar-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="search-bar-input"
          placeholder="Rechercher dans le document..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="search-bar-btn" onClick={handleSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? '⏳' : '🔍'}
        </button>
      </div>
      {results.length > 0 && (
        <div className="search-bar-results">
          <span className="search-bar-count">
            {currentResultIndex + 1} / {results.length} résultat(s)
          </span>
          <button className="search-bar-nav" onClick={() => navigateResult(-1)} title="Précédent">▲</button>
          <button className="search-bar-nav" onClick={() => navigateResult(1)} title="Suivant">▼</button>
        </div>
      )}
      {results.length === 0 && query && !isSearching && (
        <div className="search-bar-no-results">Aucun résultat</div>
      )}
      <button className="search-bar-close" onClick={onClose} title="Fermer" aria-label="Fermer la recherche">×</button>
    </div>
  );
}
