import React from 'react';

export function Badge({ children, variant = 'neutral', size = 'sm' }) {
  const variantStyles = {
    teal: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center space-x-1.5 font-medium rounded-lg border ${
        variantStyles[variant] || variantStyles.neutral
      } ${sizeStyles[size] || sizeStyles.sm}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
    case 'ACTIVE':
    case 'SUCCESS':
    case 'CONFIRMED':
      return <Badge variant="emerald">{status}</Badge>;
    case 'PENDING':
      return <Badge variant="amber">{status}</Badge>;
    case 'REJECTED':
    case 'REVOKED':
    case 'EXPIRED':
    case 'FAILED':
      return <Badge variant="rose">{status}</Badge>;
    default:
      return <Badge variant="neutral">{status || 'UNKNOWN'}</Badge>;
  }
}
