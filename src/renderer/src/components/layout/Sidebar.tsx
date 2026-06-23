interface SidebarProps {
  activeItem: 'customers' | 'settings';
  onNavigate: (path: string) => void;
}

export function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Menu lateral">
      <div className="sidebar__brand">ClientDesk</div>
      <nav aria-label="Menu principal">
        <button
          className={getLinkClassName(activeItem === 'customers')}
          type="button"
          aria-current={activeItem === 'customers' ? 'page' : undefined}
          onClick={() => onNavigate('/customers')}
        >
          Clientes
        </button>
        <button
          className={getLinkClassName(activeItem === 'settings')}
          type="button"
          aria-current={activeItem === 'settings' ? 'page' : undefined}
          onClick={() => onNavigate('/settings/backup')}
        >
          Configurações
        </button>
      </nav>
    </aside>
  );
}

function getLinkClassName(active: boolean): string {
  return active ? 'sidebar__link sidebar__link--active' : 'sidebar__link';
}
