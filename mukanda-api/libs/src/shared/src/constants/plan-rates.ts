// libs/shared/src/constants/rate-limits.ts
export const PLAN_RATE_LIMITS: Record<string, { ttl: number; limit: number }> = {
  FREE:       { ttl: 60000, limit: 10  },
  BASIC:      { ttl: 60000, limit: 30  },
  PRO:        { ttl: 60000, limit: 60  },
  BUSINESS:   { ttl: 60000, limit: 120 },
  ENTERPRISE: { ttl: 60000, limit: 500 },
};