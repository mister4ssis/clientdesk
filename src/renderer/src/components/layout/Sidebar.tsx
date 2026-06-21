export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Menu lateral">
      <div className="sidebar__brand">ClientDesk</div>
      <nav aria-label="Menu principal">
        <a className="sidebar__link sidebar__link--active" href="#/customers" aria-current="page">
          Clientes
        </a>
      </nav>
    </aside>
  );
}
