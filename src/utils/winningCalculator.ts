import { zodiacs } from '../constants';

export const getZodiacFromNumber = (num: number | '') => {
  if (num === '' || num < 1 || num > 49) return '';
  const index = (num - 1) % 12;
  return zodiacs[index];
};

export const formatNumber = (num: number | string) => {
  const n = typeof num === 'string' ? parseInt(num) : num;
  if (isNaN(n)) return num.toString();
  return n < 10 ? `0${n}` : n.toString();
};

export interface WinningContext {
  drawNumbers: (number | '')[];
  isLocked: boolean;
}

export const checkIsWinner = (part: string, context: WinningContext): boolean => {
  const { drawNumbers, isLocked } = context;
  if (!isLocked || !drawNumbers || drawNumbers.length === 0) return false;

  // Check if it's a number (01-49)
  if (/^\d{1,2}$/.test(part)) {
    const n = parseInt(part);
    // Special Number rule: only the 7th number (index 6) counts for "Special Number Area"
    // However, the user said "在特码区下注的所有号码，都是在下注对应彩种中的第七个号码"
    // So for highlighting, we highlight if it matches the 7th number.
    return drawNumbers[6] === n;
  }

  // Check if it's a zodiac
  if (zodiacs.includes(part)) {
    // Flat Zodiac rule: wins if it appears in any of the 7 numbers
    const winningZodiacs = drawNumbers.map(n => getZodiacFromNumber(n)).filter(Boolean);
    return winningZodiacs.includes(part);
  }

  return false;
};

export const calculateWinAmount = (
  numberDeltas: Record<number, number> = {},
  zodiacDeltas: Record<string, number> = {},
  drawNumbers: (number | '')[]
): number | null => {
  if (!drawNumbers || drawNumbers.length < 7 || drawNumbers.some(n => n === '')) return null;

  let totalWin = 0;
  let hasWin = false;

  // 1. Special Number (特码) calculation: 47x multiplier for the 7th number
  const specialNum = drawNumbers[6] as number;
  // Ensure we check both numeric and string keys because JSON.parse converts numeric keys to strings
  const betAmount = numberDeltas[specialNum] || (numberDeltas as any)[specialNum.toString()];
  if (betAmount) {
    totalWin += betAmount * 47;
    hasWin = true;
  }

  // 2. Flat Zodiac (平肖) calculation: 2x multiplier (1.8x for Horse) if in any of the 7 numbers
  const winningZodiacs = drawNumbers.map(n => getZodiacFromNumber(n)).filter(Boolean);
  Object.entries(zodiacDeltas).forEach(([z, amt]) => {
    if (winningZodiacs.includes(z)) {
      const multiplier = z === '马' ? 1.8 : 2;
      totalWin += amt * multiplier;
      hasWin = true;
    }
  });

  return hasWin ? totalWin : 0;
};

/**
 * Future-proofing: Add more complex winning rules here.
 * For example: checkSpecialNumberOnly, checkNormalNumbersOnly, etc.
 */
export const checkIsSpecialWinner = (part: string, context: WinningContext): boolean => {
  const { drawNumbers, isLocked } = context;
  if (!isLocked || !drawNumbers || drawNumbers[6] === '') return false;
  
  const specialNum = drawNumbers[6];
  if (/^\d{1,2}$/.test(part)) {
    return parseInt(part) === specialNum;
  }
  
  if (zodiacs.includes(part)) {
    return getZodiacFromNumber(specialNum) === part;
  }
  
  return false;
};
