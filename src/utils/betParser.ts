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

export interface BetItem {
  text: string;
  numberDeltas: Record<number, number>;
  flatNumberDeltas: Record<number, number>;
  zodiacDeltas: Record<string, number>;
  tailDeltas: Record<number, number>;
  multiZodiacBets: MultiZodiacBet[];
  sixZodiacBets: MultiZodiacBet[];
  fiveZodiacBets: MultiZodiacBet[];
  fourZodiacBets: MultiZodiacBet[];
  multiTailBets: MultiZodiacBet[];
  notInBets: NotInBet[];
  total: number;
}

export interface ParsedInput {
  items: BetItem[];
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
const BOUNDARY = '(?<=^|[\\s,，。；;.、/\\d\\n\\r]|' + lotteryTypes.join('|') + ')';
const LOOKAHEAD = '(?=$|[\\s,，。；;.](?:[二三四五2345两]?(?:连肖|连|连尾|不中|中)|平|[马蛇龙兔虎牛鼠猪狗鸡猴羊]*包|不中|特码|正码|合计|计|总计|共|总|' + lotteryTypes.join('|') + ')|(?:[二三四五2345两]?(?:连肖|连|连尾|不中|中)|平|[马蛇龙兔虎牛鼠猪狗鸡猴羊]*包|不中|特码|正码|合计|计|总计|共|总|' + lotteryTypes.join('|') + '))';
const LOOKAHEAD_LOOSE = '(?=$|[\\s,，。；;.、/！!！?？#]|' + lotteryTypes.join('|') + '|[马蛇龙兔虎牛鼠猪狗鸡猴羊大小单双红绿蓝家野])';
const NOISE_PREFIX = '((?:(?!' + lotteryTypes.join('|') + ')[^\\n\\r])*?)';

export const REGEX_SIX_ZODIAC = new RegExp(BOUNDARY + '(?:六中|六肖|6中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{6})[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');
export const REGEX_FIVE_ZODIAC = new RegExp(BOUNDARY + '(?:五中|5中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{5})[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');
export const REGEX_FOUR_ZODIAC = new RegExp(BOUNDARY + '(?:四中|4中)([马蛇龙兔虎牛鼠猪狗鸡猴羊]{4})[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');

export const REGEX_MULTI_ZODIAC = new RegExp(BOUNDARY + '([马蛇龙兔虎牛鼠猪狗鸡猴羊]{2,12})(?:连肖|连)[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');
export const REGEX_MULTI_ZODIAC_ADVANCED = new RegExp(BOUNDARY + '(?:平特)?(?:([二三四五2345两])(?:连肖|连|连买|买)|([二三四五2345两])肖|(?<![二三四五2345两])(连肖|连))([\\s\\S]+?)' + LOOKAHEAD, 'g');
export const REGEX_MULTI_ZODIAC_V2 = new RegExp(BOUNDARY + '([马蛇龙兔虎牛鼠猪狗鸡猴羊]{2,12})(复试|复式|复)?([二三四五六七八九十2345678910两])(?:连肖|连|连各|连每)?(?:各组|每组)?[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');

export const REGEX_NOT_IN = new RegExp(BOUNDARY + '(\\d+)(?:不中|中)(\\d+(?:[\\s,，。；;.]+\\d+)*)[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');

export const REGEX_BAO = new RegExp(BOUNDARY + '(?:([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)包|包([马蛇龙兔虎牛鼠猪狗鸡猴羊]+))[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');
export const REGEX_PING = new RegExp(BOUNDARY + '(?:(?:平特一肖|平特肖|平特|平肖|平)([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)(?:平特一肖|平特肖|平特|平肖|平))[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');
export const REGEX_TAIL = new RegExp(BOUNDARY + '(?:平特|平)(\\d+)尾[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');

export const REGEX_MULTI_TAIL_ADVANCED = new RegExp(BOUNDARY + '(?:([二三四五2345两])?连尾|([二三四五2345两])尾)([\\s\\S]+?)' + LOOKAHEAD, 'g');
export const REGEX_MULTI_TAIL_V2 = new RegExp(BOUNDARY + '(?:【?(\\d{2,10})】?)[^\\d]*?(?:各|每|买|压|个|包)?[^\\d]*?([二三四五2345两])连尾[^\\d]*?(?:各|每|买|压|个|包)?[^\\d]*?(\\+?\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');
export const REGEX_MULTI_TAIL_V3 = new RegExp(BOUNDARY + '(?:([二三四五2345两])?连尾|([二三四五2345两])尾)(?:[\\-\\s,，。；;.]*?(\\d)尾[\\-\\s,，。；;.]*?(\\d)尾[\\-\\s,，。；;.]*?(\\d)尾(?:[\\-\\s,，。；;.]*?(\\d)尾)?(?:[\\-\\s,，。；;.]*?(\\d)尾)?)[^\\d]*?(?:各|每|买|压|个|包)?[^\\d]*?(\\+?\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');

export const REGEX_HEAD_TAIL = new RegExp(BOUNDARY + '(\\d+)(头|尾)[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');

export const REGEX_EACH = new RegExp(BOUNDARY + NOISE_PREFIX + '(?:各|每|买|压|个|下注)[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?' + LOOKAHEAD_LOOSE, 'g');

export const REGEX_FLAT_NUMBER = new RegExp(BOUNDARY + '(?:([\\d\\.\\s,，。；;./+&|\\-]+)(?:平码|独平)(?:各|每|买|压|个)?(\\d+(?:\\.\\d+)?)|(?:平码|独平)([\\d\\.\\s,，。；;./+&|\\-]+)-(?:各|每|买|压|个)?(\\d+(?:\\.\\d+)?)|(?:平码|独平)([\\d\\.\\s,，。；;./+&|\\-]+)(?:各|每|买|压|个)(\\d+(?:\\.\\d+)?))(?:米|个|元|块|斤)?', 'g');

export const REGEX_TUO_ZODIAC = new RegExp(BOUNDARY + '([二三四五2345两])拖([马蛇龙兔虎牛鼠猪狗鸡猴羊]{2,12})[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');
export const REGEX_TUO_ZODIAC_V3 = new RegExp(BOUNDARY + '([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)拖([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)([二三四五六七八九十2345678910两])(?:连肖|连|连各|连每)?(?:各组|每组)?[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤)?', 'g');

export const REGEX_GENERIC = new RegExp(BOUNDARY + NOISE_PREFIX + '(?:大|小|单|双|红|绿|蓝|家|野|合单|合双)+[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|#)?' + LOOKAHEAD_LOOSE, 'g');

export const normalizeLotteryTypes = (text: string): string => {
  let processedText = text;
  processedText = processedText.replace(/奥大/g, '澳大');
  
  // Normalize 'cc' aliases
  processedText = processedText.replace(/(?:新[cC]{1,2}|新西西|[cC]{2})/g, 'cc');
  
  // Normalize '老cc' aliases
  processedText = processedText.replace(/(?:[旧老][cC]{1,2}|[旧老]西西)/g, '老cc');
  
  processedText = processedText.replace(/新澳/g, '新澳');
  processedText = processedText.replace(/老澳/g, '老澳');
  processedText = processedText.replace(/香港/g, '香港');
  processedText = processedText.replace(/万和/g, '越南');
  processedText = processedText.replace(/万合/g, '越南');
  return processedText;
};

export const parseBetInput = (inputText: string): ParsedInput => {
  const result: ParsedInput = {
    items: [],
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

  let textForPatterns = inputText;
  
  // Pre-processing
  textForPatterns = textForPatterns.replace(/免/g, '兔');
  textForPatterns = textForPatterns.replace(/兰/g, '蓝');

  // Identify Lottery Type
  for (const type of lotteryTypes) {
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

    // 1. Base Numbers/Zodiacs
    // Split by common separators to handle mixed inputs like "兔+04.40"
    const parts = prefix.split(/[\s\+\.\,，。；;\/&|\-]+/).filter(Boolean);
    
    if (parts.length > 0) {
      parts.forEach(part => {
        // Head/Tail
        const headMatch = part.match(/(\d+)头/);
        if (headMatch) {
          const digits = headMatch[1].split('');
          digits.forEach(digit => {
            const d = parseInt(digit);
            if (d === 0) {
              currentNumbers.push(...[1, 2, 3, 4, 5, 6, 7, 8, 9]);
            } else if (d >= 1 && d <= 4) {
              for (let i = d * 10; i < (d + 1) * 10 && i <= 49; i++) {
                currentNumbers.push(i);
              }
            }
          });
          hasBase = true;
        }
        const tailMatch = part.match(/(\d+)尾/);
        if (tailMatch) {
          const digits = tailMatch[1].split('');
          digits.forEach(digit => {
            const d = parseInt(digit);
            for (let i = 1; i <= 49; i++) {
              if (i % 10 === d) {
                currentNumbers.push(i);
              }
            }
          });
          hasBase = true;
        }

        // Numbers
        const numMatches = part.match(/\d+/g);
        if (numMatches) {
          numMatches.forEach(n => {
            const val = parseInt(n);
            if (val >= 1 && val <= 49) {
              currentNumbers.push(val);
              hasBase = true;
            }
          });
        }

        // Zodiacs
        zodiacs.forEach(z => {
          if (part.includes(z)) {
            currentNumbers.push(...getNumbersForZodiac(z));
            hasBase = true;
          }
        });

        // Special categories
        if (part.includes('家')) {
          domesticZodiacs.forEach(z => currentNumbers.push(...getNumbersForZodiac(z)));
          hasBase = true;
        }
        if (part.includes('野')) {
          wildZodiacs.forEach(z => currentNumbers.push(...getNumbersForZodiac(z)));
          hasBase = true;
        }
      });
    } else {
      // Fallback to original logic if split fails
      const numMatches = prefix.match(/\d+/g);
      if (numMatches) {
        numMatches.forEach(n => {
          const val = parseInt(n);
          if (val >= 1 && val <= 49) {
            currentNumbers.push(val);
            hasBase = true;
          }
        });
      }
      zodiacs.forEach(z => {
        if (prefix.includes(z)) {
          currentNumbers.push(...getNumbersForZodiac(z));
          hasBase = true;
        }
      });
    }

    // If no base numbers/zodiacs, start with all numbers
    if (!hasBase) {
      numbers.forEach(n => currentNumbers.push(n));
    }

    // 2. Filters
    let filtered = [...currentNumbers];

    // Color
    if (prefix.includes('红')) filtered = filtered.filter(n => redNumbers.includes(n));
    if (prefix.includes('绿')) filtered = filtered.filter(n => greenNumbers.includes(n));
    if (prefix.includes('蓝')) filtered = filtered.filter(n => blueNumbers.includes(n));

    // Size
    if (prefix.includes('大')) filtered = filtered.filter(n => n >= 25);
    if (prefix.includes('小')) filtered = filtered.filter(n => n <= 24);

    // Parity
    const hasStandaloneOdd = prefix.replace(/合单/g, '').includes('单');
    const hasStandaloneEven = prefix.replace(/合双/g, '').includes('双');
    if (hasStandaloneOdd) filtered = filtered.filter(n => n % 2 !== 0);
    if (hasStandaloneEven) filtered = filtered.filter(n => n % 2 === 0);

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
    original: string;
  }

  const allMatches: MatchResult[] = [];

  const addMatches = (regex: RegExp, type: string) => {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(textForPatterns)) !== null) {
      const matchText = m[0];
      let offset = 0;
      // Skip leading punctuation/separators for highlighting and parsing
      while (offset < matchText.length && /[\s,，。；;.、/]/.test(matchText[offset])) {
        offset++;
      }

      allMatches.push({
        start: m.index + offset,
        end: m.index + matchText.length,
        type,
        groups: Array.from(m),
        original: matchText.substring(offset)
      });
    }
  };

