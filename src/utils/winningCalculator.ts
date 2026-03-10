import { zodiacs, redNumbers, blueNumbers, greenNumbers } from '../constants';
import { MultiZodiacBet } from '../types';

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

  // Check for Color, Size, Parity (Special Number only)
  if (drawNumbers[6] === '') return false;
  const specialNum = drawNumbers[6] as number;
  
  if (part === '单') return specialNum % 2 !== 0;
  if (part === '双') return specialNum % 2 === 0;
  if (part === '大') return specialNum >= 25 && specialNum <= 49;
  if (part === '小') return specialNum >= 1 && specialNum <= 24;
  
  if (part === '红') return redNumbers.includes(specialNum);
  if (part === '蓝') return blueNumbers.includes(specialNum);
  if (part === '绿') return greenNumbers.includes(specialNum);

  return false;
};

export const calculateWinAmount = (
  numberDeltas: Record<number, number> = {},
  zodiacDeltas: Record<string, number> = {},
  tailDeltas: Record<number, number> = {},
  multiZodiacDeltas: MultiZodiacBet[] = [],
  sixZodiacDeltas: MultiZodiacBet[] = [],
  fourZodiacDeltas: MultiZodiacBet[] = [],
  drawNumbers: (number | '')[]
): number | null => {
  if (!drawNumbers || drawNumbers.length < 7 || drawNumbers.some(n => n === '')) return null;

  let totalWin = 0;
  let hasWin = false;

  // 1. Special Number (特码) calculation: 47x multiplier for the 7th number
  const specialNum = drawNumbers[6] as number;
  const specialZodiac = getZodiacFromNumber(specialNum);
  // Ensure we check both numeric and string keys because JSON.parse converts numeric keys to strings
  const betAmount = numberDeltas[specialNum] || (numberDeltas as any)[specialNum.toString()];
  if (betAmount) {
    totalWin += betAmount * 47;
    hasWin = true;
  }

  // 2. Flat Zodiac (平肖) calculation: 2x multiplier (1.8x for Horse) if in any of the 7 numbers
  const winningZodiacs = Array.from(new Set(drawNumbers.map(n => getZodiacFromNumber(n)).filter(Boolean)));
  Object.entries(zodiacDeltas).forEach(([z, amt]) => {
    if (winningZodiacs.includes(z)) {
      const multiplier = z === '马' ? 1.8 : 2;
      totalWin += amt * multiplier;
      hasWin = true;
    }
  });

  // 3. Flat Tail (平尾) calculation: 2x for tail 0, 1.8x for tails 1-9
  const winningTails = Array.from(new Set(drawNumbers.map(n => (n === '' ? -1 : n % 10)).filter(t => t !== -1)));
  Object.entries(tailDeltas).forEach(([tailStr, amt]) => {
    const tail = parseInt(tailStr);
    if (winningTails.includes(tail)) {
      const multiplier = tail === 0 ? 2 : 1.8;
      totalWin += amt * multiplier;
      hasWin = true;
    }
  });

  // 4. Multi-Zodiac (连肖) calculation
  // 2连肖: 4x (Horse: 3.5x)
  // 3连肖: 10x (Horse: 9x)
  // 4连肖: 30x (Horse: 28x)
  // 5连肖: 100x (Horse: 85x)
  multiZodiacDeltas.forEach(bet => {
    const allPresent = bet.zodiacs.every(z => winningZodiacs.includes(z));
    if (allPresent) {
      const count = bet.zodiacs.length;
      const hasHorse = bet.zodiacs.includes('马');
      let multiplier = 0;
      
      if (count === 2) multiplier = hasHorse ? 3.5 : 4;
      else if (count === 3) multiplier = hasHorse ? 9 : 10;
      else if (count === 4) multiplier = hasHorse ? 28 : 30;
      else if (count >= 5) multiplier = hasHorse ? 85 : 100;
      
      if (multiplier > 0) {
        totalWin += bet.amount * multiplier;
        hasWin = true;
      }
    }
  });

  // 5. Six-Zodiac (六中/六肖) calculation: 1.9x multiplier if special zodiac is in the set
  if (sixZodiacDeltas) {
    sixZodiacDeltas.forEach(bet => {
      if (bet.zodiacs.includes(specialZodiac)) {
        totalWin += bet.amount * 1.9;
        hasWin = true;
      }
    });
  }

  // 6. Four-Zodiac (四中/四肖) calculation: 2.8x multiplier if special zodiac is in the set
  if (fourZodiacDeltas) {
    fourZodiacDeltas.forEach(bet => {
      if (bet.zodiacs.includes(specialZodiac)) {
        totalWin += bet.amount * 2.8;
        hasWin = true;
      }
    });
  }

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
