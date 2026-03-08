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

export interface ParsedInput {
  selectedNumbers: Set<number>;
  parsedBets: Record<number, number>;
  parsedZodiacBets: Record<string, number>;
  lastAmount: number | '';
  anyPatternFound: boolean;
}

export const parseBetInput = (inputText: string): ParsedInput => {
  if (!inputText.trim()) {
    return {
      selectedNumbers: new Set(),
      parsedBets: {},
      parsedZodiacBets: {},
      lastAmount: '',
      anyPatternFound: false
    };
  }

  const processedText = inputText.replace(/免/g, '兔');
  const newSelected = new Set<number>();
  const newParsedBets: Record<number, number> = {};
  const newParsedZodiacBets: Record<string, number> = {};
  let lastAmount: number | '' = '';
  let anyPatternFound = false;

  // 1. "各" Pattern (Special Number)
  // Should NOT start with 平 or 平肖 to avoid overlapping with Flat Zodiac
  // Now also handles "单/双/红/绿/蓝"
  const regexEach = /([^各\n平]+)各(?:号)?(?:[\s\W\u4e00-\u9fa5]*?)(\d+|[一二三四五六七八九十百千万]+)/g;
  let match;

  while ((match = regexEach.exec(processedText)) !== null) {
    anyPatternFound = true;
    const prefix = match[1];
    // Skip if it looks like a Flat Zodiac bet
    if (prefix.includes('平')) continue;
    
    const amtStr = match[2];
    const parsedAmt = chineseToNumber(amtStr);
    const currentNums: number[] = [];

    // Handle Zodiacs
    zodiacs.forEach((z, idx) => {
      if (prefix.includes(z)) {
        for (let i = idx + 1; i <= 49; i += 12) {
          currentNums.push(i);
        }
      }
    });

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
      // Deduplicate numbers
      const uniqueNums = Array.from(new Set(currentNums));
      uniqueNums.forEach(n => {
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

  return {
    selectedNumbers: newSelected,
    parsedBets: newParsedBets,
    parsedZodiacBets: newParsedZodiacBets,
    lastAmount,
    anyPatternFound
  };
};
