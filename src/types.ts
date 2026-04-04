export type LotteryType = '新澳' | '老澳' | '香港' | 'cc' | '老cc';

export interface MultiZodiacBet {
  zodiacs: string[];
  amount: number;
  type?: string;
  isTuo?: boolean;
  tuoBase?: string;
  tuoFollowers?: string;
  tuoCount?: number;
  tuoGroups?: string[][];
}

export interface NotInBet {
  x: number;
  numbers: number[];
  amount: number;
}

export interface CombinationWinBet {
  type: '三中三' | '二中二';
  numbers: number[];
  amount: number;
  isTuo?: boolean;
  tuoBase?: string;
  tuoFollowers?: string;
  tuoCount?: number;
  tuoGroups?: number[][];
}

export interface BetOrder {
  id: string;
  text: string;
  numberDeltas: Record<number, number>;
  flatNumberDeltas: Record<number, number>;
  zodiacDeltas: Record<string, number>;
  teXiaoDeltas: Record<string, number>;
  tailDeltas: Record<number, number>;
  multiZodiacDeltas: MultiZodiacBet[];
  sixZodiacDeltas: MultiZodiacBet[];
  fiveZodiacDeltas: MultiZodiacBet[];
  fourZodiacDeltas: MultiZodiacBet[];
  multiTailDeltas: MultiZodiacBet[];
  notInDeltas: NotInBet[];
  combinationWinDeltas: CombinationWinBet[];
  total: number;
  lotteryType: string;
  timestamp: number;
}

export interface ConfirmedBet {
  id: string;
  content: string;
  total: number;
  timestamp: number;
  lotteryType: string;
  items: BetOrder[];
  basketId: string;
}

export interface AppState {
  confirmedBets: ConfirmedBet[];
  cumulativeAmounts: Record<number, number>;
  flatNumberCumulativeAmounts: Record<number, number>;
  zodiacCumulativeAmounts: Record<string, number>;
  teXiaoCumulativeAmounts: Record<string, number>;
  tailCumulativeAmounts: Record<number, number>;
  drawNumbers: Record<string, (number | '')[]>;
  isDrawLocked: Record<string, boolean>;
  selectedLotteryType: string;
}

export interface TextParsedData {
  bets: Record<number, number>;
  flatBets: Record<number, number>;
  zodiacBets: Record<string, number>;
  tailBets: Record<number, number>;
  teXiaoBets: Record<string, number>;
  multiZodiacBets: MultiZodiacBet[];
  sixZodiacBets: MultiZodiacBet[];
  fiveZodiacBets: MultiZodiacBet[];
  fourZodiacBets: MultiZodiacBet[];
  multiTailBets: MultiZodiacBet[];
  notInBets: NotInBet[];
  combinationWinBets: CombinationWinBet[];
  errors: string[];
}
