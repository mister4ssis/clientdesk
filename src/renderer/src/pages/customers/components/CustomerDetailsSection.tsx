import type { ReactNode } from 'react';

interface CustomerDetailsSectionProps {
  title: string;
  children: ReactNode;
}

export function CustomerDetailsSection({ title, children }: CustomerDetailsSectionProps) {
  return (
    <section className="details-section" aria-labelledby={`${slugify(title)}-title`}>
      <h2 id={`${slugify(title)}-title`}>{title}</h2>
      <dl className="details-grid">{children}</dl>
    </section>
  );
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\W+/g, '-')
    .toLowerCase();
}
