import { useState, useRef, useEffect, useCallback } from 'react';

export interface MenuAction {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  checked?: boolean;
  type?: 'item' | 'separator' | 'toggle';
}

export interface MenuGroup {
  label: string;
  items: MenuAction[];
}

interface MenuBarProps {
  menus: MenuGroup[];
  darkMode: boolean;
}

export function MenuBar({ menus, darkMode }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [focusedItem, setFocusedItem] = useState(-1);
  const barRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click + keyboard navigation
  useEffect(() => {
    if (openMenu === null) { setFocusedItem(-1); return; }
    const handleClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpenMenu(null); return; }
      if (openMenu === null) return;
      const items = menus[openMenu].items.filter((i) => i.type !== 'separator');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedItem((prev) => {
          let next = prev + 1;
          while (next < items.length && items[next].disabled) next++;
          return next < items.length ? next : prev;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedItem((prev) => {
          let next = prev - 1;
          while (next >= 0 && items[next].disabled) next--;
          return next >= 0 ? next : prev;
        });
      } else if (e.key === 'Enter' && focusedItem >= 0 && focusedItem < items.length) {
        e.preventDefault();
        const item = items[focusedItem];
        if (!item.disabled) { item.onClick(); setOpenMenu(null); }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = (openMenu + 1) % menus.length;
        setOpenMenu(next);
        setFocusedItem(-1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = (openMenu - 1 + menus.length) % menus.length;
        setOpenMenu(next);
        setFocusedItem(-1);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openMenu, focusedItem, menus]);

  const handleMenuClick = useCallback((index: number) => {
    setOpenMenu((prev) => (prev === index ? null : index));
  }, []);

  const handleItemClick = useCallback((action: MenuAction) => {
    if (action.disabled) return;
    action.onClick();
    setOpenMenu(null);
  }, []);

  const handleMenuEnter = useCallback((index: number) => {
    if (openMenu !== null) {
      setOpenMenu(index);
    }
  }, [openMenu]);

  return (
    <div className={`menubar${darkMode ? ' menubar--dark' : ''}`} ref={barRef} role="menubar">
      {menus.map((menu, menuIndex) => (
        <div key={menu.label} className="menubar-item-wrapper">
          <button
            className={`menubar-item${openMenu === menuIndex ? ' menubar-item--active' : ''}`}
            onClick={() => handleMenuClick(menuIndex)}
            onMouseEnter={() => handleMenuEnter(menuIndex)}
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={openMenu === menuIndex}
          >
            {menu.label}
          </button>

          {openMenu === menuIndex && (
            <div className="menubar-dropdown" ref={dropdownRef} role="menu">
              {(() => {
                let nonSepIndex = -1;
                return menu.items.map((item, itemIndex) => {
                  if (item.type === 'separator') {
                    return <div key={`sep-${itemIndex}`} className="menubar-separator" role="separator" />;
                  }
                  nonSepIndex++;
                  const isFocused = nonSepIndex === focusedItem;
                  return (
                    <button
                      key={item.label}
                      className={`menubar-dropdown-item${item.disabled ? ' menubar-dropdown-item--disabled' : ''}${isFocused ? ' menubar-dropdown-item--focused' : ''}`}
                      onClick={() => handleItemClick(item)}
                      disabled={item.disabled}
                      role="menuitem"
                    >
                    <span className="menubar-dropdown-check">
                      {item.type === 'toggle' && item.checked ? '✓' : ''}
                    </span>
                    <span className="menubar-dropdown-label">{item.label}</span>
                    {item.shortcut && (
                      <span className="menubar-dropdown-shortcut">{item.shortcut}</span>
                    )}
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
