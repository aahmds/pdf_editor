import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnnotationPanel from './AnnotationPanel';
import type { Annotation } from '../types';

describe('AnnotationPanel', () => {
  const mockAnnotations: Annotation[] = [
    {
      id: 'anno-1',
      type: 'text',
      page: 0,
      x: 100,
      y: 150,
      width: 200,
      height: 50,
      content: 'Sample text annotation',
    },
    {
      id: 'anno-2',
      type: 'signature',
      page: 0,
      x: 50,
      y: 200,
      width: 150,
      height: 100,
      content: 'Signature here',
    },
    {
      id: 'anno-3',
      type: 'checkbox',
      page: 1,
      x: 300,
      y: 400,
      width: 30,
      height: 30,
      content: 'Check this',
    },
  ];

  describe('toggle button', () => {
    it('renders toggle button when closed', () => {
      const mockOnToggle = vi.fn();
      render(
        <AnnotationPanel
          annotations={[]}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={false}
          onToggle={mockOnToggle}
        />
      );

      const toggleButton = screen.getByRole('button', {
        name: /open annotation panel/i,
      });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveTextContent('▶');
    });

    it('calls onToggle when clicking toggle button', () => {
      const mockOnToggle = vi.fn();
      render(
        <AnnotationPanel
          annotations={[]}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={false}
          onToggle={mockOnToggle}
        />
      );

      const toggleButton = screen.getByRole('button', {
        name: /open annotation panel/i,
      });
      fireEvent.click(toggleButton);
      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('shows close icon when panel is open', () => {
      const mockOnToggle = vi.fn();
      render(
        <AnnotationPanel
          annotations={[]}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );

      const toggleButton = screen.getByRole('button', {
        name: /close annotation panel/i,
      });
      expect(toggleButton).toHaveTextContent('◀');
    });
  });

  describe('empty state', () => {
    it('shows "Aucune annotation" when open with empty annotations', () => {
      render(
        <AnnotationPanel
          annotations={[]}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      expect(screen.getByText('Aucune annotation')).toBeInTheDocument();
    });

    it('does not show empty state when panel is closed', () => {
      render(
        <AnnotationPanel
          annotations={[]}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={false}
          onToggle={vi.fn()}
        />
      );

      expect(screen.queryByText('Aucune annotation')).not.toBeInTheDocument();
    });
  });

  describe('grouping and display', () => {
    it('groups annotations by page and shows page headers', () => {
      render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.getByText('Page 2')).toBeInTheDocument();
    });

    it('shows correct count per page', () => {
      render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      const badges = screen.getAllByText('2');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    it('shows total annotation count in header badge', () => {
      render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays annotation content (truncated to 20 chars)', () => {
      render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      expect(screen.getByText('Sample text annotati…')).toBeInTheDocument();
    });

    it('displays position information for annotations', () => {
      render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      expect(screen.getByText('x:100 y:150')).toBeInTheDocument();
      expect(screen.getByText('x:50 y:200')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onSelectAnnotation when clicking an item', () => {
      const mockOnSelectAnnotation = vi.fn();
      render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={mockOnSelectAnnotation}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      const firstItem = screen.getByText('Sample text annotati…').closest('li');
      fireEvent.click(firstItem!);

      expect(mockOnSelectAnnotation).toHaveBeenCalledWith('anno-1', 0);
    });

    it('calls onSelectAnnotation with correct page number', () => {
      const mockOnSelectAnnotation = vi.fn();
      render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={mockOnSelectAnnotation}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      const page2Item = screen.getByText('Check this').closest('li');
      fireEvent.click(page2Item!);

      expect(mockOnSelectAnnotation).toHaveBeenCalledWith('anno-3', 1);
    });
  });

  describe('deletion', () => {
    it('shows delete confirmation on first click', () => {
      render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      const deleteButtons = screen.getAllByRole('button', {
        name: /delete annotation/i,
      });
      expect(deleteButtons[0]).toHaveTextContent('×');

      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', {
        name: /confirm delete/i,
      });
      expect(confirmButton).toHaveTextContent('?');
    });

    it('deletes on second click', () => {
      const mockOnDeleteAnnotation = vi.fn();
      render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={mockOnDeleteAnnotation}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      const deleteButtons = screen.getAllByRole('button', {
        name: /delete annotation/i,
      });

      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', {
        name: /confirm delete/i,
      });
      fireEvent.click(confirmButton);

      expect(mockOnDeleteAnnotation).toHaveBeenCalledWith('anno-1');
    });

    it('clears delete confirmation when selecting another annotation', () => {
      render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      const deleteButtons = screen.getAllByRole('button', {
        name: /delete annotation/i,
      });
      fireEvent.click(deleteButtons[0]);

      let confirmButton = screen.getByRole('button', {
        name: /confirm delete/i,
      });
      expect(confirmButton).toBeInTheDocument();

      const secondItem = screen.getByText('Signature here').closest('li');
      fireEvent.click(secondItem!);

      const allDeleteButtons = screen.getAllByRole('button', {
        name: /delete annotation/i,
      });
      const allConfirmButtons = screen.queryAllByRole('button', {
        name: /confirm delete/i,
      });
      expect(allConfirmButtons).toHaveLength(0);
      expect(allDeleteButtons[0]).toHaveTextContent('×');
    });
  });

  describe('selection highlighting', () => {
    it('highlights selected annotation', () => {
      render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId="anno-1"
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      const selectedItem = screen.getByText('Sample text annotati…').closest('li');
      expect(selectedItem).toHaveClass('annotation-panel-item--selected');
    });

    it('removes highlight from previously selected annotation', () => {
      const { rerender } = render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId="anno-1"
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      let selectedItem = screen.getByText('Sample text annotati…').closest('li');
      expect(selectedItem).toHaveClass('annotation-panel-item--selected');

      rerender(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId="anno-2"
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      const firstItem = screen.getByText('Sample text annotati…').closest('li');
      expect(firstItem).not.toHaveClass('annotation-panel-item--selected');

      const secondItem = screen.getByText('Signature here').closest('li');
      expect(secondItem).toHaveClass('annotation-panel-item--selected');
    });

    it('highlights current page badge differently', () => {
      const { container } = render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      // pageBadges used for coverage
      const currentPageBadge = container.querySelector(
        '.annotation-panel-page-badge--current'
      );

      expect(currentPageBadge).toBeInTheDocument();
    });
  });

  describe('annotation types', () => {
    it('displays correct icon for each annotation type', () => {
      render(
        <AnnotationPanel
          annotations={mockAnnotations}
          currentPage={0}
          numPages={2}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      const icons = screen.getAllByTitle((title) =>
        ['text', 'signature', 'checkbox'].includes(title)
      );
      expect(icons.length).toBeGreaterThanOrEqual(3);
    });

    it('displays dash for empty content', () => {
      const annotationWithEmptyContent: Annotation = {
        id: 'anno-empty',
        type: 'text',
        page: 0,
        x: 0,
        y: 0,
        width: 100,
        height: 30,
        content: '',
      };

      render(
        <AnnotationPanel
          annotations={[annotationWithEmptyContent]}
          currentPage={0}
          numPages={1}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles annotations with very long content', () => {
      const longContent = 'a'.repeat(50);
      const annotationWithLongContent: Annotation = {
        id: 'anno-long',
        type: 'text',
        page: 0,
        x: 0,
        y: 0,
        width: 100,
        height: 30,
        content: longContent,
      };

      render(
        <AnnotationPanel
          annotations={[annotationWithLongContent]}
          currentPage={0}
          numPages={1}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      expect(screen.getByText(/aaaaa.*…/)).toBeInTheDocument();
    });

    it('handles single page with multiple annotations', () => {
      const singlePageAnnotations: Annotation[] = [
        {
          id: 'anno-a',
          type: 'text',
          page: 0,
          x: 10,
          y: 20,
          width: 100,
          height: 30,
          content: 'First',
        },
        {
          id: 'anno-b',
          type: 'text',
          page: 0,
          x: 30,
          y: 40,
          width: 100,
          height: 30,
          content: 'Second',
        },
        {
          id: 'anno-c',
          type: 'text',
          page: 0,
          x: 50,
          y: 60,
          width: 100,
          height: 30,
          content: 'Third',
        },
      ];

      render(
        <AnnotationPanel
          annotations={singlePageAnnotations}
          currentPage={0}
          numPages={1}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('handles multiple pages with sparse annotations', () => {
      const sparseAnnotations: Annotation[] = [
        {
          id: 'anno-sparse-1',
          type: 'text',
          page: 0,
          x: 0,
          y: 0,
          width: 100,
          height: 30,
          content: 'First note',
        },
        {
          id: 'anno-sparse-5',
          type: 'text',
          page: 4,
          x: 0,
          y: 0,
          width: 100,
          height: 30,
          content: 'Last note',
        },
      ];

      render(
        <AnnotationPanel
          annotations={sparseAnnotations}
          currentPage={0}
          numPages={5}
          selectedId={null}
          onSelectAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
        />
      );

      // Page headers should exist for pages with annotations
      const pageLabels = screen.getAllByText(/^Page \d+$/);
      expect(pageLabels).toHaveLength(2);
      expect(screen.getByText('First note')).toBeInTheDocument();
      expect(screen.getByText('Last note')).toBeInTheDocument();
      // Pages without annotations should not appear
      expect(screen.queryByText('Page 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Page 3')).not.toBeInTheDocument();
      expect(screen.queryByText('Page 4')).not.toBeInTheDocument();
    });
  });
});
