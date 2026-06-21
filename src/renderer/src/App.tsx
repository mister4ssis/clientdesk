import type { ReactElement } from 'react';

export function App(): ReactElement {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <strong>ClientDesk</strong>
        <nav aria-label="Menu principal">
          <a href="#clientes">Clientes</a>
        </nav>
      </aside>
      <section className="content">
        <h1>Clientes</h1>
        <p>Infraestrutura inicial do aplicativo configurada.</p>
      </section>
    </main>
  );
}