  // Collect all matches
  addMatches(REGEX_SIX_ZODIAC, 'SIX_ZODIAC');
  addMatches(REGEX_FIVE_ZODIAC, 'FIVE_ZODIAC');
  addMatches(REGEX_FOUR_ZODIAC, 'FOUR_ZODIAC');
  addMatches(REGEX_MULTI_ZODIAC_V2, 'MULTI_ZODIAC_V2');
  addMatches(REGEX_TUO_ZODIAC_V3, 'TUO_ZODIAC_V3');
  addMatches(REGEX_MULTI_ZODIAC_ADVANCED, 'MULTI_ZODIAC_ADVANCED');
  addMatches(REGEX_MULTI_ZODIAC, 'MULTI_ZODIAC');
  addMatches(REGEX_NOT_IN, 'NOT_IN');
  addMatches(REGEX_BAO, 'BAO');
  addMatches(REGEX_PING, 'PING');
  addMatches(REGEX_TAIL, 'TAIL');
  addMatches(REGEX_MULTI_TAIL_V2, 'MULTI_TAIL_V2');
  addMatches(REGEX_MULTI_TAIL_V3, 'MULTI_TAIL_V3');
  addMatches(REGEX_HEAD_TAIL, 'HEAD_TAIL');
  addMatches(REGEX_MULTI_TAIL_ADVANCED, 'MULTI_TAIL_ADVANCED');
  addMatches(REGEX_EACH, 'EACH');
  addMatches(REGEX_FLAT_NUMBER, 'FLAT_NUMBER');
  addMatches(REGEX_TUO_ZODIAC, 'TUO_ZODIAC');
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
    
