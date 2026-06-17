import {
  numbers as configNumbers,
  zodiacs as configZodiacs,
  lotteryTypes as configLotteryTypes,
  chineseNumberMap as configChineseNumberMap,
  redNumbers as configRedNumbers,
  blueNumbers as configBlueNumbers,
  greenNumbers as configGreenNumbers,
  domesticZodiacs as configDomesticZodiacs,
  wildZodiacs as configWildZodiacs,
  maleZodiacs as configMaleZodiacs,
  femaleZodiacs as configFemaleZodiacs,
  heavenZodiacs as configHeavenZodiacs,
  earthZodiacs as configEarthZodiacs,
  luckyZodiacs as configLuckyZodiacs,
  unluckyZodiacs as configUnluckyZodiacs,
  fiveElements as configFiveElements,
} from './config/bettingRules';

export { YEAR_MAIN_ZODIAC, zodiacNumbers, MULTIPLIERS } from './config/bettingRules';

export const numbers = configNumbers;
export const zodiacs = configZodiacs;
export const lotteryTypes = configLotteryTypes;
export const chineseNumberMap = configChineseNumberMap;
export const redNumbers = configRedNumbers;
export const blueNumbers = configBlueNumbers;
export const greenNumbers = configGreenNumbers;
export const domesticZodiacs = configDomesticZodiacs;
export const wildZodiacs = configWildZodiacs;
export const maleZodiacs = configMaleZodiacs;
export const femaleZodiacs = configFemaleZodiacs;
export const heavenZodiacs = configHeavenZodiacs;
export const earthZodiacs = configEarthZodiacs;
export const luckyZodiacs = configLuckyZodiacs;
export const unluckyZodiacs = configUnluckyZodiacs;
export const fiveElements = configFiveElements;

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

export const getFiveElement = (num: number): string => {
  for (const [element, numbers] of Object.entries(fiveElements)) {
    if (numbers.includes(num)) return element;
  }
  return '';
};
