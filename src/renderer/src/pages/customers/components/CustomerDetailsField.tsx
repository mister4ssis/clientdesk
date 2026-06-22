import type { ReactNode } from 'react';

interface CustomerDetailsFieldProps {
  label: string;
  value: ReactNode;
}

export function CustomerDetailsField({ label, value }: CustomerDetailsFieldProps) {
  return (
    <div className="details-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
