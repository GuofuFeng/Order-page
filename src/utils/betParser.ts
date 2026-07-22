import { chineseNumberMap, zodiacs, redNumbers, blueNumbers, greenNumbers, numbers, lotteryTypes, domesticZodiacs, wildZodiacs, maleZodiacs, femaleZodiacs, heavenZodiacs, earthZodiacs, luckyZodiacs, unluckyZodiacs, isSumOdd, isSumEven, fiveElements, zodiacNumbers } from '../constants';
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
  lotteryType?: string;
  _start?: number;
  _end?: number;
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
  validPhrases?: string[];
  invalidPhrases?: string[];
}

export interface ParsedSegment {
  lotteryType: string;
  originalInput: string;
  parsed: ParsedInput;
}

// Regular Expressions
const LOTTERY_ALIASES = '(?:老澳门|旧澳门|新cc|新Cc|新c|老cc|老㏄|老c|旧cc|旧㏄|旧c|新澳门|澳门|新澳|老澳|旧澳|老奥|旧奥|新奥|澳大|奥大|cc|㏄|c|旧|老|新|香港|香|港|万合|万和)';
const BOUNDARY = '(?<=^|[\\s,，。；;.、/\\d\\n\\r*:\\uff1a]|' + lotteryTypes.join('|') + '|' + LOTTERY_ALIASES + ')';
const BOUNDARY_STRICT = '(?<=^|[\\s,，。；;、/\\n\\r*:\\uff1a]|' + lotteryTypes.join('|') + '|' + LOTTERY_ALIASES + ')';
const BOUNDARY_COMBO = '(?<=^|[\\s,，。；;.、/\\n\\r*:\\uff1a]|' + lotteryTypes.join('|') + '|' + LOTTERY_ALIASES + ')';
const LOOKAHEAD = '(?=$|[\\s,，。；;.](?:[二三四五2345两]?(?:连肖|连|连尾|不中|中)|平|[马蛇龙兔虎牛鼠猪狗鸡猴羊]*包|不中|特码|特肖|特|特碰|正码|合计|计|总计|共|总|' + lotteryTypes.join('|') + ')|(?:[二三四五2345两]?(?:连肖|连|连尾|不中|中)|平|[马蛇龙兔虎牛鼠猪狗鸡猴羊]*包|不中|特码|特肖|特|特碰|正码|合计|计|总计|共|总|' + lotteryTypes.join('|') + '))';
const LOOKAHEAD_LOOSE = '(?=$|[\\s,，。；;.、/！!！?？#特*:\\uff1a]|' + lotteryTypes.join('|') + '|[马蛇龙兔虎牛鼠猪狗鸡猴羊大小单双红绿蓝家野男女天地吉凶美丑])';
const NOISE_PREFIX = '((?:(?!各|每|买|压|个|下注|各号|每号|平(?!码)|复(?!码)|连|拖|三中三|二中二|特碰|特肖|特码|包肖|平特|平肖|不中|六中|五中|四中|六肖|五肖|4中|二尾|三尾|四尾|五尾|两尾|连肖|连尾)[0-9,，。；;.、/ \\t\\+\\-\\(\\)\\[\\]\\{\\}\\*:\\uff1a\\u4e00-\u9fa5])+?)';

// 8. 新增：高优先级“生肖 + 特/包/特码/平/平特 + 金额”正则
export const REGEX_ZODIAC_SPECIAL_DIRECT = new RegExp(BOUNDARY + '([马蛇龙兔虎牛鼠猪狗鸡猴羊])(特肖|特码|特|包|平特|平)(\\d+(?:\\.\\d+)?)(?:元|块|米|个)?' + LOOKAHEAD_LOOSE, 'g');

// 9. 新增：高优先级“多组连肖逗号列表 + 连肖关键字 + 各/每 + 金额”正则
export const REGEX_MULTI_ZODIAC_MULTI_GROUP_POST = new RegExp(
  BOUNDARY +
  '((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s]*){2,12}(?:[，,、\\s]+(?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s]*){2,12})*)' +
  '[\\s]*' +
  '([二三四五六23456两]?(?:连肖|连|肖))' +
  '[\\s]*' +
  '(各|每|买|压|个)?' +
  '[\\s]*' +
  '(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)' +
  '(?:元|块|米|个)?' +
  LOOKAHEAD_LOOSE,
  'g'
);

