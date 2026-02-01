
import { ObserveAgent, IntelligenceAgent, PredictAgent, LearnAgent } from './agents';
import { BridgeService } from './bridge';
import { PaymentTransaction, AgentMode, AgentAction } from '../types';

export class AgentOrchestrator {
  private observer = new ObserveAgent();
  private intel = new IntelligenceAgent();
  private predictor = new PredictAgent();
  private learner = new LearnAgent();
  
  private isProcessing = false;
  private cooldownUntil = 0;
  public actionHistory: AgentAction[] = [];
  public autonomousMode = true;

  async runPipeline(
    transactions: PaymentTransaction[], 
    onMode: (mode: AgentMode) => void,
    onLog: (agent: string, msg: string) => void
  ): Promise<void> {
    if (this.isProcessing) return;
    
    const isThrottled = Date.now() < this.cooldownUntil;
    if (isThrottled) {
      const wait = Math.ceil((this.cooldownUntil - Date.now()) / 1000);
      onLog('System', `API Cooldown: Using Local Rulebook for next ${wait}s...`);
    }

    const recent = transactions.slice(-50);
    const failRate = recent.filter(t => t.status === 'FAILED').length / Math.max(1, recent.length);

    if (failRate < 0.03 && this.actionHistory.length === 0) {
      onMode(AgentMode.IDLE);
      return;
    }

    this.isProcessing = true;
    try {
      onMode(AgentMode.CONSUMING);
      const metrics = this.observer.ingest(recent);
      onLog('Kafka', `Ingested ${recent.length} signals.`);

      onMode(AgentMode.REASONING);
      const brain = await this.intel.analyzeAndDecide(metrics, isThrottled);
      
      if (!brain) {
        onMode(AgentMode.IDLE);
        return;
      }

      onLog('Reason', `Diagnostic Output: ${brain.reasoning.hypothesis}`);

      onMode(AgentMode.PREDICTING);
      const prediction = this.predictor.run(brain.reasoning);

      const action: AgentAction = {
        id: `ACT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        timestamp: Date.now(),
        decision: brain.decision,
        prediction,
        reasoning: brain.reasoning,
        status: 'DRAFT'
      };

      if (this.autonomousMode && brain.decision.isAutonomous) {
        onMode(AgentMode.ACTING);
        onLog('Action', `Applying Routing Policy: ${brain.decision.parameters.target} @ 0%`);
        
        const committed = await BridgeService.commitRoutingPolicy(
          brain.decision.parameters.target, 
          brain.decision.parameters.method, 
          brain.decision.parameters.weight
        );
        
        if (committed) {
          // NEW: Craft unique email report using LLM
          onLog('System', 'Crafting unique incident report via Gemini...');
          const emailReport = await this.intel.craftIncidentReport(action);
          
          // Dispatch to n8n with the unique email report
          await BridgeService.dispatchToN8N(action, emailReport);
          
          action.status = 'EXECUTED';
          onLog('Action', `Policy synced. Report dispatched to Gmail via n8n.`);
        }
      }

      this.actionHistory.push(action);
      if (this.actionHistory.length > 8) this.actionHistory.shift();
      
      onMode(AgentMode.LEARNING);
      this.learner.record(action.id, (1 - failRate) * 100);

    } catch (err) {
      const errorMsg = err.message || '';
      if (errorMsg.includes('429') || errorMsg.includes('quota')) {
        onLog('System', 'Gemini Quota Exhausted. Entering cooldown.');
        this.cooldownUntil = Date.now() + 45000;
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async manualCommit(id: string) {
    const action = this.actionHistory.find(a => a.id === id);
    if (action) {
      const success = await BridgeService.commitRoutingPolicy(
        action.decision.parameters.target, 
        action.decision.parameters.method, 
        action.decision.parameters.weight
      );
      if (success) {
        const emailReport = await this.intel.craftIncidentReport(action);
        await BridgeService.dispatchToN8N(action, emailReport);
        action.status = 'EXECUTED';
      }
      return success;
    }
    return false;
  }
}
