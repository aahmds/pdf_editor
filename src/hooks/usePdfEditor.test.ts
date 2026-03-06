import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePdfEditor } from './usePdfEditor';

// Mock pdfUtils
vi.mock('../utils/pdfUtils', () => ({
  getPageCount: vi.fn().mockResolvedValue(5),
  applyAnnotations: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  downloadPdf: vi.fn(),
}));

describe('usePdfEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePdfEditor());
    expect(result.current.state.file).toBeNull();
    expect(result.current.state.pdfBytes).toBeNull();
    expect(result.current.state.numPages).toBe(0);
    expect(result.current.state.currentPage).toBe(0);
    expect(result.current.state.scale).toBe(1.5);
    expect(result.current.state.annotations).toEqual([]);
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBeNull();
    expect(result.current.activeTool).toBe('select');
  });

  it('should load a file successfully', async () => {
    const { result } = renderHook(() => usePdfEditor());
    const mockFile = new File(['fake-pdf-content'], 'test.pdf', { type: 'application/pdf' });

    await act(async () => {
      await result.current.loadFile(mockFile);
    });

    expect(result.current.state.file).toBe(mockFile);
    expect(result.current.state.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(result.current.state.numPages).toBe(5);
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('should handle loadFile error gracefully', async () => {
    const { getPageCount } = await import('../utils/pdfUtils');
    vi.mocked(getPageCount).mockRejectedValueOnce(new Error('Invalid PDF'));

    const { result } = renderHook(() => usePdfEditor());
    const mockFile = new File(['bad-content'], 'bad.pdf', { type: 'application/pdf' });

    await act(async () => {
      await result.current.loadFile(mockFile);
    });

    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBeTruthy();
    expect(result.current.state.pdfBytes).toBeNull();
  });

  it('should clear error', () => {
    const { result } = renderHook(() => usePdfEditor());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.state.error).toBeNull();
  });

  it('should set current page within bounds', () => {
    const { result } = renderHook(() => usePdfEditor());

    act(() => {
      result.current.setCurrentPage(5);
    });
    // numPages is 0, so page stays at 0
    expect(result.current.state.currentPage).toBe(0);
  });

  it('should set scale within bounds', () => {
    const { result } = renderHook(() => usePdfEditor());

    act(() => {
      result.current.setScale(0.1);
    });
    expect(result.current.state.scale).toBe(0.5);

    act(() => {
      result.current.setScale(10);
    });
    expect(result.current.state.scale).toBe(3);
  });

  it('should add an annotation', () => {
    const { result } = renderHook(() => usePdfEditor());

    act(() => {
      result.current.addAnnotation({
        type: 'text',
        page: 0,
        x: 10,
        y: 20,
        width: 100,
        height: 20,
        content: 'Hello',
        fontSize: 14,
        fontColor: '#000000',
      });
    });

    expect(result.current.state.annotations).toHaveLength(1);
    expect(result.current.state.annotations[0].content).toBe('Hello');
    expect(result.current.state.annotations[0].id).toBeDefined();
  });

  it('should update an annotation', () => {
    const { result } = renderHook(() => usePdfEditor());
    let id: string;

    act(() => {
      id = result.current.addAnnotation({
        type: 'text',
        page: 0,
        x: 10,
        y: 20,
        width: 100,
        height: 20,
        content: 'Hello',
      });
    });

    act(() => {
      result.current.updateAnnotation(id!, { content: 'Updated' });
    });

    expect(result.current.state.annotations[0].content).toBe('Updated');
  });

  it('should delete an annotation', () => {
    const { result } = renderHook(() => usePdfEditor());
    let id: string;

    act(() => {
      id = result.current.addAnnotation({
        type: 'text',
        page: 0,
        x: 10,
        y: 20,
        width: 100,
        height: 20,
        content: 'Hello',
      });
    });

    expect(result.current.state.annotations).toHaveLength(1);

    act(() => {
      result.current.deleteAnnotation(id!);
    });

    expect(result.current.state.annotations).toHaveLength(0);
  });

  it('should reset state', () => {
    const { result } = renderHook(() => usePdfEditor());

    act(() => {
      result.current.addAnnotation({
        type: 'text',
        page: 0,
        x: 10,
        y: 20,
        width: 100,
        height: 20,
        content: 'Hello',
      });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.file).toBeNull();
    expect(result.current.state.annotations).toEqual([]);
    expect(result.current.activeTool).toBe('select');
  });
});
