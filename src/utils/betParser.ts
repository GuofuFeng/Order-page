import { chineseNumberMap, zodiacs, redNumbers, blueNumbers, greenNumbers, numbers, lotteryTypes, domesticZodiacs, wildZodiacs, isSumOdd, isSumEven } from '../constants';
import { MultiZodiacBet, NotInBet } from '../types';
import { getZodiacFromNumber } from './winningCalculator';

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
  const cleanStr = chStr.replace(/[^\d.零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]/g, '');
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

export interface ParsedSegment {
  lotteryType: string;
  originalInput: string;
  parsed: ParsedInput;
}

// Regular Expressions
// We use a prefix that allows start of string, whitespace, punctuation, or Chinese characters (lottery types)
const PREFIX = '(?:^|[\\s,，。；;.:：\\u4e00-\\u9fa5])';

export const REGEX_SIX_ZODIAC = new RegExp(`${PREFIX}(?:六中|6中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{6})(?:各|买|压|个)?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?`, 'g');
export const REGEX_FIVE_ZODIAC = new RegExp(`${PREFIX}(?:五中|5中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{5})(?:各|买|压|个)?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?`, 'g');
export const REGEX_FOUR_ZODIAC = new RegExp(`${PREFIX}(?:四中|4中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{4})(?:各|买|压|个)?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?`, 'g');

export const REGEX_MULTI_ZODIAC = new RegExp(`${PREFIX}([马蛇龙兔虎牛鼠猪狗鸡猴羊\\s,，。；;.:：]+?)(?:连肖|连)\\s*(?:各|买|压|个)?\\s*(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?`, 'g');
export const REGEX_MULTI_ZODIAC_ADVANCED = new RegExp(`${PREFIX}(?:平特)?\\s*(?:([二三四五2345两])(?:连肖|连)|([二三四五2345两])肖|(?<![二三四五2345两])(连肖|连))\\s*([\\s\\S]+?)(?=$|[\\s,，。；;.:：.．!！?？\\n](?:[二三四五2345两]?(?:连肖|连|连尾|不中|中)|平|包|不中|特码|正码|合计|计|总计|共|总)|[\\s,，。；;.:：.．!！?？\\n])`, 'g');
export const REGEX_MULTI_ZODIAC_V2 = new RegExp(`${PREFIX}([马蛇龙兔虎牛鼠猪狗鸡猴羊\\s,，。；;.:：]+?)(复试|复式)?\\s*([二三四五2345两])(?:连肖|连)\\s*(?:各组)?\\s*(?:各|买|压|个)?\\s*(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?`, 'g');

export const REGEX_NOT_IN = new RegExp(`${PREFIX}([五六七八九十]{1,2}|5|6|7|8|9|10|11|12)不中[，,：:]?\\s*([\\d\\s\\+\\-\\.,，。；;.:：]+?)\\s*(?:买|包|各|各号|下单)\\s*(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?(?=$|[\\s,，。；;.:：.．!！?？\\n](?:[二三四五2345两]?(?:连肖|连|连尾|不中|中)|平|包|不中|特码|正码|合计|计|总计|共|总)|[\\s,，。；;.:：.．!！?？\\n])`, 'g');

// Refined REGEX_EACH: Ensure it doesn't match if "不中" is present in the prefix or nearby
export const REGEX_EACH = new RegExp(`${PREFIX}([\\d\\W\\u4e00-\\u9fa5]+?)(?:各|买|压|个)(?:号)?([\\d\\W\\u4e00-\\u9fa5]*?)(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?`, 'g');
export const REGEX_GENERIC = new RegExp(`${PREFIX}([\\d\\W\\u4e00-\\u9fa5]*?(?:大|小|单|双|红|绿|蓝|家|野|合单|合双|尾|头)+[\\d\\W\\u4e00-\\u9fa5]*?)(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?(?=$|[\\s,，。；;.:：.．!！?？\\n](?:[二三四五2345两]?(?:连肖|连|连尾|不中|中)|平|包|不中|特码|正码|合计|计|总计|共|总)|[\\s,，。；;.:：.．!！?？\\n])`, 'g');

