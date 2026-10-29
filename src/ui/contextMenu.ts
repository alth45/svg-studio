/* ============================================================
 * ui/contextMenu.ts — Right-click context menu
 * ============================================================ */

export interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

let activeMenu: HTMLElement | null = null;

export function showContextMenu(x: number, y: number, items: MenuItem[]) {
  hideContextMenu();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.id = 'contextMenu';
  menu.setAttribute('role', 'menu');

  items.forEach(item => {
    if (item.divider) {
      const d = document.createElement('div');
      d.className = 'ctx-divider';
      menu.appendChild(d);
      return;
    }

    const row = document.createElement('button');
    row.className =
      'ctx-item' +
      (item.disabled ? ' disabled' : '') +
      (item.danger ? ' danger' : '');
    row.disabled = !!item.disabled;
    row.setAttribute('role', 'menuitem');

    const label = document.createElement('span');
    label.className = 'ctx-label';
    label.textContent = item.label || '';
    row.appendChild(label);

    if (item.shortcut) {
      const sc = document.createElement('span');
      sc.className = 'ctx-shortcut';
      sc.textContent = item.shortcut;
      row.appendChild(sc);
    }

    if (!item.disabled && item.action) {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        hideContextMenu();
        item.action!();
      });
    }

    menu.appendChild(row);
  });

  // Render invisible dulu untuk ukur
  menu.style.left = '-9999px';
  menu.style.top = '-9999px';
  menu.style.visibility = 'hidden';
  document.body.appendChild(menu);
  activeMenu = menu;

  // Clamp ke viewport
  const rect = menu.getBoundingClientRect();
  const pad = 8;
  let px = x, py = y;
  if (px + rect.width > window.innerWidth - pad) px = window.innerWidth - rect.width - pad;
  if (py + rect.height > window.innerHeight - pad) py = window.innerHeight - rect.height - pad;
  if (px < pad) px = pad;
  if (py < pad) py = pad;

  menu.style.left = `${px}px`;
  menu.style.top = `${py}px`;
  menu.style.visibility = '';

  requestAnimationFrame(() => menu.classList.add('visible'));
}

export function hideContextMenu() {
  if (activeMenu) {
    activeMenu.remove();
    activeMenu = null;
  }
  const stale = document.getElementById('contextMenu');
  if (stale) stale.remove();
}

export function bindContextMenu() {
  document.addEventListener('pointerdown', (e) => {
    const menu = document.getElementById('contextMenu');
    if (menu && !menu.contains(e.target as Node)) hideContextMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideContextMenu();
  });
  window.addEventListener('blur', hideContextMenu);
  window.addEventListener('resize', hideContextMenu);
  window.addEventListener('scroll', hideContextMenu, true);
}