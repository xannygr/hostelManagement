import React from 'react';

export type LegendItem = {
  label: string;
  color?: string;
  swatch?: React.ReactNode;
};

export default function Legend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-4 text-xs ${className ?? ''}`}>
      {items.map(it => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          {it.swatch ?? <span className={`w-3 h-3 rounded ${it.color ?? 'bg-gray-300'}`} />}
          {it.label}
        </span>
      ))}
    </div>
  );
}
