export {
  YEAR_MAIN_ZODIAC,
  zodiacNumbers,
  MULTIPLIERS,
  numbers,
  zodiacs,
  lotteryTypes,
  chineseNumberMap,
  redNumbers,
  blueNumbers,
  greenNumbers,
  domesticZodiacs,
  wildZodiacs,
  maleZodiacs,
  femaleZodiacs,
  heavenZodiacs,
  earthZodiacs,
  luckyZodiacs,
  unluckyZodiacs,
  fiveElements,
} from './config/bettingRules';

export const isSumOdd = (n: number) => {
  const tens = Math.floor(n / 10);
  const units = n % 10;
  return (tens + units) % 2 !== 0;
};

export const isSumEven = (n: number) => {
  const tens = Math.floor(n / 10);
  const units = n % 10;
  return (tens + units) % 2 === 0;
};

import { fiveElements } from './config/bettingRules';

export const getFiveElement = (num: number): string => {
  for (const [element, numbers] of Object.entries(fiveElements)) {
    if (numbers.includes(num)) return element;
  }
  return '';
};
