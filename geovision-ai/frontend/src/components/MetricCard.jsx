import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function MetricCard({
  title,
  value,
  unit = '',
  change = null,
  changeType = 'neutral', // 'positive', 'negative', 'neutral'
  subtitle = '',
  icon: Icon,
  accentColor = 'emerald', // emerald, cyan, rose, amber, blue
}) {
  const accentGradients = {
    emerald: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-400',
    cyan: 'from-cyan-500/10 via-cyan-500/5 to-transparent border-cyan-500/30 text-cyan-400',
    rose: 'from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/30 text-rose-400',
    amber: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 text-amber-400',
    blue: 'from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30 text-blue-400',
  };

  const iconBg = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br bg-geo-card p-5 shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl ${accentGradients[accentColor] || accentGradients.emerald}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
            {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${iconBg[accentColor] || iconBg.emerald}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {change !== null && (
          <div className={`flex items-center space-x-1 font-semibold ${
            changeType === 'positive' ? 'text-emerald-400' :
            changeType === 'negative' ? 'text-rose-400' : 'text-slate-400'
          }`}>
            {changeType === 'positive' && <ArrowUpRight className="w-3.5 h-3.5" />}
            {changeType === 'negative' && <ArrowDownRight className="w-3.5 h-3.5" />}
            {changeType === 'neutral' && <Minus className="w-3.5 h-3.5" />}
            <span>{change}</span>
          </div>
        )}
        {subtitle && <span className="text-slate-400">{subtitle}</span>}
      </div>
    </div>
  );
}
