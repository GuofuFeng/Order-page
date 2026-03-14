export const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
export const zodiacs = ['马', '蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊'];
export const lotteryTypes = ['新澳', '老澳', '香港', 'cc', '老cc', '越南', '泰国', '海天', '巴黎', '迪拜', '七星', '印度', '金沙', '澳大'];

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