export const REGEX_BAO = new RegExp(`${PREFIX}(?:([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)包|包([马蛇龙兔虎牛鼠猪狗鸡猴羊]+))\\s*(?:各|买|压|个)?\\s*(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?`, 'g');
export const REGEX_PING = new RegExp(`${PREFIX}(?:(?:平特一肖|平特肖|平特|平肖|平)[:：]?([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)[:：]?(?:平特一肖|平特肖|平特|平肖|平))\\s*(?:各|买|压|个)?\\s*(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?`, 'g');
export const REGEX_TAIL = new RegExp(`${PREFIX}(?:平特|平|特码|特)?([\\d\\W\\u4e00-\\u9fa5]+?)尾\\s*(?:各|买|压|个)?\\s*(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?`, 'g');

export const REGEX_MULTI_TAIL_ADVANCED = new RegExp(`${PREFIX}(?:([二三四五2345两])?连尾|([二三四五2345两])尾)\\s*([\\s\\S]+?)(?=$|[\\s,，。；;.:：.．!！?？\\n](?:[二三四五2345两]?(?:连肖|连|连尾|不中|中)|平|包|不中|特码|正码|合计|计|总计|共|总)|[\\s,，。；;.:：.．!！?？\\n])`, 'g');
export const REGEX_MULTI_TAIL_V2 = new RegExp(`${PREFIX}(?:【?(\\d{2,10})】?)(?:各|买|压|个|包)?([二三四五2345两])连尾(?:各|买|压|个|包)?(\\+?\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?`, 'g');
export const REGEX_MULTI_TAIL_V3 = new RegExp(`${PREFIX}(?:([二三四五2345两])?连尾|([二三四五2345两])尾)(?:[\\-\\s,，。；;.:：]*?(\\d)尾[\\-\\s,，。；;.:：]*?(\\d)尾[\\-\\s,，。；;.:：]*?(\\d)尾(?:[\\-\\s,，。；;.:：]*?(\\d)尾)?(?:[\\-\\s,，。；;.:：]*?(\\d)尾)?)(?:各|买|压|个|包)?(\\+?\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块)?`, 'g');

export const REGEX_FLAT_NUMBER = new RegExp(`${PREFIX}(?:(\\d+)平码(\\d+(?:\\.\\d+)?)|平码(\\d+)-(\\d+(?:\\.\\d+)?)|平码([\\d\\.\\s,，。；;.:：]+)各(\\d+(?:\\.\\d+)?)|平码(\\d+)各(\\d+(?:\\.\\d+)?))`, 'g');

export const REGEX_INVALID_NUMBERS = /\d{3,}|[5-9]\d/g;

export const normalizeLotteryTypes = (text: string): string => {
  let processedText = text;
  processedText = processedText.replace(/奥大/g, '澳大');
  processedText = processedText.replace(/新cc/g, 'cc');
  processedText = processedText.replace(/老cc/g, '老cc');
  processedText = processedText.replace(/新澳/g, '新澳');
  processedText = processedText.replace(/老澳/g, '老澳');
  // Handle shorthands and typos
  processedText = processedText.replace(/香港/g, '香港'); // Keep original
  processedText = processedText.replace(/香(?!港)/g, '香港');
  processedText = processedText.replace(/(?<!香)港/g, '香港');
  processedText = processedText.replace(/万合/g, '万和');
  return processedText;
};

