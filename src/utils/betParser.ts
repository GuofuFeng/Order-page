import { chineseNumberMap, zodiacs, redNumbers, blueNumbers, greenNumbers, numbers } from '../constants';

export const chineseToNumber = (chStr: string): number => {
  if (!isNaN(Number(chStr))) return Number(chStr);
  
  let total = 0;
  let temp = 0;
  let lastUnit = 1;
  
  for (let i = 0; i < chStr.length; i++) {
    const char = chStr[i];
    const val = chineseNumberMap[char];
    
    if (val === undefined) continue;
    
    if (val >= 10) {
      if (temp === 0) temp = 1;
      if (val > lastUnit) {
        total = (total + temp) * val;
        temp = 0;
      } else {
        total += temp * val;
        temp = 0;
      }
      lastUnit = val;
    } else {
      temp = val;
    }
  }
  return total + temp;
};

export interface MultiZodiacBet {
  zodiacs: string[];
  amount: number;
}

export interface ParsedInput {
  selectedNumbers: Set<number>;
  parsedBets: Record<number, number>;
  parsedZodiacBets: Record<string, number>;
  parsedTailBets: Record<number, number>;
  parsedMultiZodiacBets: MultiZodiacBet[];
  parsedSixZodiacBets: MultiZodiacBet[];
  parsedFourZodiacBets: MultiZodiacBet[];
  lastAmount: number | '';
  anyPatternFound: boolean;
}

