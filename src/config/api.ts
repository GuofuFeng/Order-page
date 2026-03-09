export const API_CONFIG = {
  // This key is used to unlock "Paid Tier" features.
  // It can be configured in the platform's Settings menu via VITE_PROJECT_PAID_TIER_KEY.
  PAID_TIER_KEY: import.meta.env.VITE_PROJECT_PAID_TIER_KEY || '',
  
  // Gemini API Key for AI features
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
};

export type PaidTier = 'FREE' | 'PAID';
