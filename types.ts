
export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING';
export type ErrorCode = 'BANK_DOWNTIME' | 'ISSUER_THROTTLING' | 'NETWORK_LATENCY' | 'INSUFFICIENT_FUNDS' | 'NONE';

export interface PaymentTransaction {
  id: string;
  timestamp: number;
  amount: number;
  method: 'UPI' | 'CARD' | 'NETBANKING';
  issuer: 'HDFC' | 'ICICI' | 'SBI' | 'AXIS';
  status: PaymentStatus;
  errorCode: ErrorCode;
  latency: number;
  retries: number;
}

export interface AgentReasoning {
  clusterId: string;
  hypothesis: string;
  confidence: number;
  variance: number;
  detectedPattern: 'OUTLIER_CLUSTER' | 'STEADY_DEGRADATION' | 'NOISE';
}

export interface AgentPrediction {
  expectedSavedTransactions: number;
  projectedUserFriction: number;
  impactScore: number;
  uncertainty: number; // Probabilistic variance
  variance: number;    // Statistical spread
  recoveryETA: string;
}

export interface AgentDecision {
  actionType: 'REROUTE' | 'ADJUST_RETRY' | 'THROTTLE' | 'NONE';
  parameters: {
    target: string;
    method: string;
    weight: number;
  };
  rationale: string;
  isAutonomous: boolean;
}

export interface AgentAction {
  id: string;
  timestamp: number;
  decision: AgentDecision;
  prediction: AgentPrediction;
  reasoning: AgentReasoning;
  status: 'EXECUTED' | 'FAILED' | 'DRAFT';
}

export enum AgentMode {
  IDLE = 'IDLE',
  CONSUMING = 'CONSUMING_KAFKA',
  REASONING = 'REASONING',
  PREDICTING = 'PREDICTING',
  DECIDING = 'DECIDING',
  ACTING = 'COMMITTING_POLICY',
  LEARNING = 'LEARNING'
}
