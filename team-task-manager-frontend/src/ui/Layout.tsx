import React from 'react';

export function Container({ children }: { children: React.ReactNode }) {
  return <div className="ttm-container">{children}</div>;
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="ttm-card">{children}</div>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="ttm-section-title">
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

