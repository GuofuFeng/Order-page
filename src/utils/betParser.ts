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
  parsedFiveZodiacBets: MultiZodiacBet[];
  parsedFourZodiacBets: MultiZodiacBet[];
  lastAmount: number | '';
  anyPatternFound: boolean;
}

// Export regexes for UI highlighting
export const REGEX_SIX_ZODIAC = /(?:^|[\s,，])(?:六中|六肖|6中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{6})(?:各)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_FIVE_ZODIAC = /(?:^|[\s,，])(?:五中|5中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{5})(?:各)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_FOUR_ZODIAC = /(?:^|[\s,，])(?:四中|4中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{4})(?:各)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_MULTI_ZODIAC = /(?:^|[\s,，])(?:(?:([二三四五2345])?连肖|([二三四五2345])肖)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{2,5})(?:连肖)?(?:各)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊]{2,5})(?:连肖)(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+))/g;
export const REGEX_EACH = /(?:^|[\s,，])([^各\n平连中肖包]+)各(?:号)?(?:[\s\W\u4e00-\u9fa5]*?)(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_GENERIC = /(?:^|[\s,，])([马蛇龙兔虎牛鼠猪狗鸡猴羊\d\.\s,，]*?(?:大|小|单|双|红|绿|蓝)+[马蛇龙兔虎牛鼠猪狗鸡猴羊\d\.\s,，]*?)(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?=$|[\s,，])/g;
export const REGEX_BAO = /(?:^|[\s,，])(?:([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)包|包([马蛇龙兔虎牛鼠猪狗鸡猴羊]+))(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_PING = /(?:^|[\s,，])(?:(?:平肖|平)([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)平)(?:各)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_TAIL = /(?:^|[\s,，])(?:平)?(\d)尾(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;

export const parseBetInput = (inputText: string): ParsedInput => {
  if (!inputText.trim()) {
    return {
      selectedNumbers: new Set(),
      parsedBets: {},
      parsedZodiacBets: {},
      parsedTailBets: {},
      parsedMultiZodiacBets: [],
      parsedSixZodiacBets: [],
      parsedFiveZodiacBets: [],
      parsedFourZodiacBets: [],
      lastAmount: '',
      anyPatternFound: false
    };
  }

  // Pre-processing: handle synonyms and common typos
  let processedText = inputText.replace(/免/g, '兔');
  processedText = processedText.replace(/兰/g, '蓝');
  processedText = processedText.replace(/[蓝红绿]波/g, (m) => m[0]);
  processedText = processedText.replace(/[买压个]/g, '各');
  processedText = processedText.replace(/小号/g, '小');
  processedText = processedText.replace(/大号/g, '大');
  
  const newSelected = new Set<number>();
  const newParsedBets: Record<number, number> = {};
  const newParsedZodiacBets: Record<string, number> = {};
  const newParsedTailBets: Record<number, number> = {};
  const newParsedMultiZodiacBets: MultiZodiacBet[] = [];
  const newParsedSixZodiacBets: MultiZodiacBet[] = [];
  const newParsedFiveZodiacBets: MultiZodiacBet[] = [];
  const newParsedFourZodiacBets: MultiZodiacBet[] = [];
  let lastAmount: number | '' = '';
  let anyPatternFound = false;

  // Helper to parse a prefix (zodiacs, numbers, colors, filters) with intersection logic
  const parsePrefix = (prefix: string): number[] => {
    let baseNums: number[] = [];
    let hasZodiac = false;
    let hasNumbers = false;
    let hasColor = false;
    
    // 1. Collect base sets (Zodiacs, Numbers, Colors) - these are UNIONed
    // Zodiacs
    for (const char of prefix) {
      const zIdx = zodiacs.indexOf(char);
      if (zIdx !== -1) {
        hasZodiac = true;
        for (let i = zIdx + 1; i <= 49; i += 12) {
          baseNums.push(i);
        }
      }
    }
    
    // Direct numbers (exclude numbers followed by "尾")
    const numMatches = prefix.replace(/\d+尾/g, '').match(/\d+/g);
    if (numMatches) {
      hasNumbers = true;
      numMatches.forEach(nStr => {
        const n = parseInt(nStr);
        if (!isNaN(n) && n >= 1 && n <= 49) baseNums.push(n);
      });
    }
    
    // Colors
    if (prefix.includes('红')) {
      hasColor = true;
      redNumbers.forEach(n => baseNums.push(n));
    }
    if (prefix.includes('绿')) {
      hasColor = true;
      greenNumbers.forEach(n => baseNums.push(n));
    }
    if (prefix.includes('蓝')) {
      hasColor = true;
      blueNumbers.forEach(n => baseNums.push(n));
    }
    
    // If no base set yet, start with all numbers
    if (!hasZodiac && !hasNumbers && !hasColor) {
      baseNums = [...numbers];
    }
    // Note: We don't deduplicate baseNums here to support repeated numbers in input
    
    // 2. Apply filters (Intersection)
    // If multiple filters of same type are present, they are UNIONed first
    let filterNums = [...baseNums];
    
    if (prefix.includes('单') || prefix.includes('双')) {
      filterNums = filterNums.filter(n => {
        const isOdd = n % 2 !== 0;
        const isEven = n % 2 === 0;
        return (prefix.includes('单') && isOdd) || (prefix.includes('双') && isEven);
      });
    }
    
    if (prefix.includes('大') || prefix.includes('小')) {
      filterNums = filterNums.filter(n => {
        const isBig = n >= 25 && n <= 49;
        const isSmall = n >= 1 && n <= 24;
        return (prefix.includes('大') && isBig) || (prefix.includes('小') && isSmall);
      });
    }

    // Handle Tails in prefix (e.g. "12尾")
    const tailMatch = prefix.match(/(\d+)尾/);
    if (tailMatch) {
      const tails = tailMatch[1].split('').map(Number);
      filterNums = filterNums.filter(n => tails.includes(n % 10));
    }
    
    return filterNums;
  };

  // 0. "六中/六肖" Pattern
  let match;
  while ((match = REGEX_SIX_ZODIAC.exec(processedText)) !== null) {
    const zodiacNamesStr = match[1];
    const amtStr = match[2];
    const parsedAmt = chineseToNumber(amtStr);
    
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      const zodiacsInBet: string[] = [];
      for (const char of zodiacNamesStr) {
        if (zodiacs.includes(char)) zodiacsInBet.push(char);
      }
      const uniqueZodiacs = Array.from(new Set(zodiacsInBet));
      if (uniqueZodiacs.length === 6) {
        anyPatternFound = true;
        newParsedSixZodiacBets.push({ zodiacs: uniqueZodiacs, amount: parsedAmt });
        lastAmount = parsedAmt;
      }
    }
  }

  // 0.25 "五中" Pattern
  while ((match = REGEX_FIVE_ZODIAC.exec(processedText)) !== null) {
    const zodiacNamesStr = match[1];
    const amtStr = match[2];
    const parsedAmt = chineseToNumber(amtStr);
    
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      const zodiacsInBet: string[] = [];
      for (const char of zodiacNamesStr) {
        if (zodiacs.includes(char)) zodiacsInBet.push(char);
      }
      const uniqueZodiacs = Array.from(new Set(zodiacsInBet));
      if (uniqueZodiacs.length === 5) {
        anyPatternFound = true;
        newParsedFiveZodiacBets.push({ zodiacs: uniqueZodiacs, amount: parsedAmt });
        lastAmount = parsedAmt;
      }
    }
  }

  // 0.5 "四中" Pattern
  while ((match = REGEX_FOUR_ZODIAC.exec(processedText)) !== null) {
    const zodiacNamesStr = match[1];
    const amtStr = match[2];
    const parsedAmt = chineseToNumber(amtStr);
    
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      const zodiacsInBet: string[] = [];
      for (const char of zodiacNamesStr) {
        if (zodiacs.includes(char)) zodiacsInBet.push(char);
      }
      const uniqueZodiacs = Array.from(new Set(zodiacsInBet));
      if (uniqueZodiacs.length === 4) {
        anyPatternFound = true;
        newParsedFourZodiacBets.push({ zodiacs: uniqueZodiacs, amount: parsedAmt });
        lastAmount = parsedAmt;
      }
    }
  }

  // 1. "连肖" Pattern (Multi-Zodiac)
  // Updated to support Chinese digits for the count and optional count
  while ((match = REGEX_MULTI_ZODIAC.exec(processedText)) !== null) {
    const zodiacNamesStr = match[3] || match[5];
    const amtStr = match[4] || match[6];
    const parsedAmt = chineseToNumber(amtStr);
    
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      const zodiacsInBet: string[] = [];
      for (const char of zodiacNamesStr) {
        if (zodiacs.includes(char)) zodiacsInBet.push(char);
      }
      const uniqueZodiacs = Array.from(new Set(zodiacsInBet));
      if (uniqueZodiacs.length >= 2 && uniqueZodiacs.length === zodiacsInBet.length) {
        anyPatternFound = true;
        newParsedMultiZodiacBets.push({ zodiacs: uniqueZodiacs, amount: parsedAmt });
        lastAmount = parsedAmt;
      }
    }
  }

  // 2. "各" Pattern (Special Number) - handles synonyms via pre-processing
  while ((match = REGEX_EACH.exec(processedText)) !== null) {
    anyPatternFound = true;
    const prefix = match[1];
    const amtStr = match[2];
    const parsedAmt = chineseToNumber(amtStr);
    
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      const currentNums = parsePrefix(prefix);
      lastAmount = parsedAmt;
      currentNums.forEach(n => {
        newSelected.add(n);
        newParsedBets[n] = (newParsedBets[n] || 0) + parsedAmt;
      });
    }
  }

  // 2.5 Generic Pattern (No "各") - handles "马猴狗小100" or "蓝小100"
  // Run this after other patterns to avoid stealing their matches
  while ((match = REGEX_GENERIC.exec(processedText)) !== null) {
    const prefix = match[1];
    const amtStr = match[2];
    
    // Skip if it contains keywords of other patterns
    if (/[平连中肖包]/.test(prefix)) continue;
    
    const parsedAmt = chineseToNumber(amtStr);
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      const currentNums = parsePrefix(prefix);
      if (currentNums.length > 0) {
        anyPatternFound = true;
        lastAmount = parsedAmt;
        currentNums.forEach(n => {
          newSelected.add(n);
          newParsedBets[n] = (newParsedBets[n] || 0) + parsedAmt;
        });
      }
    }
  }

  // 3. "包" Pattern (Special Number) - updated for multiple zodiacs
  while ((match = REGEX_BAO.exec(processedText)) !== null) {
    anyPatternFound = true;
    const zodiacNames = match[1] || match[2];
    const amtStr = match[3];
    const perZodiacAmt = chineseToNumber(amtStr);
    
    if (!isNaN(perZodiacAmt) && perZodiacAmt > 0) {
      for (const char of zodiacNames) {
        const zodiacIdx = zodiacs.indexOf(char);
        if (zodiacIdx !== -1) {
          const zodiacNums: number[] = [];
          for (let i = zodiacIdx + 1; i <= 49; i += 12) {
            zodiacNums.push(i);
          }
          
          if (zodiacNums.length > 0) {
            const perNumAmt = Math.floor(perZodiacAmt / zodiacNums.length);
            zodiacNums.forEach(n => {
              newSelected.add(n);
              newParsedBets[n] = (newParsedBets[n] || 0) + perNumAmt;
            });
            lastAmount = perNumAmt;
          }
        }
      }
    }
  }

  // 4. "平" Pattern (Flat Zodiac) - merged to avoid doubling
  while ((match = REGEX_PING.exec(processedText)) !== null) {
    anyPatternFound = true;
    const zodiacNames = match[1] || match[2];
    const amtStr = match[3];
    const parsedAmt = chineseToNumber(amtStr);
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      for (const zName of zodiacNames) {
        if (zodiacs.includes(zName)) {
          newParsedZodiacBets[zName] = (newParsedZodiacBets[zName] || 0) + parsedAmt;
        }
      }
      lastAmount = parsedAmt;
    }
  }

  // 5. "平尾" Pattern (Flat Tail)
  while ((match = REGEX_TAIL.exec(processedText)) !== null) {
    anyPatternFound = true;
    const tailDigit = parseInt(match[1]);
    const amtStr = match[2];
    const parsedAmt = chineseToNumber(amtStr);
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      newParsedTailBets[tailDigit] = (newParsedTailBets[tailDigit] || 0) + parsedAmt;
      lastAmount = parsedAmt;
    }
  }

  return {
    selectedNumbers: newSelected,
    parsedBets: newParsedBets,
    parsedZodiacBets: newParsedZodiacBets,
    parsedTailBets: newParsedTailBets,
    parsedMultiZodiacBets: newParsedMultiZodiacBets,
    parsedSixZodiacBets: newParsedSixZodiacBets,
    parsedFiveZodiacBets: newParsedFiveZodiacBets,
    parsedFourZodiacBets: newParsedFourZodiacBets,
    lastAmount,
    anyPatternFound
  };
};
