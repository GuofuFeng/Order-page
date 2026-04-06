import { chineseNumberMap, zodiacs, redNumbers, blueNumbers, greenNumbers, numbers, lotteryTypes, domesticZodiacs, wildZodiacs, isSumOdd, isSumEven } from '../constants';
import { MultiZodiacBet, NotInBet, CombinationWinBet } from '../types';
import { getZodiacFromNumber } from './winningCalculator';

function getCombinations<T>(array: T[], size: number): T[][] {
  if (size > array.length || size <= 0) return [];
  
  // Safety limit to prevent browser crash (approx 10,000 combinations)
  // For 49 numbers: 49C2=1176, 49C3=18424 (slightly over, but manageable)
  // 49C4=211876 (too many)
  if (size > 3 && array.length > 30) return []; 
  if (size > 2 && array.length > 60) return [];

  const result: T[][] = [];
  const maxResults = 20000; // Hard limit
  
  function backtrack(start: number, path: T[]) {
    if (result.length >= maxResults) return;
    if (path.length === size) {
      result.push([...path]);
      return;
    }
    for (let i = start; i < array.length; i++) {
      path.push(array[i]);
      backtrack(i + 1, path);
      path.pop();
      if (result.length >= maxResults) return;
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
  teXiaoDeltas: Record<string, number>;
  tailDeltas: Record<number, number>;
  specialAttributeDeltas: Record<string, number>;
  multiZodiacBets: MultiZodiacBet[];
  sixZodiacBets: MultiZodiacBet[];
  fiveZodiacBets: MultiZodiacBet[];
  fourZodiacBets: MultiZodiacBet[];
  multiTailBets: MultiZodiacBet[];
  notInBets: NotInBet[];
  combinationWinBets: CombinationWinBet[];
  total: number;
}

export interface ParsedInput {
  items: BetItem[];
  selectedNumbers: Set<number>;
  parsedBets: Record<number, number>;
  parsedFlatBets: Record<number, number>;
  parsedZodiacBets: Record<string, number>;
  parsedTeXiaoBets: Record<string, number>;
  parsedTailBets: Record<number, number>;
  parsedSpecialAttributeBets: Record<string, number>;
  parsedMultiZodiacBets: MultiZodiacBet[];
  parsedSixZodiacBets: MultiZodiacBet[];
  parsedFiveZodiacBets: MultiZodiacBet[];
  parsedFourZodiacBets: MultiZodiacBet[];
  parsedMultiTailBets: MultiZodiacBet[];
  parsedNotInBets: NotInBet[];
  parsedCombinationWinBets: CombinationWinBet[];
  recognizedLotteryType?: string;
  lastAmount: number | '';
  anyPatternFound: boolean;
  errors: string[];
  // For highlighting
  validMatches: { start: number; end: number }[];
  invalidMatches: { start: number; end: number }[];
}

export interface ParsedSegment {
  lotteryType: string;
  originalInput: string;
  parsed: ParsedInput;
}

// Regular Expressions
const LOTTERY_ALIASES = '(?:旧澳门|新西西|老西西|旧西西|新cc|老cc|旧cc|新㏄|老㏄|旧㏄|新澳|老澳|香港|越南|泰国|海天|巴黎|迪拜|七星|印度|金沙|澳大|奥大|新c|老c|旧c|cc|西西|旧澳|旧奥|㏄|c|旧|老|新|香|港|万合|万和)';
const BOUNDARY = '(?<=^|[\\s,，。；;.、/\\d\\n\\r*:\\uff1a]|' + lotteryTypes.join('|') + '|' + LOTTERY_ALIASES + ')';
const BOUNDARY_STRICT = '(?<=^|[\\s,，。；;、/\\n\\r*:\\uff1a]|' + lotteryTypes.join('|') + '|' + LOTTERY_ALIASES + ')';
const BOUNDARY_COMBO = '(?<=^|[\\s,，。；;.、/\\n\\r*:\\uff1a]|' + lotteryTypes.join('|') + '|' + LOTTERY_ALIASES + ')';
const LOOKAHEAD = '(?=$|[\\s,，。；;.](?:[二三四五2345两]?(?:连肖|连|连尾|不中|中)|平|[马蛇龙兔虎牛鼠猪狗鸡猴羊]*包|不中|特码|特肖|特|特碰|正码|合计|计|总计|共|总|' + lotteryTypes.join('|') + ')|(?:[二三四五2345两]?(?:连肖|连|连尾|不中|中)|平|[马蛇龙兔虎牛鼠猪狗鸡猴羊]*包|不中|特码|特肖|特|特碰|正码|合计|计|总计|共|总|' + lotteryTypes.join('|') + '))';
const LOOKAHEAD_LOOSE = '(?=$|[\\s,，。；;.、/！!！?？#特*:\\uff1a]|' + lotteryTypes.join('|') + '|[马蛇龙兔虎牛鼠猪狗鸡猴羊大小单双红绿蓝家野])';
const NOISE_PREFIX = '((?:(?!各|每|买|压|个|下注|各号|每号|平(?!码)|复(?!码)|连|拖|三中三|二中二|特碰|特肖|特码|包肖|平特|平肖|不中|六中|五中|四中|六肖|五肖|四肖|6中|5中|4中|二尾|三尾|四尾|五尾|两尾|连肖|连尾)[0-9,，。；;.、/ \\t\\+\\-\\(\\)\\[\\]\\{\\}\\*:\\uff1a\\u4e00-\u9fa5])+?)';

export const REGEX_MULTI_TAIL_ADVANCED = new RegExp(BOUNDARY + '(?:([二三四五2345两])?连尾|([二三四五两])尾)((?:(?:\\s*)(?:\\d[\\s,，。；;.、/\\-*]*){2,10}[^\\d\\n\\r各每号]*?(?:\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:元|块|米|个|元|块|斤|文|闷)?)+)', 'g');
export const REGEX_SIX_ZODIAC = new RegExp(BOUNDARY + '(?:六中|六肖|6中)((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\\-*]*){6})[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(?:各|每|买|压|个)?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_COMBINATION_WIN = new RegExp(BOUNDARY_COMBO + '(?=[^\\n\\r]*?(?:三中三|二中二|特碰))(?:(三中三二中二|二中二三中三|三中三|二中二|特碰)[^\\d\\n\\r]*?(?:复试|复式|复)?)?((?:(?:\\d{1,2}尾|[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]|\\d{1,2})[\\s,，。；;.、/\\-*]*)+)(?:[^\\d\\n\\r]*?(?:复试|复式|复)?(三中三二中二|二中二三中三|三中三|二中二|特碰)(?:复试|复式|复)?)?[^\\d\\n\\r]*?(?:每组各|各|每|买|压|个)?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖|拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_COMBINATION_TUO = new RegExp(BOUNDARY_COMBO + '(?=[^\\n\\r]*?(?:三中三|二中二|特碰))(?:(三中三二中二|二中二三中三|三中三|二中二|特碰)[^\\d\\n\\r]*?)?((?:(?:\\d{1,2}尾|[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]|\\d{1,2})[\\s,，。；;.、/\\-*]*)+)拖((?:(?:\\d{1,2}尾|[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]|\\d{1,2})[\\s,，。；;.、/\\-*]*)+)(?:[^\\d\\n\\r]*?(三中三二中二|二中二三中三|三中三|二中二|特碰))?[^\\d\\n\\r]*?(?:每组各|各|每|买|压|个)?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖|拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_FIVE_ZODIAC = new RegExp(BOUNDARY + '(?:五中|五肖|5中)((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\\-*]*){5})[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(?:各|每|买|压|个)?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_FOUR_ZODIAC = new RegExp(BOUNDARY + '(?:四中|四肖|4中)((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\\-*]*){4})[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(?:各|每|买|压|个)?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_MULTI_ZODIAC = new RegExp(BOUNDARY + '((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\\-*]*){2,12})(?<![二三四五六七八九十2-9]|10|两)(?:连肖|连)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(?:各|每|买|压|个)?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖|拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_MULTI_ZODIAC_ADVANCED = new RegExp(BOUNDARY + '(?:平特)?(?:([二三四五六23456两])(?:连肖|连(?!尾)|连买|买)|([二三四五六23456两])肖|(?<![二三四五六23456两])(连肖|连(?!尾)))((?:(?:\\s*)[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\\-*]*){2,12}[^\\d\\n\\r各每号]*?(?:\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:元|块|米|个|元|块|斤|文|闷)?)+', 'g');
export const REGEX_MULTI_ZODIAC_HABIT = new RegExp(BOUNDARY + '((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\\-*]*){2,12})(?:([二三四五六23456两])(连肖|连|肖))[^\\d\\n\\r]*?(?:复试|复式|复)(?:([二三四五六23456两])(连肖|连|肖))[^\\d\\n\\r]*?(?:各|每|买|压|个)?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_MULTI_ZODIAC_V2 = new RegExp(BOUNDARY + '((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\\-*]*){2,12})[^\\d\\n\\r]*?(' + 
  '(?:复试|复式|复)[^\\d\\n\\r]*?(?:[二三四五六七八九十2-9]|10|两)?(?:连肖|连|连各|连每)?' + 
  '|' +
  '(?:[二三四五六七八九十2-9]|10|两)(?:连肖|连|连各|连每|肖)' + 
  '|' +
  '(?<![二三四五六七八九十2-9]|10|两)(?:连肖|连|连各|连每)' + 
  ')' + 
  '[^\\d\\n\\r]*?(?:各组|每组)?[^\\d\\n\\r]*?(?:各|每|买|压|个)?[^\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_MULTI_ZODIAC_MULTI_GROUP = new RegExp(BOUNDARY + '([二三四五六23456两])(连肖|连|肖)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]{2,12}[，,、\\s]+)+[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]{2,12})[^\\d\\n\\r]*?(?:各|每|买|压|个)?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_NOT_IN = new RegExp(BOUNDARY_STRICT + '(\\d+|[一二三四五六七八九十]+)(?:不中|中)[^\\d]*?(\\d+(?:[\\s,，。；;.、/\\-*]+\\d+)*)[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_NOT_IN_REVERSE = new RegExp(BOUNDARY_STRICT + '(\\d+(?:[\\s,，。；;.、/\\-*]+\\d+)*)[^\\d]*?(\\d+|[一二三四五六七八九十]+)(?:不中|中)[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_BAO = new RegExp(BOUNDARY + '(?:(?:包肖|包|特码|特)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?([马蛇龙兔虎牛鼠猪狗鸡猴羊家野]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊家野]+)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(?:包肖|包|特码|特))(?:[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(各|每|买|压|个))?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_TE_XIAO = new RegExp(BOUNDARY + '(?:(?:特肖)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?([马蛇龙兔虎牛鼠猪狗鸡猴羊家野]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊家野]+)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(?:特肖))(?:[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(各|每|买|压|个))?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_PING = new RegExp(BOUNDARY + '(?:(?:平特一肖|平特肖|平特|平肖|平)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?([马蛇龙兔虎牛鼠猪狗鸡猴羊家野]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊家野]+)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(?:平特一肖|平特肖|平特|平肖|平))(?:[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(各|每|买|压|个))?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_TAIL = new RegExp(BOUNDARY + '(?:平特|平)(\\d+)尾[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_MULTI_TAIL_V2 = new RegExp(BOUNDARY_STRICT + '(?:【?(\\d{2,10})】?)[^\\d]*?(?:各|每|买|压|个|包)?[^\\d]*?([二三四五2345两])?连尾[^\\d]*?(?:各|每|买|压|个|包)?[^\\d]*?(\\+?\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_MULTI_TAIL_V3 = new RegExp(BOUNDARY + '(?:([二三四五2345两])?连尾|([二三四五两])尾)(?:[\\-\\s,，。；;.]*?(\\d)尾[\\-\\s,，。；;.]*?(\\d)尾[\\-\\s,，。；;.]*?(\\d)尾(?:[\\-\\s,，。；;.]*?(\\d)尾)?(?:[\\-\\s,，。；;.]*?(\\d)尾)?)[^\\d]*?(?:各|每|买|压|个|包)?[^\\d]*?(\\+?\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_HEAD_TAIL = new RegExp(BOUNDARY + '(\\d+)(头|尾)[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_SPECIAL_ATTR = new RegExp(BOUNDARY + '(红波|蓝波|绿波|大数|小数|单数|双数)(?![^\\d\\n\\r]*?(?:各|每|买|压|个))[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_EACH = new RegExp(BOUNDARY_STRICT + NOISE_PREFIX + '(?:各号|每号|各|每|买|压|个|下注)[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?' + LOOKAHEAD_LOOSE, 'g');

export const REGEX_FLAT_NUMBER = new RegExp(BOUNDARY_STRICT + '(?:((?<!\\d)[\\d\\.\\s,，。；;./+&|\\-*]+)(?:平码|独平)(?:各|每|买|压|个)?(\\d+(?:\\.\\d+)?)|(?:平码|独平)([\\d\\.\\s,，。；;./+&|\\-*]+)-(?:各|每|买|压|个)?(\\d+(?:\\.\\d+)?)|(?:平码|独平)((?<!\\d)[\\d\\.\\s,，。；;./+&|\\-*]+)(?:各|每|买|压|个)(\\d+(?:\\.\\d+)?))(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_TUO_ZODIAC = new RegExp(BOUNDARY + '([二三四五2345两])拖([马蛇龙兔虎牛鼠猪狗鸡猴羊家野]{2,12})[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_TUO_ZODIAC_V3 = new RegExp(BOUNDARY + '((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\\-*]*)+)拖((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\\-*]*)+)([二三四五六七八九十2345678910两])(?:连肖|连|连各|连每)?(?:各组|每组)?[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_TUO_ZODIAC_V4 = new RegExp(BOUNDARY + '(?<!\\d)([二三四五2345两])(?:连肖|连|连各|连每)?((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\\-*]*)+)拖((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\\-*]*)+)[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_GENERIC = new RegExp(BOUNDARY_STRICT + '((?:(?!各|每|买|压|个|下注|各号|每号|平(?!码)|复(?!码)|连|拖|三中三|二中二|特碰|特肖|特码|包肖|平特|平肖|不中|六中|五中|四中|六肖|五肖|四肖|6中|5中|4中|二尾|三尾|四尾|五尾|两尾|连肖|连尾)[0-9,，。；;.、/ \\t\\+\\-\\(\\)\\[\\]\\{\\}\\*:\\uff1a\\u4e00-\u9fa5])*?(?:大|小|单|双|红|绿|蓝|家|野|合单|合双)+)[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|#)?' + LOOKAHEAD_LOOSE, 'g');

export const normalizeLotteryTypes = (text: string): string => {
  let processedText = text;
  processedText = processedText.replace(/奥大/g, '澳大');
  
  // 1. Normalize '老cc' aliases first to avoid partial 'cc' match.
  // Preserve length by padding with spaces if needed.
  processedText = processedText.replace(/(?:[旧老]\s*[cC㏄]{2}|[旧老]\s*西西)/gi, (m) => '老cc' + ' '.repeat(Math.max(0, m.length - 3)));
  processedText = processedText.replace(/(?:[旧老]\s*[cC㏄])/gi, (m) => '老c' + ' '.repeat(Math.max(0, m.length - 2)));
  
  // 2. Normalize 'cc' aliases.
  processedText = processedText.replace(/(?:新\s*[cC㏄]{1,2}|(?:新\s*)?西西|[cC㏄]{2})/gi, (m) => 'cc' + ' '.repeat(Math.max(0, m.length - 2)));
  
  // 3. New aliases: map to standard types but PRESERVE LENGTH to avoid highlighting offset.
  processedText = processedText.replace(/旧澳门/g, '老澳 ');
  processedText = processedText.replace(/旧澳/g, '老澳');
  processedText = processedText.replace(/旧奥/g, '老澳');
  processedText = processedText.replace(/旧/g, '老');
  
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
    parsedTeXiaoBets: {},
    parsedTailBets: {},
    parsedSpecialAttributeBets: {},
    parsedMultiZodiacBets: [],
    parsedSixZodiacBets: [],
    parsedFiveZodiacBets: [],
    parsedFourZodiacBets: [],
    parsedMultiTailBets: [],
    parsedNotInBets: [],
    parsedCombinationWinBets: [],
    lastAmount: '',
    anyPatternFound: false,
    errors: [],
    validMatches: [],
    invalidMatches: []
  };

  const expandZodiacs = (str: string): string[] => {
    const tokens: string[] = [];
    for (const char of str) {
      if (zodiacs.includes(char)) {
        tokens.push(char);
      } else if (char === '家') {
        tokens.push(...domesticZodiacs);
      } else if (char === '野') {
        tokens.push(...wildZodiacs);
      }
    }
    return tokens;
  };

  if (!inputText.trim()) return result;

  let textForPatterns = normalizeLotteryTypes(inputText);
  
  // Pre-processing
  textForPatterns = textForPatterns.replace(/免/g, '兔');
  textForPatterns = textForPatterns.replace(/兰/g, '蓝');
  textForPatterns = textForPatterns.replace(/侯/g, '猴');

  // Identify Lottery Type using a regex that includes aliases
  const typeRegex = new RegExp(`(${lotteryTypes.join('|')}|${LOTTERY_ALIASES})`, 'i');
  const typeMatch = textForPatterns.match(typeRegex);
  if (typeMatch) {
    const matchedText = typeMatch[1];
    // Map the matched alias to the standard type
    let standardType = matchedText;
    const lowerMatched = matchedText.toLowerCase();
    if (/^[旧老]/.test(matchedText) && /[cC㏄]/.test(matchedText)) standardType = '老cc';
    else if (/^新/.test(matchedText) && /[cC㏄]/.test(matchedText)) standardType = 'cc';
    else if (/^[旧老]/.test(matchedText)) standardType = '老澳';
    else if (/^新/.test(matchedText)) standardType = '新澳';
    else if (/^[香港]/.test(matchedText)) standardType = '香港';
    else if (lowerMatched === 'cc' || lowerMatched === 'c' || lowerMatched === '㏄') standardType = 'cc';
    else if (matchedText === '万合' || matchedText === '万和') standardType = '越南';
    else if (matchedText === '奥大') standardType = '澳大';
    
    // Ensure standardType is one of the recognized types
    const lowerStandard = standardType.toLowerCase();
    const exactMatch = lotteryTypes.find(t => t.toLowerCase() === lowerStandard);
    if (exactMatch) {
      result.recognizedLotteryType = exactMatch;
    } else {
      // Fallback: find the best match in lotteryTypes
      const bestMatch = lotteryTypes.find(t => 
        t.toLowerCase().includes(lowerStandard) || 
        lowerStandard.includes(t.toLowerCase())
      );
      if (bestMatch) result.recognizedLotteryType = bestMatch;
    }
    
    // Replace with spaces to preserve length
    textForPatterns = textForPatterns.replace(matchedText, ' '.repeat(matchedText.length));
  }

  const getNumbersForZodiac = (zodiac: string): number[] => {
    return numbers.filter(n => getZodiacFromNumber(n) === zodiac);
  };

  const parsePrefix = (prefix: string): number[][] => {
    const subPrefixes = prefix.split(/[\s\+\.\,，。；;\/&|\-\*:\uff1a]+/).filter(Boolean);
    const allBets: number[][] = [];

    subPrefixes.forEach(sub => {
      const bases: number[][] = [];
      
      // 1. Extract Bases (Numbers, Zodiacs, Head/Tail)
      // Head/Tail
      const headMatches = sub.match(/(\d+)头/g);
      if (headMatches) {
        headMatches.forEach(m => {
          const digits = m.match(/(\d+)头/)![1].split('');
          digits.forEach(digit => {
            const d = parseInt(digit);
            const nums: number[] = [];
            if (d === 0) nums.push(...[1, 2, 3, 4, 5, 6, 7, 8, 9]);
            else if (d >= 1 && d <= 4) {
              for (let i = d * 10; i < (d + 1) * 10 && i <= 49; i++) nums.push(i);
            }
            if (nums.length > 0) bases.push(nums);
          });
        });
      }

      const tailMatches = sub.match(/(\d+)尾/g);
      if (tailMatches) {
        tailMatches.forEach(m => {
          const d = parseInt(m.match(/(\d+)尾/)![1]);
          const nums: number[] = [];
          for (let i = 1; i <= 49; i++) if (i % 10 === d) nums.push(i);
          if (nums.length > 0) bases.push(nums);
        });
      }

      // Numbers
      let tempSub = sub.replace(/\d+头/g, '').replace(/\d+尾/g, '');
      const numMatches = tempSub.match(/\d+/g);
      if (numMatches) {
        numMatches.forEach(n => {
          const val = parseInt(n);
          if (val >= 1 && val <= 49) bases.push([val]);
        });
      }

      // Zodiacs
      const zodiacMatches = sub.match(/[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]/g);
      if (zodiacMatches) {
        zodiacMatches.forEach(z => {
          if (z === '家') {
            domesticZodiacs.forEach(dz => bases.push(getNumbersForZodiac(dz)));
          } else if (z === '野') {
            wildZodiacs.forEach(wz => bases.push(getNumbersForZodiac(wz)));
          } else {
            bases.push(getNumbersForZodiac(z));
          }
        });
      }

      // 2. Extract Modifiers
      const colors = ['红', '绿', '蓝'].filter(c => sub.includes(c));
      const sizes = ['大', '小'].filter(s => sub.includes(s));
      const parities = ['单', '双'].filter(p => sub.replace(/合单/g, '').replace(/合双/g, '').includes(p));
      const sumParities = ['合单', '合双'].filter(sp => sub.includes(sp));

      // 3. Cartesian Product
      const baseOptions = bases.length > 0 ? bases : [numbers];
      const colorOptions = colors.length > 0 ? colors : [null];
      const sizeOptions = sizes.length > 0 ? sizes : [null];
      const parityOptions = parities.length > 0 ? parities : [null];
      const sumParityOptions = sumParities.length > 0 ? sumParities : [null];

      for (const b of baseOptions) {
        for (const c of colorOptions) {
          for (const s of sizeOptions) {
            for (const p of parityOptions) {
              for (const sp of sumParityOptions) {
                // If no modifiers were present and we used all numbers as base, skip (unless it's just a number/zodiac)
                if (bases.length === 0 && !c && !s && !p && !sp) continue;

                let filtered = [...b];
                if (c === '红') filtered = filtered.filter(n => redNumbers.includes(n));
                if (c === '绿') filtered = filtered.filter(n => greenNumbers.includes(n));
                if (c === '蓝') filtered = filtered.filter(n => blueNumbers.includes(n));
                
                if (s === '大') filtered = filtered.filter(n => n >= 25);
                if (s === '小') filtered = filtered.filter(n => n <= 24);
                
                if (p === '单') filtered = filtered.filter(n => n % 2 !== 0);
                if (p === '双') filtered = filtered.filter(n => n % 2 === 0);
                
                if (sp === '合单') filtered = filtered.filter(n => isSumOdd(n));
                if (sp === '合双') filtered = filtered.filter(n => isSumEven(n));

                if (filtered.length > 0) {
                  allBets.push(filtered);
                }
              }
            }
          }
        }
      }
    });

    return allBets;
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
    const lines = textForPatterns.split(/(\r?\n)/);
    let currentOffset = 0;
    for (const line of lines) {
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(line)) !== null) {
        const matchText = m[0];
        let offset = 0;
        // Skip leading punctuation/separators for highlighting and parsing
        while (offset < matchText.length && /[\s,，。；;.、/]/.test(matchText[offset])) {
          offset++;
        }

        allMatches.push({
          start: currentOffset + m.index + offset,
          end: currentOffset + m.index + matchText.length,
          type,
          groups: Array.from(m),
          original: matchText.substring(offset)
        });
      }
      currentOffset += line.length;
    }
  };

  // Collect all matches
  const HEAVY_KEYWORDS = ['三中三', '二中二', '特碰', '连', '拖', '复试', '复式', '复', '六中', '五中', '四中', '六肖', '五肖', '四肖', '6中', '5中', '4中', '二尾', '三尾', '四尾', '五尾', '两尾'];
  const hasHeavyKeyword = HEAVY_KEYWORDS.some(kw => textForPatterns.includes(kw));

  if (hasHeavyKeyword) {
    addMatches(REGEX_MULTI_ZODIAC_MULTI_GROUP, 'MULTI_ZODIAC_MULTI_GROUP');
    addMatches(REGEX_MULTI_ZODIAC_ADVANCED, 'MULTI_ZODIAC_ADVANCED');
    addMatches(REGEX_MULTI_TAIL_ADVANCED, 'MULTI_TAIL_ADVANCED');
    addMatches(REGEX_TUO_ZODIAC, 'TUO_ZODIAC');
    addMatches(REGEX_TUO_ZODIAC_V3, 'TUO_ZODIAC_V3');
    addMatches(REGEX_TUO_ZODIAC_V4, 'TUO_ZODIAC_V4');
    addMatches(REGEX_SIX_ZODIAC, 'SIX_ZODIAC');
    addMatches(REGEX_COMBINATION_TUO, 'COMBINATION_TUO');
    addMatches(REGEX_COMBINATION_WIN, 'COMBINATION_WIN');
    addMatches(REGEX_FIVE_ZODIAC, 'FIVE_ZODIAC');
    addMatches(REGEX_FOUR_ZODIAC, 'FOUR_ZODIAC');
    addMatches(REGEX_MULTI_ZODIAC_HABIT, 'MULTI_ZODIAC_HABIT');
    addMatches(REGEX_MULTI_ZODIAC_V2, 'MULTI_ZODIAC_V2');
    addMatches(REGEX_MULTI_ZODIAC, 'MULTI_ZODIAC');
    addMatches(REGEX_MULTI_TAIL_V2, 'MULTI_TAIL_V2');
    addMatches(REGEX_MULTI_TAIL_V3, 'MULTI_TAIL_V3');
  }

  // Light patterns always run
  addMatches(REGEX_NOT_IN, 'NOT_IN');
  addMatches(REGEX_NOT_IN_REVERSE, 'NOT_IN_REVERSE');
  addMatches(REGEX_PING, 'PING');
  addMatches(REGEX_TE_XIAO, 'TE_XIAO');
  addMatches(REGEX_BAO, 'BAO');
  addMatches(REGEX_TAIL, 'TAIL');
  addMatches(REGEX_HEAD_TAIL, 'HEAD_TAIL');
  addMatches(REGEX_SPECIAL_ATTR, 'SPECIAL_ATTR');
  addMatches(REGEX_EACH, 'EACH');
  addMatches(REGEX_FLAT_NUMBER, 'FLAT_NUMBER');
  addMatches(REGEX_GENERIC, 'GENERIC');

  // Sort matches by start index
  allMatches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

  const processedRanges: { start: number; end: number }[] = [];
  const amountRanges: { start: number; end: number }[] = [];

  const isOverlapping = (start: number, end: number) => {
    return processedRanges.some(r => (start < r.end && end > r.start));
  };

  allMatches.forEach(match => {
    if (isOverlapping(match.start, match.end)) return;

    processedRanges.push({ start: match.start, end: match.end });
    result.validMatches.push({ start: match.start, end: match.end });
    result.anyPatternFound = true;

    const groups = match.groups;
    
    // Identify amount part to exclude from invalid number checks
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && !isNaN(Number(lastGroup.replace('+', '')))) {
      const amountStart = match.start + match.original.lastIndexOf(lastGroup);
      amountRanges.push({ start: amountStart, end: amountStart + lastGroup.length });
    }
    
    const createEmptyBetItem = (originalMatch: string): BetItem => ({
      text: originalMatch.trim(),
      numberDeltas: {},
      flatNumberDeltas: {},
      zodiacDeltas: {},
      teXiaoDeltas: {},
      tailDeltas: {},
      specialAttributeDeltas: {},
      multiZodiacBets: [],
      sixZodiacBets: [],
      fiveZodiacBets: [],
      fourZodiacBets: [],
      multiTailBets: [],
      notInBets: [],
      combinationWinBets: [],
      total: 0
    });

    const item = createEmptyBetItem(match.original);

    switch (match.type) {
      case 'SPECIAL_ATTR': {
        const attr = groups[1];
        const amt = chineseToNumber(groups[2]);
        item.specialAttributeDeltas[attr] = (item.specialAttributeDeltas[attr] || 0) + amt;
        item.total += amt;
        result.parsedSpecialAttributeBets[attr] = (result.parsedSpecialAttributeBets[attr] || 0) + amt;
        result.lastAmount = amt;
        break;
      }
      case 'SIX_ZODIAC': {
        const zodiacStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const selectedZodiacs = expandZodiacs(zodiacStr);
        const bet = { zodiacs: selectedZodiacs, amount: amt };
        item.sixZodiacBets.push(bet);
        item.total = amt;
        result.parsedSixZodiacBets.push(bet);
        result.lastAmount = amt;
        break;
      }
      case 'FIVE_ZODIAC': {
        const zodiacStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const selectedZodiacs = expandZodiacs(zodiacStr);
        const bet = { zodiacs: selectedZodiacs, amount: amt };
        item.fiveZodiacBets.push(bet);
        item.total = amt;
        result.parsedFiveZodiacBets.push(bet);
        result.lastAmount = amt;
        break;
      }
      case 'FOUR_ZODIAC': {
        const zodiacStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const selectedZodiacs = expandZodiacs(zodiacStr);
        const bet = { zodiacs: selectedZodiacs, amount: amt };
        item.fourZodiacBets.push(bet);
        item.total = amt;
        result.parsedFourZodiacBets.push(bet);
        result.lastAmount = amt;
        break;
      }
      case 'MULTI_ZODIAC_HABIT': {
        const zodiacStr = groups[1];
        const count1Str = groups[2];
        const type1Str = groups[3];
        const count2Str = groups[4];
        const type2Str = groups[5];
        const amt = chineseToNumber(groups[6]);
        
        const count1 = count1Str === '二' || count1Str === '2' || count1Str === '两' ? 2 :
                       count1Str === '三' || count1Str === '3' ? 3 :
                       count1Str === '四' || count1Str === '4' ? 4 :
                       count1Str === '五' || count1Str === '5' ? 5 :
                       count1Str === '六' || count1Str === '6' ? 6 : 2;
        
        const count2 = count2Str === '二' || count2Str === '2' || count2Str === '两' ? 2 :
                       count2Str === '三' || count2Str === '3' ? 3 :
                       count2Str === '四' || count2Str === '4' ? 4 :
                       count2Str === '五' || count2Str === '5' ? 5 :
                       count2Str === '六' || count2Str === '6' ? 6 : 2;
        
        const selectedZodiacs = expandZodiacs(zodiacStr);
        
        // First part: count1-zodiac bet
        if (selectedZodiacs.length >= count1) {
          const combs = getCombinations<string>(selectedZodiacs, count1);
          const isXiaoOnly = type1Str === '肖';
          const bet: MultiZodiacBet = { 
            zodiacs: selectedZodiacs, 
            amount: amt,
            type: `${count1}${isXiaoOnly ? '肖' : '连'}`,
            tuoCount: combs.length,
            tuoGroups: combs
          };
          if (isXiaoOnly && count1 === 4) {
            item.fourZodiacBets.push(bet);
            result.parsedFourZodiacBets.push(bet);
          } else if (isXiaoOnly && count1 === 5) {
            item.fiveZodiacBets.push(bet);
            result.parsedFiveZodiacBets.push(bet);
          } else if (isXiaoOnly && count1 === 6) {
            item.sixZodiacBets.push(bet);
            result.parsedSixZodiacBets.push(bet);
          } else {
            item.multiZodiacBets.push(bet);
            result.parsedMultiZodiacBets.push(bet);
          }
          item.total += amt * combs.length;
        }
        
        // Second part: count2-zodiac bet
        if (selectedZodiacs.length >= count2) {
          const combs = getCombinations<string>(selectedZodiacs, count2);
          const isXiaoOnly = type2Str === '肖';
          const bet: MultiZodiacBet = { 
            zodiacs: selectedZodiacs, 
            amount: amt,
            type: `${count2}${isXiaoOnly ? '肖' : '连'}`,
            tuoCount: combs.length,
            tuoGroups: combs
          };
          if (isXiaoOnly && count2 === 4) {
            item.fourZodiacBets.push(bet);
            result.parsedFourZodiacBets.push(bet);
          } else if (isXiaoOnly && count2 === 5) {
            item.fiveZodiacBets.push(bet);
            result.parsedFiveZodiacBets.push(bet);
          } else if (isXiaoOnly && count2 === 6) {
            item.sixZodiacBets.push(bet);
            result.parsedSixZodiacBets.push(bet);
          } else {
            item.multiZodiacBets.push(bet);
            result.parsedMultiZodiacBets.push(bet);
          }
          item.total += amt * combs.length;
        }
        
        result.lastAmount = amt;
        break;
      }
      case 'MULTI_ZODIAC_MULTI_GROUP': {
        const countStr = groups[1];
        const typeStr = groups[2];
        const allZodiacsStr = groups[3];
        const amt = chineseToNumber(groups[4]);
        const isLian = typeStr.includes('连');
        const isXiaoOnly = typeStr === '肖';
        
        const count = countStr === '二' || countStr === '2' || countStr === '两' ? 2 :
                      countStr === '三' || countStr === '3' ? 3 :
                      countStr === '四' || countStr === '4' ? 4 :
                      countStr === '五' || countStr === '5' ? 5 :
                      countStr === '六' || countStr === '6' ? 6 : 2;
        
        const zodiacGroups = allZodiacsStr.split(/[，,、\s]+/).filter(s => s.length > 0);
        
        zodiacGroups.forEach(zStr => {
          const selectedZodiacs = expandZodiacs(zStr);
          if (selectedZodiacs.length >= count) {
            const combs = getCombinations<string>(selectedZodiacs, count);
            const isCompound = selectedZodiacs.length > count;
            
            if (isCompound) {
              const bet: MultiZodiacBet = {
                zodiacs: selectedZodiacs,
                amount: amt,
                type: `${count}${isLian ? '连' : '肖'}`,
                tuoCount: combs.length,
                tuoGroups: combs
              };
              if (isXiaoOnly && count === 4) {
                item.fourZodiacBets.push(bet);
                result.parsedFourZodiacBets.push(bet);
              } else if (isXiaoOnly && count === 5) {
                item.fiveZodiacBets.push(bet);
                result.parsedFiveZodiacBets.push(bet);
              } else if (isXiaoOnly && count === 6) {
                item.sixZodiacBets.push(bet);
                result.parsedSixZodiacBets.push(bet);
              } else {
                item.multiZodiacBets.push(bet);
                result.parsedMultiZodiacBets.push(bet);
              }
              item.total += amt * combs.length;
            } else {
              combs.forEach(c => {
                const bet = { zodiacs: c, amount: amt };
                if (isXiaoOnly && count === 4) {
                  item.fourZodiacBets.push(bet);
                  result.parsedFourZodiacBets.push(bet);
                } else if (isXiaoOnly && count === 5) {
                  item.fiveZodiacBets.push(bet);
                  result.parsedFiveZodiacBets.push(bet);
                } else if (isXiaoOnly && count === 6) {
                  item.sixZodiacBets.push(bet);
                  result.parsedSixZodiacBets.push(bet);
                } else {
                  item.multiZodiacBets.push(bet);
                  result.parsedMultiZodiacBets.push(bet);
                }
                item.total += amt;
              });
            }
          }
        });
        
        result.lastAmount = amt;
        break;
      }
      case 'MULTI_ZODIAC_V2': {
        const zodiacStr = groups[1];
        const featurePart = groups[2];
        
        const selectedZodiacs = expandZodiacs(zodiacStr);

        // Extract count from featurePart
        let count = selectedZodiacs.length;
        const countMatch = featurePart.match(/([二三四五六七八九十2-9]|10|两)/);
        if (countMatch) {
          const countStr = countMatch[1];
          count = isNaN(parseInt(countStr)) ? chineseToNumber(countStr) : parseInt(countStr);
        }
        
        const amt = chineseToNumber(groups[3]);
        const isXiaoOnly = featurePart.includes('肖') && !featurePart.includes('连');
        
        if (selectedZodiacs.length >= count) {
          const combs = getCombinations<string>(selectedZodiacs, count);
          const isCompound = selectedZodiacs.length > count;
          
          if (isCompound) {
            const bet: MultiZodiacBet = {
              zodiacs: selectedZodiacs,
              amount: amt,
              type: `${count}${isXiaoOnly ? '肖' : '连'}`,
              tuoCount: combs.length,
              tuoGroups: combs
            };
            if (isXiaoOnly && count === 4) {
              item.fourZodiacBets.push(bet);
              result.parsedFourZodiacBets.push(bet);
            } else if (isXiaoOnly && count === 5) {
              item.fiveZodiacBets.push(bet);
              result.parsedFiveZodiacBets.push(bet);
            } else if (isXiaoOnly && count === 6) {
              item.sixZodiacBets.push(bet);
              result.parsedSixZodiacBets.push(bet);
            } else {
              item.multiZodiacBets.push(bet);
              result.parsedMultiZodiacBets.push(bet);
            }
            item.total += amt * combs.length;
          } else {
            combs.forEach(c => {
              const bet = { zodiacs: c, amount: amt };
              if (isXiaoOnly && count === 4) {
                item.fourZodiacBets.push(bet);
                result.parsedFourZodiacBets.push(bet);
              } else if (isXiaoOnly && count === 5) {
                item.fiveZodiacBets.push(bet);
                result.parsedFiveZodiacBets.push(bet);
              } else if (isXiaoOnly && count === 6) {
                item.sixZodiacBets.push(bet);
                result.parsedSixZodiacBets.push(bet);
              } else {
                item.multiZodiacBets.push(bet);
                result.parsedMultiZodiacBets.push(bet);
              }
              item.total += amt;
            });
          }
          result.lastAmount = amt;
        }
        break;
      }
      case 'MULTI_ZODIAC_ADVANCED': {
        const countStr = groups[1] || groups[2] || groups[3];
        const isXiaoOnly = !!groups[2];
        const count = countStr === '二' || countStr === '2' || countStr === '两' ? 2 :
                      countStr === '三' || countStr === '3' ? 3 :
                      countStr === '四' || countStr === '4' ? 4 :
                      countStr === '五' || countStr === '5' ? 5 :
                      countStr === '六' || countStr === '6' ? 6 : 2;
        const content = groups[4];
        
        const innerRegex = /(?:\s*)((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\-*]*){2,12})[^\d\n\r各每号]*?(\d+(?:\.\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:元|块|米|个|元|块|斤|文|闷)?/g;
        let m;
        while ((m = innerRegex.exec(content)) !== null) {
          const zodiacStr = m[1];
          const amt = chineseToNumber(m[2]);
          const zodiacsInEntry = expandZodiacs(zodiacStr);
          if (zodiacsInEntry.length >= count) {
            const combs = getCombinations<string>(zodiacsInEntry, count);
            const isCompound = zodiacsInEntry.length > count;
            
            if (isCompound) {
              const bet: MultiZodiacBet = {
                zodiacs: zodiacsInEntry,
                amount: amt,
                type: `${count}${isXiaoOnly ? '肖' : '连'}`,
                tuoCount: combs.length,
                tuoGroups: combs
              };
              if (isXiaoOnly && count === 4) {
                item.fourZodiacBets.push(bet);
                result.parsedFourZodiacBets.push(bet);
              } else if (isXiaoOnly && count === 5) {
                item.fiveZodiacBets.push(bet);
                result.parsedFiveZodiacBets.push(bet);
              } else if (isXiaoOnly && count === 6) {
                item.sixZodiacBets.push(bet);
                result.parsedSixZodiacBets.push(bet);
              } else {
                item.multiZodiacBets.push(bet);
                result.parsedMultiZodiacBets.push(bet);
              }
              item.total += amt * combs.length;
            } else {
              combs.forEach(c => {
                const bet = { zodiacs: c, amount: amt };
                if (isXiaoOnly && count === 4) {
                  item.fourZodiacBets.push(bet);
                  result.parsedFourZodiacBets.push(bet);
                } else if (isXiaoOnly && count === 5) {
                  item.fiveZodiacBets.push(bet);
                  result.parsedFiveZodiacBets.push(bet);
                } else if (isXiaoOnly && count === 6) {
                  item.sixZodiacBets.push(bet);
                  result.parsedSixZodiacBets.push(bet);
                } else {
                  item.multiZodiacBets.push(bet);
                  result.parsedMultiZodiacBets.push(bet);
                }
                item.total += amt;
              });
            }
          }
        }
        result.lastAmount = 0;
        break;
      }
      case 'MULTI_ZODIAC': {
        const zodiacStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const selectedZodiacs = expandZodiacs(zodiacStr);
        const bet = { zodiacs: selectedZodiacs, amount: amt };
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
        const selectedZodiacs = expandZodiacs(zodiacStr);
        if (selectedZodiacs.length >= count) {
          const combs = getCombinations<string>(selectedZodiacs, count);
          const isCompound = selectedZodiacs.length > count;
          
          if (isCompound) {
            const bet: MultiZodiacBet = {
              zodiacs: selectedZodiacs,
              amount: amt,
              type: `${count}连`,
              tuoCount: combs.length,
              tuoGroups: combs
            };
            item.multiZodiacBets.push(bet);
            item.total += amt * combs.length;
            result.parsedMultiZodiacBets.push(bet);
          } else {
            combs.forEach(c => {
              const bet = { zodiacs: c, amount: amt };
              item.multiZodiacBets.push(bet);
              item.total += amt;
              result.parsedMultiZodiacBets.push(bet);
            });
          }
          result.lastAmount = amt;
        }
        break;
      }
      case 'TUO_ZODIAC_V3':
      case 'TUO_ZODIAC_V4': {
        const getZodiacTokens = (str: string): string[] => {
          const tokens: string[] = [];
          const matches = str.match(/[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]/g);
          if (matches) {
            matches.forEach(m => {
              if (m === '家') tokens.push(...domesticZodiacs);
              else if (m === '野') tokens.push(...wildZodiacs);
              else tokens.push(m);
            });
          }
          return tokens;
        };

        const baseZodiacs = getZodiacTokens(match.type === 'TUO_ZODIAC_V3' ? groups[1] : groups[2]);
        const trailingZodiacs = getZodiacTokens(match.type === 'TUO_ZODIAC_V3' ? groups[2] : groups[3]);
        const countStr = match.type === 'TUO_ZODIAC_V3' ? groups[3] : groups[1];
        const count = isNaN(parseInt(countStr)) ? chineseToNumber(countStr) : parseInt(countStr);
        const amt = chineseToNumber(match.type === 'TUO_ZODIAC_V3' ? groups[4] : groups[4]);
        
        const needed = count - baseZodiacs.length;
        if (needed > 0 && trailingZodiacs.length >= needed) {
          const combs = getCombinations<string>(trailingZodiacs, needed);
          const bet: MultiZodiacBet = {
            zodiacs: [...baseZodiacs, ...trailingZodiacs],
            amount: amt,
            type: `${count}连`,
            isTuo: true,
            tuoBase: baseZodiacs.join(''),
            tuoFollowers: trailingZodiacs.join(''),
            tuoCount: combs.length,
            tuoGroups: combs.map(c => [...baseZodiacs, ...c])
          };
          item.multiZodiacBets.push(bet);
          item.total += amt * combs.length;
          result.parsedMultiZodiacBets.push(bet);
          result.lastAmount = amt;
        }
        break;
      }
      case 'NOT_IN':
      case 'NOT_IN_REVERSE': {
        const isReverse = match.type === 'NOT_IN_REVERSE';
        const xStr = isReverse ? groups[2] : groups[1];
        const content = isReverse ? groups[1] : groups[2];
        const amt = chineseToNumber(groups[3]);
        
        const x = chineseToNumber(xStr);
        const nums = content.match(/\d+/g)?.map(Number).filter(n => n >= 1 && n <= 49) || [];
        
        if (nums.length === x) {
          const bet = { x, numbers: nums, amount: amt };
          item.notInBets.push(bet);
          item.total = amt;
          result.parsedNotInBets.push(bet);
          result.lastAmount = amt;
        } else if (nums.length > x) {
          result.errors.push(`${x}不中号码过多 (当前${nums.length}个)`);
        } else {
          result.errors.push(`${x}不中号码不足 (当前${nums.length}个)`);
        }
        break;
      }
      case 'BAO': {
        const zodiacStr = groups[1] || groups[2];
        const isEach = !!groups[3];
        const amt = chineseToNumber(groups[4]);
        const tokens = expandZodiacs(zodiacStr);
        tokens.forEach(z => {
          if (zodiacs.includes(z)) {
            const nums = getNumbersForZodiac(z);
            if (nums.length > 0) {
              const amtPerNum = isEach ? amt : (amt / nums.length);
              nums.forEach(n => {
                item.numberDeltas[n] = (item.numberDeltas[n] || 0) + amtPerNum;
                result.parsedBets[n] = (result.parsedBets[n] || 0) + amtPerNum;
                result.selectedNumbers.add(n);
              });
              item.total += isEach ? (amt * nums.length) : amt;
            }
          }
        });
        result.lastAmount = amt;
        break;
      }
      case 'TE_XIAO': {
        const zodiacStr = groups[1] || groups[2];
        const isEach = !!groups[3];
        const amt = chineseToNumber(groups[4]);
        const tokens = expandZodiacs(zodiacStr);
        tokens.forEach(z => {
          if (zodiacs.includes(z)) {
            item.teXiaoDeltas[z] = (item.teXiaoDeltas[z] || 0) + amt;
            item.total += amt;
            result.parsedTeXiaoBets[z] = (result.parsedTeXiaoBets[z] || 0) + amt;
          }
        });
        result.lastAmount = amt;
        break;
      }
      case 'PING': {
        const zodiacStr = groups[1] || groups[2];
        const amt = chineseToNumber(groups[4]);
        const tokens = expandZodiacs(zodiacStr);
        tokens.forEach(z => {
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
        const tailStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const tails = tailStr.split('').map(Number);
        let totalAmt = 0;
        tails.forEach(tail => {
          item.tailDeltas[tail] = (item.tailDeltas[tail] || 0) + amt;
          totalAmt += amt;
          result.parsedTailBets[tail] = (result.parsedTailBets[tail] || 0) + amt;
        });
        item.total = totalAmt;
        result.lastAmount = amt;
        break;
      }
      case 'MULTI_TAIL_V2': {
        const tailStr = groups[1];
        const countStr = groups[2];
        const count = !countStr ? tailStr.length : (isNaN(parseInt(countStr)) ? chineseToNumber(countStr) : parseInt(countStr));
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
        
        const innerRegex = /(?:\s*)((?:\d[\s,，。；;.、/\-*]*){2,10})[^\d\n\r各每号]*?(\d+(?:\.\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:元|块|米|个|元|块|斤|文|闷)?/g;
        let m;
        while ((m = innerRegex.exec(content)) !== null) {
          const tailStr = m[1];
          const amt = chineseToNumber(m[2]);
          const selectedTails = tailStr.split('').filter(t => /\d/.test(t));
          if (selectedTails.length >= count) {
            const combs = getCombinations<string>(selectedTails, count);
            combs.forEach(c => {
              const bet = { zodiacs: c, amount: amt };
              item.multiTailBets.push(bet);
              item.total += amt;
              result.parsedMultiTailBets.push(bet);
            });
          }
        }
        result.lastAmount = 0;
        break;
      }
      case 'COMBINATION_TUO': {
        const typeStart = groups[1];
        const baseStr = groups[2];
        const followerStr = groups[3];
        const typeEnd = groups[4];
        const amt = chineseToNumber(groups[5]);

        const typeStr = typeStart || typeEnd || '';
        const types: ('三中三' | '二中二' | '特碰')[] = [];
        if (typeStr.includes('三中三')) types.push('三中三');
        if (typeStr.includes('二中二')) types.push('二中二');
        if (typeStr.includes('特碰')) types.push('特碰');

        const getTokens = (str: string): string[] => {
          const tokens: string[] = [];
          const matches = str.match(/\d{1,2}尾|[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]|\d{1,2}/g);
          if (matches) {
            matches.forEach(m => {
              if (m === '家') tokens.push(...domesticZodiacs);
              else if (m === '野') tokens.push(...wildZodiacs);
              else tokens.push(m);
            });
          }
          return tokens;
        };

        const baseTokens = getTokens(baseStr);
        const followerTokens = getTokens(followerStr);

        const getNumbersForToken = (t: string): number[] => {
          if (t.endsWith('尾')) {
            const tail = parseInt(t);
            return numbers.filter(n => n % 10 === tail);
          }
          if (/\d/.test(t)) {
            return [parseInt(t)];
          }
          return getNumbersForZodiac(t);
        };

        // Expand follower tokens into a single set of numbers
        const followerNumbers: number[] = [];
        followerTokens.forEach(t => {
          followerNumbers.push(...getNumbersForToken(t));
        });
        const uniqueFollowers = Array.from(new Set(followerNumbers));

        types.forEach(type => {
          const targetSize = type === '三中三' ? 3 : 2;
          const k = baseTokens.length;
          const needed = targetSize - k;

          if (needed > 0 && uniqueFollowers.length >= needed) {
            // Get all combinations of picking 1 number from each base token
            const baseSets = baseTokens.map(t => getNumbersForToken(t));

            // Cartesian product of baseSets
            function cartesianProduct<T>(arrays: T[][]): T[][] {
              return arrays.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat() as T[])), [[]] as T[][]);
            }

            const baseCombs = cartesianProduct(baseSets);
            const followerCombs = getCombinations<number>(uniqueFollowers, needed);

            const seenGroups = new Set<string>();
            const allTuoGroups: number[][] = [];
            baseCombs.forEach(bc => {
              followerCombs.forEach(fc => {
                const combined = Array.from(new Set([...bc, ...fc])).sort((a, b) => a - b);
                if (combined.length === targetSize) {
                  const key = combined.join(',');
                  if (!seenGroups.has(key)) {
                    seenGroups.add(key);
                    allTuoGroups.push(combined);
                  }
                }
              });
            });

            if (allTuoGroups.length > 0) {
              const bet: CombinationWinBet = {
                type,
                numbers: allTuoGroups[0],
                amount: amt,
                isTuo: true,
                tuoBase: baseStr.trim(),
                tuoFollowers: followerStr.trim(),
                tuoCount: allTuoGroups.length,
                tuoGroups: allTuoGroups
              };
              item.combinationWinBets.push(bet);
              item.total += amt * allTuoGroups.length;
              result.parsedCombinationWinBets.push(bet);
            }
          }
        });
        result.lastAmount = amt;
        break;
      }
      case 'COMBINATION_WIN': {
        const typeStart = groups[1];
        const numsStr = groups[2];
        const typeEnd = groups[3];
        const amt = chineseToNumber(groups[4]);
        
        const typeStr = typeStart || typeEnd || '';
        const types: ('三中三' | '二中二' | '特碰')[] = [];
        if (typeStr.includes('三中三')) types.push('三中三');
        if (typeStr.includes('二中二')) types.push('二中二');
        if (typeStr.includes('特碰')) types.push('特碰');

        const getTokens = (str: string): string[] => {
          const tokens: string[] = [];
          const matches = str.match(/\d{1,2}尾|[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]|\d{1,2}/g);
          if (matches) {
            matches.forEach(m => {
              if (m === '家') tokens.push(...domesticZodiacs);
              else if (m === '野') tokens.push(...wildZodiacs);
              else tokens.push(m);
            });
          }
          return tokens;
        };

        const getNumbersForToken = (t: string): number[] => {
          if (t.endsWith('尾')) {
            const tail = parseInt(t);
            return numbers.filter(n => n % 10 === tail);
          }
          if (/\d/.test(t)) {
            return [parseInt(t)];
          }
          return getNumbersForZodiac(t);
        };

        const tokens = getTokens(numsStr);
        const allNumbers: number[] = [];
        tokens.forEach(t => {
          allNumbers.push(...getNumbersForToken(t));
        });
        const uniqueNumbers = Array.from(new Set(allNumbers)).sort((a, b) => a - b);

        types.forEach(type => {
          const typeItem = createEmptyBetItem(`${typeStart || ''}${numsStr}${typeEnd || ''}${groups[4]}`);
          const count = type === '三中三' ? 3 : 2;
          
          if (uniqueNumbers.length === count) {
            // Single bet
            const bet = { type, numbers: uniqueNumbers, amount: amt };
            typeItem.combinationWinBets.push(bet);
            typeItem.total += amt;
            result.parsedCombinationWinBets.push(bet);
            result.items.push(typeItem);
          } else if (uniqueNumbers.length > count) {
            // Multiple or Compound
            const strongSeparators = /[,，;；/]/;
            let allCombs: number[][] = [];
            
            if (strongSeparators.test(numsStr)) {
              const segments = numsStr.split(strongSeparators).filter(Boolean);
              segments.forEach(seg => {
                const segTokens = getTokens(seg);
                const segNums: number[] = [];
                segTokens.forEach(st => segNums.push(...getNumbersForToken(st)));
                const uniqueSegNums = Array.from(new Set(segNums)).sort((a, b) => a - b);
                
                if (uniqueSegNums.length >= count) {
                  const combs = getCombinations<number>(uniqueSegNums, count);
                  allCombs.push(...combs);
                }
              });
              
              // Fallback if split didn't yield any valid bets
              if (allCombs.length === 0) {
                allCombs = getCombinations<number>(uniqueNumbers, count);
              }
            } else {
              // No strong separators, treat as one compound bet
              allCombs = getCombinations<number>(uniqueNumbers, count);
            }

            if (allCombs.length > 0) {
              const bet: CombinationWinBet = {
                type,
                numbers: allCombs[0],
                amount: amt,
                isTuo: false,
                tuoCount: allCombs.length,
                tuoGroups: allCombs
              };
              typeItem.combinationWinBets.push(bet);
              typeItem.total += amt * allCombs.length;
              result.parsedCombinationWinBets.push(bet);
              result.items.push(typeItem);
            }
          }
        });
        result.lastAmount = amt;
        break;
      }
      case 'EACH': {
        const prefix = groups[1];
        const isFlat = prefix.includes('独平') || prefix.includes('平码');
        const cleanPrefix = prefix.replace('独平', '').replace('平码', '');
        const amt = chineseToNumber(groups[2]);
        const numGroups = parsePrefix(cleanPrefix);
        
        if (isFlat) {
          numGroups.forEach(nums => {
            nums.forEach(n => {
              const subItem = createEmptyBetItem(`${n}${prefix.includes('独平') ? '独平' : '平码'}${groups[2]}`);
              subItem.flatNumberDeltas[n] = (subItem.flatNumberDeltas[n] || 0) + amt;
              subItem.total = amt;
              result.parsedFlatBets[n] = (result.parsedFlatBets[n] || 0) + amt;
              result.items.push(subItem);
              result.selectedNumbers.add(n);
            });
          });
        } else {
          numGroups.forEach(nums => {
            nums.forEach(n => {
              item.numberDeltas[n] = (item.numberDeltas[n] || 0) + amt;
              item.total += amt;
              result.parsedBets[n] = (result.parsedBets[n] || 0) + amt;
              result.selectedNumbers.add(n);
            });
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
        const numGroups = parsePrefix(cleanPrefix);
        
        if (isFlat) {
          numGroups.forEach(nums => {
            nums.forEach(n => {
              const subItem = createEmptyBetItem(`${n}${prefix.includes('独平') ? '独平' : '平码'}${groups[2]}`);
              subItem.flatNumberDeltas[n] = (subItem.flatNumberDeltas[n] || 0) + amt;
              subItem.total = amt;
              result.parsedFlatBets[n] = (result.parsedFlatBets[n] || 0) + amt;
              result.items.push(subItem);
              result.selectedNumbers.add(n);
            });
          });
        } else {
          numGroups.forEach(nums => {
            nums.forEach(n => {
              item.numberDeltas[n] = (item.numberDeltas[n] || 0) + amt;
              item.total += amt;
              result.parsedBets[n] = (result.parsedBets[n] || 0) + amt;
              result.selectedNumbers.add(n);
            });
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

  // Identify invalid numbers (> 49) that are not part of an amount
  const numRegex = /\d+/g;
  let numMatch;
  while ((numMatch = numRegex.exec(textForPatterns)) !== null) {
    const val = parseInt(numMatch[0]);
    const start = numMatch.index;
    const end = start + numMatch[0].length;
    
    // Check if this number is within any amount range
    const isAmount = amountRanges.some(range => start >= range.start && end <= range.end);
    
    if (!isAmount && val > 49) {
      result.invalidMatches.push({ start, end });
    }
  }

  return result;
};

export interface MultiLotteryParsedResult {
  segments: ParsedSegment[];
  validMatches: { start: number; end: number }[];
  invalidMatches: { start: number; end: number }[];
  firstRecognizedType?: string;
}

export const parseMultiLotteryInput = (inputText: string): MultiLotteryParsedResult => {
  if (!inputText.trim()) return { segments: [], validMatches: [], invalidMatches: [] };

  const typePattern = `(?:${lotteryTypes.join('|')}|${LOTTERY_ALIASES})`;
  
  const segments: ParsedSegment[] = [];
  const allValidMatches: { start: number; end: number }[] = [];
  const allInvalidMatches: { start: number; end: number }[] = [];
  let firstRecognizedType = '';

  // Use the ORIGINAL inputText to find matches so indices are correct
  const matches = [...inputText.matchAll(new RegExp(typePattern, 'gi'))];
  
  const parts: { text: string; start: number }[] = [];
  if (matches.length === 0) {
    parts.push({ text: inputText, start: 0 });
  } else {
    matches.forEach((match, i) => {
      if (i === 0 && match.index > 0) {
        parts.push({ text: inputText.substring(0, match.index), start: 0 });
      }
      const nextMatch = matches[i + 1];
      const end = nextMatch ? nextMatch.index : inputText.length;
      parts.push({ text: inputText.substring(match.index!, end), start: match.index! });
    });
  }
  
  let pendingTypes: string[] = [];

  parts.forEach((partObj) => {
    const part = partObj.text;
    const offset = partObj.start;
    
    const match = part.match(new RegExp(`^(${typePattern})`, 'i'));
    const rawType = match ? match[1] : '';
    const content = rawType ? part.substring(rawType.length) : part;
    
    // Normalize the identified type for the segment
    let type = rawType;
    if (rawType) {
      const lowerRaw = rawType.toLowerCase();
      if (/^[旧老]/.test(lowerRaw) && /[cC㏄]/.test(lowerRaw)) type = '老cc';
      else if (/^新/.test(lowerRaw) && /[cC㏄]/.test(lowerRaw)) type = 'cc';
      else if (/^[旧老]/.test(lowerRaw)) type = '老澳';
      else if (/^新/.test(lowerRaw)) type = '新澳';
      else if (/^[香港]/.test(lowerRaw)) type = '香港';
      else if (lowerRaw === 'cc' || lowerRaw === 'c' || lowerRaw === '㏄') type = 'cc';
      else if (rawType === '万合' || rawType === '万和') type = '越南';
      else if (rawType === '奥大') type = '澳大';
      
      if (!lotteryTypes.includes(type)) {
        const bestMatch = lotteryTypes.find(t => t.includes(type) || type.includes(t));
        if (bestMatch) type = bestMatch;
      }

      if (type && !firstRecognizedType) firstRecognizedType = type;
    }

    const parsed = parseBetInput(content);
    
    // Adjust match ranges with offset
    const adjustedValid = parsed.validMatches.map(m => ({ start: m.start + offset + (rawType ? rawType.length : 0), end: m.end + offset + (rawType ? rawType.length : 0) }));
    const adjustedInvalid = parsed.invalidMatches.map(m => ({ start: m.start + offset + (rawType ? rawType.length : 0), end: m.end + offset + (rawType ? rawType.length : 0) }));

    allValidMatches.push(...adjustedValid);
    allInvalidMatches.push(...adjustedInvalid);

    // Update parsed object with adjusted matches for consistency if needed, 
    // though we use the combined ones for highlighting
    parsed.validMatches = adjustedValid;
    parsed.invalidMatches = adjustedInvalid;

    if (parsed.anyPatternFound || parsed.errors.length > 0) {
      // Apply this content to all preceding types that had no content
      pendingTypes.forEach(pType => {
        const pParsed = parseBetInput(content);
        pParsed.recognizedLotteryType = pType;
        // Note: we don't add matches for pending types to avoid duplicates in highlighting
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

  return { segments, validMatches: allValidMatches, invalidMatches: allInvalidMatches, firstRecognizedType };
};
