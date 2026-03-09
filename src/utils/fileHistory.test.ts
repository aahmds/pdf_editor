import { describe, it, expect, beforeEach } from 'vitest';
import { getFileHistory, addToFileHistory, clearFileHistory } from './fileHistory';

describe('fileHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getFileHistory', () => {
    it('should return empty array when no history', () => {
      expect(getFileHistory()).toEqual([]);
    });

    it('should return stored history', () => {
      const entry = { name: 'test.pdf', size: 1024, lastOpened: Date.now() };
      localStorage.setItem('pdf-editor-file-history', JSON.stringify([entry]));
      expect(getFileHistory()).toEqual([entry]);
    });

    it('should return empty array for invalid JSON', () => {
      localStorage.setItem('pdf-editor-file-history', 'not-json');
      expect(getFileHistory()).toEqual([]);
    });

    it('should return empty array for non-array data', () => {
      localStorage.setItem('pdf-editor-file-history', JSON.stringify({ foo: 'bar' }));
      expect(getFileHistory()).toEqual([]);
    });
  });

  describe('addToFileHistory', () => {
    it('should add a file entry', () => {
      const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });
      addToFileHistory(file);
      const history = getFileHistory();
      expect(history).toHaveLength(1);
      expect(history[0].name).toBe('test.pdf');
    });

    it('should replace existing entry with same name', () => {
      const file1 = new File(['data1'], 'test.pdf', { type: 'application/pdf' });
      const file2 = new File(['data2'], 'test.pdf', { type: 'application/pdf' });
      addToFileHistory(file1);
      addToFileHistory(file2);
      const history = getFileHistory();
      expect(history).toHaveLength(1);
    });

    it('should limit to 10 entries', () => {
      for (let i = 0; i < 15; i++) {
        const file = new File(['data'], `file${i}.pdf`, { type: 'application/pdf' });
        addToFileHistory(file);
      }
      expect(getFileHistory()).toHaveLength(10);
    });

    it('should add most recent entry first', () => {
      addToFileHistory(new File(['a'], 'first.pdf', { type: 'application/pdf' }));
      addToFileHistory(new File(['b'], 'second.pdf', { type: 'application/pdf' }));
      const history = getFileHistory();
      expect(history[0].name).toBe('second.pdf');
      expect(history[1].name).toBe('first.pdf');
    });
  });

  describe('clearFileHistory', () => {
    it('should clear all history', () => {
      addToFileHistory(new File(['data'], 'test.pdf', { type: 'application/pdf' }));
      clearFileHistory();
      expect(getFileHistory()).toEqual([]);
    });
  });
});
