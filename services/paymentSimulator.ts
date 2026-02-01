
import { PaymentTransaction, PaymentStatus, ErrorCode } from '../types';
import { ISSUERS, METHODS } from '../constants';

class PaymentSimulator {
  private chaosLevel: number = 0;
  private targetedIssuer: string | null = null;
  private driftFactor: number = 0.02; // Background noise

  constructor() {
    // Randomly induce background drift every 30 seconds
    setInterval(() => {
      if (Math.random() > 0.7) {
        this.driftFactor = Math.random() * 0.15;
        console.log(`[Simulator] Background drift adjusted to ${this.driftFactor.toFixed(2)}`);
      }
    }, 30000);
  }

  setChaos(level: number, issuer: string | null = null) {
    this.chaosLevel = level;
    this.targetedIssuer = issuer;
  }

  generateTransaction(): PaymentTransaction {
    const issuer = (this.targetedIssuer && Math.random() < 0.8) 
      ? this.targetedIssuer 
      : ISSUERS[Math.floor(Math.random() * ISSUERS.length)];
    
    const isTargeted = issuer === this.targetedIssuer;
    
    // Failure is now a combination of background noise + specific chaos
    const baseProb = this.driftFactor + (isTargeted ? this.chaosLevel * 0.5 : 0.02);
    const isFailed = Math.random() < baseProb;
    
    let latency = Math.random() * 400 + 150;
    let retries = 0;
    let errorCode: ErrorCode = 'NONE';

    if (isFailed) {
      // Deterministic symptoms based on probability brackets (simulating system states)
      const roll = Math.random();
      if (roll > 0.7) {
        latency = 4500 + Math.random() * 2000;
        errorCode = 'BANK_DOWNTIME';
      } else if (roll > 0.4) {
        retries = Math.floor(Math.random() * 3) + 1;
        errorCode = 'ISSUER_THROTTLING';
      } else {
        latency = 1500 + Math.random() * 1000;
        errorCode = 'NETWORK_LATENCY';
      }
    }

    return {
      id: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      timestamp: Date.now(),
      amount: Math.floor(Math.random() * 10000) + 10,
      method: METHODS[Math.floor(Math.random() * METHODS.length)] as any,
      issuer: issuer as any,
      status: isFailed ? 'FAILED' : 'SUCCESS',
      errorCode,
      latency,
      retries
    };
  }
}

export const simulator = new PaymentSimulator();
