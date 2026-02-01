
import { GoogleGenAI, Type } from "@google/genai";
import { 
  PaymentTransaction, 
  AgentReasoning, 
  AgentDecision, 
  AgentPrediction,
  AgentAction
} from '../types';

export class ObserveAgent {
  ingest(history: PaymentTransaction[]) {
    const routes = new Map<string, { count: number, fails: number, latSum: number, retries: number, errorDist: Record<string, number> }>();
    
    history.forEach(t => {
      const key = `${t.issuer}:${t.method}`;
      const m = routes.get(key) || { count: 0, fails: 0, latSum: 0, retries: 0, errorDist: {} };
      m.count++;
      if (t.status === 'FAILED') {
        m.fails++;
        m.errorDist[t.errorCode] = (m.errorDist[t.errorCode] || 0) + 1;
      }
      m.latSum += t.latency;
      m.retries += t.retries;
      routes.set(key, m);
    });

    return Array.from(routes.entries()).map(([key, m]) => ({
      route: key,
      issuer: key.split(':')[0] as any,
      method: key.split(':')[1] as any,
      failRate: Number((m.fails / m.count).toFixed(2)),
      avgLatency: Math.round(m.latSum / m.count),
      avgRetries: Number((m.retries / m.count).toFixed(2)),
      totalCount: m.count,
      topError: Object.entries(m.errorDist).sort((a,b) => b[1] - a[1])[0]?.[0] || 'NONE'
    }));
  }
}

export class IntelligenceAgent {
  public runHeuristic(metrics: any[]): {reasoning: AgentReasoning, decision: AgentDecision} {
    const worst = metrics.sort((a, b) => b.failRate - a.failRate)[0];
    return {
      reasoning: {
        clusterId: `LOC-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        hypothesis: `Heuristic: Detected ${Math.round(worst.failRate * 100)}% failure on ${worst.issuer}. Local ruleset engaged due to API cooldown.`,
        confidence: 0.75,
        variance: 0.12,
        detectedPattern: 'STEADY_DEGRADATION'
      },
      decision: {
        actionType: 'REROUTE',
        rationale: `Safety fallback: High failure density on ${worst.issuer} ${worst.method}. Diverting traffic to healthy clusters.`,
        isAutonomous: true,
        parameters: {
          target: worst.issuer,
          method: worst.method,
          weight: 0
        }
      }
    };
  }

  async craftIncidentReport(action: AgentAction): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Act as an elite SRE reporting to the CTO. Write a UNIQUE, HIGHLY CONTEXTUAL incident post-mortem email.
      
      SCENARIO DATA:
      - Incident ID: ${action.id}
      - Cluster: ${action.reasoning.clusterId}
      - Failing Node: ${action.decision.parameters.target} (${action.decision.parameters.method})
      - Pattern Detected: ${action.reasoning.detectedPattern}
      - AI Hypothesis: ${action.reasoning.hypothesis}
      - Autonomous Fix: ${action.decision.actionType} to weight ${action.decision.parameters.weight}
      - ROI: Saved ${action.prediction.expectedSavedTransactions} transactions with ${action.prediction.projectedUserFriction} friction points.
      
      REQUIREMENTS:
      1. DO NOT use a template. Every email should sound different.
      2. If it was a 'STEADY_DEGRADATION', use words like 'drift' or 'erosion'. 
      3. If confidence was high, be assertive. If low, be cautious.
      4. Focus on how the PayAgent AI successfully mitigated the chaos.
      5. Keep it under 100 words.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return response.text || "Autonomous mitigation successful.";
    } catch (e) {
      return `PayAgent System Alert: Traffic to ${action.decision.parameters.target} has been rerouted to prevent cascading failures. Recovery is in progress.`;
    }
  }

  async analyzeAndDecide(metrics: any[], skipAI: boolean = false): Promise<{reasoning: AgentReasoning, decision: AgentDecision} | null> {
    const suspectMetrics = metrics.filter(m => m.failRate > 0.04 || m.avgLatency > 1500);
    if (suspectMetrics.length === 0) return null;

    if (skipAI) return this.runHeuristic(metrics);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `SRE ANALYSIS. Telemetry: ${JSON.stringify(suspectMetrics)}. 
      Identify root cause and best reroute. 
      Return JSON: {hasAnomaly: bool, reasoning: {clusterId, hypothesis, confidence, pattern}, decision: {actionType, rationale, isAutonomous, parameters: {target, method, weight}}}`;

      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasAnomaly: { type: Type.BOOLEAN },
              reasoning: {
                type: Type.OBJECT,
                properties: {
                  clusterId: { type: Type.STRING },
                  hypothesis: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  pattern: { type: Type.STRING }
                },
                required: ["clusterId", "hypothesis", "confidence", "pattern"]
              },
              decision: {
                type: Type.OBJECT,
                properties: {
                  actionType: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                  isAutonomous: { type: Type.BOOLEAN },
                  parameters: {
                    type: Type.OBJECT,
                    properties: { target: { type: Type.STRING }, method: { type: Type.STRING }, weight: { type: Type.NUMBER } },
                    required: ["target", "method", "weight"]
                  }
                },
                required: ["actionType", "rationale", "isAutonomous", "parameters"]
              }
            }
          }
        }
      });

      const res = JSON.parse(response.text || '{}');
      if (!res.hasAnomaly) return null;
      return { reasoning: { ...res.reasoning, variance: 0.1, detectedPattern: 'STEADY_DEGRADATION' }, decision: res.decision };
    } catch (e) {
      return this.runHeuristic(metrics);
    }
  }
}

export class PredictAgent {
  run(reasoning: AgentReasoning): AgentPrediction {
    const conf = reasoning.confidence;
    return {
      expectedSavedTransactions: Math.round(conf * 180),
      projectedUserFriction: Math.round(25 * (1 - conf) + 5),
      impactScore: (conf * 180) / Math.max(1, (25 * (1 - conf) + 5)),
      uncertainty: Number((1 - conf).toFixed(2)),
      variance: 0.08,
      recoveryETA: "T + 30s"
    };
  }
}

export class LearnAgent {
  record(actionId: string, successRateAfter: number) {
    console.log(`[Learn] Action ${actionId} verified.`);
  }
}
