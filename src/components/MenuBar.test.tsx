import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MenuBar } from './MenuBar';
import type { MenuGroup } from './MenuBar';

function makeMenus(overrides?: Partial<MenuGroup>[]): MenuGroup[] {
  const defaults: MenuGroup[] = [
    {
      label: 'Fichier',
      items: [
        { label: 'Nouveau', onClick: vi.fn() },
        { type: 'separator', label: '', onClick: () => {} },
        { label: 'Sauvegarder', shortcut: '⌘S', onClick: vi.fn() },
        { label: 'Disabled', onClick: vi.fn(), disabled: true },
      ],
    },
    {
      label: 'Édition',
      items: [
        { label: 'Annuler', shortcut: '⌘Z', onClick: vi.fn() },
        { label: 'Dark Mode', type: 'toggle', checked: true, onClick: vi.fn() },
      ],
    },
  ];
  if (overrides) {
    overrides.forEach((o, i) => {
      if (defaults[i]) Object.assign(defaults[i], o);
    });
  }
  return defaults;
}

describe('MenuBar', () => {
  it('renders all menu labels', () => {
    render(<MenuBar menus={makeMenus()} darkMode={false} />);
    expect(screen.getByText('Fichier')).toBeTruthy();
    expect(screen.getByText('Édition')).toBeTruthy();
  });

  it('opens dropdown on click', () => {
    render(<MenuBar menus={makeMenus()} darkMode={false} />);
    fireEvent.click(screen.getByText('Fichier'));
    expect(screen.getByText('Nouveau')).toBeTruthy();
    expect(screen.getByText('Sauvegarder')).toBeTruthy();
  });

  it('closes dropdown on second click', () => {
    render(<MenuBar menus={makeMenus()} darkMode={false} />);
    fireEvent.click(screen.getByText('Fichier'));
    expect(screen.getByText('Nouveau')).toBeTruthy();
    fireEvent.click(screen.getByText('Fichier'));
    expect(screen.queryByText('Nouveau')).toBeNull();
  });

  it('switches menu on hover when one is open', () => {
    render(<MenuBar menus={makeMenus()} darkMode={false} />);
    fireEvent.click(screen.getByText('Fichier'));
    expect(screen.getByText('Nouveau')).toBeTruthy();
    fireEvent.mouseEnter(screen.getByText('Édition'));
    expect(screen.getByText('Annuler')).toBeTruthy();
    expect(screen.queryByText('Nouveau')).toBeNull();
  });

  it('calls onClick when item clicked', () => {
    const menus = makeMenus();
    const handler = menus[0].items[0].onClick;
    render(<MenuBar menus={menus} darkMode={false} />);
    fireEvent.click(screen.getByText('Fichier'));
    fireEvent.click(screen.getByText('Nouveau'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick for disabled items', () => {
    const menus = makeMenus();
    const handler = menus[0].items[3].onClick;
    render(<MenuBar menus={menus} darkMode={false} />);
    fireEvent.click(screen.getByText('Fichier'));
    fireEvent.click(screen.getByText('Disabled'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('renders separator elements', () => {
    render(<MenuBar menus={makeMenus()} darkMode={false} />);
    fireEvent.click(screen.getByText('Fichier'));
    const separators = document.querySelectorAll('[role="separator"]');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('renders shortcut text', () => {
    render(<MenuBar menus={makeMenus()} darkMode={false} />);
    fireEvent.click(screen.getByText('Fichier'));
    expect(screen.getByText('⌘S')).toBeTruthy();
  });

  it('renders check mark for toggle items', () => {
    render(<MenuBar menus={makeMenus()} darkMode={false} />);
    fireEvent.click(screen.getByText('Édition'));
    const checks = document.querySelectorAll('.menubar-dropdown-check');
    const checkedItem = Array.from(checks).find((el) => el.textContent === '✓');
    expect(checkedItem).toBeTruthy();
  });

  it('applies dark mode class', () => {
    render(<MenuBar menus={makeMenus()} darkMode={true} />);
    const bar = document.querySelector('.menubar');
    expect(bar?.classList.contains('menubar--dark')).toBe(true);
  });

  it('closes on Escape key', () => {
    render(<MenuBar menus={makeMenus()} darkMode={false} />);
    fireEvent.click(screen.getByText('Fichier'));
    expect(screen.getByText('Nouveau')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Nouveau')).toBeNull();
  });
});
