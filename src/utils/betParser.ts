import { chineseNumberMap, zodiacs, redNumbers, blueNumbers, greenNumbers, numbers, lotteryTypes, domesticZodiacs, wildZodiacs, isSumOdd, isSumEven } from '../constants';
import { MultiZodiacBet, NotInBet } from '../types';

function getCombinations<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  function backtrack(start: number, path: T[]) {
    if (path.length === size) {
      result.push([...path]);
      return;
    }
    for (let i = start; i < array.length; i++) {
      path.push(array[i]);
      backtrack(i + 1, path);
      path.pop();
    }
  }
  backtrack(0, []);
  return result;
}

export const chineseToNumber = (chStr: string): number => {
  const cleanStr = chStr.replace(/[^\d零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]/g, '');
  if (!isNaN(Number(cleanStr)) && cleanStr !== '') return Number(cleanStr);
  
  let total = 0;
  let temp = 0;
  let lastUnit = 1;
  
  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
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
  parsedFlatBets: Record<number, number>;
  parsedZodiacBets: Record<string, number>;
  parsedTailBets: Record<number, number>;
  parsedMultiZodiacBets: MultiZodiacBet[];
  parsedSixZodiacBets: MultiZodiacBet[];
  parsedFiveZodiacBets: MultiZodiacBet[];
  parsedFourZodiacBets: MultiZodiacBet[];
  parsedMultiTailBets: MultiZodiacBet[];
  parsedNotInBets: NotInBet[];
  recognizedLotteryType?: string;
  lastAmount: number | '';
  anyPatternFound: boolean;
  errors: string[];
}

