import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  titleId?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, titleId, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <h1 id={titleId}>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
