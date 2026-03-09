export type LotteryType = '新澳' | '老澳' | '香港' | 'cc' | '老cc';

export interface MultiZodiacBet {
  zodiacs: string[];
  amount: number;
}

export interface BetOrder {
  id: string;
  text: string;
  numberDeltas: Record<number, number>;
  zodiacDeltas: Record<string, number>;
  tailDeltas: Record<number, number>;
  multiZodiacDeltas: MultiZodiacBet[];
  sixZodiacDeltas: MultiZodiacBet[];
  fourZodiacDeltas: MultiZodiacBet[];
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
}

export interface AppState {
  confirmedBets: ConfirmedBet[];
  cumulativeAmounts: Record<number, number>;
  zodiacCumulativeAmounts: Record<string, number>;
  tailCumulativeAmounts: Record<number, number>;
  drawNumbers: Record<string, (number | '')[]>;
  isDrawLocked: Record<string, boolean>;
  selectedLotteryType: string;
}
