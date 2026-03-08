export type LotteryType = '新澳' | '老澳' | '香港' | 'cc' | '老cc';

export interface BetOrder {
  id: string;
  text: string;
  numberDeltas: Record<number, number>;
  zodiacDeltas: Record<string, number>;
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
  drawNumbers: Record<string, (number | '')[]>;
  isDrawLocked: Record<string, boolean>;
  selectedLotteryType: string;
}