export const parseBetInput = (inputText: string): ParsedInput => {
  const result: ParsedInput = {
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
    lastAmount: '',
    anyPatternFound: false,
    errors: []
  };

  if (!inputText.trim()) return result;
  
  const normalized = normalizeLotteryTypes(inputText);
  let textForPatterns = normalized;
  
  // Pre-processing
  textForPatterns = textForPatterns.replace(/免/g, '兔');
  textForPatterns = textForPatterns.replace(/兰/g, '蓝');

  // Identify Lottery Type
  const sortedTypes = [...lotteryTypes].sort((a, b) => b.length - a.length);
  for (const type of sortedTypes) {
    if (textForPatterns.includes(type)) {
      result.recognizedLotteryType = type;
      textForPatterns = textForPatterns.replace(type, ' ');
      break;
    }
  }

  const getNumbersForZodiac = (zodiac: string): number[] => {
    return numbers.filter(n => getZodiacFromNumber(n) === zodiac);
  };

  const parsePrefix = (prefix: string): number[] => {
    let currentNumbers: number[] = [];
    let hasBase = false;

    // 1. Base Numbers/Zodiacs/Tails/Heads
    
    // Heads (e.g., 1头)
    const headMatches = prefix.match(/(\d+)头/g);
    if (headMatches) {
      headMatches.forEach(hm => {
        const digits = hm.replace('头', '').split('');
        digits.forEach(d => {
          const h = parseInt(d);
          numbers.filter(n => Math.floor(n / 10) === h).forEach(n => currentNumbers.push(n));
        });
        hasBase = true;
      });
    }

    // Tails (e.g., 2尾)
    const tailMatches = prefix.match(/(\d+)尾/g);
    if (tailMatches) {
      tailMatches.forEach(tm => {
        const digits = tm.replace('尾', '').split('');
        digits.forEach(d => {
          const t = parseInt(d);
          numbers.filter(n => n % 10 === t).forEach(n => currentNumbers.push(n));
        });
        hasBase = true;
      });
    }

    // Numbers
    const numMatches = prefix.match(/\d+/g);
    if (numMatches) {
      numMatches.forEach(n => {
        const val = parseInt(n);
        // Check if this number is part of a head or tail match
        const isPartOfSpecial = tailMatches?.some(tm => tm.includes(n)) || 
                               headMatches?.some(hm => hm.includes(n));
        
        if (!isPartOfSpecial) {
          if (val >= 1 && val <= 49) {
            currentNumbers.push(val);
          }
          hasBase = true; // Set hasBase even if out of range to prevent "all numbers"
        }
      });
    }

    // Zodiacs
    zodiacs.forEach(z => {
      if (prefix.includes(z)) {
        getNumbersForZodiac(z).forEach(n => currentNumbers.push(n));
        hasBase = true;
      }
    });

    // Special categories
    if (prefix.includes('家')) {
      domesticZodiacs.forEach(z => getNumbersForZodiac(z).forEach(n => currentNumbers.push(n)));
      hasBase = true;
    }
    if (prefix.includes('野')) {
      wildZodiacs.forEach(z => getNumbersForZodiac(z).forEach(n => currentNumbers.push(n)));
      hasBase = true;
    }

    // If no base numbers/zodiacs/tails/heads, start with all numbers
    if (!hasBase) {
      numbers.forEach(n => currentNumbers.push(n));
    }

    // 2. Filters
    let filtered = currentNumbers;

    // Color
    if (prefix.includes('红')) filtered = filtered.filter(n => redNumbers.includes(n));
    if (prefix.includes('绿')) filtered = filtered.filter(n => greenNumbers.includes(n));
    if (prefix.includes('蓝')) filtered = filtered.filter(n => blueNumbers.includes(n));

    // Size
    if (prefix.includes('大')) filtered = filtered.filter(n => n >= 25);
    if (prefix.includes('小')) filtered = filtered.filter(n => n <= 24);

    // Parity
    if (prefix.replace(/合单/g, '').includes('单')) filtered = filtered.filter(n => n % 2 !== 0);
    if (prefix.replace(/合双/g, '').includes('双')) filtered = filtered.filter(n => n % 2 === 0);

    // Sum Parity
    if (prefix.includes('合单')) filtered = filtered.filter(n => isSumOdd(n));
    if (prefix.includes('合双')) filtered = filtered.filter(n => isSumEven(n));

    return filtered;
  };

  interface MatchResult {
    start: number;
    end: number;
    type: string;
    groups: any[];
  }

  const allMatches: MatchResult[] = [];

  const addMatches = (regex: RegExp, type: string) => {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(textForPatterns)) !== null) {
      allMatches.push({
        start: m.index,
        end: m.index + m[0].length,
        type,
        groups: Array.from(m)
      });
    }
  };

  // Collect all matches
  addMatches(REGEX_SIX_ZODIAC, 'SIX_ZODIAC');
  addMatches(REGEX_FIVE_ZODIAC, 'FIVE_ZODIAC');
  addMatches(REGEX_FOUR_ZODIAC, 'FOUR_ZODIAC');
  addMatches(REGEX_NOT_IN, 'NOT_IN');
  addMatches(REGEX_MULTI_ZODIAC_V2, 'MULTI_ZODIAC_V2');
  addMatches(REGEX_MULTI_ZODIAC_ADVANCED, 'MULTI_ZODIAC_ADVANCED');
  addMatches(REGEX_MULTI_ZODIAC, 'MULTI_ZODIAC');
  addMatches(REGEX_BAO, 'BAO');
  addMatches(REGEX_PING, 'PING');
  addMatches(REGEX_EACH, 'EACH');
  addMatches(REGEX_TAIL, 'TAIL');
  addMatches(REGEX_MULTI_TAIL_V2, 'MULTI_TAIL_V2');
  addMatches(REGEX_MULTI_TAIL_V3, 'MULTI_TAIL_V3');
  addMatches(REGEX_MULTI_TAIL_ADVANCED, 'MULTI_TAIL_ADVANCED');
  addMatches(REGEX_FLAT_NUMBER, 'FLAT_NUMBER');
  addMatches(REGEX_GENERIC, 'GENERIC');

  // Sort matches by start index
  allMatches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

  const processedRanges: { start: number; end: number }[] = [];

  const isOverlapping = (start: number, end: number) => {
    return processedRanges.some(r => (start < r.end && end > r.start));
  };

  allMatches.forEach(match => {
    if (isOverlapping(match.start, match.end)) return;

    processedRanges.push({ start: match.start, end: match.end });
    result.anyPatternFound = true;

    const groups = match.groups;
    
    switch (match.type) {
      case 'SIX_ZODIAC': {
        const zodiacStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const selectedZodiacs = zodiacStr.split('');
        result.parsedSixZodiacBets.push({ zodiacs: selectedZodiacs, amount: amt });
        result.lastAmount = amt;
        break;
      }
      case 'FIVE_ZODIAC': {
        const zodiacStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const selectedZodiacs = zodiacStr.split('');
        result.parsedFiveZodiacBets.push({ zodiacs: selectedZodiacs, amount: amt });
        result.lastAmount = amt;
        break;
      }
      case 'FOUR_ZODIAC': {
        const zodiacStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const selectedZodiacs = zodiacStr.split('');
        result.parsedFourZodiacBets.push({ zodiacs: selectedZodiacs, amount: amt });
        result.lastAmount = amt;
        break;
      }
      case 'MULTI_ZODIAC_V2': {
        const zodiacStr = groups[1];
        const count = chineseToNumber(groups[3]);
        const amt = chineseToNumber(groups[4]);
        const selectedZodiacs = zodiacStr.split('').filter(c => zodiacs.includes(c));
        const combs = getCombinations<string>(selectedZodiacs, count);
        combs.forEach(c => result.parsedMultiZodiacBets.push({ zodiacs: c, amount: amt }));
        result.lastAmount = amt;
        break;
      }
      case 'MULTI_ZODIAC_ADVANCED': {
        const countStr = groups[1] || groups[2] || groups[3];
        const count = countStr === '二' || countStr === '2' || countStr === '两' ? 2 :
                      countStr === '三' || countStr === '3' ? 3 :
                      countStr === '四' || countStr === '4' ? 4 :
                      countStr === '五' || countStr === '5' ? 5 : 2;
        const content = groups[4];
        const segments = content.split(/[\s,，。；;.各买压个]+/).filter(Boolean);
        let currentZodiacs: string[] = [];
        segments.forEach(seg => {
          const amtMatch = seg.match(/(\d+(?:\.\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/);
          if (amtMatch) {
            const amt = chineseToNumber(amtMatch[1]);
            const zodiacsInSeg = seg.replace(amtMatch[1], '').split('').filter(c => zodiacs.includes(c));
            const allZodiacs = [...currentZodiacs, ...zodiacsInSeg];
            
            if (allZodiacs.length >= count) {
              const combs = getCombinations<string>(allZodiacs, count);
              combs.forEach(c => result.parsedMultiZodiacBets.push({ zodiacs: c, amount: amt }));
              result.lastAmount = amt;
            }
            currentZodiacs = [];
          } else {
            const zodiacsInSeg = seg.split('').filter(c => zodiacs.includes(c));
            currentZodiacs.push(...zodiacsInSeg);
          }
        });
        break;
      }
      case 'MULTI_ZODIAC': {
        const zodiacStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const selectedZodiacs = zodiacStr.split('').filter(c => zodiacs.includes(c));
        if (selectedZodiacs.length > 0) {
          result.parsedMultiZodiacBets.push({ zodiacs: selectedZodiacs, amount: amt });
          result.lastAmount = amt;
        }
        break;
      }
      case 'NOT_IN': {
        const xStr = groups[1];
        const x = chineseToNumber(xStr);
        const content = groups[2];
        const amt = chineseToNumber(groups[3]);
        const nums = content.match(/\d+/g)?.map(Number).filter(n => n >= 1 && n <= 49) || [];
        if (nums.length >= x) {
          result.parsedNotInBets.push({ x, numbers: nums, amount: amt });
          result.lastAmount = amt;
        }
        break;
      }
      case 'BAO': {
        const zodiacStr = groups[1] || groups[2];
        const amt = chineseToNumber(groups[3]);
        zodiacStr.split('').forEach(z => {
          if (zodiacs.includes(z)) {
            const nums = getNumbersForZodiac(z);
            if (nums.length > 0) {
              const perNumAmt = amt / nums.length;
              nums.forEach(n => {
                result.parsedBets[n] = (result.parsedBets[n] || 0) + perNumAmt;
                result.selectedNumbers.add(n);
              });
            }
          }
        });
        result.lastAmount = amt;
        break;
      }
      case 'PING': {
        const zodiacStr = groups[1] || groups[2];
        const amt = chineseToNumber(groups[3]);
        zodiacStr.split('').forEach(z => {
          if (zodiacs.includes(z)) {
            result.parsedZodiacBets[z] = (result.parsedZodiacBets[z] || 0) + amt;
          }
        });
        result.lastAmount = amt;
        break;
      }
      case 'TAIL': {
        const tailStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const tails = tailStr.match(/\d/g) || [];
        tails.forEach(t => {
          const tail = parseInt(t);
          result.parsedTailBets[tail] = (result.parsedTailBets[tail] || 0) + amt;
        });
        result.lastAmount = amt;
        break;
      }
      case 'MULTI_TAIL_V2': {
        const tailStr = groups[1];
        const count = chineseToNumber(groups[2]);
        const amt = chineseToNumber(groups[3]);
        const selectedTails = tailStr.split('').map(String);
        const combs = getCombinations<string>(selectedTails, count);
        combs.forEach(c => result.parsedMultiTailBets.push({ zodiacs: c, amount: amt }));
        result.lastAmount = amt;
        break;
      }
      case 'MULTI_TAIL_V3': {
        const countStr = groups[1] || groups[2];
        const count = countStr === '二' || countStr === '2' || countStr === '两' ? 2 :
                      countStr === '三' || countStr === '3' ? 3 :
                      countStr === '四' || countStr === '4' ? 4 :
                      countStr === '五' || countStr === '5' ? 5 : 2;
        const tails = groups.slice(3, 8).filter(Boolean).map(String) as string[];
        const amt = chineseToNumber(groups[8]);
        if (tails.length >= count) {
          tails.forEach(t => {
            const tailNum = parseInt(t);
            numbers.filter(n => n % 10 === tailNum).forEach(n => result.selectedNumbers.add(n));
          });
          const combs = getCombinations<string>(tails, count);
          combs.forEach(c => result.parsedMultiTailBets.push({ zodiacs: c, amount: amt }));
          result.lastAmount = amt;
        }
        break;
      }
      case 'MULTI_TAIL_ADVANCED': {
        const countStr = groups[1] || groups[2];
        const count = countStr === '二' || countStr === '2' || countStr === '两' ? 2 :
                      countStr === '三' || countStr === '3' ? 3 :
                      countStr === '四' || countStr === '4' ? 4 :
                      countStr === '五' || countStr === '5' ? 5 : 2;
        const content = groups[3];
        const segments = content.split(/[\s,，。；;.各买压个]+/).filter(Boolean);
        let currentTails: string[] = [];
        segments.forEach(seg => {
          const amtMatch = seg.match(/(\d+(?:\.\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/);
          if (amtMatch) {
            const amt = chineseToNumber(amtMatch[1]);
            const tailsInSeg = seg.replace(amtMatch[1], '').match(/\d/g) || [];
            const allTails = [...currentTails, ...tailsInSeg];
            
            allTails.forEach(t => {
              const tailNum = parseInt(t);
              numbers.filter(n => n % 10 === tailNum).forEach(n => result.selectedNumbers.add(n));
            });

            if (allTails.length >= count) {
              const combs = getCombinations<string>(allTails, count);
              combs.forEach(c => result.parsedMultiTailBets.push({ zodiacs: c, amount: amt }));
              result.lastAmount = amt;
            }
            currentTails = [];
          } else {
            const tailsInSeg = seg.match(/\d/g) || [];
            currentTails.push(...tailsInSeg);
          }
        });
        break;
      }
      case 'EACH': {
        const prefix = groups[1];
        const amt = chineseToNumber(groups[3]);
        const nums = parsePrefix(prefix);
        nums.forEach(n => {
          result.parsedBets[n] = (result.parsedBets[n] || 0) + amt;
          result.selectedNumbers.add(n);
        });
        result.lastAmount = amt;
        break;
      }
      case 'FLAT_NUMBER': {
        const num1 = groups[1] || groups[3] || groups[7];
        const amt1 = groups[2] || groups[4] || groups[8];
        const numsStr = groups[5];
        const amt2 = groups[6];

        if (num1 && amt1) {
          const n = parseInt(num1);
          const a = chineseToNumber(amt1);
          result.parsedFlatBets[n] = (result.parsedFlatBets[n] || 0) + a;
          result.selectedNumbers.add(n);
          result.lastAmount = a;
        } else if (numsStr && amt2) {
          const a = chineseToNumber(amt2);
          const nums = numsStr.match(/\d+/g)?.map(Number).filter(n => n >= 1 && n <= 49) || [];
          nums.forEach(n => {
            result.parsedFlatBets[n] = (result.parsedFlatBets[n] || 0) + a;
            result.selectedNumbers.add(n);
          });
          result.lastAmount = a;
        }
        break;
      }
      case 'GENERIC': {
        const prefix = groups[1];
        const amt = chineseToNumber(groups[2]);
        const nums = parsePrefix(prefix);
        nums.forEach(n => {
          result.parsedBets[n] = (result.parsedBets[n] || 0) + amt;
          result.selectedNumbers.add(n);
        });
        result.lastAmount = amt;
        break;
      }
    }
  });

  // Error checking for invalid numbers
  let errorMatch;
  REGEX_INVALID_NUMBERS.lastIndex = 0;
  while ((errorMatch = REGEX_INVALID_NUMBERS.exec(textForPatterns)) !== null) {
    if (!isOverlapping(errorMatch.index, errorMatch.index + errorMatch[0].length)) {
      result.errors.push(`识别到异常数字: ${errorMatch[0]}`);
    }
  }

  return result;
};

export const parseMultiLotteryInput = (inputText: string): ParsedSegment[] => {
  if (!inputText.trim()) return [];

  const normalized = normalizeLotteryTypes(inputText);
  const sortedTypes = [...lotteryTypes].sort((a, b) => b.length - a.length);
  const typePattern = sortedTypes.join('|');
  const regex = new RegExp(`(${typePattern})`, 'g');
  
  const segments: ParsedSegment[] = [];
  const parts = normalized.split(new RegExp(`(?=${typePattern})`, 'g')).filter(Boolean);

  parts.forEach(part => {
    const match = part.match(new RegExp(`^(${typePattern})`));
    const type = match ? match[1] : '';
    let content = type ? part.substring(type.length) : part;
    
    // Clean up leading punctuation like ： or :
    content = content.replace(/^[：:，,\s]+/, '');
    
    const parsed = parseBetInput(content);
    if (type) parsed.recognizedLotteryType = type;
    
    if (parsed.anyPatternFound || parsed.errors.length > 0) {
      segments.push({
        lotteryType: type,
        originalInput: part,
        parsed
      });
    }
  });

  return segments;
};