export const REGEX_MULTI_TAIL_ADVANCED = new RegExp(BOUNDARY + '(?:([二三四五2345两])?连尾|([二三四五两])尾)((?:(?:\\s*)(?:\\d[\\s,，。；;.、/\\-*]*){2,10}[^\\d\\n\\r各每号]*?(?:\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:元|块|米|个|元|块|斤|文|闷)?)+)', 'g');
export const REGEX_SIX_ZODIAC = new RegExp(BOUNDARY + '(?:六中|六肖|6中|6肖)((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑][\\s,，。；;.、/\\-*]*){6})[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(?:各|每|买|压|个)?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_FIVE_ZODIAC = new RegExp(BOUNDARY + '(?:五中|五肖|5中|5肖)((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑][\\s,，.、/\\-*]*){5})[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(?:各|每|买|压|个)?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_FOUR_ZODIAC = new RegExp(BOUNDARY + '(?:四中|四肖|4中|4肖)((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑][\\s,，。；;.、/\\-*]*){4})[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(?:各|每|买|压|个)?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_COMBINATION_WIN = new RegExp(BOUNDARY_COMBO + '(?=[^\\n\\r]*?(?:三中三|二中二|特碰))(?:(三中三二中二|二中二三中三|三中三|二中二|二中2|特碰)[^\\d\\n\\r马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]*?(?:复试|复式|复)?)?((?:(?:\\d{1,2}尾|[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]|\\d{1,2})[\\s,，。；;.、/\\-*\\+]*)+)(?:[^\\d\\n\\r]*?(?:复试|复式|复)?(三中三二中二|二中二三中三|三中三|二中二|特碰)(?:复试|复式|复)?)?[^\\d\\n\\r]*?(?:各号|每号|各组|每组|每组各|各|每|买|压|个)?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖|拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_COMBINATION_TUO = new RegExp(BOUNDARY_COMBO + '(?=[^\\n\\r]*?(?:三中三|二中二|特碰))(?:(三中三二中二|二中二三中三|三中三|二中二|二中2|特碰)[^\\d\\n\\r马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]*?)?((?:(?:\\d{1,2}尾|[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]|\\d{1,2})[\\s,，。；;.、/\\-*\\+]*)+)[拖拖]((?:(?:\\d{1,2}尾|[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]|\\d{1,2})[\\s,，。；;.、/\\-*\\+]*)+)(?:[^\\d\\n\\r]*?(三中三二中二|二中二三中三|三中三|二中二|特碰))?[^\\d\\n\\r]*?(?:各号|每号|各组|每组|每组各|各|每|买|压|个)?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖|拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_MULTI_ZODIAC = new RegExp(BOUNDARY + '((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑][\\s,，。；;.、/\\-*]*){2,12})(?<![二三四五六七八九十2-9]|10|两)(?:连肖|连)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(?:各|每|买|压|个)?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖|拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_MULTI_ZODIAC_ADVANCED = new RegExp(BOUNDARY + '(?:平特)?(?:([二三四五六23456两])(?:连肖|连(?!尾)|连买|买)|([二三四五六23456两])肖|(?<![二三四五六23456两])(连肖|连(?!尾)))((?:(?:\\s*)[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑][\\s,，。；;.、/\\-*]*){2,12}[^\\d\\n\\r]*?(?:(?!连肖|连尾|不中|三中三|二中二|特碰|复式|复试|平特|平肖|平特一肖|平特肖|独平).)*?(?:\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:元|块|米|个|元|块|斤|文|闷)?)+', 'g');
export const REGEX_MULTI_ZODIAC_HABIT = new RegExp(BOUNDARY + '((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑][\\s,，。；;.、/\\-*]*){2,12})(?:([二三四五六23456两])(连肖|连|肖))[^\\d\\n\\r]*?(?:复试|复式|复)(?:([二三四五六23456两])(连肖|连|肖))[^\\d\\n\\r]*?(?:各|每|买|压|个)?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_MULTI_ZODIAC_HABIT_V2 = new RegExp(BOUNDARY + '((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑][\\s,，。；;.、/\\-*]*){2,12})(?:复试|复式|复)(?:([二三四五六23456两])(连肖|连|肖))[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(?:([二三四五六23456两])(连肖|连|肖))[\\s]*?(?:各|每|买|压|个)?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_MULTI_ZODIAC_V2 = new RegExp(BOUNDARY + '((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑][\\s,，。；;.、/\\-*]*){2,12})[^\\d\\n\\r]*?(' + 
  '(?:复试|复式|复)[^\\d\\n\\r]*?(?:[二三四五六七八九十2-9]|10|两)?(?:连肖|连|连各|连每)?' + 
  '|' +
  '(?:[二三四五六七八九十2-9]|10|两)(?:连肖|连|连各|连每|肖)' + 
  '|' +
  '(?<![二三四五六七八九十2-9]|10|两)(?:连肖|连|连各|连每)' + 
  ')' + 
  '[^\\d\\n\\r]*?(?:各组|每组)?[^\\d\\n\\r]*?(?:各|每|买|压|个)?[^\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_MULTI_ZODIAC_MULTI_GROUP = new RegExp(BOUNDARY + '([二三四五六23456两])(连肖|连|肖)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]{2,12}[，,、\\s]+)+[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]{2,12})[^\\d\\n\\r]*?(?:各|每|买|压|个)?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_NOT_IN = new RegExp(BOUNDARY_STRICT + '(\\d+|[一二三四五六七八九十]+)(?:不中|中)[^马蛇龙兔虎牛鼠猪狗鸡猴羊\\d\\n\\r]*?([马蛇龙兔虎牛鼠猪狗鸡猴羊\\d]+(?:[\\s,，。；;.、/\\-*\\+]+[马蛇龙兔虎牛鼠猪狗鸡猴羊\\d]+)*)[^马蛇龙兔虎牛鼠猪狗鸡猴羊\\d\\n\\r]*?(?:各|每|买|压|个)?[^\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_NOT_IN_REVERSE = new RegExp(BOUNDARY_STRICT + '([马蛇龙兔虎牛鼠猪狗鸡猴羊\\d]+(?:[\\s,，。；;.、/\\-*\\+]+[马蛇龙鼠猪狗鸡猴羊\\d]+)*)[^马蛇龙兔虎牛鼠猪狗鸡猴羊\\d\\n\\r]*?(\\d+|[一二三四五六七八九十]+)(?:不中|中)[^\\d\\n\\r]*?(?:各|每|买|压|个)?[^\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_BAO = new RegExp(BOUNDARY + '(?:(?:包肖|包|特码|特)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?([马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]+)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(?:包肖|包|特码|特))(?:[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(各|每|买|压|个))?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_TE_XIAO = new RegExp(BOUNDARY + '(?:(?:特肖)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?([马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]+)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(?:特肖))(?:[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(各|每|买|压|个))?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_PING = new RegExp(BOUNDARY + '(?:(?:平特一肖|平特肖|平特|平肖|平)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?([马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]+)[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(?:平特一肖|平特肖|平特|平肖|平))(?:[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(各|每|买|压|个))?[^马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_TAIL = new RegExp(BOUNDARY + '(?:平特|平)(\\d+)尾[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_FIVE_ELEMENTS = new RegExp(BOUNDARY + '([金木水火土](?:[\\s,，。；;.、/\\\\\\-+&|\\*]*[金木水火土]|[金木水火土]|[\\u4e00-\\u9fa5])*?)[^金木水火土\\d\\n\\r]*?(?:各|每|买|压|个)?[^金木水火土\\d\\n\\r]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?' + LOOKAHEAD_LOOSE, 'g');

export const REGEX_MULTI_TAIL_V2 = new RegExp(BOUNDARY_STRICT + '(?:【?(\\d{2,10})】?)[^\\d]*?(?:各|每|买|压|个|包)?[^\\d]*?([二三四五2345两])?连尾[^\\d]*?(?:各|每|买|压|个|包)?[^\\d]*?(\\+?\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_MULTI_TAIL_V3 = new RegExp(BOUNDARY + '(?:([二三四五2345两])?连尾|([二三四五两])尾)(?:[\\-\\s,，。；;.]*?(\\d)尾[\\-\\s,，。；;.]*?(\\d)尾[\\-\\s,，。；;.]*?(\\d)尾(?:[\\-\\s,，。；;.]*?(\\d)尾)?(?:[\\-\\s,，。；;.]*?(\\d)尾)?)[^\\d]*?(?:各|每|买|压|个|包)?[^\\d]*?(\\+?\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_HEAD_TAIL = new RegExp(BOUNDARY + '(\\d+)(头|尾)[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_SPECIAL_ATTR = new RegExp(BOUNDARY + '(红波|蓝波|绿波|大数|小数|单数|双数|合单|合双|红单|红双|蓝单|蓝双|绿单|绿双)(?![^\\d\\n\\r]*?(?:各|每|买|压|个))[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_EXCLUSION = new RegExp(
  BOUNDARY_STRICT +
  NOISE_PREFIX +
  '不要' +
  '((?:(?!其他|各|每|买|压|个|下注|元|块|米|各号|每号)[0-9,，。；;.、/ \\t\\+\\-\\(\\)\\[\\]\\{\\}\\*：:\\uff1a\\u4e00-\\u9fa5])+?)' +
  '(?:[^\\d\\n\\r*]*(?:其他各|其他每|其他|各号|每号|各|每|买|压|个|下注)[^\\d\\n\\r*]*|\\s+)' +
  '(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?' +
  LOOKAHEAD_LOOSE,
  'g'
);

export const REGEX_EACH = new RegExp(BOUNDARY_STRICT + NOISE_PREFIX + '(?:各号|每号|各|每|买|压|个|下注)[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?' + LOOKAHEAD_LOOSE, 'g');

export const REGEX_FLAT_NUMBER = new RegExp(BOUNDARY_STRICT + '(?:((?<!\\d)[\\d\\.\\s,，。；;./+&|\\-*]+)(?:平码|独平)(?:各|每|买|压|个)?(\\d+(?:\\.\\d+)?)|(?:平码|独平)([\\d\\.\\s,，。；;./+&|\\-*]+)-(?:各|每|买|压|个)?(\\d+(?:\\.\\d+)?)|(?:平码|独平)((?<!\\d)[\\d\\.\\s,，。；;./+&|\\-*]+)(?:各|每|买|压|个)(\\d+(?:\\.\\d+)?))(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_TUO_ZODIAC = new RegExp(BOUNDARY + '([二三四五2345两])[拖拖]([马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]{2,12})[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_TUO_ZODIAC_V3 = new RegExp(BOUNDARY + '((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑][\\s,，。；;.、/\\-*]*)+)[拖拖]((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑][\\s,，。；;.、/\\-*]*)+)([二三四五六七八九十2345678910两])(?:连肖|连|连各|连每)?(?:各组|每组)?[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');
export const REGEX_TUO_ZODIAC_V4 = new RegExp(BOUNDARY + '(?<!\\d)([二三四五2345两])(?:连肖|连|连各|连每)?((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑][\\s,，。；;.、/\\-*]*)+)[拖拖]((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑][\\s,，。；;.、/\\-*]*)+)[^\\d]*?(?:各|每|买|压|个)?[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|文|闷)?', 'g');

export const REGEX_GENERIC = new RegExp(BOUNDARY_STRICT + '((?:(?!各|每|买|压|个|下注|各号|每号|平(?!码)|复(?!码)|连|拖|三中三|二中二|特碰|特肖|特码|包肖|平特|平肖|不中|六中|五中|四中|六肖|五肖|四肖|6中|5中|4中|二尾|三尾|四尾|五尾|两尾|连肖|连尾)[0-9,，。；;.、/ \\t\\+\\-\\(\\)\\[\\]\\{\\}\\*:\\uff1a\\u4e00-\u9fa5])*?(?:大|小|单|双|红|绿|蓝|家|野|男|女|天|地|吉|凶|美|丑|合单|合双)+)[^\\d]*?(\\d+(?:\\.\\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:米|个|元|块|斤|#)?' + LOOKAHEAD_LOOSE, 'g');

export const normalizeLotteryTypes = (text: string): string => {
  let processedText = text;
  processedText = processedText.replace(/奥大/g, '澳大');
  
  // 1. Normalize '老cc' aliases first to avoid partial 'cc' match.
  // Preserve length by padding with spaces if needed.
  processedText = processedText.replace(/(?:[旧老]\s*[cC㏄]{2}|[旧老]\s*西西)/gi, (m) => '老cc' + ' '.repeat(Math.max(0, m.length - 3)));
  processedText = processedText.replace(/(?:[旧老]\s*[cC㏄])/gi, (m) => '老cc' + ' '.repeat(Math.max(0, m.length - 2)));
  
  // 2. Normalize 'cc' aliases.
  processedText = processedText.replace(/(?:新\s*[cC㏄]{1,2}|(?:新\s*)?西西|[cC㏄]{1,2})/gi, (m) => 'cc' + ' '.repeat(Math.max(0, m.length - 2)));
  
  // 3. New aliases: map to standard types but PRESERVE LENGTH to avoid highlighting offset.
  processedText = processedText.replace(/旧澳门/g, '老澳 ');
  processedText = processedText.replace(/旧澳/g, '老澳');
  processedText = processedText.replace(/旧奥/g, '老澳');
  processedText = processedText.replace(/老澳门/g, '老澳  ');
  processedText = processedText.replace(/新澳门/g, '新澳  ');
  processedText = processedText.replace(/旧/g, '老');
  
  processedText = processedText.replace(/万和/g, '越南');
  processedText = processedText.replace(/万合/g, '越南');
  return processedText;
};

const groupCounts: Record<string, number> = {
  '家': domesticZodiacs.length,
  '野': wildZodiacs.length,
  '天': heavenZodiacs.length,
  '地': earthZodiacs.length,
  '吉': luckyZodiacs.length,
  '美': luckyZodiacs.length,
  '凶': unluckyZodiacs.length,
  '丑': unluckyZodiacs.length,
  '女': femaleZodiacs.length,
  '男': maleZodiacs.length
};

const groupMembers: Record<string, string> = {
  '家': domesticZodiacs.join(''),
  '野': wildZodiacs.join(''),
  '天': heavenZodiacs.join(''),
  '地': earthZodiacs.join(''),
  '吉': luckyZodiacs.join(''),
  '美': luckyZodiacs.join(''),
  '凶': unluckyZodiacs.join(''),
  '丑': unluckyZodiacs.join(''),
  '女': femaleZodiacs.join(''),
  '男': maleZodiacs.join('')
};

const parseBetInputOriginal = (inputText: string): ParsedInput => {
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
      } else if (char === '男') {
        tokens.push(...maleZodiacs);
      } else if (char === '女') {
        tokens.push(...femaleZodiacs);
      } else if (char === '天') {
        tokens.push(...heavenZodiacs);
      } else if (char === '地') {
        tokens.push(...earthZodiacs);
      } else if (char === '吉' || char === '美') {
        tokens.push(...luckyZodiacs);
      } else if (char === '凶' || char === '丑') {
        tokens.push(...unluckyZodiacs);
      }
    }
    return tokens;
  };

  if (!inputText.trim()) return result;

  let preprocessedInput = inputText;

  let textForPatterns = normalizeLotteryTypes(preprocessedInput);
  
  // Pre-processing for user habits
  textForPatterns = textForPatterns.replace(/[\(\)（）′']/g, ' '); // Rule 3: ignore () and '
  
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
    if (/[旧老]\s*[cC㏄]{1,2}/i.test(matchedText)) standardType = '老cc';
    else if (/新\s*[cC㏄]{1,2}/i.test(matchedText)) standardType = '新cc';
    else if (/cc|c|㏄/i.test(matchedText)) standardType = '老cc';
    else if (/^[旧老]/.test(matchedText)) standardType = '老澳';
    else if (/^新/.test(matchedText)) standardType = '新澳';
    else if (/^[香港]/.test(matchedText)) standardType = '香港';
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
    return zodiacNumbers[zodiac] || [];
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
          const digits = m.match(/(\d+)尾/)![1].split('');
          digits.forEach(digit => {
            const d = parseInt(digit);
            const nums: number[] = [];
            for (let i = 1; i <= 49; i++) if (i % 10 === d) nums.push(i);
            if (nums.length > 0) bases.push(nums);
          });
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
      const zodiacMatches = sub.match(/[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]/g);
      if (zodiacMatches) {
        zodiacMatches.forEach(z => {
          if (z === '家') {
            domesticZodiacs.forEach(dz => bases.push(getNumbersForZodiac(dz)));
          } else if (z === '野') {
            wildZodiacs.forEach(wz => bases.push(getNumbersForZodiac(wz)));
          } else if (z === '男') {
            maleZodiacs.forEach(mz => bases.push(getNumbersForZodiac(mz)));
          } else if (z === '女') {
            femaleZodiacs.forEach(fz => bases.push(getNumbersForZodiac(fz)));
          } else if (z === '天') {
            heavenZodiacs.forEach(hz => bases.push(getNumbersForZodiac(hz)));
          } else if (z === '地') {
            earthZodiacs.forEach(ez => bases.push(getNumbersForZodiac(ez)));
          } else if (z === '吉' || z === '美') {
            luckyZodiacs.forEach(lz => bases.push(getNumbersForZodiac(lz)));
          } else if (z === '凶' || z === '丑') {
            unluckyZodiacs.forEach(uz => bases.push(getNumbersForZodiac(uz)));
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
  const HEAVY_KEYWORDS = ['三中三', '二中二', '特碰', '连', '拖', '复试', '复式', '复', '六中', '六肖', '6中', '五中', '五肖', '5中', '四中', '四肖', '4中', '6肖', '5肖', '4肖', '二尾', '三尾', '四尾', '五尾', '两尾'];
  const hasHeavyKeyword = HEAVY_KEYWORDS.some(kw => textForPatterns.includes(kw));

  if (hasHeavyKeyword) {
    addMatches(REGEX_MULTI_ZODIAC_MULTI_GROUP_POST, 'MULTI_ZODIAC_MULTI_GROUP');
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
    addMatches(REGEX_MULTI_ZODIAC_HABIT_V2, 'MULTI_ZODIAC_HABIT');
    addMatches(REGEX_MULTI_ZODIAC_V2, 'MULTI_ZODIAC_V2');
    addMatches(REGEX_MULTI_ZODIAC, 'MULTI_ZODIAC');
    addMatches(REGEX_MULTI_TAIL_V2, 'MULTI_TAIL_V2');
    addMatches(REGEX_MULTI_TAIL_V3, 'MULTI_TAIL_V3');
  }

  // Light patterns always run
  addMatches(REGEX_EXCLUSION, 'EXCLUSION');
  addMatches(REGEX_NOT_IN, 'NOT_IN');
  addMatches(REGEX_NOT_IN_REVERSE, 'NOT_IN_REVERSE');
  addMatches(REGEX_PING, 'PING');
  addMatches(REGEX_TE_XIAO, 'TE_XIAO');
  addMatches(REGEX_BAO, 'BAO');
  addMatches(REGEX_TAIL, 'TAIL');
  addMatches(REGEX_FIVE_ELEMENTS, 'FIVE_ELEMENTS');
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

  allMatches.forEach(match => {
    if (isOverlapping(match.start, match.end)) return;

    const groups = match.groups;
    const item = createEmptyBetItem(match.original);
    const initialItemsCount = result.items.length;

    const pushSubItem = (sub: BetItem) => {
      sub._start = match.start;
      sub._end = match.end;
      result.items.push(sub);
    };

    switch (match.type) {
      case 'EXCLUSION': {
        const prefix = groups[1];
        const exclusionStr = groups[2];
        const amtStr = groups[3];

        const isFlat = prefix.includes('独平') || prefix.includes('平码');
        const cleanPrefix = prefix.replace('独平', '').replace('平码', '');
        const amt = chineseToNumber(amtStr);

        const baseNums = new Set(parsePrefix(cleanPrefix).flat());
        const excludedNums = new Set(parsePrefix(exclusionStr).flat());

        const remainingNums = [...baseNums].filter(n => !excludedNums.has(n));

        if (isFlat) {
          remainingNums.forEach(n => {
            const subItem = createEmptyBetItem(`${n}${prefix.includes('独平') ? '独平' : '平码'}${amtStr}`);
            subItem.flatNumberDeltas[n] = (subItem.flatNumberDeltas[n] || 0) + amt;
            subItem.total = amt;
            result.parsedFlatBets[n] = (result.parsedFlatBets[n] || 0) + amt;
            pushSubItem(subItem);
            result.selectedNumbers.add(n);
          });
        } else {
          remainingNums.forEach(n => {
            item.numberDeltas[n] = (item.numberDeltas[n] || 0) + amt;
            item.total += amt;
            result.parsedBets[n] = (result.parsedBets[n] || 0) + amt;
            result.selectedNumbers.add(n);
          });
        }
        result.lastAmount = amt;
        break;
      }
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
        // 判断是后置格式还是前置格式
        const isPostFormat = /[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]/.test(groups[1] || '');

        let countStr = '';
        let typeStr = '';
        let allZodiacsStr = '';
        let amtStr = '';

        if (isPostFormat) {
          // 后置格式，例如：牛鸡虎，牛龙猪鸡，龙猪鸡蛇鼠 3连肖 各10
          allZodiacsStr = groups[1] || '';
          typeStr = groups[2] || '';
          amtStr = groups[4] || '';

          // 从 typeStr (如 "3连", "三连肖", "连肖") 提取连数前缀
          const countMatch = typeStr.match(/^[二三四五六23456两]/);
          countStr = countMatch ? countMatch[0] : '';
        } else {
          // 前置格式，例如：三连肖 牛鸡虎，牛龙猪鸡，龙猪鸡蛇鼠 各10
          countStr = groups[1] || '';
          typeStr = groups[2] || '';
          allZodiacsStr = groups[3] || '';
          amtStr = groups[4] || '';
        }

        const amt = chineseToNumber(amtStr);
        const isLian = typeStr.includes('连');
        const isXiaoOnly = (typeStr === '肖' || typeStr.endsWith('肖')) && !typeStr.includes('连');

        const zodiacGroups = allZodiacsStr.split(/[，,、\s]+/).filter(s => s.length > 0);

        zodiacGroups.forEach(zStr => {
          const selectedZodiacs = expandZodiacs(zStr);

          // 🔴 动态连数匹配：如果未显式指定数字（如仅写了 "连肖"、"连"），则以该组生肖的实际字符个数作为连数
          let count = 2;
          if (countStr) {
            count = countStr === '二' || countStr === '2' || countStr === '两' ? 2 :
                    countStr === '三' || countStr === '3' ? 3 :
                    countStr === '四' || countStr === '4' ? 4 :
                    countStr === '五' || countStr === '5' ? 5 :
                    countStr === '六' || countStr === '6' ? 6 : 2;
          } else {
            count = selectedZodiacs.length;
          }

          if (selectedZodiacs.length >= count && count >= 2) {
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
              // 🔴 核心修复：即使复式连数等于生肖数，也直接作为组合存储（把自身作为唯一组合放入 tuoGroups 中），
              // 这样前台下箭头渲染引擎在做 filter 展开时，能统一将“复式X连就是自身”的情况也以组合列表全部优雅展示出来！
              const bet: MultiZodiacBet = {
                zodiacs: selectedZodiacs,
                amount: amt,
                type: `${count}${isLian ? '连' : '肖'}`,
                tuoCount: 1,
                tuoGroups: [selectedZodiacs]
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
              item.total += amt;
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
            // 🔴 核心修复：即使复式连数等于生肖数，也直接作为组合存储，这样能点击下箭头进行列表展示自身
            const bet: MultiZodiacBet = {
              zodiacs: selectedZodiacs,
              amount: amt,
              type: `${count}${isXiaoOnly ? '肖' : '连'}`,
              tuoCount: 1,
              tuoGroups: [selectedZodiacs]
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
            item.total += amt;
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

        // 🔴 放宽连接符以完美支持 “猪蛇各100”、“猪蛇各组100”等连接词
        const innerRegex = /(?:\s*)((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野][\\s,，。；;.、/\-*]*){2,12})[^\\d\\n\\r]*?(\d+(?:\.\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:元|块|米|个|元|块|斤|文|闷)?/g;
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
              // 🔴 核心修复：即使复式连数等于生肖数，也直接作为组合存储，这样能点击下箭头进行列表展示自身
              const bet: MultiZodiacBet = {
                zodiacs: zodiacsInEntry,
                amount: amt,
                type: `${count}${isXiaoOnly ? '肖' : '连'}`,
                tuoCount: 1,
                tuoGroups: [zodiacsInEntry]
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
              item.total += amt;
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
          const matches = str.match(/[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]/g);
          if (matches) {
            matches.forEach(m => {
              if (m === '家') tokens.push(...domesticZodiacs);
              else if (m === '野') tokens.push(...wildZodiacs);
              else if (m === '男') tokens.push(...maleZodiacs);
              else if (m === '女') tokens.push(...femaleZodiacs);
              else if (m === '天') tokens.push(...heavenZodiacs);
              else if (m === '地') tokens.push(...earthZodiacs);
              else if (m === '吉' || m === '美') tokens.push(...luckyZodiacs);
              else if (m === '凶' || m === '丑') tokens.push(...unluckyZodiacs);
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
        const numsList: number[] = [];
        const digitMatches = content.match(/\d+/g);
        if (digitMatches) {
          digitMatches.forEach(m => {
            const n = parseInt(m);
            if (n >= 1 && n <= 49) numsList.push(n);
          });
        }
        for (const char of content) {
          if (zodiacs.includes(char)) {
            const zNums = numbers.filter(n => getZodiacFromNumber(n) === char);
            numsList.push(...zNums);
          }
        }
        const nums = Array.from(new Set(numsList)).sort((a, b) => a - b);
        
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
      case 'FIVE_ELEMENTS': {
        const elementStr = groups[1];
        const amt = chineseToNumber(groups[2]);
        const elementsMatch = elementStr.match(/[金木水火土]/g);
        const elements = elementsMatch ? Array.from(new Set(elementsMatch)) : [];
        let totalNums = 0;
        elements.forEach(element => {
          const nums = fiveElements[element as string] || [];
          nums.forEach(n => {
            item.numberDeltas[n] = (item.numberDeltas[n] || 0) + amt;
            result.parsedBets[n] = (result.parsedBets[n] || 0) + amt;
            result.selectedNumbers.add(n);
          });
          totalNums += nums.length;
        });
        item.total = amt * totalNums;
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
          const matches = str.match(/\d{1,2}尾|[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]|\d{1,2}/g);
          if (matches) {
            matches.forEach(m => {
              if (m === '家') tokens.push(...domesticZodiacs);
              else if (m === '野') tokens.push(...wildZodiacs);
              else if (m === '男') tokens.push(...maleZodiacs);
              else if (m === '女') tokens.push(...femaleZodiacs);
              else if (m === '天') tokens.push(...heavenZodiacs);
              else if (m === '地') tokens.push(...earthZodiacs);
              else if (m === '吉' || m === '美') tokens.push(...luckyZodiacs);
              else if (m === '凶' || m === '丑') tokens.push(...unluckyZodiacs);
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
          const matches = str.match(/\d{1,2}尾|[马蛇龙兔虎牛鼠猪狗鸡猴羊家野男女天地吉凶美丑]|\d{1,2}/g);
          if (matches) {
            matches.forEach(m => {
              if (m === '家') tokens.push(...domesticZodiacs);
              else if (m === '野') tokens.push(...wildZodiacs);
              else if (m === '男') tokens.push(...maleZodiacs);
              else if (m === '女') tokens.push(...femaleZodiacs);
              else if (m === '天') tokens.push(...heavenZodiacs);
              else if (m === '地') tokens.push(...earthZodiacs);
              else if (m === '吉' || m === '美') tokens.push(...luckyZodiacs);
              else if (m === '凶' || m === '丑') tokens.push(...unluckyZodiacs);
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
            pushSubItem(typeItem);
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
              pushSubItem(typeItem);
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
              pushSubItem(subItem);
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
            pushSubItem(subItem);
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
              pushSubItem(subItem);
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
      item._start = match.start;
      item._end = match.end;
      result.items.push(item);
    }

    if (result.items.length > initialItemsCount) {
      processedRanges.push({ start: match.start, end: match.end });
      result.validMatches.push({ start: match.start, end: match.end });
      result.anyPatternFound = true;

      // Identify amount part to exclude from invalid number checks
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && !isNaN(Number(lastGroup.replace('+', '')))) {
        const amountStart = match.start + match.original.lastIndexOf(lastGroup);
        amountRanges.push({ start: amountStart, end: amountStart + lastGroup.length });
      }
    }
  });

  // Identify invalid numbers that are not part of a valid match or an amount
  const numRegex = /\d+/g;
  let numMatch;
  while ((numMatch = numRegex.exec(textForPatterns)) !== null) {
    const val = parseInt(numMatch[0]);
    const start = numMatch.index;
    const end = start + numMatch[0].length;
    
    // Check if this number is within any valid match range
    const isPartOfValidSelection = result.validMatches.some(range => start >= range.start && end <= range.end);
    // Check if this number is within any amount range
    const isAmount = amountRanges.some(range => start >= range.start && end <= range.end);
    
    if (!isPartOfValidSelection && !isAmount) {
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
  validPhrases?: string[];
  invalidPhrases?: string[];
}

const parseMultiLotteryInputOriginal = (inputText: string): MultiLotteryParsedResult => {
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
      // Rules:
      // 新澳: 新澳, 新, 新奥, 澳门
      // 老澳: 老澳, 老, 旧澳, 旧, 老奥, 旧奥
      // 香港: 香港, 港, 香
      // 澳大: 澳大, 奥大
      // 新cc: 新cc, 新c, 新Cc
      // 老cc: cc, c, ㏄, 老cc, 老c, 老㏄, 旧cc, 旧c, 旧㏄
      // 越南: 万合, 万和
      
      if (/新[cC㏄]{1,2}/i.test(lowerRaw)) type = '新cc';
      else if (/[老旧][cC㏄]{1,2}/i.test(lowerRaw)) type = '老cc';
      else if (/^(?:cc|c|㏄)/i.test(lowerRaw)) type = '老cc';
      else if (/^(?:香港|港|香)/.test(lowerRaw)) type = '香港';
      else if (/^(?:新澳|新奥|澳门|新)/.test(lowerRaw)) type = '新澳';
      else if (/^(?:老澳|老奥|旧澳|旧奥|老|旧)/.test(lowerRaw)) type = '老澳';
      else if (rawType === '万合' || rawType === '万和' || rawType === '越南') type = '越南';
      else if (rawType === '奥大' || rawType === '澳大') type = '澳大';
      
      if (!lotteryTypes.includes(type)) {
        const bestMatch = lotteryTypes.find(t => t === type || t.includes(type) || type.includes(t));
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

// Helper function to perform regex replaces while tracking character indices mapping
function replaceAndMap(
  str: string,
  regex: RegExp,
  replacer: (...args: any[]) => string,
  map: number[]
): { result: string; map: number[] } {
  let resultStr = "";
  const newMap: number[] = [];
  let lastIndex = 0;

  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const matchIndex = match.index;
    const matchText = match[0];
    const matchLength = matchText.length;

    // Copy unchanged segment before the match
    for (let i = lastIndex; i < matchIndex; i++) {
      resultStr += str[i];
      newMap.push(map[i]);
    }

    // Get replacement string
    const replacerArgs = [...match, matchIndex, str];
    const replacement = replacer(...replacerArgs);

    // Map replacement characters back to the original source match range
    const repLen = replacement.length;
    for (let i = 0; i < repLen; i++) {
      const originalIdxInMatch = Math.min(
        matchLength - 1,
        Math.floor((i / repLen) * matchLength)
      );
      newMap.push(map[matchIndex + originalIdxInMatch]);
    }

    resultStr += replacement;
    lastIndex = matchIndex + matchLength;
  }

  // Copy remaining unchanged segment
  for (let i = lastIndex; i < str.length; i++) {
    resultStr += str[i];
    newMap.push(map[i]);
  }

  return { result: resultStr, map: newMap };
}

// ==========================================
// 🔴 新增：parseBetInput 的包装修饰器，实现不改变长度的别名清洗与高亮词组提取
// ==========================================
export const parseBetInput = (inputText: string): ParsedInput => {
  if (!inputText.trim()) {
    return {
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
      invalidMatches: [],
      validPhrases: [],
      invalidPhrases: []
    };
  }

  // 1. 等长别名及错字预清洗 (不改变字符串的总长度和字符绝对索引)
  let preprocessed = inputText;
  let indexMap = Array.from({ length: inputText.length }, (_, i) => i);

  const applyReplacement = (regex: RegExp, replacer: (...args: any[]) => string) => {
    const res = replaceAndMap(preprocessed, regex, replacer, indexMap);
    preprocessed = res.result;
    indexMap = res.map;
  };

  // 🔴 引入：生肖组宏替换在 wrapper 展开，以便 indexMap 完美追踪其引起的文件偏移位移，彻底绝缘高亮空白间断 Bug！
  const zodiacErrors: string[] = [];
  const macroExpanderRegex = /(六中|六肖|6中|6肖|五中|五肖|5中|5肖|四中|四肖|4中|4肖)\s*(家|野|男|女|天|地|吉|美|凶|丑)肖?/g;
  applyReplacement(macroExpanderRegex, (match, type, group) => {
    const requiredCount = (type.startsWith('六') || type.startsWith('6')) ? 6 :
                          (type.startsWith('五') || type.startsWith('5')) ? 5 : 4;
    const count = groupCounts[group];
    if (count === requiredCount) {
      return type + groupMembers[group];
    } else {
      const pinyinGroupName = group === '家' ? '家肖' :
                             group === '野' ? '野肖' :
                             group === '男' ? '男肖' :
                             group === '女' ? '女肖' :
                             group === '天' ? '天肖' :
                             group === '地' ? '地肖' :
                             group === '吉' ? '吉肖' :
                             group === '美' ? '美肖' :
                             group === '凶' ? '凶肖' : '丑肖';
      zodiacErrors.push(`‘${match}’是错误的，因为${pinyinGroupName}一共包含${count}个生肖，数量不等于‘${type}’本应该匹配的生肖数量(${requiredCount})`);
      return match;
    }
  });

  applyReplacement(/特\s*串/g, () => '特碰');
  applyReplacement(/友/g, () => '连');
  applyReplacement(/包(?=红波|蓝波|绿波|大数|小数|单数|双数|单|双|大|小|红单|红双|蓝单|蓝双|录单|录双|绿单|绿双|合单|合双)/g, () => ' ');
  applyReplacement(/(\d+)尾平/g, (match, d) => `平${d}尾`);
  applyReplacement(/([马蛇龙兔虎牛鼠猪狗鸡猴羊家野]{2,12})[拖拖](\d+)/g, (match, z, d) => `${z}连${d}`);
  applyReplacement(/[xX]/g, () => '各');

  // 🔴 核心展开：由于多组连肖（如：'牛鸡虎，牛龙猪鸡，龙猪鸡蛇鼠连肖各10'）最后只有最后一个有'连肖各10'，
  // 我们直接用正则捕获，把这种结构全展开为独立的组结构以逗号连接，同时不改变长度：
  // 长度对齐由包装层解析器映射完成，所以我们只要展开它让核心解析器可以正确通过逗号匹配到各组！
  const multiGroupPostRegex = /((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]{2,12}[，,、\s]+)+)([马蛇龙兔虎牛鼠猪狗鸡猴羊家野]{2,12})([二三四五六23456两]?(?:连肖|连|肖))((各|每|买|压|个)?\d+(?:\.\d+)?)/g;
  applyReplacement(multiGroupPostRegex, (match, prefix, lastGroup, type, suffix) => {
    // 将 '牛鸡虎，牛龙猪鸡，' 的组全部提取
    const groups = prefix.split(/[，,、\s]+/).filter(Boolean);
    // 生成展开后的文本，比如 '牛鸡虎连肖各10，牛龙猪鸡连肖各10，龙猪鸡蛇鼠连肖各10'
    const expanded = groups.map(g => `${g}${type}${suffix}`).join(',') + `,${lastGroup}${type}${suffix}`;
    // 为了能够对齐后面的 validPhrases 映射，把这个转换记录到 global/闭包 map，以便包装层做 originalTextSegment 的恢复。
    return expanded;
  });

  // 🔴 新增识别：“龙猪鸡蛇鼠狗复3.4.5连各10” 这类复式多连投下注展开
  // 支持识别 '.'、'。'、'，'、'、'、'/'、'-' 等常见标点作为连接符，支持中文数词，支持空格，且允许金额修饰词如“各组”、“每组”等
  const multiComboRegex = /((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]{2,12}))[\s]*(?:复式|复试|复)[\s]*([二三四五六23456两](?:[\s\-.。，,、\/]*[二三四五六23456两])*)[\s]*(?:连肖|连)[\s]*(各号|每号|各组|每组|各|每|买|压|个)?[\s]*(\d+(?:\.\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:元|块|米|个|斤|文|闷)?/gi;
  applyReplacement(multiComboRegex, (match, zodiacs, countsStr, prefix, amtStr) => {
    // 将常见的标点符号如 。 ， 、 / - 以及空格统一分割
    const counts = countsStr.split(/[\s\-.。，,、\/]+/).filter(Boolean);
    const suffix = (prefix || '') + amtStr;
    const expanded = counts.map(c => `${zodiacs}复式${c}连${suffix}`).join(',');
    return expanded;
  });

  // 将前置标点变等长空格
  applyReplacement(/(?<=(?:特|平|包|特肖|平特)\s*(?:[马蛇龙兔虎牛鼠猪狗鸡猴羊][\s,，。；;.、/\\*、。，\.]*)+)([,，。；;.、/\\*、。，\.])/g, () => ' ');

  // 🔴 核心修复：还原掉之前对于 “复3.4.5连” 的拆分预处理，转而在核心解析后进行统一映射重组，
  // 确保它是一个整体（一个 BetItem），而不用拆分成多个文本解析，保持整体高亮和整体行结构。

  // 2. 调用原始核心解析器
  const parsed = parseBetInputOriginal(preprocessed);

  // 🔴 整体合并机制：针对形如 "龙猪鸡蛇鼠狗复3.4.5连各10" 的解析处理，
  // 原始解析器现在会对各个连肖产生多个独立 BetItem（因为逗号被展开了）。
  // 我们只把这些“复式多连展开产生的项”进行局部的归并重组，而保留同一行中的其他常规投注项。
  const multiComboRegexLocal = /((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]{2,12}))[\s]*(?:复式|复试|复)[\s]*([二三四五六23456两](?:[\s\-.。，,、\/]*[二三四五六23456两])*)[\s]*(?:连肖|连)[\s]*(各号|每号|各组|每组|各|每|买|压|个)?[\s]*(\d+(?:\.\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:元|块|米|个|斤|文|闷)?/gi;
  let comboMatch;

  const mergedItems = new Set<any>();

  multiComboRegexLocal.lastIndex = 0;

  while ((comboMatch = multiComboRegexLocal.exec(inputText)) !== null) {
    const originalText = comboMatch[0];
    const zodiacsStr = comboMatch[1];
    const countsStr = comboMatch[2];

    const counts = countsStr.split(/[\s\-.。，,、\/]+/).filter(Boolean);
    if (counts.length <= 1) {
      // 🔴 只有当连肖复式包含多个连数（如 4-5 连）时，才需要进行归并合并。
      // 如果仅是单组连数（如独立匹配到的一条四连），则保持原样不予合并。
      continue;
    }

    const comboStart = comboMatch.index;
    const comboEnd = comboStart + originalText.length;

    const getZodiacList = (str: string) => {
      return Array.from(str).filter(char => zodiacs.includes(char));
    };

    // 找出所有属于该复式片段展开生成的子 items
    const targetItems = parsed.items.filter(item => {
      if (mergedItems.has(item)) return false;

      // 🔴 精准物理位置限制：只合并从当前这组连肖复式所处物理范围 [comboStart, comboEnd] 内解析出来的子项
      const startInOriginal = item._start !== undefined && item._start < indexMap.length ? indexMap[item._start] : -1;
      const isPosMatch = startInOriginal >= comboStart && startInOriginal < comboEnd;
      if (!isPosMatch) return false;

      // 校验该下注是否属于该复式项的展开连数
      const hasMatchingBet = [
        ...item.multiZodiacBets,
        ...item.fourZodiacBets,
        ...item.fiveZodiacBets,
        ...item.sixZodiacBets
      ].some(b => {
        const isMatchZodiacs = b.zodiacs && b.zodiacs.join('') === getZodiacList(zodiacsStr).join('');
        return isMatchZodiacs;
      });

      return hasMatchingBet;
    });

    if (targetItems.length > 0) {
      // 创建局部统一的 unifiedItem
      const unifiedItem: BetItem = {
        text: originalText,
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
      };

      targetItems.forEach(item => {
        // 累加 delta
        Object.keys(item.numberDeltas).forEach(k => {
          const num = parseInt(k);
          unifiedItem.numberDeltas[num] = (unifiedItem.numberDeltas[num] || 0) + item.numberDeltas[num];
        });
        Object.keys(item.flatNumberDeltas).forEach(k => {
          const num = parseInt(k);
          unifiedItem.flatNumberDeltas[num] = (unifiedItem.flatNumberDeltas[num] || 0) + item.flatNumberDeltas[num];
        });
        Object.keys(item.zodiacDeltas).forEach(k => {
          unifiedItem.zodiacDeltas[k] = (unifiedItem.zodiacDeltas[k] || 0) + item.zodiacDeltas[k];
        });
        Object.keys(item.teXiaoDeltas).forEach(k => {
          unifiedItem.teXiaoDeltas[k] = (unifiedItem.teXiaoDeltas[k] || 0) + item.teXiaoDeltas[k];
        });
        Object.keys(item.tailDeltas).forEach(k => {
          const num = parseInt(k);
          unifiedItem.tailDeltas[num] = (unifiedItem.tailDeltas[num] || 0) + item.tailDeltas[num];
        });
        Object.keys(item.specialAttributeDeltas).forEach(k => {
          unifiedItem.specialAttributeDeltas[k] = (unifiedItem.specialAttributeDeltas[k] || 0) + item.specialAttributeDeltas[k];
        });

        // 转移连肖数据
        unifiedItem.multiZodiacBets.push(...item.multiZodiacBets);
        unifiedItem.sixZodiacBets.push(...item.sixZodiacBets);
        unifiedItem.fiveZodiacBets.push(...item.fiveZodiacBets);
        unifiedItem.fourZodiacBets.push(...item.fourZodiacBets);
        unifiedItem.multiTailBets.push(...item.multiTailBets);
        unifiedItem.notInBets.push(...item.notInBets);
        unifiedItem.combinationWinBets.push(...item.combinationWinBets);

        unifiedItem.total += item.total;
        mergedItems.add(item);
      });

      // Find first index of targetItems in parsed.items to preserve physical order
      const firstIndex = parsed.items.findIndex(item => targetItems.includes(item));
      if (firstIndex !== -1) {
        const newItems: BetItem[] = [];
        let inserted = false;
        for (let i = 0; i < parsed.items.length; i++) {
          const currentItem = parsed.items[i];
          if (targetItems.includes(currentItem)) {
            if (!inserted) {
              newItems.push(unifiedItem);
              inserted = true;
            }
          } else {
            newItems.push(currentItem);
          }
        }
        parsed.items = newItems;
      }
    }
  }

  // 3. 精准收集金额部分的数字文本 (防止金额 > 49 被标红误杀)
  const amountTexts = new Set<string>();
  parsed.items.forEach(item => {
    const matchAmt = item.text.match(/(\d+(?:\.\d+)?)(?:元|块|米|个|斤|文|闷)?$/);
    if (matchAmt) {
      amountTexts.add(matchAmt[1]);
    }
  });

  const validPhrases = new Set<string>();
  const invalidPhrases = new Set<string>();

  // 4. 精准标红无效号码
  const numRegex = /\d+/g;
  let numMatch;
  while ((numMatch = numRegex.exec(inputText)) !== null) {
    const numStr = numMatch[0];
    const val = parseInt(numStr);
    const start = numMatch.index;
    const end = start + numStr.length;

    if ((val > 49 || val === 0) && !amountTexts.has(numStr)) {
      // 检查该数字是否是尾数或头数的选择（如 0尾, 54867尾号, 2头）
      // 只要后面紧跟着 "尾" 或 "头"，就说明它是属性选择，排除在红字无效号码之外
      const lookahead = inputText.substring(end).trim();
      if (/^(?:尾|头)/.test(lookahead)) {
        continue;
      }

      // 如果它不是特殊组合的一部分（如连尾或特碰里的正常号码）
      const isInsideCombo = parsed.items.some(item => {
        const isCombo = item.multiTailBets.length > 0 ||
                        item.combinationWinBets.length > 0 ||
                        item.notInBets.length > 0 ||
                        item.multiZodiacBets.length > 0;
        return isCombo && item.text.includes(numStr);
      });

      if (!isInsideCombo) {
        invalidPhrases.add(numStr);
      }
    }
  }

  // 5. 提取匹配成功的词组用于前台高亮
  // 🔴 机制一：直接通过 validMatches 中的精确物理区间进行原词截取（最精准，防止由于拼装和别名转换导致的 indexOf 偏置失败）
  if (parsed.validMatches) {
    parsed.validMatches.forEach(m => {
      const startInOriginal = m.start < indexMap.length ? indexMap[m.start] : -1;
      const endInOriginal = (m.end - 1) < indexMap.length ? indexMap[m.end - 1] + 1 : -1;
      if (startInOriginal >= 0 && endInOriginal <= inputText.length && endInOriginal > startInOriginal) {
        const seg = inputText.substring(startInOriginal, endInOriginal).trim();
        if (seg) {
          validPhrases.add(seg);
        }
      }
    });
  }

  // 🔴 机制三：针对会改变物理长度的预处理替换（生肖组宏替换、复式多连、后置多组连肖），
  // 直接利用其原始匹配正则特征，去 inputText 中进行捞词，强行加入 validPhrases 避开区间计算偏差与 indexOf 失败。

  // 1. 生肖组宏替换捞词（如“六中家肖500”）
  const macroZodiacRegex = /((?:六中|六肖|6中|6肖|五中|五肖|5中|5肖|四中|四肖|4中|4肖)\s*(?:家|野|男|女|天|地|吉|美|凶|丑)肖?)(?:[^\d\n\r]*?(\d+(?:\.\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+))?/gi;
  let macroMatch;
  macroZodiacRegex.lastIndex = 0;
  while ((macroMatch = macroZodiacRegex.exec(inputText)) !== null) {
    validPhrases.add(macroMatch[0].trim());
  }

  // 2. 复式多连捞词（如“鼠牛羊蛇兔复式3.4.5连各10”）
  const multiComboRegexHighlight = /((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]{2,12}))[\s]*(?:复式|复试|复)[\s]*([二三四五六23456两](?:[\s\-.。，,、\/]*[二三四五六23456两])*)[\s]*(?:连肖|连)[\s]*(各号|每号|各组|每组|各|每|买|压|个)?[\s]*(\d+(?:\.\d+)?|[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾两廿卅佰仟]+)(?:元|块|米|个|斤|文|闷)?/gi;
  let comboHighlightMatch;
  multiComboRegexHighlight.lastIndex = 0;
  while ((comboHighlightMatch = multiComboRegexHighlight.exec(inputText)) !== null) {
    validPhrases.add(comboHighlightMatch[0].trim());
  }

  // 3. 后置多组连肖展开捞词（如“牛鸡虎，牛龙猪鸡连肖各10”）
  const multiGroupHighlightRegex = /((?:[马蛇龙兔虎牛鼠猪狗鸡猴羊家野]{2,12}[，,、\s]+)+)([马蛇龙兔虎牛鼠猪狗鸡猴羊家野]{2,12})([二三四五六23456两]?(?:连肖|连|肖))((各|每|买|压|个)?\d+(?:\.\d+)?)/gi;
  let groupHighlightMatch;
  multiGroupHighlightRegex.lastIndex = 0;
  while ((groupHighlightMatch = multiGroupHighlightRegex.exec(inputText)) !== null) {
    validPhrases.add(groupHighlightMatch[0].trim());
  }

  // 🔴 机制二：兜底逻辑，按 items 遍历进行反向检索和提取（兼容部分重组后文本）
  parsed.items.forEach(item => {
    if (item.text) {
      // 核心修复：由于预清洗做的是等长替换（例如 '友' -> '连', '拖' -> '连'），
      // 我们可以直接通过绝对位置或字符映射，将清洗后匹配到的 item.text 还原为原文本中的字串，
      // 从而让前端直接拿着原输入词进行绿色高亮渲染，完美对齐。
      let originalTextSegment = '';

      // 在原 preprocessed (其中等长替换过) 和原 inputText 间做字符对齐
      // 由于长度完全一致，如果有匹配到的词，可以直接按内容和位置映射
      // 最稳妥的方法是：将 item.text 在 preprocessed 里的匹配区间映射回 inputText
      let matchIndex = preprocessed.indexOf(item.text);
      if (matchIndex !== -1) {
        const startInOriginal = matchIndex < indexMap.length ? indexMap[matchIndex] : -1;
        const endInOriginal = (matchIndex + item.text.length - 1) < indexMap.length ? indexMap[matchIndex + item.text.length - 1] + 1 : -1;
        if (startInOriginal >= 0 && endInOriginal <= inputText.length && endInOriginal > startInOriginal) {
          originalTextSegment = inputText.substring(startInOriginal, endInOriginal);
          // 🔴 原地替换：保持原本的输入词在识别框中展示，避免显示展开后的生肖列表
          item.text = originalTextSegment;
        }
      } else {
        // 兜底机制：把特殊字映射回原字符
        let restored = item.text;
        // 如果原词包含 '友'，我们在 restored 中将 '连' 还原为 '友' 匹配
        // 由于预处理是非破环性等长处理，我们甚至可以直接在原文本里搜索相似的结构
        originalTextSegment = restored;
      }
      if (originalTextSegment) {
        validPhrases.add(originalTextSegment);
      }
    }
  });

  parsed.validPhrases = Array.from(validPhrases);
  parsed.invalidPhrases = Array.from(invalidPhrases);

  if (zodiacErrors.length > 0) {
    parsed.errors.push(...zodiacErrors);
  }

  return parsed;
};

// ==========================================
// 🔴 新增：parseMultiLotteryInput 的包装修饰器，汇聚 Phrases
// ==========================================
export const parseMultiLotteryInput = (inputText: string): MultiLotteryParsedResult => {
  const result = parseMultiLotteryInputOriginal(inputText);

  const allValidPhrases = new Set<string>();
  const allInvalidPhrases = new Set<string>();

  result.segments.forEach(seg => {
    if (seg.parsed.validPhrases) {
      seg.parsed.validPhrases.forEach(p => allValidPhrases.add(p));
    }
    if (seg.parsed.invalidPhrases) {
      seg.parsed.invalidPhrases.forEach(p => allInvalidPhrases.add(p));
    }
  });

  result.validPhrases = Array.from(allValidPhrases);
  result.invalidPhrases = Array.from(allInvalidPhrases);

  return result;
};
