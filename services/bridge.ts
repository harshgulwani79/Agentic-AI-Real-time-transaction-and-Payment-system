
import { AgentAction, PaymentTransaction } from '../types';

export class BridgeService {
  private static N8N_WEBHOOK = 'https://arpitad2020.app.n8n.cloud/webhook-test/payagent-ops';
  private static API_BASE = 'http://localhost:8000/api';

  static async getChaosStatus(): Promise<{bank: string | null, active: boolean, level: number}> {
    try {
      const resp = await fetch(`${this.API_BASE}/chaos_status`);
      if (!resp.ok) throw new Error();
      return await resp.json();
    } catch (e) {
      return { bank: null, active: false, level: 0 };
    }
  }

  static async commitRoutingPolicy(bank: string, method: string, weight: number): Promise<boolean> {
    try {
      const resp = await fetch(`${this.API_BASE}/routing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank, method, new_weight: weight })
      });
      return resp.ok;
    } catch (e) {
      console.warn("[Bridge] Could not reach main.py. Ensure uvicorn is running on port 8000.");
      return true; 
    }
  }

  static async dispatchToN8N(action: AgentAction, emailReport?: string): Promise<boolean> {
    const payload = {
      cluster_id: action.reasoning.clusterId,
      affected_pairs: [{ bank: action.decision.parameters.target, method: action.decision.parameters.method }],
      action: action.decision.actionType,
      expected_saved_txns: action.prediction.expectedSavedTransactions,
      user_friction: action.prediction.projectedUserFriction,
      confidence: action.reasoning.confidence,
      timestamp: new Date(action.timestamp).toISOString(),
      email_report: emailReport || "Default incident summary: Route rerouted autonomously."
    };

    try {
      const resp = await fetch(this.N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return resp.ok;
    } catch (e) {
      console.error("[N8N] Webhook failed", e);
      return false;
    }
  }
}
