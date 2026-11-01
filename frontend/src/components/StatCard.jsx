import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'teal' }) {
  const colorMap = {
    teal: {
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      icon: 'text-teal-400',
      glow: 'hover:shadow-teal-500/10',
    },
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      icon: 'text-indigo-400',
      glow: 'hover:shadow-indigo-500/10',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: 'text-amber-400',
      glow: 'hover:shadow-amber-500/10',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      icon: 'text-emerald-400',
      glow: 'hover:shadow-emerald-500/10',
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      icon: 'text-rose-400',
      glow: 'hover:shadow-rose-500/10',
    },
  };

  const scheme = colorMap[color] || colorMap.teal;

  return (
    <div className={`glass-card p-5 rounded-2xl relative overflow-hidden group ${scheme.glow}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-black text-white mt-1 group-hover:scale-105 transition-transform origin-left">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
              <span>{subtitle}</span>
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-xl ${scheme.bg} ${scheme.border} border flex items-center justify-center ${scheme.icon} group-hover:rotate-6 transition-transform`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-teal-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