// Export regexes for UI highlighting
export const REGEX_SIX_ZODIAC = /(?:^|[\s,，])(?:六中|六肖|6中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{6})(?:各|买|压|个)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_FIVE_ZODIAC = /(?:^|[\s,，])(?:五中|5中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{5})(?:各|买|压|个)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_FOUR_ZODIAC = /(?:^|[\s,，])(?:四中|4中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{4})(?:各|买|压|个)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_MULTI_ZODIAC = /(?:^|[\s,，])(?:平特)?(?:(?:([二三四五2345])?(?:连肖|连)|([二三四五2345])肖)(?:[\(\)（）]?([马蛇龙兔虎牛鼠猪狗鸡猴羊]{2,12})[\(\)（）]?)(?:连肖|连)?(?:各|买|压|个)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)|(?:[\(\)（）]?([马蛇龙兔虎牛鼠猪狗鸡猴羊]{2,12})[\(\)（）]?)(?:连肖|连)(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+))/g;
export const REGEX_MULTI_ZODIAC_ADVANCED = /(?:^|[\s,，])(?:平特)?(?:([二三四五2345两])?连肖|([二三四五2345两])肖)([\s\S]+?)(?=$|[\s,，](?:[二三四五2345两]?(?:连肖|连尾|不中|中)|平|包|各|买|压))/g;
export const REGEX_MULTI_ZODIAC_V2 = /(?:^|[\s,，])([马蛇龙兔虎牛鼠猪狗鸡猴羊]{2,12})(复试|复式)?([二三四五2345])(?:连肖|连)(?:各组)?(?:各|买|压|个)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_NOT_IN = /(?:^|[\s,，])([五六七八九十]{1,2}|5|6|7|8|9|10|11|12)不中[:：]?([\s\S]+?)(?:买|包|各|各号|下单)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?=$|[\s,，])/g;
export const REGEX_EACH = /(?:^|[\s,，])([^各买压个\n平连中包不]+)(?:各|买|压|个)(?:号)?(?:[\s\W\u4e00-\u9fa5]*?)(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_GENERIC = /(?:^|[\s,，])([马蛇龙兔虎牛鼠猪狗鸡猴羊合家野肖\d\.\s,，]*?(?:大|小|单|双|红|绿|蓝|家|野|合单|合双)+[马蛇龙兔虎牛鼠猪狗鸡猴羊合家野肖\d\.\s,，]*?)(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?=$|[\s,，])/g;
export const REGEX_BAO = /(?:^|[\s,，])(?:([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)包|包([马蛇龙兔虎牛鼠猪狗鸡猴羊]+))(?:各|买|压|个)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_PING = /(?:^|[\s,，])(?:(?:平特一肖|平特肖|平特|平肖|平)([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)(?:平特一肖|平特肖|平特|平肖|平))(?:各|买|压|个)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_TAIL = /(?:^|[\s,，])(?:平特|平)?(\d+)尾(?:各|买|压|个)?(\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_MULTI_TAIL_ADVANCED = /(?:^|[\s,，])(?:([二三四五2345两])?连尾|([二三四五2345两])尾)([\s\S]+?)(?=$|[\s,，](?:[二三四五2345两]?(?:连肖|连尾|不中|中)|平|包|各|买|压))/g;
export const REGEX_MULTI_TAIL_V2 = /(?:^|[\s,，])(?:【?(\d{2,10})】?)(?:各|买|压|个|包)?([二三四五2345两])连尾(?:各|买|压|个|包)?(\+?\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_MULTI_TAIL_V3 = /(?:^|[\s,，])(?:([二三四五2345两])?连尾|([二三四五2345两])尾)(?:[\-\s,，]*?(\d)尾[\-\s,，]*?(\d)尾[\-\s,，]*?(\d)尾(?:[\-\s,，]*?(\d)尾)?(?:[\-\s,，]*?(\d)尾)?)(?:各|买|压|个|包)?(\+?\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/g;
export const REGEX_FLAT_NUMBER = /(?:^|[\s,，])(?:(\d+)平码(\d+)|平码(\d+)-(\d+)|平码([\d\.\s,，]+)各(\d+)|平码(\d+)各(\d+))/g;
export const REGEX_INVALID_NUMBERS = /\d{3,}|[5-9]\d/g;

export const parseBetInput = (inputText: string): ParsedInput => {
  // Reset all global regexes lastIndex to 0
  [
    REGEX_SIX_ZODIAC, REGEX_FIVE_ZODIAC, REGEX_FOUR_ZODIAC,
    REGEX_MULTI_ZODIAC, REGEX_MULTI_ZODIAC_ADVANCED, REGEX_MULTI_ZODIAC_V2,
    REGEX_NOT_IN, REGEX_EACH, REGEX_GENERIC, REGEX_BAO, REGEX_PING, REGEX_TAIL,
    REGEX_MULTI_TAIL_ADVANCED, REGEX_MULTI_TAIL_V2, REGEX_MULTI_TAIL_V3, REGEX_FLAT_NUMBER
  ].forEach(re => { if (re) re.lastIndex = 0; });

  if (!inputText.trim()) {
    return {
      selectedNumbers: new Set(),
      parsedBets: {},
      parsedFlatBets: {},
      parsedZodiacBets: {},
      parsedTailBets: {},
      parsedMultiZodiacBets: [],
      parsedSixZodiacBets: [],
      parsedFiveZodiacBets: [],
      parsedFourZodiacBets: [],
      parsedMultiTailBets: [],
      parsedNotInBets: [],
      recognizedLotteryType: undefined,
      lastAmount: '',
      anyPatternFound: false,
      errors: []
    };
  }

  // Pre-processing: handle synonyms and common typos
  let processedText = inputText.replace(/免/g, '兔');
  processedText = processedText.replace(/兰/g, '蓝');
  processedText = processedText.replace(/[蓝红绿]波/g, (m) => m[0]);
  processedText = processedText.replace(/[买压个]/g, '各');
  processedText = processedText.replace(/小号/g, '小');
  processedText = processedText.replace(/大号/g, '大');
  processedText = processedText.replace(/号/g, '');
  processedText = processedText.replace(/万[和合]/g, '越南');
  processedText = processedText.replace(/(\d+)文/g, '$1');
  
  // Lottery type synonyms
  processedText = processedText.replace(/奥大/g, '澳大');
  processedText = processedText.replace(/新[cC][cC]/g, 'cc');
  processedText = processedText.replace(/CC/g, 'cc');
  
  const newSelected = new Set<number>();
  const newParsedBets: Record<number, number> = {};
  const newParsedFlatBets: Record<number, number> = {};
  const newParsedZodiacBets: Record<string, number> = {};
  const newParsedTailBets: Record<number, number> = {};
  const newParsedMultiZodiacBets: MultiZodiacBet[] = [];
  const newParsedSixZodiacBets: MultiZodiacBet[] = [];
  const newParsedFiveZodiacBets: MultiZodiacBet[] = [];
  const newParsedFourZodiacBets: MultiZodiacBet[] = [];
  const newParsedMultiTailBets: MultiZodiacBet[] = [];
  const newParsedNotInBets: NotInBet[] = [];
  const errors: string[] = [];
  let recognizedLotteryType: string | undefined = undefined;
  
  // Check for lottery type recognition at the beginning or within brackets
  for (const type of lotteryTypes) {
    if (processedText.includes(`【${type}】`) || processedText.startsWith(type)) {
      recognizedLotteryType = type;
      break;
    }
  }

  // Remove lottery types from text to avoid interfering with regex start anchors
  let textForPatterns = processedText;
  for (const type of lotteryTypes) {
    const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    textForPatterns = textForPatterns.replace(new RegExp(`【?${escapedType}】?`, 'g'), ' ');
  }

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

    // Domestic/Wild Zodiacs
    if (prefix.includes('家')) {
      hasZodiac = true;
      domesticZodiacs.forEach(z => {
        const zIdx = zodiacs.indexOf(z);
        for (let i = zIdx + 1; i <= 49; i += 12) baseNums.push(i);
      });
    }
    if (prefix.includes('野')) {
      hasZodiac = true;
      wildZodiacs.forEach(z => {
        const zIdx = zodiacs.indexOf(z);
        for (let i = zIdx + 1; i <= 49; i += 12) baseNums.push(i);
      });
    }
    
    // Direct numbers (exclude numbers followed by "尾" or "头")
    const numMatches = prefix.replace(/\d+[尾头]/g, '').match(/\d+/g);
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
    
    const hasOdd = prefix.includes('单') && !prefix.includes('合单');
    const hasEven = prefix.includes('双') && !prefix.includes('合双');
    
    if (hasOdd || hasEven) {
      filterNums = filterNums.filter(n => {
        const isOdd = n % 2 !== 0;
        const isEven = n % 2 === 0;
        return (hasOdd && isOdd) || (hasEven && isEven);
      });
    }
    
    if (prefix.includes('大') || prefix.includes('小')) {
      filterNums = filterNums.filter(n => {
        const isBig = n >= 25 && n <= 49;
        const isSmall = n >= 1 && n <= 24;
        return (prefix.includes('大') && isBig) || (prefix.includes('小') && isSmall);
      });
    }

    if (prefix.includes('合单') || prefix.includes('合双')) {
      filterNums = filterNums.filter(n => {
        return (prefix.includes('合单') && isSumOdd(n)) || (prefix.includes('合双') && isSumEven(n));
      });
    }

    // Handle Tails in prefix (e.g. "12尾")
    const tailMatch = prefix.match(/(\d+)尾/);
    if (tailMatch) {
      const tails = tailMatch[1].split('').map(Number);
      filterNums = filterNums.filter(n => tails.includes(n % 10));
    }

    // Handle Heads in prefix (e.g. "4头")
    const headMatch = prefix.match(/(\d+)头/);
    if (headMatch) {
      const heads = headMatch[1].split('').map(Number);
      filterNums = filterNums.filter(n => heads.includes(Math.floor(n / 10)));
    }
    
    return filterNums;
  };

  // 0. "六中/六肖" Pattern
  let match;
  while ((match = REGEX_SIX_ZODIAC.exec(textForPatterns)) !== null) {
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
  while ((match = REGEX_FIVE_ZODIAC.exec(textForPatterns)) !== null) {
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
  while ((match = REGEX_FOUR_ZODIAC.exec(textForPatterns)) !== null) {
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
  while ((match = REGEX_MULTI_ZODIAC.exec(textForPatterns)) !== null) {
    const countStr = match[1] || match[2];
    const zodiacNamesStr = match[3] || match[5];
    const amtStr = match[4] || match[6];
    const parsedAmt = chineseToNumber(amtStr);
    const count = countStr ? chineseToNumber(countStr) : 0;
    
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      const zodiacsInBet: string[] = [];
      for (const char of zodiacNamesStr) {
        if (zodiacs.includes(char)) zodiacsInBet.push(char);
      }
      const uniqueZodiacs = Array.from(new Set(zodiacsInBet));
      
      if (uniqueZodiacs.length >= 2) {
        anyPatternFound = true;
        lastAmount = parsedAmt;
        
        const actualCount = count || uniqueZodiacs.length;
        if (uniqueZodiacs.length > actualCount) {
          // Compound bet logic
          const combinations = getCombinations(uniqueZodiacs, actualCount);
          combinations.forEach(combo => {
            newParsedMultiZodiacBets.push({ zodiacs: combo, amount: parsedAmt });
          });
        } else if (uniqueZodiacs.length === actualCount) {
          newParsedMultiZodiacBets.push({ zodiacs: uniqueZodiacs, amount: parsedAmt });
        }
      }
    }
  }

  // 1.05 "连肖" Pattern Advanced (Multiple groups)
  while ((match = REGEX_MULTI_ZODIAC_ADVANCED.exec(textForPatterns)) !== null) {
    const countStr = match[1] || match[2];
    const content = match[3];
    
    // Split content by separators like commas, spaces, or "各/包" to find groups
    const groups = content.split(/[,，\s]+/);
    groups.forEach(group => {
      if (!group.trim()) return;
      
      // Try to find zodiacs and amount in this group
      // Match zodiacs (possibly in brackets/parentheses) and then an amount
      const groupMatch = group.match(/(?:[\(\)（）【】]?([马蛇龙兔虎牛鼠猪狗鸡猴羊]{2,12})[\(\)（）【】]?)(?:各|买|压|个|包)?(\+?\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/);
      if (groupMatch) {
        const zodiacNamesStr = groupMatch[1];
        const groupAmtStr = groupMatch[2];
        const parsedAmt = chineseToNumber(groupAmtStr.replace('+', ''));
        const count = countStr ? chineseToNumber(countStr) : 0;
        
        if (!isNaN(parsedAmt) && parsedAmt > 0) {
          const zodiacsInBet: string[] = [];
          for (const char of zodiacNamesStr) {
            if (zodiacs.includes(char)) zodiacsInBet.push(char);
          }
          const uniqueZodiacs = Array.from(new Set(zodiacsInBet));
          
          if (uniqueZodiacs.length >= 2) {
            anyPatternFound = true;
            lastAmount = parsedAmt;
            
            const actualCount = count || uniqueZodiacs.length;
            if (uniqueZodiacs.length > actualCount) {
              const combinations = getCombinations(uniqueZodiacs, actualCount);
              combinations.forEach(combo => {
                newParsedMultiZodiacBets.push({ zodiacs: combo, amount: parsedAmt });
              });
            } else if (uniqueZodiacs.length === actualCount) {
              newParsedMultiZodiacBets.push({ zodiacs: uniqueZodiacs, amount: parsedAmt });
            }
          }
        }
      }
    });
  }

  // 1.1 "连肖" Pattern V2 (Zodiacs + Count + Amount) e.g. "猴兔狗三连30"
  while ((match = REGEX_MULTI_ZODIAC_V2.exec(textForPatterns)) !== null) {
    const zodiacNamesStr = match[1];
    const isCompound = !!match[2];
    const countStr = match[3];
    const amtStr = match[4];
    const parsedAmt = chineseToNumber(amtStr);
    const count = chineseToNumber(countStr);
    
    if (!isNaN(parsedAmt) && parsedAmt > 0 && !isNaN(count)) {
      const zodiacsInBet: string[] = [];
      for (const char of zodiacNamesStr) {
        if (zodiacs.includes(char)) zodiacsInBet.push(char);
      }
      const uniqueZodiacs = Array.from(new Set(zodiacsInBet));
      
      if (uniqueZodiacs.length >= count) {
        anyPatternFound = true;
        lastAmount = parsedAmt;
        
        if (isCompound || uniqueZodiacs.length > count) {
          const combinations = getCombinations(uniqueZodiacs, count);
          combinations.forEach(combo => {
            newParsedMultiZodiacBets.push({ zodiacs: combo, amount: parsedAmt });
          });
        } else {
          newParsedMultiZodiacBets.push({ zodiacs: uniqueZodiacs, amount: parsedAmt });
        }
      }
    }
  }

  // 1.5 "x不中" Pattern
  while ((match = REGEX_NOT_IN.exec(textForPatterns)) !== null) {
    const xStr = match[1];
    const content = match[2];
    const amtStr = match[3];
    const parsedAmt = chineseToNumber(amtStr);
    const x = chineseToNumber(xStr);

    if (!isNaN(parsedAmt) && parsedAmt > 0 && !isNaN(x)) {
      const betNumbers: number[] = [];
      
      // Extract zodiacs
      for (const char of content) {
        const zIdx = zodiacs.indexOf(char);
        if (zIdx !== -1) {
          for (let i = zIdx + 1; i <= 49; i += 12) {
            betNumbers.push(i);
          }
        }
      }

      // Extract tails
      const tailMatches = content.match(/(\d)尾/g);
      if (tailMatches) {
        tailMatches.forEach(tm => {
          const t = parseInt(tm[0]);
          for (let i = 1; i <= 49; i++) {
            if (i % 10 === t) betNumbers.push(i);
          }
        });
      }

      // Extract direct numbers (avoiding those already matched as tails)
      const numMatches = content.replace(/\d尾/g, '').match(/\d{1,2}/g);
      if (numMatches) {
        numMatches.forEach(nm => {
          const n = parseInt(nm);
          if (n >= 1 && n <= 49) betNumbers.push(n);
        });
      }

      const uniqueNumbers = Array.from(new Set(betNumbers));
      
      if (betNumbers.length !== uniqueNumbers.length) {
        errors.push(`${x}不中号码下注重复`);
        continue;
      }

      if (uniqueNumbers.length !== x) {
        errors.push(`${x}不中玩法下注号码不足`);
        continue;
      }

      anyPatternFound = true;
      newParsedNotInBets.push({ x, numbers: uniqueNumbers, amount: parsedAmt });
      lastAmount = parsedAmt;
    }
  }

  // 2. "各" Pattern (Special Number) - handles synonyms via pre-processing
  while ((match = REGEX_EACH.exec(textForPatterns)) !== null) {
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
  while ((match = REGEX_GENERIC.exec(textForPatterns)) !== null) {
    const prefix = match[1];
    const amtStr = match[2];
    
    // Skip if it contains keywords of other patterns
    if (/[平连中包]/.test(prefix)) continue;
    
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
  while ((match = REGEX_BAO.exec(textForPatterns)) !== null) {
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
  while ((match = REGEX_PING.exec(textForPatterns)) !== null) {
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
  while ((match = REGEX_TAIL.exec(textForPatterns)) !== null) {
    anyPatternFound = true;
    const tailDigitsStr = match[1];
    const amtStr = match[2];
    const parsedAmt = chineseToNumber(amtStr);
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      for (const char of tailDigitsStr) {
        const tailDigit = parseInt(char);
        if (!isNaN(tailDigit)) {
          newParsedTailBets[tailDigit] = (newParsedTailBets[tailDigit] || 0) + parsedAmt;
        }
      }
      lastAmount = parsedAmt;
    }
  }

  // 6. "连尾" Pattern (Multi-Tail)
  const processMultiTailMatch = (match: RegExpExecArray, type: 'advanced' | 'v2' | 'v3') => {
    let countStr = '';
    let content = '';
    let amtStr = '';
    
    if (type === 'advanced') {
      countStr = match[1] || match[2];
      content = match[3];
      
      // Split content by separators like commas, spaces, or "各/包" to find groups
      // Example content: "478包20，236包10" or "【36512】5"
      const groups = content.split(/[,，\s]+/);
      groups.forEach(group => {
        if (!group.trim()) return;
        
        // Try to find digits and amount in this group
        // Match digits (possibly in brackets) and then an amount
        const groupMatch = group.match(/(?:【?(\d{2,10})】?)(?:各|买|压|个|包)?(\+?\d+|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/);
        if (groupMatch) {
          const tailDigitsStr = groupMatch[1];
          const groupAmtStr = groupMatch[2];
          const parsedAmt = chineseToNumber(groupAmtStr.replace('+', ''));
          const count = countStr ? chineseToNumber(countStr) : 0;
          
          if (!isNaN(parsedAmt) && parsedAmt > 0) {
            const tailsInBet: string[] = tailDigitsStr.split('');
            const uniqueTails = Array.from(new Set(tailsInBet)).map(Number);
            
            if (uniqueTails.length >= 2) {
              anyPatternFound = true;
              lastAmount = parsedAmt;
              
              const actualCount = count || uniqueTails.length;
              if (uniqueTails.length > actualCount) {
                const combinations = getCombinations(uniqueTails, actualCount);
                combinations.forEach(combo => {
                  newParsedMultiTailBets.push({ zodiacs: combo.map(String), amount: parsedAmt });
                });
              } else if (uniqueTails.length === actualCount) {
                newParsedMultiTailBets.push({ zodiacs: uniqueTails.map(String), amount: parsedAmt });
              }
            }
          }
        }
      });
    } else if (type === 'v2') {
      const tailDigitsStr = match[1];
      countStr = match[2];
      amtStr = match[3];
      const parsedAmt = chineseToNumber(amtStr.replace('+', ''));
      const count = countStr ? chineseToNumber(countStr) : 0;
      
      if (!isNaN(parsedAmt) && parsedAmt > 0) {
        const tailsInBet: string[] = tailDigitsStr.split('');
        const uniqueTails = Array.from(new Set(tailsInBet)).map(Number);
        if (uniqueTails.length >= 2) {
          anyPatternFound = true;
          lastAmount = parsedAmt;
          const actualCount = count || uniqueTails.length;
          if (uniqueTails.length > actualCount) {
            const combinations = getCombinations(uniqueTails, actualCount);
            combinations.forEach(combo => {
              newParsedMultiTailBets.push({ zodiacs: combo.map(String), amount: parsedAmt });
            });
          } else if (uniqueTails.length === actualCount) {
            newParsedMultiTailBets.push({ zodiacs: uniqueTails.map(String), amount: parsedAmt });
          }
        }
      }
    } else if (type === 'v3') {
      countStr = match[1] || match[2];
      const digits = [match[3], match[4], match[5], match[6], match[7]].filter(Boolean);
      const tailDigitsStr = digits.join('');
      amtStr = match[8];
      const parsedAmt = chineseToNumber(amtStr.replace('+', ''));
      const count = countStr ? chineseToNumber(countStr) : 0;
      
      if (!isNaN(parsedAmt) && parsedAmt > 0) {
        const uniqueTails = Array.from(new Set(tailDigitsStr.split(''))).map(Number);
        if (uniqueTails.length >= 2) {
          anyPatternFound = true;
          lastAmount = parsedAmt;
          const actualCount = count || uniqueTails.length;
          if (uniqueTails.length > actualCount) {
            const combinations = getCombinations(uniqueTails, actualCount);
            combinations.forEach(combo => {
              newParsedMultiTailBets.push({ zodiacs: combo.map(String), amount: parsedAmt });
            });
          } else if (uniqueTails.length === actualCount) {
            newParsedMultiTailBets.push({ zodiacs: uniqueTails.map(String), amount: parsedAmt });
          }
        }
      }
    }
  };

  while ((match = REGEX_MULTI_TAIL_ADVANCED.exec(textForPatterns)) !== null) {
    processMultiTailMatch(match, 'advanced');
  }
  while ((match = REGEX_MULTI_TAIL_V2.exec(textForPatterns)) !== null) {
    processMultiTailMatch(match, 'v2');
  }
  while ((match = REGEX_MULTI_TAIL_V3.exec(textForPatterns)) !== null) {
    processMultiTailMatch(match, 'v3');
  }

  // 7. "平码" Pattern
  while ((match = REGEX_FLAT_NUMBER.exec(textForPatterns)) !== null) {
    anyPatternFound = true;
    let nums: number[] = [];
    let amount = 0;

    if (match[1] && match[2]) { // 18平码20
      nums = [parseInt(match[1])];
      amount = chineseToNumber(match[2]);
    } else if (match[3] && match[4]) { // 平码26-100
      nums = [parseInt(match[3])];
      amount = chineseToNumber(match[4]);
    } else if (match[5] && match[6]) { // 平码20.36各10
      const numStr = match[5];
      const amtStr = match[6];
      nums = numStr.split(/[\.\s,，]+/).filter(Boolean).map(n => parseInt(n));
      amount = chineseToNumber(amtStr);
    } else if (match[7] && match[8]) { // 平码37各50
      nums = [parseInt(match[7])];
      amount = chineseToNumber(match[8]);
    }

    if (amount > 0) {
      lastAmount = amount;
      nums.forEach(n => {
        if (n >= 1 && n <= 49) {
          newParsedFlatBets[n] = (newParsedFlatBets[n] || 0) + amount;
        }
      });
    }
  }

  return {
    selectedNumbers: newSelected,
    parsedBets: newParsedBets,
    parsedFlatBets: newParsedFlatBets,
    parsedZodiacBets: newParsedZodiacBets,
    parsedTailBets: newParsedTailBets,
    parsedMultiZodiacBets: newParsedMultiZodiacBets,
    parsedSixZodiacBets: newParsedSixZodiacBets,
    parsedFiveZodiacBets: newParsedFiveZodiacBets,
    parsedFourZodiacBets: newParsedFourZodiacBets,
    parsedMultiTailBets: newParsedMultiTailBets,
    parsedNotInBets: newParsedNotInBets,
    recognizedLotteryType,
    lastAmount,
    anyPatternFound,
    errors
  };
};
