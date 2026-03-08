export const STORAGE_KEYS = {
  CONFIRMED_BETS: 'confirmedBets',
  CUMULATIVE_AMOUNTS: 'cumulativeAmounts',
  ZODIAC_CUMULATIVE_AMOUNTS: 'zodiacCumulativeAmounts',
  DRAW_NUMBERS: 'drawNumbers',
  IS_DRAW_LOCKED: 'isDrawLocked',
  SELECTED_LOTTERY_TYPE: 'selectedLotteryType'
};

export const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving to storage: ${key}`, e);
  }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error(`Error loading from storage: ${key}`, e);
    return defaultValue;
  }
};

export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
};
