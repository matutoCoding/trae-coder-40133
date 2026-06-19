import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export default function PageHeader({ title, subtitle, action, icon }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-12 h-12 rounded-xl bg-tennis-100 text-tennis-800 flex items-center justify-center shadow-sm">
            {icon}
          </div>
        )}
        <div>
          <h1 className="font-display font-bold text-2xl text-tennis-950 tracking-wide">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
