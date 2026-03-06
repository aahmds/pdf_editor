import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadSignatures, saveSignatures, STORAGE_KEY } from './signatureStorage';
import type { SavedSignature } from '../types';

describe('signatureStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('STORAGE_KEY', () => {
    it('should have correct storage key value', () => {
      expect(STORAGE_KEY).toBe('pdf-editor-signatures');
    });
  });

  describe('loadSignatures', () => {
    it('should return empty array when no data exists', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

      const result = loadSignatures();

      expect(result).toEqual([]);
      expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEY);

      getItemSpy.mockRestore();
    });

    it('should return parsed data when valid JSON exists', () => {
      const mockSignatures: SavedSignature[] = [
        {
          id: 'sig-1',
          dataUrl: 'data:image/png;base64,abc123',
          createdAt: 1234567890,
        },
        {
          id: 'sig-2',
          dataUrl: 'data:image/png;base64,xyz789',
          createdAt: 1234567891,
        },
      ];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockSignatures));

      const result = loadSignatures();

      expect(result).toEqual(mockSignatures);
      expect(result).toHaveLength(2);
    });

    it('should return empty array on invalid JSON', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid json {');

      const result = loadSignatures();

      expect(result).toEqual([]);
      expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEY);

      getItemSpy.mockRestore();
    });
  });

  describe('saveSignatures', () => {
    it('should store JSON in localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const mockSignatures: SavedSignature[] = [
        {
          id: 'sig-1',
          dataUrl: 'data:image/png;base64,abc123',
          createdAt: 1234567890,
        },
      ];

      saveSignatures(mockSignatures);

      expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(mockSignatures));

      setItemSpy.mockRestore();
    });

    it('should store empty array', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      saveSignatures([]);

      expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, '[]');

      setItemSpy.mockRestore();
    });
  });
});
