// @ts-nocheck

export const KYC_LIMITS = {
  0: {
    label: 'Unverified',
    maxDailyFiatDeposit: 0,
    maxDailyFiatWithdraw: 0,
    maxDailyCryptoWithdraw: 0,
    p2pEnabled: false,
    merchantEligible: false,
  },
  1: {
    label: 'Level 1 — Email verified',
    maxDailyFiatDeposit: 50_000, // NGN
    maxDailyFiatWithdraw: 0,
    maxDailyCryptoWithdraw: 0,
    p2pEnabled: false,
    merchantEligible: false,
  },
  2: {
    label: 'Level 2 — Identity verified',
    maxDailyFiatDeposit: 1_000_000, // NGN
    maxDailyFiatWithdraw: 500_000, // NGN
    maxDailyCryptoWithdraw: 0.2, // BTC (or define per-asset limits in future)
    p2pEnabled: true,
    merchantEligible: false,
  },
  3: {
    label: 'Level 3 — Full KYC',
    maxDailyFiatDeposit: 10_000_000, // NGN
    maxDailyFiatWithdraw: 5_000_000, // NGN
    maxDailyCryptoWithdraw: 1, // BTC
    p2pEnabled: true,
    merchantEligible: true,
  },
};

// Helper to get limits safely
export const getKycLimitsForUser = user => {
  const level = user.kycLevel || 0;
  return KYC_LIMITS[level] || KYC_LIMITS[0];
};
