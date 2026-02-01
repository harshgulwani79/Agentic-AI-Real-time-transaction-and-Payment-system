
export const ISSUERS = ['HDFC', 'ICICI', 'SBI', 'AXIS'];
export const METHODS = ['UPI', 'CARD', 'NETBANKING'];
export const ERROR_CODES = ['BANK_DOWNTIME', 'ISSUER_THROTTLING', 'NETWORK_LATENCY', 'INSUFFICIENT_FUNDS', 'NONE'];

export const SAFEGUARDS = {
  MAX_RETRY_INCREASE: 3,
  MIN_SUCCESS_THRESHOLD: 0.65,
  AUTO_ROLLBACK_ENABLED: true,
  HUMAN_APPROVAL_REQUIRED_FOR: ['DISABLE_METHOD', 'GLOBAL_THROTTLE']
};

// Heartbeat frequency (Reduced to 15s for more responsive telemetry)
export const REFRESH_INTERVAL = 15000;