    const createEmptyBetItem = (originalMatch: string): BetItem => ({
      text: originalMatch.trim(),
      numberDeltas: {},
      flatNumberDeltas: {},
      zodiacDeltas: {},
      tailDeltas: {},
      multiZodiacBets: [],
      sixZodiacBets: [],
      fiveZodiacBets: [],
      fourZodiacBets: [],
      multiTailBets: [],
      notInBets: [],
      total: 0
    });

    const item = createEmptyBetItem(match.original);

    switch (match.type) {
      case 'SIX_ZODIAC': {
        const zodiacStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const bet = { zodiacs: zodiacStr.split(''), amount: amt };
        item.sixZodiacBets.push(bet);
        item.total = amt;
        result.parsedSixZodiacBets.push(bet);
        result.lastAmount = amt;
        break;
      }
      case 'FIVE_ZODIAC': {
        const zodiacStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const bet = { zodiacs: zodiacStr.split(''), amount: amt };
        item.fiveZodiacBets.push(bet);
        item.total = amt;
        result.parsedFiveZodiacBets.push(bet);
        result.lastAmount = amt;
        break;
      }
      case 'FOUR_ZODIAC': {
        const zodiacStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const bet = { zodiacs: zodiacStr.split(''), amount: amt };
        item.fourZodiacBets.push(bet);
        item.total = amt;
        result.parsedFourZodiacBets.push(bet);
        result.lastAmount = amt;
        break;
      }
      case 'MULTI_ZODIAC_V2': {
        const zodiacStr = groups[1];
        const isFu = !!groups[2];
        const countStr = groups[3];
        const count = isNaN(parseInt(countStr)) ? chineseToNumber(countStr) : parseInt(countStr);
        const amt = chineseToNumber(groups[4]);
        const selectedZodiacs = zodiacStr.split('');
        
        if (selectedZodiacs.length >= count) {
          const combs = getCombinations<string>(selectedZodiacs, count);
          combs.forEach(c => {
            const bet = { zodiacs: c, amount: amt };
            item.multiZodiacBets.push(bet);
            item.total += amt;
            result.parsedMultiZodiacBets.push(bet);
          });
          result.lastAmount = amt;
        }
        break;
      }
      case 'MULTI_ZODIAC_ADVANCED': {
        const countStr = groups[1] || groups[2] || groups[3];
        const count = countStr === '二' || countStr === '2' || countStr === '两' ? 2 :
                      countStr === '三' || countStr === '3' ? 3 :
                      countStr === '四' || countStr === '4' ? 4 :
                      countStr === '五' || countStr === '5' ? 5 : 2;
        const content = groups[4];
        const segments = content.split(/[\s,，。；;.各每买压个]+/).filter(Boolean);
        let currentZodiacs: string[] = [];
        segments.forEach(seg => {
          const amtMatch = seg.match(/(\d+(?:\.\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/);
          if (amtMatch) {
            const amt = chineseToNumber(amtMatch[1]);
            const zodiacsInSeg = seg.replace(amtMatch[1], '').split('').filter(c => zodiacs.includes(c));
            const allZodiacs = [...currentZodiacs, ...zodiacsInSeg];
            if (allZodiacs.length >= count) {
              const combs = getCombinations<string>(allZodiacs, count);
              combs.forEach(c => {
                const bet = { zodiacs: c, amount: amt };
                item.multiZodiacBets.push(bet);
                item.total += amt;
                result.parsedMultiZodiacBets.push(bet);
              });
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
        const bet = { zodiacs: zodiacStr.split(''), amount: amt };
        item.multiZodiacBets.push(bet);
        item.total = amt;
        result.parsedMultiZodiacBets.push(bet);
        result.lastAmount = amt;
        break;
      }
      case 'TUO_ZODIAC': {
        const countStr = groups[1];
        const count = countStr === '二' || countStr === '2' || countStr === '两' ? 2 :
                      countStr === '三' || countStr === '3' ? 3 :
                      countStr === '四' || countStr === '4' ? 4 :
                      countStr === '五' || countStr === '5' ? 5 : 2;
        const zodiacStr = groups[2];
        const amt = chineseToNumber(groups[3]);
        const selectedZodiacs = zodiacStr.split('');
        if (selectedZodiacs.length >= count) {
          const combs = getCombinations<string>(selectedZodiacs, count);
          combs.forEach(c => {
            const bet = { zodiacs: c, amount: amt };
            item.multiZodiacBets.push(bet);
            item.total += amt;
            result.parsedMultiZodiacBets.push(bet);
          });
          result.lastAmount = amt;
        }
        break;
      }
      case 'TUO_ZODIAC_V3': {
        const baseZodiacs = groups[1].split('');
        const trailingZodiacs = groups[2].split('');
        const countStr = groups[3];
        const count = isNaN(parseInt(countStr)) ? chineseToNumber(countStr) : parseInt(countStr);
        const amt = chineseToNumber(groups[4]);
        
        const needed = count - baseZodiacs.length;
        if (needed > 0 && trailingZodiacs.length >= needed) {
          const combs = getCombinations<string>(trailingZodiacs, needed);
          combs.forEach(c => {
            const combined = [...baseZodiacs, ...c];
            const bet = { zodiacs: combined, amount: amt };
            item.multiZodiacBets.push(bet);
            item.total += amt;
            result.parsedMultiZodiacBets.push(bet);
          });
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
        if (nums.length === x) {
          const bet = { x, numbers: nums, amount: amt };
          item.notInBets.push(bet);
          item.total = amt;
          result.parsedNotInBets.push(bet);
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
              const amtPerNum = amt / nums.length;
              nums.forEach(n => {
                item.numberDeltas[n] = (item.numberDeltas[n] || 0) + amtPerNum;
                result.parsedBets[n] = (result.parsedBets[n] || 0) + amtPerNum;
                result.selectedNumbers.add(n);
              });
              item.total += amt;
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
            item.zodiacDeltas[z] = (item.zodiacDeltas[z] || 0) + amt;
            item.total += amt;
            result.parsedZodiacBets[z] = (result.parsedZodiacBets[z] || 0) + amt;
          }
        });
        result.lastAmount = amt;
        break;
      }
      case 'HEAD_TAIL': {
        const digits = groups[1].split('');
        const type = groups[2];
        const amt = chineseToNumber(groups[3]);
        
        let totalNums = 0;
        digits.forEach(digit => {
          const d = parseInt(digit);
          let nums: number[] = [];
          if (type === '头') {
            if (d === 0) {
              nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            } else if (d >= 1 && d <= 4) {
              for (let i = d * 10; i < (d + 1) * 10 && i <= 49; i++) {
                nums.push(i);
              }
            }
          } else if (type === '尾') {
            for (let i = 1; i <= 49; i++) {
              if (i % 10 === d) {
                nums.push(i);
              }
            }
          }
          
          if (nums.length > 0) {
            nums.forEach(n => {
              item.numberDeltas[n] = (item.numberDeltas[n] || 0) + amt;
              result.parsedBets[n] = (result.parsedBets[n] || 0) + amt;
              result.selectedNumbers.add(n);
            });
            totalNums += nums.length;
          }
        });
        item.total = amt * totalNums;
        result.lastAmount = amt;
        break;
      }
      case 'TAIL': {
        const tail = parseInt(groups[1]);
        const amt = chineseToNumber(groups[2]);
        item.tailDeltas[tail] = (item.tailDeltas[tail] || 0) + amt;
        item.total = amt;
        result.parsedTailBets[tail] = (result.parsedTailBets[tail] || 0) + amt;
        result.lastAmount = amt;
        break;
      }
      case 'MULTI_TAIL_V2': {
        const tailStr = groups[1];
        const count = parseInt(groups[2]);
        const amt = chineseToNumber(groups[3]);
        const selectedTails = tailStr.split('').map(String);
        const combs = getCombinations<string>(selectedTails, count);
        combs.forEach(c => {
          const bet = { zodiacs: c, amount: amt };
          item.multiTailBets.push(bet);
          item.total += amt;
          result.parsedMultiTailBets.push(bet);
        });
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
          const combs = getCombinations<string>(tails, count);
          combs.forEach(c => {
            const bet = { zodiacs: c, amount: amt };
            item.multiTailBets.push(bet);
            item.total += amt;
            result.parsedMultiTailBets.push(bet);
          });
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
        const segments = content.split(/[\s,，。；;.各每买压个]+/).filter(Boolean);
        let currentTails: string[] = [];
        segments.forEach(seg => {
          const amtMatch = seg.match(/(\d+(?:\.\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)/);
          if (amtMatch) {
            const amt = chineseToNumber(amtMatch[1]);
            const tailsInSeg = seg.replace(amtMatch[1], '').match(/\d/g) || [];
            const allTails = [...currentTails, ...tailsInSeg];
            if (allTails.length >= count) {
              const combs = getCombinations<string>(allTails, count);
              combs.forEach(c => {
                const bet = { zodiacs: c, amount: amt };
                item.multiTailBets.push(bet);
                item.total += amt;
                result.parsedMultiTailBets.push(bet);
              });
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
        const isFlat = prefix.includes('独平') || prefix.includes('平码');
        const cleanPrefix = prefix.replace('独平', '').replace('平码', '');
        const amt = chineseToNumber(groups[2]);
        const nums = parsePrefix(cleanPrefix);
        
        if (isFlat) {
          nums.forEach(n => {
            const subItem = createEmptyBetItem(`${n}${prefix.includes('独平') ? '独平' : '平码'}${groups[2]}`);
            subItem.flatNumberDeltas[n] = (subItem.flatNumberDeltas[n] || 0) + amt;
            subItem.total = amt;
            result.parsedFlatBets[n] = (result.parsedFlatBets[n] || 0) + amt;
            result.items.push(subItem);
            result.selectedNumbers.add(n);
          });
        } else {
          nums.forEach(n => {
            item.numberDeltas[n] = (item.numberDeltas[n] || 0) + amt;
            item.total += amt;
            result.parsedBets[n] = (result.parsedBets[n] || 0) + amt;
            result.selectedNumbers.add(n);
          });
        }
        result.lastAmount = amt;
        break;
      }
      case 'FLAT_NUMBER': {
        const num1 = groups[1] || groups[3] || groups[5];
        const amt1 = groups[2] || groups[4] || groups[6];

        if (num1 && amt1) {
          const a = chineseToNumber(amt1);
          const nums = num1.match(/\d+/g)?.map(Number).filter(n => n >= 1 && n <= 49) || [];
          nums.forEach(n => {
            const subItem = createEmptyBetItem(`${n}平码${amt1}`);
            subItem.flatNumberDeltas[n] = (subItem.flatNumberDeltas[n] || 0) + a;
            subItem.total = a;
            result.parsedFlatBets[n] = (result.parsedFlatBets[n] || 0) + a;
            result.items.push(subItem);
            result.selectedNumbers.add(n);
          });
          result.lastAmount = a;
        }
        break;
      }
      case 'GENERIC': {
        const prefix = groups[1];
        const isFlat = prefix.includes('独平') || prefix.includes('平码');
        const cleanPrefix = prefix.replace('独平', '').replace('平码', '');
        const amt = chineseToNumber(groups[2]);
        const nums = parsePrefix(cleanPrefix);
        
        if (isFlat) {
          nums.forEach(n => {
            const subItem = createEmptyBetItem(`${n}${prefix.includes('独平') ? '独平' : '平码'}${groups[2]}`);
            subItem.flatNumberDeltas[n] = (subItem.flatNumberDeltas[n] || 0) + amt;
            subItem.total = amt;
            result.parsedFlatBets[n] = (result.parsedFlatBets[n] || 0) + amt;
            result.items.push(subItem);
            result.selectedNumbers.add(n);
          });
        } else {
          nums.forEach(n => {
            item.numberDeltas[n] = (item.numberDeltas[n] || 0) + amt;
            item.total += amt;
            result.parsedBets[n] = (result.parsedBets[n] || 0) + amt;
            result.selectedNumbers.add(n);
          });
        }
        result.lastAmount = amt;
        break;
      }
    }

    if (item.total > 0) {
      result.items.push(item);
    }
  });

  return result;
};

export const parseMultiLotteryInput = (inputText: string): ParsedSegment[] => {
  if (!inputText.trim()) return [];

  const normalized = normalizeLotteryTypes(inputText);
  const sortedTypes = [...lotteryTypes].sort((a, b) => b.length - a.length);
  const typePattern = sortedTypes.join('|');
  
  const segments: ParsedSegment[] = [];
  // Use a positive lookahead to split by lottery types, keeping the type with the following content
  const parts = normalized.split(new RegExp(`(?=${typePattern})`, 'g')).filter(Boolean);
  
  let pendingTypes: string[] = [];

  parts.forEach((part) => {
    const match = part.match(new RegExp(`^(${typePattern})`));
    const type = match ? match[1] : '';
    const content = type ? part.substring(type.length) : part;
    
    const parsed = parseBetInput(content);
    
    if (parsed.anyPatternFound || parsed.errors.length > 0) {
      // Apply this content to all preceding types that had no content
      pendingTypes.forEach(pType => {
        const pParsed = parseBetInput(content);
        pParsed.recognizedLotteryType = pType;
        segments.push({
          lotteryType: pType,
          originalInput: pType + content,
          parsed: pParsed
        });
      });
      pendingTypes = [];
      
      if (type) {
        parsed.recognizedLotteryType = type;
        segments.push({
          lotteryType: type,
          originalInput: part,
          parsed: parsed
        });
      } else {
        // No lottery type specified, just add the segment
        segments.push({
          lotteryType: '',
          originalInput: part,
          parsed: parsed
        });
      }
    } else if (type) {
      pendingTypes.push(type);
    }
  });

  return segments;
};
