
import React from 'react';

interface MetricsCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ label, value, trend }) => {
  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-2 group hover:border-blue-500/50 transition-all cursor-default">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">{label}</span>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-black text-white tracking-tighter">{value}</span>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
            trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : trend === 'down' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800 text-slate-500'
          }`}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '▬'}
          </div>
        )}
      </div>
    </div>
  );
};
