import { zodiacs, redNumbers, blueNumbers, greenNumbers, domesticZodiacs, wildZodiacs, maleZodiacs, femaleZodiacs, heavenZodiacs, earthZodiacs, luckyZodiacs, unluckyZodiacs, fiveElements, zodiacNumbers, YEAR_MAIN_ZODIAC, MULTIPLIERS } from '../constants';
import { MultiZodiacBet, NotInBet, CombinationWinBet } from '../types';

// Pre-compute O(1) number to zodiac lookup array (indices 1-49)
const numToZodiacMap = new Array<string>(50).fill('');
Object.entries(zodiacNumbers).forEach(([zodiac, nums]) => {
  nums.forEach(num => {
    numToZodiacMap[num] = zodiac;
  });
});

export const getZodiacFromNumber = (num: number | '') => {
  if (num === '' || num < 1 || num > 49) return '';
  return numToZodiacMap[num];
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

// Helpers to extract logic and remove code duplication
const getSpecialNumberMultiplier = (
  lotteryType?: string,
  multipliers?: Record<string, number>
): number => {
  if (multipliers && lotteryType && multipliers[lotteryType] !== undefined) {
    return multipliers[lotteryType];
  }
  const highOddsTypes = ['新澳', '老澳', '香港', '老cc'];
  return lotteryType && highOddsTypes.includes(lotteryType)
    ? MULTIPLIERS.specialNumber.highOdds
    : MULTIPLIERS.specialNumber.default;
};

const getMultiZodiacMultiplier = (count: number, hasMain: boolean): number => {
  const key = Math.min(count, 5) as 2 | 3 | 4 | 5;
  const config = MULTIPLIERS.multiZodiac[key];
  if (!config) return 0;
  return hasMain ? config.main : config.others;
};

const checkSpecialAttributeWinner = (attr: string, specialNum: number): boolean => {
  if (attr === '红波') return redNumbers.includes(specialNum);
  if (attr === '蓝波') return blueNumbers.includes(specialNum);
  if (attr === '绿波') return greenNumbers.includes(specialNum);
  if (attr === '大数') return specialNum >= 25 && specialNum <= 49;
  if (attr === '小数') return specialNum >= 1 && specialNum <= 24;
  if (attr === '单数') return specialNum % 2 !== 0;
  if (attr === '双数') return specialNum % 2 === 0;
  if (attr === '红单') return redNumbers.includes(specialNum) && specialNum % 2 !== 0;
  if (attr === '红双') return redNumbers.includes(specialNum) && specialNum % 2 === 0;
  if (attr === '绿单') return greenNumbers.includes(specialNum) && specialNum % 2 !== 0;
  if (attr === '绿双') return greenNumbers.includes(specialNum) && specialNum % 2 === 0;
  if (attr === '蓝单') return blueNumbers.includes(specialNum) && specialNum % 2 !== 0;
  if (attr === '蓝双') return blueNumbers.includes(specialNum) && specialNum % 2 === 0;
  return false;
};

export const checkIsWinner = (part: string, context: WinningContext): boolean => {
  const { drawNumbers, isLocked } = context;
  if (!isLocked || !drawNumbers || drawNumbers.length === 0) return false;

  // Check if it's a number (01-49)
  if (/^\d{1,2}$/.test(part)) {
    const n = parseInt(part);
    // Special Number rule: only the 7th number (index 6) counts for "Special Number Area"
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

  const hasAttrMatch = checkSpecialAttributeWinner(part, specialNum);
  if (hasAttrMatch) return true;

  // Check for Zodiac Groups (Special Number only)
  const specialZodiac = getZodiacFromNumber(specialNum);
  if (part === '家') return domesticZodiacs.includes(specialZodiac);
  if (part === '野') return wildZodiacs.includes(specialZodiac);
  if (part === '男') return maleZodiacs.includes(specialZodiac);
  if (part === '女') return femaleZodiacs.includes(specialZodiac);
  if (part === '天') return heavenZodiacs.includes(specialZodiac);
  if (part === '地') return earthZodiacs.includes(specialZodiac);
  if (part === '吉' || part === '美') return luckyZodiacs.includes(specialZodiac);
  if (part === '凶' || part === '丑') return unluckyZodiacs.includes(specialZodiac);

  // Check for Five Elements
  if (['金', '木', '水', '火', '土'].includes(part)) {
    const nums = fiveElements[part] || [];
    return nums.includes(specialNum);
  }

  // Check for Head (头) - Special Number only
  const headMatch = part.match(/([0-4])头/);
  if (headMatch) {
    const head = parseInt(headMatch[1]);
    return Math.floor(specialNum / 10) === head;
  }

  // Check for Tail (尾) - Special Number only
  const tailMatch = part.match(/([0-9])尾/);
  if (tailMatch && !part.startsWith('平')) {
    const tail = parseInt(tailMatch[1]);
    return specialNum % 10 === tail;
  }

  return false;
};

export const calculateWinAmount = (
  numberDeltas: Record<number, number> = {},
  flatNumberDeltas: Record<number, number> = {},
  zodiacDeltas: Record<string, number> = {},
  teXiaoDeltas: Record<string, number> = {},
  tailDeltas: Record<number, number> = {},
  multiZodiacDeltas: MultiZodiacBet[] = [],
  sixZodiacDeltas: MultiZodiacBet[] = [],
  fiveZodiacDeltas: MultiZodiacBet[] = [],
  fourZodiacDeltas: MultiZodiacBet[] = [],
  multiTailDeltas: MultiZodiacBet[] = [],
  notInDeltas: NotInBet[] = [],
  combinationWinDeltas: CombinationWinBet[] = [],
  specialAttributeDeltas: Record<string, number> = {},
  drawNumbers: (number | '')[],
  lotteryType?: string,
  multipliers?: Record<string, number>
): number | null => {
  if (!drawNumbers || drawNumbers.length < 7 || drawNumbers.some(n => n === '')) return null;

  let totalWin = 0;
  let hasWin = false;

  const drawNums = drawNumbers.filter((n): n is number => typeof n === 'number');
  const normalNums = drawNums.slice(0, 6); // First 6 numbers are "平码"

  // 1. Special Number (特码) calculation
  const specialNum = drawNumbers[6] as number;
  const specialZodiac = getZodiacFromNumber(specialNum);
  // Ensure we check both numeric and string keys because JSON.parse converts numeric keys to strings
  const betAmount = numberDeltas[specialNum] || (numberDeltas as any)[specialNum.toString()];
  if (betAmount) {
    const multiplier = getSpecialNumberMultiplier(lotteryType, multipliers);
    totalWin += betAmount * multiplier;
    hasWin = true;
  }

  // 1.2 Te Xiao (特肖) calculation: using configurable multipliers
  Object.entries(teXiaoDeltas).forEach(([z, amt]) => {
    if (specialZodiac === z) {
      const multiplier = z === YEAR_MAIN_ZODIAC ? MULTIPLIERS.teXiao.main : MULTIPLIERS.teXiao.others;
      totalWin += amt * multiplier;
      hasWin = true;
    }
  });

  // 1.5 Flat Number (平码) calculation
  Object.entries(flatNumberDeltas).forEach(([numStr, amt]) => {
    const n = parseInt(numStr);
    if (normalNums.includes(n)) {
      totalWin += amt * MULTIPLIERS.flatNumber;
      hasWin = true;
    }
  });

  // 2. Flat Zodiac (平肖) calculation: using configurable multipliers
  const winningZodiacs = Array.from(new Set(drawNumbers.map(n => getZodiacFromNumber(n)).filter(Boolean)));
  Object.entries(zodiacDeltas).forEach(([z, amt]) => {
    if (winningZodiacs.includes(z)) {
      const multiplier = z === YEAR_MAIN_ZODIAC ? MULTIPLIERS.flatZodiac.main : MULTIPLIERS.flatZodiac.others;
      totalWin += amt * multiplier;
      hasWin = true;
    }
  });

  // 3. Flat Tail (平尾) calculation: using configurable multipliers
  const winningTails = Array.from(new Set(drawNumbers.map(n => (n === '' ? -1 : n % 10)).filter(t => t !== -1)));
  Object.entries(tailDeltas).forEach(([tailStr, amt]) => {
    const tail = parseInt(tailStr);
    if (winningTails.includes(tail)) {
      const multiplier = tail === 0 ? MULTIPLIERS.flatTail.tail0 : MULTIPLIERS.flatTail.otherTails;
      totalWin += amt * multiplier;
      hasWin = true;
    }
  });

  // 4. Multi-Zodiac (连肖) calculation
  multiZodiacDeltas.forEach(bet => {
    if (bet.tuoGroups && bet.tuoGroups.length > 0) {
      bet.tuoGroups.forEach(group => {
        const allPresent = group.every(z => winningZodiacs.includes(z));
        if (allPresent) {
          const count = group.length;
          const hasMain = group.includes(YEAR_MAIN_ZODIAC);
          const multiplier = getMultiZodiacMultiplier(count, hasMain);

          if (multiplier > 0) {
            totalWin += bet.amount * multiplier;
            hasWin = true;
          }
        }
      });
    } else {
      const allPresent = bet.zodiacs.every(z => winningZodiacs.includes(z));
      if (allPresent) {
        const count = bet.zodiacs.length;
        const hasMain = bet.zodiacs.includes(YEAR_MAIN_ZODIAC);
        const multiplier = getMultiZodiacMultiplier(count, hasMain);

        if (multiplier > 0) {
          totalWin += bet.amount * multiplier;
          hasWin = true;
        }
      }
    }
  });

  // 5. Six-Zodiac (六中/六肖) calculation
  if (sixZodiacDeltas) {
    sixZodiacDeltas.forEach(bet => {
      if (bet.zodiacs.includes(specialZodiac)) {
        totalWin += bet.amount * MULTIPLIERS.sixZodiac;
        hasWin = true;
      }
    });
  }

  // 5.5 Five-Zodiac (五中/五肖) calculation
  if (fiveZodiacDeltas) {
    fiveZodiacDeltas.forEach(bet => {
      if (bet.zodiacs.includes(specialZodiac)) {
        totalWin += bet.amount * MULTIPLIERS.fiveZodiac;
        hasWin = true;
      }
    });
  }

  // 6. Four-Zodiac (四中/四肖) calculation
  if (fourZodiacDeltas) {
    fourZodiacDeltas.forEach(bet => {
      if (bet.zodiacs.includes(specialZodiac)) {
        totalWin += bet.amount * MULTIPLIERS.fourZodiac;
        hasWin = true;
      }
    });
  }

  // 7. x-Not-In (x不中) calculation
  if (notInDeltas) {
    notInDeltas.forEach(bet => {
      const isWinner = bet.numbers.every(n => !drawNums.includes(n));
      if (isWinner) {
        const multiplier = MULTIPLIERS.notIn[bet.x] || 0;
        if (multiplier > 0) {
          totalWin += bet.amount * multiplier;
          hasWin = true;
        }
      }
    });
  }

  // 8. Multi-Tail (连尾) calculation
  if (multiTailDeltas) {
    multiTailDeltas.forEach(bet => {
      const betTails = bet.zodiacs.map(Number);
      const allPresent = betTails.every(t => winningTails.includes(t));
      if (allPresent) {
        const count = betTails.length;
        const multiplier = MULTIPLIERS.multiTail[count] || 0;
        if (multiplier > 0) {
          totalWin += bet.amount * multiplier;
          hasWin = true;
        }
      }
    });
  }

  // 9. Combination Win (二中二, 三中三) calculation
  if (combinationWinDeltas) {
    combinationWinDeltas.forEach(bet => {
      if (bet.tuoGroups && bet.tuoGroups.length > 0) {
        bet.tuoGroups.forEach(nums => {
          let isWinner = false;
          let multiplier = 0;

          if (bet.type === '特碰') {
            const specialNum = drawNumbers[6] as number;
            const hasSpecial = nums.includes(specialNum);
            const otherNum = nums.find(n => n !== specialNum);
            const hasNormal = otherNum !== undefined && normalNums.includes(otherNum);
            if (hasSpecial && hasNormal) {
              isWinner = true;
              multiplier = MULTIPLIERS.combinationWin['特碰'];
            }
          } else {
            const allPresent = nums.every(n => normalNums.includes(n));
            if (allPresent) {
              isWinner = true;
              multiplier = MULTIPLIERS.combinationWin[bet.type] || 0;
            }
          }

          if (isWinner && multiplier > 0) {
            totalWin += bet.amount * multiplier;
            hasWin = true;
          }
        });
      } else {
        let isWinner = false;
        let multiplier = 0;

        if (bet.type === '特碰') {
          const specialNum = drawNumbers[6] as number;
          const hasSpecial = bet.numbers.includes(specialNum);
          const otherNum = bet.numbers.find(n => n !== specialNum);
          const hasNormal = otherNum !== undefined && normalNums.includes(otherNum);
          if (hasSpecial && hasNormal) {
            isWinner = true;
            multiplier = MULTIPLIERS.combinationWin['特碰'];
          }
        } else {
          const allPresent = bet.numbers.every(n => normalNums.includes(n));
          if (allPresent) {
            isWinner = true;
            multiplier = MULTIPLIERS.combinationWin[bet.type] || 0;
          }
        }

        if (isWinner && multiplier > 0) {
          totalWin += bet.amount * multiplier;
          hasWin = true;
        }
      }
    });
  }

  // 10. Special Attribute (波色, 大小, 单双) calculation
  Object.entries(specialAttributeDeltas).forEach(([attr, amt]) => {
    const isWinner = checkSpecialAttributeWinner(attr, specialNum);
    const multiplier = MULTIPLIERS.specialAttribute[attr] || 0;

    if (isWinner && multiplier > 0) {
      totalWin += amt * multiplier;
      hasWin = true;
    }
  });

  return hasWin ? totalWin : 0;
};

export const getWinningDetails = (
  numberDeltas: Record<number, number> = {},
  flatNumberDeltas: Record<number, number> = {},
  zodiacDeltas: Record<string, number> = {},
  teXiaoDeltas: Record<string, number> = {},
  tailDeltas: Record<number, number> = {},
  multiZodiacDeltas: MultiZodiacBet[] = [],
  sixZodiacDeltas: MultiZodiacBet[] = [],
  fiveZodiacDeltas: MultiZodiacBet[] = [],
  fourZodiacDeltas: MultiZodiacBet[] = [],
  multiTailDeltas: MultiZodiacBet[] = [],
  notInDeltas: NotInBet[] = [],
  combinationWinDeltas: CombinationWinBet[] = [],
  specialAttributeDeltas: Record<string, number> = {},
  drawNumbers: (number | '')[]
): Record<string, number> => {
  if (!drawNumbers || drawNumbers.length < 7 || drawNumbers.some(n => n === '')) return {};

  const typeSums: Record<string, number> = {};
  const drawNums = drawNumbers.filter((n): n is number => typeof n === 'number');
  const normalNums = drawNums.slice(0, 6);
  const winningZodiacs = Array.from(new Set(drawNums.map(n => getZodiacFromNumber(n)).filter(Boolean)));
  const specialNum = drawNumbers[6] as number;
  const specialZodiac = getZodiacFromNumber(specialNum);
  const winningTails = Array.from(new Set(drawNums.map(n => n % 10)));

  // 1. Special Number
  const betAmount = numberDeltas[specialNum] || (numberDeltas as any)[specialNum.toString()];
  if (betAmount) {
    typeSums['特'] = (typeSums['特'] || 0) + betAmount;
  }

  // 1.2 Te Xiao
  Object.entries(teXiaoDeltas).forEach(([z, amt]) => {
    if (specialZodiac === z) {
      typeSums['特肖'] = (typeSums['特肖'] || 0) + amt;
    }
  });

  // 1.5 Flat Number
  Object.entries(flatNumberDeltas).forEach(([numStr, amt]) => {
    const n = parseInt(numStr);
    if (normalNums.includes(n)) {
      typeSums['平码'] = (typeSums['平码'] || 0) + amt;
    }
  });

  // 2. Flat Zodiac
  Object.entries(zodiacDeltas).forEach(([z, amt]) => {
    if (winningZodiacs.includes(z)) {
      const type = z === YEAR_MAIN_ZODIAC ? `平${YEAR_MAIN_ZODIAC}` : '平肖';
      typeSums[type] = (typeSums[type] || 0) + amt;
    }
  });

  // 3. Flat Tail
  Object.entries(tailDeltas).forEach(([tailStr, amt]) => {
    const tail = parseInt(tailStr);
    if (winningTails.includes(tail)) {
      const type = tail === 0 ? '平0尾' : '平尾';
      typeSums[type] = (typeSums[type] || 0) + amt;
    }
  });

  // 4. Multi-Zodiac
  multiZodiacDeltas.forEach(bet => {
    if (bet.tuoGroups && bet.tuoGroups.length > 0) {
      bet.tuoGroups.forEach(group => {
        if (group.every(z => winningZodiacs.includes(z))) {
          const hasMain = group.includes(YEAR_MAIN_ZODIAC);
          const type = hasMain ? `${group.length}肖${YEAR_MAIN_ZODIAC}` : `${group.length}肖`;
          typeSums[type] = (typeSums[type] || 0) + bet.amount;
        }
      });
    } else {
      if (bet.zodiacs.every(z => winningZodiacs.includes(z))) {
        const hasMain = bet.zodiacs.includes(YEAR_MAIN_ZODIAC);
        const type = hasMain ? `${bet.zodiacs.length}肖${YEAR_MAIN_ZODIAC}` : `${bet.zodiacs.length}肖`;
        typeSums[type] = (typeSums[type] || 0) + bet.amount;
      }
    }
  });

  // 5. Six-Zodiac
  if (sixZodiacDeltas) {
    sixZodiacDeltas.forEach(bet => {
      if (bet.zodiacs.includes(specialZodiac)) {
        typeSums['六中'] = (typeSums['六中'] || 0) + bet.amount;
      }
    });
  }

  // 5.5 Five-Zodiac
  if (fiveZodiacDeltas) {
    fiveZodiacDeltas.forEach(bet => {
      if (bet.zodiacs.includes(specialZodiac)) {
        typeSums['五中'] = (typeSums['五中'] || 0) + bet.amount;
      }
    });
  }

  // 6. Four-Zodiac
  if (fourZodiacDeltas) {
    fourZodiacDeltas.forEach(bet => {
      if (bet.zodiacs.includes(specialZodiac)) {
        typeSums['四中'] = (typeSums['四中'] || 0) + bet.amount;
      }
    });
  }

  // 7. x-Not-In
  if (notInDeltas) {
    notInDeltas.forEach(bet => {
      const isWinner = bet.numbers.every(n => !drawNums.includes(n));
      if (isWinner) {
        const type = `${bet.x}不中`;
        typeSums[type] = (typeSums[type] || 0) + bet.amount;
      }
    });
  }

  // 8. Multi-Tail
  if (multiTailDeltas) {
    multiTailDeltas.forEach(bet => {
      const betTails = bet.zodiacs.map(Number);
      if (betTails.every(t => winningTails.includes(t))) {
        const type = `${bet.zodiacs.length}连尾`;
        typeSums[type] = (typeSums[type] || 0) + bet.amount;
      }
    });
  }

  // 9. Combination Win
  if (combinationWinDeltas) {
    combinationWinDeltas.forEach(bet => {
        if (bet.tuoGroups && bet.tuoGroups.length > 0) {
          bet.tuoGroups.forEach(nums => {
            if (bet.type === '特碰') {
              const specialNum = drawNumbers[6] as number;
              const hasSpecial = nums.includes(specialNum);
              const otherNum = nums.find(n => n !== specialNum);
              const hasNormal = otherNum !== undefined && normalNums.includes(otherNum);
              if (hasSpecial && hasNormal) {
                typeSums[bet.type] = (typeSums[bet.type] || 0) + bet.amount;
              }
            } else if (nums.every(n => normalNums.includes(n))) {
              typeSums[bet.type] = (typeSums[bet.type] || 0) + bet.amount;
            }
          });
        } else {
          if (bet.type === '特碰') {
            const specialNum = drawNumbers[6] as number;
            const hasSpecial = bet.numbers.includes(specialNum);
            const otherNum = bet.numbers.find(n => n !== specialNum);
            const hasNormal = otherNum !== undefined && normalNums.includes(otherNum);
            if (hasSpecial && hasNormal) {
              typeSums[bet.type] = (typeSums[bet.type] || 0) + bet.amount;
            }
          } else if (bet.numbers.every(n => normalNums.includes(n))) {
            typeSums[bet.type] = (typeSums[bet.type] || 0) + bet.amount;
          }
        }
    });
  }

  // 10. Special Attribute
  Object.entries(specialAttributeDeltas).forEach(([attr, amt]) => {
    const isWinner = checkSpecialAttributeWinner(attr, specialNum);
    if (isWinner) {
      typeSums[attr] = (typeSums[attr] || 0) + amt;
    }
  });

  return typeSums;
};

export const getWinningBreakdown = (
  numberDeltas: Record<number, number> = {},
  flatNumberDeltas: Record<number, number> = {},
  zodiacDeltas: Record<string, number> = {},
  teXiaoDeltas: Record<string, number> = {},
  tailDeltas: Record<number, number> = {},
  multiZodiacDeltas: MultiZodiacBet[] = [],
  sixZodiacDeltas: MultiZodiacBet[] = [],
  fiveZodiacDeltas: MultiZodiacBet[] = [],
  fourZodiacDeltas: MultiZodiacBet[] = [],
  multiTailDeltas: MultiZodiacBet[] = [],
  notInDeltas: NotInBet[] = [],
  combinationWinDeltas: CombinationWinBet[] = [],
  specialAttributeDeltas: Record<string, number> = {},
  drawNumbers: (number | '')[],
  lotteryType?: string,
  multipliers?: Record<string, number>
): { type: string; amount: number; multiplier: number; win: number }[] => {
  if (!drawNumbers || drawNumbers.length < 7 || drawNumbers.some(n => n === '')) return [];

  const breakdown: { type: string; amount: number; multiplier: number; win: number }[] = [];
  const drawNums = drawNumbers.filter((n): n is number => typeof n === 'number');
  const normalNums = drawNums.slice(0, 6);
  const winningZodiacs = Array.from(new Set(drawNums.map(n => getZodiacFromNumber(n)).filter(Boolean)));
  const specialNum = drawNumbers[6] as number;
  const specialZodiac = getZodiacFromNumber(specialNum);
  const winningTails = Array.from(new Set(drawNums.map(n => n % 10)));

  // 1. Special Number
  const betAmount = numberDeltas[specialNum] || (numberDeltas as any)[specialNum.toString()];
  if (betAmount) {
    const multiplier = getSpecialNumberMultiplier(lotteryType, multipliers);
    breakdown.push({ type: '特', amount: betAmount, multiplier, win: betAmount * multiplier });
  }

  // 1.2 Te Xiao
  Object.entries(teXiaoDeltas).forEach(([z, amt]) => {
    if (specialZodiac === z) {
      const multiplier = z === YEAR_MAIN_ZODIAC ? MULTIPLIERS.teXiao.main : MULTIPLIERS.teXiao.others;
      breakdown.push({ type: '特肖', amount: amt, multiplier, win: amt * multiplier });
    }
  });

  // 1.5 Flat Number
  Object.entries(flatNumberDeltas).forEach(([numStr, amt]) => {
    const n = parseInt(numStr);
    if (normalNums.includes(n)) {
      breakdown.push({ type: '平码', amount: amt, multiplier: MULTIPLIERS.flatNumber, win: amt * MULTIPLIERS.flatNumber });
    }
  });

  // 2. Flat Zodiac
  Object.entries(zodiacDeltas).forEach(([z, amt]) => {
    if (winningZodiacs.includes(z)) {
      const multiplier = z === YEAR_MAIN_ZODIAC ? MULTIPLIERS.flatZodiac.main : MULTIPLIERS.flatZodiac.others;
      const type = z === YEAR_MAIN_ZODIAC ? `平${YEAR_MAIN_ZODIAC}` : '平肖';
      breakdown.push({ type, amount: amt, multiplier, win: amt * multiplier });
    }
  });

  // 3. Flat Tail
  Object.entries(tailDeltas).forEach(([tailStr, amt]) => {
    const tail = parseInt(tailStr);
    if (winningTails.includes(tail)) {
      const multiplier = tail === 0 ? MULTIPLIERS.flatTail.tail0 : MULTIPLIERS.flatTail.otherTails;
      const type = tail === 0 ? '平0尾' : '平尾';
      breakdown.push({ type, amount: amt, multiplier, win: amt * multiplier });
    }
  });

  // 4. Multi-Zodiac
  multiZodiacDeltas.forEach(bet => {
    if (bet.tuoGroups && bet.tuoGroups.length > 0) {
      bet.tuoGroups.forEach(group => {
        if (group.every(z => winningZodiacs.includes(z))) {
          const count = group.length;
          const hasMain = group.includes(YEAR_MAIN_ZODIAC);
          const multiplier = getMultiZodiacMultiplier(count, hasMain);

          if (multiplier > 0) {
            breakdown.push({ type: `${count}连肖`, amount: bet.amount, multiplier, win: bet.amount * multiplier });
          }
        }
      });
    } else {
      if (bet.zodiacs.every(z => winningZodiacs.includes(z))) {
        const count = bet.zodiacs.length;
        const hasMain = bet.zodiacs.includes(YEAR_MAIN_ZODIAC);
        const multiplier = getMultiZodiacMultiplier(count, hasMain);

        if (multiplier > 0) {
          breakdown.push({ type: `${count}连肖`, amount: bet.amount, multiplier, win: bet.amount * multiplier });
        }
      }
    }
  });

  // 5. Six-Zodiac
  if (sixZodiacDeltas) {
    sixZodiacDeltas.forEach(bet => {
      if (bet.zodiacs.includes(specialZodiac)) {
        breakdown.push({ type: '六中', amount: bet.amount, multiplier: MULTIPLIERS.sixZodiac, win: bet.amount * MULTIPLIERS.sixZodiac });
      }
    });
  }

  // 5.5 Five-Zodiac
  if (fiveZodiacDeltas) {
    fiveZodiacDeltas.forEach(bet => {
      if (bet.zodiacs.includes(specialZodiac)) {
        breakdown.push({ type: '五中', amount: bet.amount, multiplier: MULTIPLIERS.fiveZodiac, win: bet.amount * MULTIPLIERS.fiveZodiac });
      }
    });
  }

  // 6. Four-Zodiac
  if (fourZodiacDeltas) {
    fourZodiacDeltas.forEach(bet => {
      if (bet.zodiacs.includes(specialZodiac)) {
        breakdown.push({ type: '四中', amount: bet.amount, multiplier: MULTIPLIERS.fourZodiac, win: bet.amount * MULTIPLIERS.fourZodiac });
      }
    });
  }

  // 7. x-Not-In
  if (notInDeltas) {
    notInDeltas.forEach(bet => {
      if (bet.numbers.every(n => !drawNums.includes(n))) {
        const multiplier = MULTIPLIERS.notIn[bet.x] || 0;
        if (multiplier > 0) {
          breakdown.push({ type: `${bet.x}不中`, amount: bet.amount, multiplier, win: bet.amount * multiplier });
        }
      }
    });
  }

  // 8. Multi-Tail
  if (multiTailDeltas) {
    multiTailDeltas.forEach(bet => {
      const betTails = bet.zodiacs.map(Number);
      if (betTails.every(t => winningTails.includes(t))) {
        const count = betTails.length;
        const multiplier = MULTIPLIERS.multiTail[count] || 0;
        if (multiplier > 0) {
          breakdown.push({ type: `${count}连尾`, amount: bet.amount, multiplier, win: bet.amount * multiplier });
        }
      }
    });
  }

  // 9. Combination Win
  if (combinationWinDeltas) {
    combinationWinDeltas.forEach(bet => {
      if (bet.tuoGroups && bet.tuoGroups.length > 0) {
        bet.tuoGroups.forEach(nums => {
          if (bet.type === '特碰') {
            const hasSpecial = nums.includes(specialNum);
            const otherNum = nums.find(n => n !== specialNum);
            const hasNormal = otherNum !== undefined && normalNums.includes(otherNum);
            if (hasSpecial && hasNormal) {
              breakdown.push({ type: bet.type, amount: bet.amount, multiplier: MULTIPLIERS.combinationWin['特碰'], win: bet.amount * MULTIPLIERS.combinationWin['特碰'] });
            }
          } else if (nums.every(n => normalNums.includes(n))) {
            const multiplier = MULTIPLIERS.combinationWin[bet.type] || 0;
            breakdown.push({ type: bet.type, amount: bet.amount, multiplier, win: bet.amount * multiplier });
          }
        });
      } else {
        if (bet.type === '特碰') {
          const hasSpecial = bet.numbers.includes(specialNum);
          const otherNum = bet.numbers.find(n => n !== specialNum);
          const hasNormal = otherNum !== undefined && normalNums.includes(otherNum);
          if (hasSpecial && hasNormal) {
            breakdown.push({ type: bet.type, amount: bet.amount, multiplier: MULTIPLIERS.combinationWin['特碰'], win: bet.amount * MULTIPLIERS.combinationWin['特碰'] });
          }
        } else if (bet.numbers.every(n => normalNums.includes(n))) {
          const multiplier = MULTIPLIERS.combinationWin[bet.type] || 0;
          breakdown.push({ type: bet.type, amount: bet.amount, multiplier, win: bet.amount * multiplier });
        }
      }
    });
  }

  // 10. Special Attribute
  Object.entries(specialAttributeDeltas).forEach(([attr, amt]) => {
    const isWinner = checkSpecialAttributeWinner(attr, specialNum);
    const multiplier = MULTIPLIERS.specialAttribute[attr] || 0;

    if (isWinner && multiplier > 0) {
      breakdown.push({ type: attr, amount: amt, multiplier, win: amt * multiplier });
    }
  });

  return breakdown;
};

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
