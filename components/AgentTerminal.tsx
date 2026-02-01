
import React from 'react';
import { AgentMode } from '../types';

interface LogEntry {
  agent: string;
  message: string;
  timestamp: string;
}

interface AgentTerminalProps {
  mode: AgentMode;
  logs: LogEntry[];
}

export const AgentTerminal: React.FC<AgentTerminalProps> = ({ mode, logs }) => {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="px-4 py-2 bg-slate-800 flex justify-between items-center border-b border-slate-700">
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="ml-2 text-xs font-mono text-slate-400 font-medium">PAYAGENT CORE_LOG</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Active State:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                mode === AgentMode.IDLE ? 'bg-slate-700 text-slate-400' :
                mode === AgentMode.ACTING ? 'bg-rose-900/40 text-rose-400 animate-pulse' :
                'bg-blue-900/40 text-blue-400'
            }`}>
                {mode}
            </span>
        </div>
      </div>
      <div className="p-4 flex-1 overflow-y-auto font-mono text-xs flex flex-col gap-2 bg-slate-900/50">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 leading-relaxed border-b border-slate-800/50 pb-2">
            <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
            <span className={`font-bold shrink-0 uppercase tracking-tighter ${
                log.agent === 'Observe' ? 'text-cyan-400' :
                log.agent === 'Reason' ? 'text-purple-400' :
                log.agent === 'Decide' ? 'text-amber-400' :
                log.agent === 'Action' ? 'text-rose-400' :
                'text-emerald-400'
            }`}>
                {log.agent}:
            </span>
            <span className="text-slate-300">{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && <span className="text-slate-600 italic">Awaiting telemetry stream...</span>}
      </div>
    </div>
  );
};
