import { describe, it, expect, vi } from 'vitest';
import { getPageCount, downloadPdf } from './pdfUtils';

// Mock pdfWorker (requires DOMMatrix not available in test env)
vi.mock('./pdfWorker', () => ({
  pdfjsLib: {
    getDocument: vi.fn().mockReturnValue({
      promise: Promise.resolve({
        numPages: 3,
        destroy: vi.fn(),
      }),
    }),
  },
}));

// Mock pdf-lib
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn().mockResolvedValue({
      getPageCount: () => 3,
      getPages: () => [],
      embedFont: vi.fn().mockResolvedValue({}),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }),
  },
  rgb: vi.fn((r, g, b) => ({ r, g, b })),
  StandardFonts: { Helvetica: 'Helvetica' },
}));

describe('pdfUtils', () => {
  describe('getPageCount', () => {
    it('should return the number of pages', async () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const count = await getPageCount(bytes);
      expect(count).toBe(3);
    });
  });

  describe('downloadPdf', () => {
    it('should create a download link and click it', () => {
      const clickMock = vi.fn();
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: clickMock,
      } as unknown as HTMLAnchorElement);
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const bytes = new Uint8Array([1, 2, 3]);
      downloadPdf(bytes, 'test.pdf');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(clickMock).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test');

      createElementSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });
});
