export const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
export const zodiacs = ['马', '蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊'];
export const lotteryTypes = ['新澳', '老澳', '香港', '老cc', 'cc', '越南', '泰国', '海天', '巴黎', '迪拜', '七星', '印度', '金沙', '澳大'];

export const chineseNumberMap: Record<string, number> = {
  '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '壹': 1, '贰': 2, '叁': 3, '肆': 4, '伍': 5, '陆': 6, '柒': 7, '捌': 8, '玖': 9, '拾': 10,
  '两': 2, '廿': 20, '卅': 30, '百': 100, '佰': 100, '千': 1000, '仟': 1000, '万': 10000
};

export const redNumbers = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
export const blueNumbers = [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48];
export const greenNumbers = [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49];

export const domesticZodiacs = ['牛', '马', '羊', '鸡', '狗', '猪'];
export const wildZodiacs = ['鼠', '虎', '兔', '龙', '蛇', '猴'];

export const maleZodiacs = ['鼠', '牛', '虎', '龙', '马', '猴', '狗'];
export const femaleZodiacs = ['兔', '蛇', '羊', '鸡', '猪'];

export const heavenZodiacs = ['猪', '牛', '猴', '马', '兔', '龙'];
export const earthZodiacs = ['蛇', '羊', '鸡', '狗', '鼠', '虎'];

export const luckyZodiacs = ['兔', '龙', '蛇', '马', '羊', '鸡'];
export const unluckyZodiacs = ['鼠', '牛', '虎', '猴', '狗', '猪'];

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

export const fiveElements: Record<string, number[]> = {
  '金': [4, 5, 12, 13, 26, 27, 34, 35, 42, 43],
  '木': [8, 9, 16, 17, 24, 25, 38, 39, 46, 47],
  '水': [1, 14, 15, 22, 23, 30, 31, 44, 45],
  '火': [2, 3, 10, 11, 18, 19, 32, 33, 40, 41, 48, 49],
  '土': [6, 7, 20, 21, 28, 29, 36, 37]
};

export const getFiveElement = (num: number): string => {
  for (const [element, numbers] of Object.entries(fiveElements)) {
    if (numbers.includes(num)) return element;
  }
  return '';
};