export const parseBetInput = (inputText: string): ParsedInput => {
  if (!inputText.trim()) {
    return {
      selectedNumbers: new Set(),
      parsedBets: {},
      parsedZodiacBets: {},
      parsedTailBets: {},
      parsedMultiZodiacBets: [],
      parsedSixZodiacBets: [],
      parsedFourZodiacBets: [],
      lastAmount: '',
      anyPatternFound: false
    };
  }

  const processedText = inputText.replace(/免/g, '兔');
  const newSelected = new Set<number>();
  const newParsedBets: Record<number, number> = {};
  const newParsedZodiacBets: Record<string, number> = {};
  const newParsedTailBets: Record<number, number> = {};
  const newParsedMultiZodiacBets: MultiZodiacBet[] = [];
  const newParsedSixZodiacBets: MultiZodiacBet[] = [];
  const newParsedFourZodiacBets: MultiZodiacBet[] = [];
  let lastAmount: number | '' = '';
  let anyPatternFound = false;

  // 0. "六中/六肖" Pattern
  // Matches "六中马蛇龙牛鼠狗1000" or "六肖马蛇龙牛鼠狗1000" or "6中马蛇龙牛鼠狗1000"
  const regexSixZodiac = /(?:^|[\s,，])(?:六中|六肖|6中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{6})(?:各)?(\d+|[一二三四五六七八九十百千万]+)/g;
  let match;
  while ((match = regexSixZodiac.exec(processedText)) !== null) {
    const zodiacNamesStr = match[1];
    const amtStr = match[2];
    const parsedAmt = chineseToNumber(amtStr);
    
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      const zodiacsInBet: string[] = [];
      for (const char of zodiacNamesStr) {
        if (zodiacs.includes(char)) {
          zodiacsInBet.push(char);
        }
      }
      
      // Check for unique zodiacs
      const uniqueZodiacs = Array.from(new Set(zodiacsInBet));
      if (uniqueZodiacs.length === 6) {
        anyPatternFound = true;
        newParsedSixZodiacBets.push({
          zodiacs: uniqueZodiacs,
          amount: parsedAmt
        });
        lastAmount = parsedAmt;
      }
    }
  }

  // 0.5 "四中/四肖" Pattern
  // Matches "四中马蛇龙牛1000" or "四肖马蛇龙牛1000" or "4中马蛇龙牛1000"
  const regexFourZodiac = /(?:^|[\s,，])(?:四中|四肖|4中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{4})(?:各)?(\d+|[一二三四五六七八九十百千万]+)/g;
  while ((match = regexFourZodiac.exec(processedText)) !== null) {
    const zodiacNamesStr = match[1];
    const amtStr = match[2];
    const parsedAmt = chineseToNumber(amtStr);
    
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      const zodiacsInBet: string[] = [];
      for (const char of zodiacNamesStr) {
        if (zodiacs.includes(char)) {
          zodiacsInBet.push(char);
        }
      }
      
      // Check for unique zodiacs
      const uniqueZodiacs = Array.from(new Set(zodiacsInBet));
      if (uniqueZodiacs.length === 4) {
        anyPatternFound = true;
        newParsedFourZodiacBets.push({
          zodiacs: uniqueZodiacs,
          amount: parsedAmt
        });
        lastAmount = parsedAmt;
      }
    }
  }

  // 1. "连肖" Pattern (Multi-Zodiac)
  // Matches "连肖虎狗马100" or "3肖虎狗马50" or "三连肖虎狗马50" or "虎狗马连肖50"
  // REQUIRED keyword: 连肖 or 肖
  const regexMultiZodiac = /(?:^|[\s,，])(?:(?:([二三四五])?连肖|([2345])肖)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{2,5})(?:连肖)?(?:各)?(\d+|[一二三四五六七八九十百千万]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊]{2,5})(?:连肖)(\d+|[一二三四五六七八九十百千万]+))/g;
  while ((match = regexMultiZodiac.exec(processedText)) !== null) {
    const zodiacNamesStr = match[3] || match[5];
    const amtStr = match[4] || match[6];
    const parsedAmt = chineseToNumber(amtStr);
    
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      const zodiacsInBet: string[] = [];
      for (const char of zodiacNamesStr) {
        if (zodiacs.includes(char)) {
          zodiacsInBet.push(char);
        }
      }
      
      // Check for unique zodiacs
      const uniqueZodiacs = Array.from(new Set(zodiacsInBet));
      if (uniqueZodiacs.length >= 2 && uniqueZodiacs.length === zodiacsInBet.length) {
        anyPatternFound = true;
        newParsedMultiZodiacBets.push({
          zodiacs: uniqueZodiacs,
          amount: parsedAmt
        });
        lastAmount = parsedAmt;
      }
    }
  }

  // 2. "各" Pattern (Special Number)
  // Handles "01.02.03各10" or "鼠牛各20" or "单双各50"
  // Exclude keywords: 平, 连, 中, 肖 to avoid overlapping with other patterns
  // Must start at beginning or after a separator to avoid matching "平鼠牛各20" partially
  const regexEach = /(?:^|[\s,，])([^各\n平连中肖]+)各(?:号)?(?:[\s\W\u4e00-\u9fa5]*?)(\d+|[一二三四五六七八九十百千万]+)/g;

  while ((match = regexEach.exec(processedText)) !== null) {
    anyPatternFound = true;
    const prefix = match[1];
    // Skip if it looks like a Flat Zodiac bet
    if (prefix.includes('平')) continue;
    
    const amtStr = match[2];
    const parsedAmt = chineseToNumber(amtStr);
    const currentNums: number[] = [];

    // Handle Zodiacs
    for (const char of prefix) {
      const zIdx = zodiacs.indexOf(char);
      if (zIdx !== -1) {
        for (let i = zIdx + 1; i <= 49; i += 12) {
          currentNums.push(i);
        }
      }
    }

    // Handle Odd/Even
    if (prefix.includes('单')) {
      numbers.filter(n => n % 2 !== 0).forEach(n => currentNums.push(n));
    }
    if (prefix.includes('双')) {
      numbers.filter(n => n % 2 === 0).forEach(n => currentNums.push(n));
    }

    // Handle Colors
    if (prefix.includes('红')) {
      redNumbers.forEach(n => currentNums.push(n));
    }
    if (prefix.includes('绿')) {
      greenNumbers.forEach(n => currentNums.push(n));
    }
    if (prefix.includes('蓝')) {
      blueNumbers.forEach(n => currentNums.push(n));
    }

    // Handle direct numbers
    const numMatches = prefix.match(/\d+/g);
    if (numMatches) {
      numMatches.forEach(nStr => {
        const n = parseInt(nStr);
        if (!isNaN(n) && n >= 1 && n <= 49) currentNums.push(n);
      });
    }

    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      lastAmount = parsedAmt;
      currentNums.forEach(n => {
        newSelected.add(n);
        newParsedBets[n] = (newParsedBets[n] || 0) + parsedAmt;
      });
    }
  }

  // 2. "包" Pattern (Special Number)
  const regexBao = /([马蛇龙兔虎牛鼠猪狗鸡猴羊])包(\d+|[一二三四五六七八九十百千万]+)|包(?:[\s\W\u4e00-\u9fa5]*?)([马蛇龙兔虎牛鼠猪狗鸡猴羊])(\d+|[一二三四五六七八九十百千万]+)/g;
  while ((match = regexBao.exec(processedText)) !== null) {
    anyPatternFound = true;
    const zodiacName = match[1] || match[3];
    const amtStr = match[2] || match[4];
    const totalAmt = chineseToNumber(amtStr);
    
    if (!isNaN(totalAmt) && totalAmt > 0) {
      const zodiacIdx = zodiacs.indexOf(zodiacName);
      const zodiacNums: number[] = [];
      for (let i = zodiacIdx + 1; i <= 49; i += 12) {
        zodiacNums.push(i);
      }
      
      const perNumAmt = Math.floor(totalAmt / zodiacNums.length);
      zodiacNums.forEach(n => {
        newSelected.add(n);
        newParsedBets[n] = (newParsedBets[n] || 0) + perNumAmt;
      });
      lastAmount = perNumAmt;
    }
  }

  // 3. "平" Pattern (Flat Zodiac)
  // Must explicitly contain 平 or 平肖
  const regexPingMulti = /(?:平肖|平)([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)(?:各)?(\d+|[一二三四五六七八九十百千万]+)/g;
  while ((match = regexPingMulti.exec(processedText)) !== null) {
    anyPatternFound = true;
    const zodiacNames = match[1];
    const amtStr = match[2];
    const parsedAmt = chineseToNumber(amtStr);
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      for (const zName of zodiacNames) {
        if (zodiacs.includes(zName)) {
          newParsedZodiacBets[zName] = (newParsedZodiacBets[zName] || 0) + parsedAmt;
        }
      }
    }
  }

  const regexPingSingle = /(?:平肖|平)([马蛇龙兔虎牛鼠猪狗鸡猴羊])(\d+|[一二三四五六七八九十百千万]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊])平(\d+|[一二三四五六七八九十百千万]+)/g;
  while ((match = regexPingSingle.exec(processedText)) !== null) {
    anyPatternFound = true;
    const zodiacName = match[1] || match[3];
    const amtStr = match[2] || match[4];
    const parsedAmt = chineseToNumber(amtStr);
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      newParsedZodiacBets[zodiacName] = (newParsedZodiacBets[zodiacName] || 0) + parsedAmt;
    }
  }

  // 4. "平尾" Pattern (Flat Tail)
  const regexTail = /(?:平)?(\d)尾(\d+|[一二三四五六七八九十百千万]+)/g;
  while ((match = regexTail.exec(processedText)) !== null) {
    anyPatternFound = true;
    const tailDigit = parseInt(match[1]);
    const amtStr = match[2];
    const parsedAmt = chineseToNumber(amtStr);
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      newParsedTailBets[tailDigit] = (newParsedTailBets[tailDigit] || 0) + parsedAmt;
    }
  }

  return {
    selectedNumbers: newSelected,
    parsedBets: newParsedBets,
    parsedZodiacBets: newParsedZodiacBets,
    parsedTailBets: newParsedTailBets,
    parsedMultiZodiacBets: newParsedMultiZodiacBets,
    parsedSixZodiacBets: newParsedSixZodiacBets,
    parsedFourZodiacBets: newParsedFourZodiacBets,
    lastAmount,
    anyPatternFound
  };
};
