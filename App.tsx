
import { useState, useEffect, useCallback, useRef } from 'react';
import { simulator } from './services/paymentSimulator';
import { AgentOrchestrator } from './services/AgentOrchestrator';
import { BridgeService } from './services/bridge';
import { PaymentTransaction, AgentMode, AgentAction } from './types';
import { MetricsCard } from './components/MetricsCard';
import { AgentTerminal } from './components/AgentTerminal';
import { ISSUERS, REFRESH_INTERVAL } from './constants';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [agentMode, setAgentMode] = useState<AgentMode>(AgentMode.IDLE);
  const [logs, setLogs] = useState<{agent: string, message: string, timestamp: string}[]>([]);
  const [chaosIssuer, setChaosIssuer] = useState<string | null>(null);
  const [isExternalChaos, setIsExternalChaos] = useState(false);
  const [successHistory, setSuccessHistory] = useState<{time: string, rate: number}[]>([]);
  const [actionHistory, setActionHistory] = useState<AgentAction[]>([]);
  const [lastReport, setLastReport] = useState<string | null>(null);
  const [isAutonomous, setIsAutonomous] = useState(true);
  
  const orchestrator = useRef<AgentOrchestrator | null>(null);
  const txRef = useRef<PaymentTransaction[]>([]);

  useEffect(() => {
    orchestrator.current = new AgentOrchestrator();
  }, []);

  const addLog = useCallback((agent: string, message: string) => {
    setLogs(prev => [...prev.slice(-30), {
      agent,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }]);

    // Track the report generation log to update preview
    if (message.includes("Report dispatched")) {
      // Small delay to allow the state to sync if needed
      setTimeout(() => {
        // In a real app we'd get this from the orchestrator state
      }, 500);
    }
  }, []);

  useEffect(() => {
    const poll = setInterval(async () => {
      const status = await BridgeService.getChaosStatus();
      if (status.active && status.bank !== chaosIssuer) {
        setChaosIssuer(status.bank);
        setIsExternalChaos(true);
        simulator.setChaos(status.level, status.bank);
        addLog('System', `EXTERNAL_TRIGGER: ${status.bank} failure signal detected via Terminal.`);
      } else if (!status.active && isExternalChaos) {
        setChaosIssuer(null);
        setIsExternalChaos(false);
        simulator.setChaos(0, null);
        addLog('System', 'EXTERNAL_TRIGGER: Chaos signal cleared by Bridge.');
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [chaosIssuer, isExternalChaos, addLog]);

  useEffect(() => {
    const interval = setInterval(() => {
      const tx = simulator.generateTransaction();
      setTransactions(prev => {
        const next = [...prev.slice(-40), tx];
        txRef.current = next;
        return next;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loop = setInterval(async () => {
      if (!orchestrator.current) return;
      
      const currentTxs = txRef.current;
      const recent = currentTxs.slice(-20);
      const sr = recent.length > 0 ? (recent.filter(t => t.status === 'SUCCESS').length / recent.length) * 100 : 100;
      
      setSuccessHistory(prev => [...prev.slice(-50), { time: ' ', rate: sr }]);

      orchestrator.current.autonomousMode = isAutonomous;
      await orchestrator.current.runPipeline(currentTxs, setAgentMode, addLog);
      
      setActionHistory([...orchestrator.current.actionHistory]);

    }, REFRESH_INTERVAL);
    return () => clearInterval(loop);
  }, [addLog, isAutonomous]);

  const handleManualCommit = async (id: string) => {
    if (!orchestrator.current) return;
    const success = await orchestrator.current.manualCommit(id);
    if (success) {
      addLog('Action', `MANUAL_COMMIT: Synced with Bridge & Sent Gmail.`);
      setActionHistory([...orchestrator.current.actionHistory]);
    }
  };

  const currentSR = successHistory.length > 0 ? successHistory[successHistory.length - 1].rate : 100;
  const lastAction = actionHistory[actionHistory.length - 1];

  return (
    <div className="h-screen bg-[#02040a] text-slate-300 p-6 flex flex-col gap-6 overflow-hidden">
      <header className="flex justify-between items-center bg-[#0d1117] p-4 rounded-3xl border border-white/5 shadow-2xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-xl font-black text-white italic">P</span>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-white uppercase italic leading-none">PayAgent<span className="text-blue-500">.OPS</span></h1>
            <p className="text-[7px] font-mono text-slate-500 uppercase tracking-widest mt-1">
              Terminal Bridge: <span className={isExternalChaos ? "text-rose-500 animate-pulse" : "text-emerald-500"}>
                {isExternalChaos ? "LISTENING_FOR_CHAOS_CMD" : "ACTIVE"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-2xl border border-white/5">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Autonomous</span>
            <button 
              onClick={() => setIsAutonomous(!isAutonomous)}
              className={`w-10 h-5 rounded-full relative transition-all ${isAutonomous ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isAutonomous ? 'left-6' : 'left-1'}`}></div>
            </button>
          </div>
          <div className="flex gap-2">
            {ISSUERS.map(issuer => (
              <button
                key={issuer}
                onClick={() => {
                  if (chaosIssuer === issuer) {
                    setChaosIssuer(null);
                    simulator.setChaos(0, null);
                  } else {
                    setChaosIssuer(issuer);
                    simulator.setChaos(0.9, issuer);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-[9px] font-black border transition-all uppercase tracking-tight ${
                  chaosIssuer === issuer 
                  ? 'bg-rose-600 text-white border-transparent shadow-[0_0_20px_rgba(225,29,72,0.5)] animate-pulse' 
                  : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                }`}
              >
                {chaosIssuer === issuer ? `Fixing ${issuer}` : `Fail ${issuer}`}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        <div className="col-span-4 flex flex-col gap-6 min-h-0 overflow-hidden">
          <AgentTerminal mode={agentMode} logs={logs} />
          
          {/* Post-Mortem Preview Panel */}
          <div className="bg-[#0d1117] rounded-3xl p-5 border border-blue-500/20 shadow-2xl flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic">Latest Incident Report</span>
              <span className="text-[7px] text-slate-600 font-mono">Gmail Sync Active</span>
            </div>
            <div className="flex-1 overflow-y-auto bg-black/40 rounded-2xl p-4 custom-scroll">
              {lastAction?.status === 'EXECUTED' ? (
                <div className="space-y-3 animate-in fade-in duration-700">
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1"></div>
                    <p className="text-[10px] text-slate-200 leading-relaxed font-medium italic">
                      "Agent successfully generated a unique report for Incident {lastAction.id}. Message was dispatched via n8n Webhook to your Gmail inbox."
                    </p>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Subject Header</p>
                    <p className="text-[9px] text-blue-400 font-mono italic">Post-Mortem: Autonomous Fix Applied to {lastAction.decision.parameters.target}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-2">
                  <div className="w-8 h-8 rounded-full border border-dashed border-slate-500"></div>
                  <p className="text-[8px] uppercase font-black tracking-widest">Awaiting Next Incident</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-5 flex flex-col gap-6 min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-4 shrink-0">
             <MetricsCard label="System Integrity" value={`${currentSR.toFixed(1)}%`} trend={currentSR > 92 ? "up" : "down"} />
             <MetricsCard label="Cluster Confidence" value={lastAction ? `${(lastAction.reasoning.confidence*100).toFixed(0)}%` : '---'} />
          </div>

          <div className="flex-[2] bg-[#0d1117] rounded-3xl p-6 border border-white/5 shadow-2xl relative min-h-0">
             <div className="absolute top-4 left-6 text-[8px] font-bold text-slate-600 uppercase tracking-widest">Real-time Telemetry Graph</div>
             <div className="w-full h-full pt-6">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={successHistory}>
                        <defs>
                            <linearGradient id="wave" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={3} fill="url(#wave)" isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="flex-[1] bg-blue-600/5 rounded-3xl border border-blue-500/20 p-6 flex flex-col justify-center shrink-0">
            <h4 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Probabilistic Impact Card</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col">
                <span className="text-[7px] text-slate-500 uppercase font-black">Exp. Saved</span>
                <span className="text-2xl font-black text-emerald-400 leading-none mt-2">{lastAction?.prediction.expectedSavedTransactions || '0'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] text-slate-500 uppercase font-black">User Friction</span>
                <span className="text-2xl font-black text-rose-400 leading-none mt-2">{lastAction?.prediction.projectedUserFriction || '0'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] text-slate-500 uppercase font-black">Uncertainty</span>
                <span className="text-2xl font-black text-amber-500 leading-none mt-2">{lastAction?.prediction.uncertainty.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] text-slate-500 uppercase font-black">Variance</span>
                <span className="text-2xl font-black text-slate-400 leading-none mt-2">{lastAction?.prediction.variance.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-3 flex flex-col gap-6 min-h-0 overflow-hidden">
           <div className="bg-[#0d1117] rounded-3xl flex flex-col border border-white/5 shadow-2xl h-full min-h-0 overflow-hidden">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                 <div>
                    <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic leading-none">Policy Ledger</h3>
                    <p className="text-[6px] text-slate-600 mt-1 uppercase">Causal Action Ledger</p>
                 </div>
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 custom-scroll">
                 {actionHistory.slice().reverse().map(action => (
                    <div key={action.id} className="relative">
                       <div className={`p-4 rounded-2xl text-[9px] border shadow-xl transition-all ${
                          action.status === 'EXECUTED' ? 'bg-emerald-900/10 border-emerald-500/20 text-emerald-200' :
                          'bg-amber-600/10 border-amber-500/40 text-amber-100'
                       }`}>
                          <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2 text-[7px] font-black opacity-60">
                            <span className={`uppercase tracking-tighter px-2 py-0.5 rounded ${action.status === 'EXECUTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-black/40'}`}>
                              {action.status === 'EXECUTED' ? 'SYNCED' : 'PENDING'}
                            </span>
                            <span>{action.reasoning.clusterId}</span>
                          </div>
                          <div className="font-black mb-2 uppercase text-white tracking-tight">{action.decision.actionType} ROUTE: {action.decision.parameters.target}</div>
                          <div className="p-2.5 bg-black/40 rounded-xl mb-4">
                            <p className="text-[8px] opacity-90 leading-relaxed font-medium italic">"{action.decision.rationale}"</p>
                          </div>
                          {action.status === 'DRAFT' && (
                            <button 
                                onClick={() => handleManualCommit(action.id)}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-[8px] py-2.5 rounded-xl transition-all uppercase tracking-[0.2em] shadow-lg shadow-blue-900/40"
                            >
                                Manual Sync
                            </button>
                          )}
                       </div>
                    </div>
                 ))}
                 {actionHistory.length === 0 && (
                   <div className="text-center mt-24 opacity-30">
                     <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Awaiting Trigger</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
