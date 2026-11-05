/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Storage key definitions
export const STORAGE_KEYS = {
  DRAW_NUMBERS: 'drawNumbers',
  CONFIRMED_BETS: 'confirmedBets',
  // ALL_PENDING_BETS is now dynamic per user - use getStorageKey('ALL_PENDING_BETS', userId)
  ALL_PENDING_BETS: 'allPendingBets', // Legacy fallback
  LOTTERY_PRESETS: 'lotteryPresets',
  SELECTED_BASKET_ID: 'selectedBasketId',
  PAGE: 'page',
  SCROLL_POSITIONS: 'scrollPositions',
  IS_DRAW_LOCKED: 'isDrawLocked',
  SELECTED_LOTTERY_TYPE: 'selectedLotteryType',
  IS_LOTTERY_TYPE_LOCKED: 'isLotteryTypeLocked',
  SPECIAL_MULTIPLIERS: 'specialMultipliers',
  COMMISSION_RATE: 'commissionRate',
  BASKET_PRESETS: 'basketPresets'
};

/**
 * Generate user-specific storage key
 * @param key - Base storage key
 * @param userId - User ID (null for guest/logged-out state)
 */
export function getStorageKey(key: string, userId: number | null): string {
  if (key === STORAGE_KEYS.ALL_PENDING_BETS && userId !== null) {
    return `allPendingBets:${userId}`;
  }
  return key;
}

// Load from localStorage with a fallback default value
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored !== null ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Save to localStorage
export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage save error:', err);
  }
}
