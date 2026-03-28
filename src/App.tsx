/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import ExcelJS from 'exceljs';
import { numbers, zodiacs, lotteryTypes, redNumbers, blueNumbers, greenNumbers, domesticZodiacs, wildZodiacs, isSumOdd, isSumEven } from './constants';
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from './utils/storage';
import { parseBetInput, parseMultiLotteryInput, chineseToNumber, REGEX_SIX_ZODIAC, REGEX_FIVE_ZODIAC, REGEX_FOUR_ZODIAC, REGEX_MULTI_ZODIAC, REGEX_MULTI_ZODIAC_ADVANCED, REGEX_MULTI_ZODIAC_V2, REGEX_TUO_ZODIAC_V3, REGEX_NOT_IN, REGEX_EACH, REGEX_GENERIC, REGEX_BAO, REGEX_PING, REGEX_TAIL, REGEX_MULTI_TAIL_ADVANCED, REGEX_MULTI_TAIL_V2, REGEX_MULTI_TAIL_V3, REGEX_FLAT_NUMBER, REGEX_TUO_ZODIAC, REGEX_HEAD_TAIL } from './utils/betParser';
import { getZodiacFromNumber, formatNumber, checkIsWinner, calculateWinAmount, getWinningDetails } from './utils/winningCalculator';
import { BetOrder, ConfirmedBet, MultiZodiacBet, NotInBet } from './types';

// Helper to get Beijing Date String (YYYY-MM-DD) with 04:00 AM cutoff
const getBeijingDateString = (timestamp: number) => {
  // Subtract 4 hours (4 * 60 * 60 * 1000 ms) to shift the cutoff to 04:00 AM
  const adjustedTimestamp = timestamp - 4 * 60 * 60 * 1000;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(adjustedTimestamp)).replace(/\//g, '-');
};

// Helper to get color for a number
const getNumberColor = (num: number | '') => {
  if (num === '') return { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-200' };
  if (redNumbers.includes(num as number)) return { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500' };
  if (blueNumbers.includes(num as number)) return { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' };
  if (greenNumbers.includes(num as number)) return { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500' };
  return { bg: 'bg-stone-800', text: 'text-stone-800', border: 'border-stone-800' };
};

export default function App() {
  const [currentPage, setCurrentPage] = useState('order');
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(new Set());
  const [inputText, setInputText] = useState('');
  const [selectedLotteryType, setSelectedLotteryType] = useState<string>(() => loadFromStorage(STORAGE_KEYS.SELECTED_LOTTERY_TYPE, lotteryTypes[0]));
  const [isLotteryTypeLocked, setIsLotteryTypeLocked] = useState<boolean>(() => loadFromStorage(STORAGE_KEYS.IS_LOTTERY_TYPE_LOCKED, false));
  const [selectedBasketId, setSelectedBasketId] = useState<string>(() => loadFromStorage(STORAGE_KEYS.SELECTED_BASKET_ID, 'A'));
  const [baskets, setBaskets] = useState<string[]>(['A', 'B', 'C', 'D', 'E']);

  const [allPendingBets, setAllPendingBets] = useState<Record<string, BetOrder[]>>(() => loadFromStorage(STORAGE_KEYS.ALL_PENDING_BETS, {}));
  const pendingBets = useMemo(() => allPendingBets[selectedBasketId] || [], [allPendingBets, selectedBasketId]);

  const setPendingBets = (newBets: BetOrder[] | ((prev: BetOrder[]) => BetOrder[])) => {
    setAllPendingBets(prev => {
      const current = prev[selectedBasketId] || [];
      const updated = typeof newBets === 'function' ? newBets(current) : newBets;
      return { ...prev, [selectedBasketId]: updated };
    });
  };
  const [deletedBetsHistory, setDeletedBetsHistory] = useState<{
    item: BetOrder;
    index: number;
  }[]>([]);
  const [amount, setAmount] = useState<number | ''>('');
  const [textParsedBets, setTextParsedBets] = useState<Record<number, number>>({});
  const [textParsedFlatBets, setTextParsedFlatBets] = useState<Record<number, number>>({});
  const [textParsedZodiacBets, setTextParsedZodiacBets] = useState<Record<string, number>>({});
  const [textParsedTailBets, setTextParsedTailBets] = useState<Record<number, number>>({});
  const [textParsedMultiZodiacBets, setTextParsedMultiZodiacBets] = useState<MultiZodiacBet[]>([]);
  const [textParsedSixZodiacBets, setTextParsedSixZodiacBets] = useState<MultiZodiacBet[]>([]);
  const [textParsedFiveZodiacBets, setTextParsedFiveZodiacBets] = useState<MultiZodiacBet[]>([]);
  const [textParsedFourZodiacBets, setTextParsedFourZodiacBets] = useState<MultiZodiacBet[]>([]);
  const [textParsedMultiTailBets, setTextParsedMultiTailBets] = useState<MultiZodiacBet[]>([]);
  const [textParsedNotInBets, setTextParsedNotInBets] = useState<NotInBet[]>([]);
  const [textParsedErrors, setTextParsedErrors] = useState<string[]>([]);
  
  const [oddEvenFilter, setOddEvenFilter] = useState<'odd' | 'even' | null>(null);
  const [sumOddEvenFilter, setSumOddEvenFilter] = useState<'odd' | 'even' | null>(null);
  const [colorFilter, setColorFilter] = useState<'red' | 'green' | 'blue' | null>(null);
  const [sizeFilter, setSizeFilter] = useState<'big' | 'small' | null>(null);
  const [domesticWildFilter, setDomesticWildFilter] = useState<'domestic' | 'wild' | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);
  
  const [zodiacBetAmounts, setZodiacBetAmounts] = useState<Record<string, number | ''>>({});
  const [tailBetAmounts, setTailBetAmounts] = useState<Record<number, number | ''>>({});
  
  const [multiZodiacSelection, setMultiZodiacSelection] = useState<string[]>([]);
  const [multiZodiacAmount, setMultiZodiacAmount] = useState<number | ''>('');

  // Final confirmed bets for the table
  const [confirmedBets, setConfirmedBets] = useState<ConfirmedBet[]>(() => loadFromStorage(STORAGE_KEYS.CONFIRMED_BETS, []));

  // Filter confirmed bets by selected basket
  const filteredConfirmedBets = useMemo(() => {
    return confirmedBets.filter(bet => bet.basketId === selectedBasketId);
  }, [confirmedBets, selectedBasketId]);

  const [todayBeijing, setTodayBeijing] = useState(() => getBeijingDateString(Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getBeijingDateString(Date.now());
      if (current !== todayBeijing) {
        setTodayBeijing(current);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [todayBeijing]);

  // Split bets into Today and Past
  const todayBets = useMemo(() => {
    return filteredConfirmedBets
      .filter(o => getBeijingDateString(o.timestamp) === todayBeijing)
      .sort((a, b) => b.timestamp - a.timestamp); // Reverse chronological (newest first)
  }, [filteredConfirmedBets, todayBeijing]);

  const pastBets = useMemo(() => filteredConfirmedBets.filter(o => getBeijingDateString(o.timestamp) !== todayBeijing), [filteredConfirmedBets, todayBeijing]);

  // Group past bets by date
  const groupedPastBets = useMemo(() => {
    const groups: Record<string, ConfirmedBet[]> = {};
    pastBets.forEach(bet => {
      const date = getBeijingDateString(bet.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(bet);
    });
    // Sort items within each date by reverse chronological
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => b.timestamp - a.timestamp);
    });
    return groups;
  }, [pastBets]);

  // DERIVED: Cumulative amounts from pending and today's confirmed bets
  const cumulativeAmounts = useMemo(() => {
    const totals: Record<number, number> = {};
    const allTodayItems = [...pendingBets, ...todayBets.flatMap(b => b.items || [])];
    allTodayItems.forEach(item => {
      (Object.entries(item.numberDeltas) as [string, number][]).forEach(([num, amt]) => {
        const n = Number(num);
        totals[n] = (totals[n] || 0) + amt;
      });
    });
    return totals;
  }, [pendingBets, todayBets]);

  const flatNumberCumulativeAmounts = useMemo(() => {
    const totals: Record<number, number> = {};
    const allTodayItems = [...pendingBets, ...todayBets.flatMap(b => b.items || [])];
    allTodayItems.forEach(item => {
      (Object.entries(item.flatNumberDeltas || {}) as [string, number][]).forEach(([num, amt]) => {
        const n = Number(num);
        totals[n] = (totals[n] || 0) + amt;
      });
    });
    return totals;
  }, [pendingBets, todayBets]);

  const zodiacCumulativeAmounts = useMemo(() => {
    const totals: Record<string, number> = {};
    const allTodayItems = [...pendingBets, ...todayBets.flatMap(b => b.items || [])];
    allTodayItems.forEach(item => {
      (Object.entries(item.zodiacDeltas) as [string, number][]).forEach(([z, amt]) => {
        totals[z] = (totals[z] || 0) + amt;
      });
    });
    return totals;
  }, [pendingBets, todayBets]);

  const tailCumulativeAmounts = useMemo(() => {
    const totals: Record<number, number> = {};
    const allTodayItems = [...pendingBets, ...todayBets.flatMap(b => b.items || [])];
    allTodayItems.forEach(item => {
      (Object.entries(item.tailDeltas || {}) as [string, number][]).forEach(([tail, amt]) => {
        const t = Number(tail);
        totals[t] = (totals[t] || 0) + amt;
      });
    });
    return totals;
  }, [pendingBets, todayBets]);

  const currentPendingTotal = useMemo(() => pendingBets.reduce((sum, item) => sum + item.total, 0), [pendingBets]);

  const top5Numbers = useMemo(() => {
    const entries = (Object.entries(cumulativeAmounts) as [string, number][])
      .filter(([_, val]) => val > 0)
      .map(([num, val]) => ({ num: Number(num), val }));
    if (entries.length === 0) return new Set<number>();
    entries.sort((a, b) => b.val - a.val || a.num - b.num);
    return new Set(entries.slice(0, 5).map(e => e.num));
  }, [cumulativeAmounts]);

  // Manual entry state
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [manualTotal, setManualTotal] = useState<number | ''>('');

  // Folding state for today's orders
  const [isTodayExpanded, setIsTodayExpanded] = useState(true);
  const inputScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Folding state for past orders (per date)
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  // Editing state for confirmed bets
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingTotal, setEditingTotal] = useState<number | ''>('');
  const [editingLotteryType, setEditingLotteryType] = useState('');

  const [drawNumbers, setDrawNumbers] = useState<Record<string, (number | '')[]>>(() => {
    const defaultDraws = lotteryTypes.reduce((acc, type) => ({ ...acc, [type]: Array(7).fill('') }), {});
    const savedDraws = loadFromStorage(STORAGE_KEYS.DRAW_NUMBERS, defaultDraws);
    return { ...defaultDraws, ...savedDraws };
  });
  const [isDrawLocked, setIsDrawLocked] = useState<Record<string, boolean>>(() => {
    const defaultLocked = lotteryTypes.reduce((acc, type) => ({ ...acc, [type]: false }), {});
    const savedLocked = loadFromStorage(STORAGE_KEYS.IS_DRAW_LOCKED, defaultLocked);
    return { ...defaultLocked, ...savedLocked };
  });

  // Persistence: Save to localStorage on change
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CONFIRMED_BETS, confirmedBets);
  }, [confirmedBets]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ALL_PENDING_BETS, allPendingBets);
  }, [allPendingBets]);

  // Prevent accidental refresh if there are pending bets
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingBets.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingBets]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.DRAW_NUMBERS, drawNumbers);
  }, [drawNumbers]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.IS_DRAW_LOCKED, isDrawLocked);
  }, [isDrawLocked]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SELECTED_LOTTERY_TYPE, selectedLotteryType);
  }, [selectedLotteryType]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.IS_LOTTERY_TYPE_LOCKED, isLotteryTypeLocked);
  }, [isLotteryTypeLocked]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SELECTED_BASKET_ID, selectedBasketId);
  }, [selectedBasketId]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ALL_PENDING_BETS, allPendingBets);
  }, [allPendingBets]);

  // Parsing logic for textarea input
  useEffect(() => {
    const segments = parseMultiLotteryInput(inputText);
    
    if (segments.length === 0) {
      setSelectedNumbers(new Set());
      setAmount('');
      setTextParsedBets({});
      setTextParsedFlatBets({});
      setTextParsedZodiacBets({});
      setTextParsedTailBets({});
      setTextParsedMultiZodiacBets([]);
      setTextParsedSixZodiacBets([]);
      setTextParsedFiveZodiacBets([]);
      setTextParsedFourZodiacBets([]);
      setTextParsedMultiTailBets([]);
      setTextParsedNotInBets([]);
      setTextParsedErrors([]);
      return;
    }

    const mergedSelected = new Set<number>();
    const mergedBets: Record<number, number> = {};
    const mergedFlatBets: Record<number, number> = {};
    const mergedZodiacBets: Record<string, number> = {};
    const mergedTailBets: Record<number, number> = {};
    const mergedMultiZodiac: MultiZodiacBet[] = [];
    const mergedSixZodiac: MultiZodiacBet[] = [];
    const mergedFiveZodiac: MultiZodiacBet[] = [];
    const mergedFourZodiac: MultiZodiacBet[] = [];
    const mergedMultiTail: MultiZodiacBet[] = [];
    const mergedNotIn: NotInBet[] = [];
    const mergedErrors: string[] = [];
    let lastAmount: number | '' = '';
    let anyPatternFound = false;

    segments.forEach(seg => {
      const p = seg.parsed;
      p.selectedNumbers.forEach(n => mergedSelected.add(n));
      Object.entries(p.parsedBets).forEach(([n, a]) => mergedBets[Number(n)] = (mergedBets[Number(n)] || 0) + a);
      Object.entries(p.parsedFlatBets).forEach(([n, a]) => mergedFlatBets[Number(n)] = (mergedFlatBets[Number(n)] || 0) + a);
      Object.entries(p.parsedZodiacBets).forEach(([z, a]) => mergedZodiacBets[z] = (mergedZodiacBets[z] || 0) + a);
      Object.entries(p.parsedTailBets).forEach(([t, a]) => mergedTailBets[Number(t)] = (mergedTailBets[Number(t)] || 0) + a);
      mergedMultiZodiac.push(...p.parsedMultiZodiacBets);
      mergedSixZodiac.push(...p.parsedSixZodiacBets);
      mergedFiveZodiac.push(...p.parsedFiveZodiacBets);
      mergedFourZodiac.push(...p.parsedFourZodiacBets);
      mergedMultiTail.push(...p.parsedMultiTailBets);
      mergedNotIn.push(...p.parsedNotInBets);
      mergedErrors.push(...p.errors);
      if (p.lastAmount !== '') lastAmount = p.lastAmount;
      if (p.anyPatternFound) anyPatternFound = true;
    });

    const firstRecognized = segments.find(s => s.lotteryType)?.lotteryType;
    if (firstRecognized && !isLotteryTypeLocked) {
      setSelectedLotteryType(firstRecognized);
    }

    if (anyPatternFound || mergedErrors.length > 0) {
      setSelectedNumbers(mergedSelected);
      setAmount(lastAmount);
      setTextParsedBets(mergedBets);
      setTextParsedFlatBets(mergedFlatBets);
      setTextParsedZodiacBets(mergedZodiacBets);
      setTextParsedTailBets(mergedTailBets);
      setTextParsedMultiZodiacBets(mergedMultiZodiac);
      setTextParsedSixZodiacBets(mergedSixZodiac);
      setTextParsedFiveZodiacBets(mergedFiveZodiac);
      setTextParsedFourZodiacBets(mergedFourZodiac);
      setTextParsedMultiTailBets(mergedMultiTail);
      setTextParsedNotInBets(mergedNotIn);
      setTextParsedErrors(mergedErrors);
    } else {
      setSelectedNumbers(new Set());
      setAmount('');
      setTextParsedBets({});
      setTextParsedFlatBets({});
      setTextParsedZodiacBets({});
      setTextParsedTailBets({});
      setTextParsedMultiZodiacBets([]);
      setTextParsedSixZodiacBets([]);
      setTextParsedFiveZodiacBets([]);
      setTextParsedFourZodiacBets([]);
      setTextParsedMultiTailBets([]);
      setTextParsedNotInBets([]);
      setTextParsedErrors([]);
    }
  }, [inputText]);

  // Effect to handle simultaneous filters
  useEffect(() => {
    if (oddEvenFilter === null && colorFilter === null && sizeFilter === null && domesticWildFilter === null && sumOddEvenFilter === null) {
      // If no filters, don't clear manual selections unless they were set by filters
      // Actually, it's better to just clear if all filters are off to match user expectation of "reset"
      return;
    }

    let filtered = [...numbers];

    if (oddEvenFilter === 'odd') {
      filtered = filtered.filter(n => n % 2 !== 0);
    } else if (oddEvenFilter === 'even') {
      filtered = filtered.filter(n => n % 2 === 0);
    }

    if (colorFilter === 'red') {
      filtered = filtered.filter(n => redNumbers.includes(n));
    } else if (colorFilter === 'green') {
      filtered = filtered.filter(n => greenNumbers.includes(n));
    } else if (colorFilter === 'blue') {
      filtered = filtered.filter(n => blueNumbers.includes(n));
    }

    if (sizeFilter === 'small') {
      filtered = filtered.filter(n => n >= 1 && n <= 24);
    } else if (sizeFilter === 'big') {
      filtered = filtered.filter(n => n >= 25 && n <= 49);
    }

    if (domesticWildFilter === 'domestic') {
      filtered = filtered.filter(n => domesticZodiacs.includes(getZodiacFromNumber(n)));
    } else if (domesticWildFilter === 'wild') {
      filtered = filtered.filter(n => wildZodiacs.includes(getZodiacFromNumber(n)));
    }

    if (sumOddEvenFilter === 'odd') {
      filtered = filtered.filter(n => isSumOdd(n));
    } else if (sumOddEvenFilter === 'even') {
      filtered = filtered.filter(n => isSumEven(n));
    }

    setSelectedNumbers(new Set(filtered));
  }, [oddEvenFilter, colorFilter, sizeFilter, domesticWildFilter, sumOddEvenFilter]);

  const toggleNumber = (num: number) => {
    const newSelected = new Set(selectedNumbers);
    if (newSelected.has(num)) {
      newSelected.delete(num);
    } else {
      newSelected.add(num);
    }
    setSelectedNumbers(newSelected);
    // Keep focus on amount input
    amountInputRef.current?.focus();
  };

  const selectZodiacColumn = (index: number) => {
    const newSelected = new Set(selectedNumbers);
    const columnNumbers: number[] = [];
    for (let i = index + 1; i <= 49; i += 12) {
      columnNumbers.push(i);
    }

    const allSelected = columnNumbers.every(num => selectedNumbers.has(num));

    if (allSelected) {
      columnNumbers.forEach(num => newSelected.delete(num));
    } else {
      columnNumbers.forEach(num => newSelected.add(num));
    }
    setSelectedNumbers(newSelected);
    // Keep focus on amount input
    amountInputRef.current?.focus();
  };

  const clearAllSelections = () => {
    setSelectedNumbers(new Set());
    amountInputRef.current?.focus();
  };

  const toggleOddEven = () => {
    const oddNumbers = numbers.filter(n => n % 2 !== 0);
    const evenNumbers = numbers.filter(n => n % 2 === 0);
    
    const isCurrentlyOdd = selectedNumbers.size === oddNumbers.length && 
                           oddNumbers.every(n => selectedNumbers.has(n));
    
    if (isCurrentlyOdd) {
      setSelectedNumbers(new Set(evenNumbers));
    } else {
      setSelectedNumbers(new Set(oddNumbers));
    }
    // Keep focus on amount input
    amountInputRef.current?.focus();
  };

  // Add to pending bets list
  const handleAddToPending = () => {
    if (textParsedErrors.length > 0) {
      alert(textParsedErrors.join('\n'));
      return;
    }

    const itemsToAdd: BetOrder[] = [];
    const newZodiacBetAmounts = { ...zodiacBetAmounts };
    
    let hasAction = false;

    // 1. Handle text input (Numbers, Zodiacs and Tails)
    if (inputText.trim()) {
      const segments = parseMultiLotteryInput(inputText);
      
      segments.forEach(seg => {
        const p = seg.parsed;
        const lotteryType = isLotteryTypeLocked ? selectedLotteryType : (seg.lotteryType || selectedLotteryType);
        
        // Process granular items for splitting
        p.items.forEach(item => {
          itemsToAdd.push({
            id: Math.random().toString(36).substr(2, 9),
            text: item.text,
            numberDeltas: item.numberDeltas,
            flatNumberDeltas: item.flatNumberDeltas,
            zodiacDeltas: item.zodiacDeltas,
            tailDeltas: item.tailDeltas,
            multiZodiacDeltas: [...item.multiZodiacBets],
            sixZodiacDeltas: [...item.sixZodiacBets], 
            fiveZodiacDeltas: [...item.fiveZodiacBets], 
            fourZodiacDeltas: [...item.fourZodiacBets],
            multiTailDeltas: [...item.multiTailBets],
            notInDeltas: [...item.notInBets], 
            total: item.total,
            lotteryType,
            timestamp: Date.now()
          });
          hasAction = true;
        });
      });
    }

    // 2. Handle manually selected numbers (that aren't already in textParsedBets)
    if (selectedNumbers.size > 0 && amount !== '') {
      if (amount < 0) {
        alert('金额不能为负数');
        return;
      }
      
      const processedNums = new Set([
        ...Object.keys(textParsedBets).map(Number),
        ...Object.keys(textParsedFlatBets).map(Number)
      ]);
      const manualNums = [...selectedNumbers].filter(n => !processedNums.has(n));
      
      if (manualNums.length > 0) {
        const numberDeltas: Record<number, number> = {};
        let addedTotal = 0;
        
        manualNums.forEach(num => {
          const amt = amount as number;
          numberDeltas[num] = amt;
          addedTotal += amt;
        });

        const sortedNums = manualNums.sort((a, b) => a - b);
        itemsToAdd.push({
          id: Math.random().toString(36).substr(2, 9),
          text: `${sortedNums.map(n => formatNumber(n)).join('，')}各号下单${amount}元`,
          numberDeltas,
          flatNumberDeltas: {},
          zodiacDeltas: {},
          tailDeltas: {},
          multiZodiacDeltas: [],
          sixZodiacDeltas: [],
          fiveZodiacDeltas: [],
          fourZodiacDeltas: [],
          multiTailDeltas: [],
          notInDeltas: [],
          total: addedTotal,
          lotteryType: selectedLotteryType,
          timestamp: Date.now()
        });
        hasAction = true;
      }
    }

    // 3. Handle manual zodiac bets (that aren't already in textParsedZodiacBets)
    let hasNegativeZodiac = false;
    zodiacs.forEach(z => {
      const val = zodiacBetAmounts[z];
      const parsedVal = textParsedZodiacBets[z];
      
      if (val !== undefined && val !== '') {
        if (val < 0) {
          hasNegativeZodiac = true;
          return;
        }
        
        if (parsedVal !== undefined) return; 

        const zodiacDeltas = { [z]: val as number };
        newZodiacBetAmounts[z] = '';
        
        itemsToAdd.push({
          id: Math.random().toString(36).substr(2, 9),
          text: `平肖${z}下单${val}元`,
          numberDeltas: {},
          flatNumberDeltas: {},
          zodiacDeltas,
          tailDeltas: {},
          multiZodiacDeltas: [],
          sixZodiacDeltas: [],
          fiveZodiacDeltas: [],
          fourZodiacDeltas: [],
          multiTailDeltas: [],
          notInDeltas: [],
          total: val as number,
          lotteryType: selectedLotteryType,
          timestamp: Date.now()
        });
        hasAction = true;
      }
    });

    if (hasNegativeZodiac) {
      alert('生肖金额不能为负数');
      return;
    }

    // 4. Handle manual tail bets (that aren't already in textParsedTailBets)
    let hasNegativeTail = false;
    const newTailBetAmounts = { ...tailBetAmounts };
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(t => {
      const val = tailBetAmounts[t];
      const parsedVal = textParsedTailBets[t];
      
      if (val !== undefined && val !== '') {
        if (val < 0) {
          hasNegativeTail = true;
          return;
        }
        
        if (parsedVal !== undefined) return; 

        const tailDeltas = { [t]: val as number };
        newTailBetAmounts[t] = '';
        
        itemsToAdd.push({
          id: Math.random().toString(36).substr(2, 9),
          text: `平${t}尾下单${val}元`,
          numberDeltas: {},
          flatNumberDeltas: {},
          zodiacDeltas: {},
          tailDeltas,
          multiZodiacDeltas: [],
          sixZodiacDeltas: [],
          fiveZodiacDeltas: [],
          fourZodiacDeltas: [],
          multiTailDeltas: [],
          notInDeltas: [],
          total: val as number,
          lotteryType: selectedLotteryType,
          timestamp: Date.now()
        });
        hasAction = true;
      }
    });

    if (hasNegativeTail) {
      alert('尾数金额不能为负数');
      return;
    }

    // 5. Handle manual multi-zodiac bets
    if (multiZodiacSelection.length > 0) {
      if (multiZodiacSelection.length < 2) {
        alert('连肖至少选择2个生肖');
        return;
      }
      if (multiZodiacAmount === '' || multiZodiacAmount <= 0) {
        alert('请输入有效的连肖金额');
        return;
      }

      const multiZodiacDeltas = [{
        zodiacs: [...multiZodiacSelection],
        amount: multiZodiacAmount as number
      }];
      
      itemsToAdd.push({
        id: Math.random().toString(36).substr(2, 9),
        text: `${multiZodiacSelection.length}肖${multiZodiacSelection.join('')}下单${multiZodiacAmount}元`,
        numberDeltas: {},
        flatNumberDeltas: {},
        zodiacDeltas: {},
        tailDeltas: {},
        multiZodiacDeltas,
        sixZodiacDeltas: [],
        fiveZodiacDeltas: [],
        fourZodiacDeltas: [],
        multiTailDeltas: [],
        notInDeltas: [],
        total: multiZodiacAmount as number,
        lotteryType: selectedLotteryType,
        timestamp: Date.now()
      });
      hasAction = true;
    }

    // 6. Handle text-parsed six-zodiac bets (REMOVED: Handled in step 1)

    // 6.5 Handle text-parsed five-zodiac bets (REMOVED: Handled in step 1)

    // 7. Handle text-parsed four-zodiac bets (REMOVED: Handled in step 1)

    // 8. Handle text-parsed x-not-in bets (REMOVED: Handled in step 1)

    if (hasAction) {
      const finalItemsToAdd = itemsToAdd.map(item => {
        const lotteryPrefix = `【${item.lotteryType}】`;
        return {
          ...item,
          text: item.text.startsWith('【') ? item.text : `${lotteryPrefix}${item.text}`
        };
      });
      
      setPendingBets(prev => [...prev, ...finalItemsToAdd]);
      setZodiacBetAmounts(newZodiacBetAmounts);
      setTailBetAmounts(newTailBetAmounts);
      setMultiZodiacSelection([]);
      setMultiZodiacAmount('');
      setSelectedNumbers(new Set());
      setAmount('');
      setInputText('');
      setOddEvenFilter(null);
      setColorFilter(null);
      setSizeFilter(null);
      setTextParsedBets({});
      setTextParsedZodiacBets({});
      setTextParsedTailBets({});
      setTextParsedMultiZodiacBets([]);
      setTextParsedSixZodiacBets([]);
      setTextParsedFourZodiacBets([]);
      setTextParsedNotInBets([]);
    } else {
      alert('请先选择数字、生肖或尾数并输入金额');
    }
  };

  const deletePendingBet = (id: string) => {
    const index = pendingBets.findIndex(item => item.id === id);
    if (index === -1) return;

    const itemToDelete = pendingBets[index];
    setPendingBets(prev => prev.filter(item => item.id !== id));
    setDeletedBetsHistory(prev => [...prev, { item: itemToDelete, index }]);
  };

  const clearAllPendingBets = () => {
    if (pendingBets.length === 0) return;
    setPendingBets([]);
    setDeletedBetsHistory([]);
  };

  const undoDeletePendingBet = () => {
    if (deletedBetsHistory.length === 0) return;

    const lastDeleted = deletedBetsHistory[deletedBetsHistory.length - 1];
    const itemToRestore = lastDeleted.item;
    
    const newPendingBets = [...pendingBets];
    newPendingBets.splice(lastDeleted.index, 0, itemToRestore);
    setPendingBets(newPendingBets);
    setDeletedBetsHistory(prev => prev.slice(0, -1));
  };

  // Final confirm bets to table
  const handleConfirmBets = () => {
    if (pendingBets.length === 0) {
      alert('待确认区域没有内容可以提交');
      return;
    }
    
    // Add lottery type prefix to each line to ensure correct highlighting in the table
    // Note: item.text already contains the prefix from handleAddToPending
    const finalContent = pendingBets.map(item => item.text).join('\n');
    const uniqueLotteryTypes = Array.from(new Set(pendingBets.map(item => item.lotteryType)));
    const lotteryTypeDisplay = uniqueLotteryTypes.join(' ');
    
    setConfirmedBets(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9),
      content: finalContent, 
      total: currentPendingTotal, 
      timestamp: Date.now(),
      lotteryType: lotteryTypeDisplay,
      basketId: selectedBasketId,
      items: [...pendingBets]
    }]);
    setPendingBets([]);
    setDeletedBetsHistory([]);
  };

  const handleExportExcel = async (betsToExport: ConfirmedBet[], filename: string) => {
    if (betsToExport.length === 0) {
      alert('没有注单可以导出');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Confirmed Bets');

    // Define columns
    worksheet.columns = [
      { header: '序号', key: 'index', width: 10 },
      { header: '彩种', key: 'type', width: 15 },
      { header: '注单内容', key: 'content', width: 60 },
      { header: '下注金额', key: 'total', width: 15 },
      { header: '中奖类型', key: 'winType', width: 20 },
      { header: '中奖金额', key: 'win', width: 15 },
      { header: '下单时间', key: 'time', width: 25 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data - sort by timestamp ascending (oldest first) to match UI serial numbers 1, 2, 3...
    const sortedBets = [...betsToExport].sort((a, b) => a.timestamp - b.timestamp);
    sortedBets.forEach((order, index) => {
      const totalWin = (order.items || []).reduce((sum, item) => {
        const win = calculateWinAmount(item.numberDeltas, item.flatNumberDeltas || {}, item.zodiacDeltas, item.tailDeltas, item.multiZodiacDeltas, item.sixZodiacDeltas, item.fiveZodiacDeltas, item.fourZodiacDeltas, item.multiTailDeltas, item.notInDeltas, drawNumbers[item.lotteryType], item.lotteryType);
        return sum + (win || 0);
      }, 0);

      const winDetailsMap = (order.items || []).reduce((acc, item) => {
        const details = getWinningDetails(item.numberDeltas, item.flatNumberDeltas || {}, item.zodiacDeltas, item.tailDeltas, item.multiZodiacDeltas, item.sixZodiacDeltas, item.fiveZodiacDeltas, item.fourZodiacDeltas, item.multiTailDeltas, item.notInDeltas, drawNumbers[item.lotteryType]);
        Object.entries(details).forEach(([type, amt]) => {
          acc[type] = (acc[type] || 0) + amt;
        });
        return acc;
      }, {} as Record<string, number>);
      const winDetails = Object.entries(winDetailsMap).map(([type, sum]) => `${type}${sum}`);

      const row = worksheet.addRow({
        index: index + 1,
        type: order.lotteryType,
        content: '', // Will be set as rich text
        total: order.total,
        winType: winDetails.join(' '),
        win: totalWin > 0 ? totalWin : '',
        time: new Date(order.timestamp).toLocaleString()
      });

      // Style win cell if there's a win
      if (totalWin > 0) {
        const winCell = row.getCell('win');
        winCell.font = { bold: true, color: { argb: 'FFFF0000' } };
      }

      // Style other cells to match UI
      row.getCell('type').font = { bold: true, color: { argb: 'FF78716C' } }; // stone-500
      row.getCell('total').font = { bold: true, color: { argb: 'FF1C1917' } }; // stone-900
      row.getCell('index').font = { color: { argb: 'FFA8A29E' } }; // stone-400
      row.getCell('time').font = { color: { argb: 'FFA8A29E' } }; // stone-400

      // Handle rich text for content (highlighting)
      const contentCell = row.getCell('content');
      const lines = order.content.split('\n');
      const richText: any[] = [];
      let lastDetectedLotteryType = '';

      lines.forEach((line, lineIdx) => {
        let currentLotteryType = lastDetectedLotteryType;
        const typeMatch = line.match(/【(.+?)】/);
        if (typeMatch) {
          currentLotteryType = typeMatch[1];
          lastDetectedLotteryType = currentLotteryType;
        } else if (order.lotteryType && !order.lotteryType.includes(' ')) {
          currentLotteryType = order.lotteryType;
        }

        const context = {
          drawNumbers: currentLotteryType ? drawNumbers[currentLotteryType] : [],
          isLocked: currentLotteryType ? isDrawLocked[currentLotteryType] : false
        };

        // Split line into segments by "各" or "下单"
        // We want to highlight only the parts BEFORE "各" or "下单"
        const segments = line.split(/(各|下单)/);
        
        segments.forEach((segment, segIdx) => {
          if (segment === '各' || segment === '下单') {
            richText.push({
              text: segment,
              font: { color: { argb: 'FF999999' } }
            });
            return;
          }

          // If this segment follows a "各" or "下单", it's an amount part
          const isAmountPart = segIdx > 0 && (segments[segIdx-1] === '各' || segments[segIdx-1] === '下单');
          
          if (isAmountPart) {
            // Only highlight the first number/unit as the amount, the rest might be next bet
            const amountMatch = segment.match(/^(\d+|[一二三四五六七八九十百千万]+(?:元|块)?)/);
            if (amountMatch) {
              const amountText = amountMatch[0];
              const remainingText = segment.slice(amountText.length);
              
              richText.push({
                text: amountText,
                font: { color: { argb: 'FF999999' } }
              });
              
              if (remainingText) {
                // Process remaining text as normal bet content
                processBetContent(remainingText, context, richText);
              }
            } else {
              richText.push({ text: segment, font: { color: { argb: 'FF999999' } } });
            }
          } else {
            processBetContent(segment, context, richText);
          }
        });

        if (lineIdx < lines.length - 1) {
          richText.push({ text: '\n' });
        }
      });

      function processBetContent(text: string, context: any, richText: any[]) {
        // Updated regex to capture multi-digit tails like "246尾"
        const parts = text.split(/(平?\d+尾|\d{1,2}|[马蛇龙兔虎牛鼠猪狗鸡猴羊]|单|双|大|小|红|绿|蓝)/);
        const drawNums = context.drawNumbers || [];
        const normalNums = drawNums.slice(0, 6);
        const specialNum = drawNums[6];
        const winningZodiacsNormal = normalNums.map((n: any) => getZodiacFromNumber(n as number)).filter(Boolean);
        const winningZodiacSpecial = getZodiacFromNumber(specialNum as number);
        const winningTails = drawNums.map((n: any) => (n === '' ? -1 : (n as number) % 10)).filter((t: number) => t !== -1);
        const specialTail = specialNum !== '' ? (specialNum as number) % 10 : -1;

        parts.forEach(part => {
          if (!part) return;
          
          if (context.isLocked && context.drawNumbers.length >= 7) {
            if (/^\d{1,2}$/.test(part)) {
              const num = parseInt(part);
              if (num === specialNum) {
                richText.push({ text: part, font: { color: { argb: 'FFFF0000' }, bold: true, underline: true } });
              } else if (normalNums.includes(num)) {
                richText.push({ text: part, font: { color: { argb: 'FF0000FF' }, bold: true, underline: true } });
              } else {
                richText.push({ text: part });
              }
            } else if (part.endsWith('尾')) {
              const tailMatch = part.match(/(\d+)尾/);
              if (tailMatch) {
                const tailDigits = tailMatch[1].split('');
                const isFlat = part.startsWith('平');
                
                if (isFlat) richText.push({ text: '平' });
                
                tailDigits.forEach(digit => {
                  const d = parseInt(digit);
                  const isWinning = isFlat ? winningTails.includes(d) : d === specialTail;
                  richText.push({
                    text: digit,
                    font: isWinning ? { color: { argb: isFlat ? 'FF0000FF' : 'FFFF0000' }, bold: true, underline: true } : undefined
                  });
                });
                
                const isTailWinning = isFlat ? winningTails.some(d => tailDigits.includes(d.toString())) : tailDigits.includes(specialTail.toString());
                richText.push({
                  text: '尾',
                  font: isTailWinning ? { color: { argb: isFlat ? 'FF0000FF' : 'FFFF0000' }, bold: true, underline: true } : undefined
                });
              } else {
                richText.push({ text: part });
              }
            } else if (zodiacs.includes(part)) {
              if (part === winningZodiacSpecial) {
                richText.push({ text: part, font: { color: { argb: 'FFFF0000' }, bold: true, underline: true } });
              } else if (winningZodiacsNormal.includes(part)) {
                richText.push({ text: part, font: { color: { argb: 'FF0000FF' }, bold: true, underline: true } });
              } else {
                richText.push({ text: part });
              }
            } else if (['单', '双', '大', '小', '红', '绿', '蓝'].includes(part)) {
              if (checkIsWinner(part, context)) {
                richText.push({ text: part, font: { color: { argb: 'FFFF0000' }, bold: true, underline: true } });
              } else {
                richText.push({ text: part });
              }
            } else {
              richText.push({ text: part });
            }
          } else {
            richText.push({ text: part });
          }
        });
      }

      contentCell.value = { richText };
      contentCell.alignment = { wrapText: true, vertical: 'top' };
    });

    // Add summary
    const totalSum = betsToExport.reduce((sum, order) => sum + order.total, 0);
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow(['总下注', '', '', totalSum]);
    const summaryRow = worksheet.lastRow;
    if (summaryRow) {
      summaryRow.getCell(1).font = { bold: true };
      summaryRow.getCell(4).font = { bold: true, color: { argb: 'FF1C1917' } };
    }

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAddManualBet = () => {
    if (!manualContent.trim() || manualTotal === '') {
      alert('请填写注单内容和金额');
      return;
    }
    
    // Attempt to parse manual content for deltas
    const { parsedBets, parsedZodiacBets, parsedTailBets, parsedMultiZodiacBets, parsedMultiTailBets, parsedNotInBets } = parseBetInput(manualContent);

    setConfirmedBets(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9),
      content: manualContent, 
      total: Number(manualTotal), 
      timestamp: Date.now(),
      lotteryType: selectedLotteryType,
      basketId: selectedBasketId,
      items: [{
        id: Math.random().toString(36).substr(2, 9),
        text: manualContent,
        numberDeltas: parsedBets,
        zodiacDeltas: parsedZodiacBets,
        tailDeltas: parsedTailBets,
        multiZodiacDeltas: parsedMultiZodiacBets,
        sixZodiacDeltas: [],
        fiveZodiacDeltas: [],
        fourZodiacDeltas: [],
        multiTailDeltas: parsedMultiTailBets,
        notInDeltas: parsedNotInBets,
        total: Number(manualTotal),
        lotteryType: selectedLotteryType,
        timestamp: Date.now()
      }]
    }]);
    setManualContent('');
    setManualTotal('');
    setIsAddingManual(false);
  };

  const deleteConfirmedBet = (index: number) => {
    const newBets = [...confirmedBets];
    newBets.splice(index, 1);
    setConfirmedBets(newBets);
  };

  const deleteOrdersByDate = (date: string) => {
    if (window.confirm(`确定要删除 ${date} 的所有订单吗？`)) {
      const newBets = confirmedBets.filter(bet => getBeijingDateString(bet.timestamp) !== date);
      setConfirmedBets(newBets);
    }
  };

  const renderHighlightedText = (text: string, fallbackLotteryType?: string) => {
    const lines = text.split('\n');
    let lastDetectedLotteryType = '';
    
    // If fallback is a single lottery type, use it as initial sticky type
    if (fallbackLotteryType && !fallbackLotteryType.includes(' ')) {
      lastDetectedLotteryType = fallbackLotteryType;
    }

    return lines.map((line, lineIdx) => {
      // Detect lottery type from prefix like 【新澳】
      let currentLotteryType = lastDetectedLotteryType;
      const typeMatch = line.match(/【(.+?)】/);
      if (typeMatch) {
        currentLotteryType = typeMatch[1];
        lastDetectedLotteryType = currentLotteryType;
      }

      const context = {
        drawNumbers: currentLotteryType ? drawNumbers[currentLotteryType] : [],
        isLocked: currentLotteryType ? isDrawLocked[currentLotteryType] : false
      };

      // Split line into segments by "各" or "下单"
      // We always split to ensure amounts are gray, even if not locked
      const segments = line.split(/(各|下单)/);
      
      return (
        <div key={lineIdx} className="flex flex-wrap items-center gap-x-0.5">
          {segments.map((segment, segIdx) => {
            if (segment === '各' || segment === '下单') {
              return <span key={segIdx} className="text-stone-400 font-medium">{segment}</span>;
            }

            // If this segment follows a "各" or "下单", it's an amount part
            const isAmountPart = segIdx > 0 && (segments[segIdx-1] === '各' || segments[segIdx-1] === '下单');
            
            if (isAmountPart) {
              // Only highlight the first number/unit as the amount, the rest might be next bet
              const amountMatch = segment.match(/^(\d+|[一二三四五六七八九十百千万]+(?:元|块)?)/);
              if (amountMatch) {
                const amountText = amountMatch[0];
                const remainingText = segment.slice(amountText.length);
                
                return (
                  <React.Fragment key={segIdx}>
                    <span className="text-stone-400 font-bold">{amountText}</span>
                    {remainingText && renderBetContent(remainingText, context)}
                  </React.Fragment>
                );
              } else {
                return <span key={segIdx} className="text-stone-400 font-medium">{segment}</span>;
              }
            } else {
              return <React.Fragment key={segIdx}>{renderBetContent(segment, context)}</React.Fragment>;
            }
          })}
        </div>
      );
    });

    function renderBetContent(text: string, context: any) {
      // Updated regex to capture multi-digit tails like "246尾" and "x不中" prefix
      const parts = text.split(/(平码|独平|平?\d+尾|\d{1,2}|[马蛇龙兔虎牛鼠猪狗鸡猴羊]|单|双|大|小|红|绿|蓝|家|野|合单|合双|[五六七八九十]{1,2}不中|\d{1,2}不中)/);
      const drawNums = context.drawNumbers || [];
      const normalNums = drawNums.slice(0, 6);
      const specialNum = drawNums[6];
      const winningZodiacsNormal = normalNums.map((n: any) => getZodiacFromNumber(n as number)).filter(Boolean);
      const winningZodiacSpecial = getZodiacFromNumber(specialNum as number);
      const winningTails = drawNums.map((n: any) => (n === '' ? -1 : (n as number) % 10)).filter((t: number) => t !== -1);
      const specialTail = specialNum !== '' ? (specialNum as number) % 10 : -1;

      return parts.map((part, partIdx) => {
        if (!part) return null;
        
        if (context.isLocked && drawNums.length >= 7) {
          if (/^\d{1,2}$/.test(part)) {
            const num = parseInt(part);
            if (num === specialNum) {
              return <span key={partIdx} className="text-red-600 font-black underline decoration-2 underline-offset-4 bg-red-50 px-0.5 rounded">{part}</span>;
            } else if (normalNums.includes(num)) {
              return <span key={partIdx} className="text-blue-600 font-black underline decoration-2 underline-offset-4 bg-blue-50 px-0.5 rounded">{part}</span>;
            }
          } else if (part.endsWith('尾')) {
            const tailMatch = part.match(/(\d+)尾/);
            if (tailMatch) {
              const tailDigits = tailMatch[1].split('');
              const isFlat = part.startsWith('平');
              
              return (
                <span key={partIdx} className="inline-flex items-center">
                  {isFlat && <span>平</span>}
                  {tailDigits.map((digit, dIdx) => {
                    const d = parseInt(digit);
                    const isWinning = isFlat ? winningTails.includes(d) : d === specialTail;
                    return (
                      <span 
                        key={dIdx} 
                        className={isWinning ? (isFlat ? "text-blue-600 font-black underline decoration-2 underline-offset-4 bg-blue-50 px-0.5 rounded" : "text-red-600 font-black underline decoration-2 underline-offset-4 bg-red-50 px-0.5 rounded") : ""}
                      >
                        {digit}
                      </span>
                    );
                  })}
                  <span className={(isFlat ? winningTails.some(d => tailDigits.includes(d.toString())) : tailDigits.includes(specialTail.toString())) ? (isFlat ? "text-blue-600 font-black underline decoration-2 underline-offset-4 bg-blue-50 px-0.5 rounded" : "text-red-600 font-black underline decoration-2 underline-offset-4 bg-red-50 px-0.5 rounded") : ""}>
                    尾
                  </span>
                </span>
              );
            }
          } else if (part === '平码' || part === '独平') {
            return <span key={partIdx} className="text-blue-600 font-bold">{part}</span>;
          } else if (zodiacs.includes(part)) {
            if (part === winningZodiacSpecial) {
              return <span key={partIdx} className="text-red-600 font-black underline decoration-2 underline-offset-4 bg-red-50 px-0.5 rounded">{part}</span>;
            } else if (winningZodiacsNormal.includes(part)) {
              return <span key={partIdx} className="text-blue-600 font-black underline decoration-2 underline-offset-4 bg-blue-50 px-0.5 rounded">{part}</span>;
            }
          } else if (['单', '双', '大', '小', '红', '绿', '蓝', '家', '野', '合单', '合双'].includes(part)) {
            if (checkIsWinner(part, context)) {
              return <span key={partIdx} className="text-red-600 font-black underline decoration-2 underline-offset-4 bg-red-50 px-0.5 rounded">{part}</span>;
            }
          }
        }
        return <span key={partIdx}>{part}</span>;
      });
    }
  };

  const renderHighlightedInput = (text: string) => {
    if (!text) return null;
    
    const validMatches: { start: number; end: number }[] = [];
    const amountRanges: { start: number; end: number }[] = [];
    const invalidMatches: { start: number; end: number }[] = [];

    const validRegexes = [
      REGEX_SIX_ZODIAC, REGEX_FIVE_ZODIAC, REGEX_FOUR_ZODIAC,
      REGEX_MULTI_ZODIAC, REGEX_MULTI_ZODIAC_ADVANCED, REGEX_MULTI_ZODIAC_V2, REGEX_TUO_ZODIAC_V3, REGEX_NOT_IN, REGEX_HEAD_TAIL, REGEX_EACH, REGEX_GENERIC,
      REGEX_BAO, REGEX_PING, REGEX_TAIL, REGEX_MULTI_TAIL_ADVANCED, REGEX_MULTI_TAIL_V2, REGEX_MULTI_TAIL_V3,
      REGEX_FLAT_NUMBER, REGEX_TUO_ZODIAC
    ];

    validRegexes.forEach(re => {
      let m;
      const r = new RegExp(re.source, re.flags);
      while ((m = r.exec(text)) !== null) {
        const matchStr = m[0];
        let offset = 0;
        while (offset < matchStr.length && /[\s,，。；;.、/]/.test(matchStr[offset])) {
          offset++;
        }
        validMatches.push({ start: m.index + offset, end: m.index + m[0].length });

        // Identify amount part to exclude from invalid number checks
        // Most regexes have amount as the last capturing group
        const lastGroup = m[m.length - 1];
        if (lastGroup && !isNaN(Number(lastGroup.replace('+', '')))) {
          const amountStart = m.index + m[0].lastIndexOf(lastGroup);
          amountRanges.push({ start: amountStart, end: amountStart + lastGroup.length });
        }
      }
    });

    // Identify invalid numbers (> 49) that are not part of an amount
    const numRegex = /\d+/g;
    let numMatch;
    while ((numMatch = numRegex.exec(text)) !== null) {
      const val = parseInt(numMatch[0]);
      const start = numMatch.index;
      const end = start + numMatch[0].length;
      
      // Check if this number is within any amount range
      const isAmount = amountRanges.some(range => start >= range.start && end <= range.end);
      
      if (!isAmount && val > 49) {
        invalidMatches.push({ start, end });
      }
    }
    
    const mergeMatches = (matches: { start: number; end: number }[]) => {
      if (matches.length === 0) return [];
      matches.sort((a, b) => a.start - b.start);
      const merged: { start: number; end: number }[] = [];
      let current = { ...matches[0] };
      for (let i = 1; i < matches.length; i++) {
        if (matches[i].start < current.end) {
          current.end = Math.max(current.end, matches[i].end);
        } else {
          merged.push(current);
          current = { ...matches[i] };
        }
      }
      merged.push(current);
      return merged;
    };

    const mergedValid = mergeMatches(validMatches);
    const mergedInvalid = mergeMatches(invalidMatches);

    const result: React.ReactNode[] = [];
    let currentPos = 0;

    // Create a combined list of points of interest
    const points: { pos: number; type: 'valid' | 'invalid' | 'end', id: number }[] = [];
    mergedValid.forEach((m, i) => {
      points.push({ pos: m.start, type: 'valid', id: i });
      points.push({ pos: m.end, type: 'end', id: i });
    });
    mergedInvalid.forEach((m, i) => {
      points.push({ pos: m.start, type: 'invalid', id: i + 1000 });
      points.push({ pos: m.end, type: 'end', id: i + 1000 });
    });
    points.sort((a, b) => a.pos - b.pos || (a.type === 'end' ? -1 : 1));

    let currentInvalidId: number | null = null;
    let currentValidId: number | null = null;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.pos > currentPos) {
        const slice = text.substring(currentPos, p.pos);
        if (currentInvalidId !== null) {
          result.push(<span key={`inv-${currentPos}`} className="bg-red-400/20 border-b-2 border-red-400/30">{slice}</span>);
        } else if (currentValidId !== null) {
          result.push(<span key={`val-${currentPos}`} className="bg-emerald-400/20 border-b-2 border-emerald-400/30">{slice}</span>);
        } else {
          result.push(slice);
        }
        currentPos = p.pos;
      }

      if (p.type === 'invalid') currentInvalidId = p.id;
      else if (p.type === 'valid') currentValidId = p.id;
      else if (p.type === 'end') {
        if (p.id >= 1000) currentInvalidId = null;
        else currentValidId = null;
      }
    }

    if (currentPos < text.length) {
      result.push(text.substring(currentPos));
    }

    return result;
  };

  const handleInputScroll = () => {
    if (textareaRef.current && inputScrollRef.current) {
      inputScrollRef.current.scrollTop = textareaRef.current.scrollTop;
      inputScrollRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddToPending();
    }
  };

  return (
    <div className="h-screen bg-stone-50 text-stone-950 font-sans flex flex-col overflow-hidden">
      {/* 1. Header Navigation (Top Section) */}
      <header className="bg-white border-b border-stone-200 flex items-center justify-between px-6 py-2 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-stone-950 tracking-tight">系统管理</h2>
            <div className="h-4 w-px bg-stone-200"></div>
            <nav className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage('order')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentPage === 'order' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                下单页
              </button>
              <button 
                onClick={() => setCurrentPage('draw')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentPage === 'draw' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 10-4 4-4-4"/></svg>
                开奖页
              </button>
              <button 
                onClick={() => setCurrentPage('confirm')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentPage === 'confirm' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                注单页
                {todayBets.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">{todayBets.length}</span>
                )}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">彩种选择:</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 shadow-inner">
                {lotteryTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedLotteryType(type)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${selectedLotteryType === type ? 'bg-stone-950 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsLotteryTypeLocked(!isLotteryTypeLocked)}
                className={`p-1.5 rounded-lg transition-all ${isLotteryTypeLocked ? 'bg-red-500 text-white shadow-md' : 'bg-stone-100 text-stone-400 hover:text-stone-600 border border-stone-200'}`}
                title={isLotteryTypeLocked ? "解锁彩种自动识别" : "锁定当前彩种"}
              >
                {isLotteryTypeLocked ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-stone-400 text-[10px] font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            系统运行中
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex p-4 gap-4 overflow-hidden">
        {currentPage === 'order' ? (
          <>
            {/* Left Section (Flat Tail) */}
            <div className="w-44 flex flex-col gap-4 shrink-0 min-h-0">
              <section className="bg-white p-3 rounded-2xl shadow-sm border border-stone-200 flex flex-col min-h-0 h-full">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <div className="h-px bg-stone-100 flex-grow"></div>
                  <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">平尾下单区</h2>
                  <div className="h-px bg-stone-100 flex-grow"></div>
                </div>
                <div className="grid grid-cols-1 gap-y-2 overflow-y-auto pr-1 flex-grow">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(t => (
                    <div key={t} className="group flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-lg font-bold text-[10px] border transition-colors shrink-0 ${
                          (tailBetAmounts[t] !== undefined && tailBetAmounts[t] !== '') || textParsedTailBets[t] !== undefined
                            ? 'bg-stone-800 text-white border-stone-800 shadow-sm'
                            : 'bg-stone-50 text-stone-600 border-stone-100 group-hover:border-stone-300'
                        }`}>
                          {t}尾
                        </span>
                        <div className="relative flex-grow">
                          <input
                            type="number"
                            min="0"
                            placeholder="金额"
                            value={tailBetAmounts[t] !== undefined && tailBetAmounts[t] !== '' ? tailBetAmounts[t] : (textParsedTailBets[t] || '')}
                            onKeyDown={handleKeyDown}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              if (val === '' || val >= 0) {
                                setTailBetAmounts(prev => ({ ...prev, [t]: val }));
                              }
                            }}
                            className={`w-full p-1.5 pr-6 border rounded-lg text-[10px] outline-none transition-all ${
                              textParsedTailBets[t] 
                                ? 'bg-amber-50 border-amber-200 focus:ring-amber-200 focus:bg-white' 
                                : 'bg-stone-50 border-stone-100 focus:ring-stone-200 focus:bg-white'
                            }`}
                          />
                          {(tailBetAmounts[t] !== undefined && tailBetAmounts[t] !== '') || textParsedTailBets[t] ? (
                            <button 
                              onClick={() => {
                                setTailBetAmounts(prev => ({ ...prev, [t]: '' }));
                              }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] text-stone-400">累计:</span>
                        <span className="text-[8px] font-bold text-stone-600">
                          {tailCumulativeAmounts[t] || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Center Section (Number Grid + Input + Pending) */}
            <div className="flex-grow flex flex-col gap-4 min-w-0">
              <section className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-col min-h-0">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <div className="h-px bg-stone-100 flex-grow"></div>
                  <h1 className="text-sm font-bold tracking-tight text-stone-400 uppercase tracking-widest whitespace-nowrap">特码下单区</h1>
                  <div className="h-px bg-stone-100 flex-grow"></div>
                </div>
                
                <div className="grid grid-cols-12 gap-1 mb-2">
                  {zodiacs.map((zodiac, idx) => (
                    <motion.button
                      key={zodiac}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => selectZodiacColumn(idx)}
                      className={`h-7 w-full flex items-center justify-center rounded-lg text-xs font-bold transition-colors border ${
                        (numbers.filter(n => getZodiacFromNumber(n) === zodiac).every(n => selectedNumbers.has(n) || textParsedBets[n] !== undefined || textParsedFlatBets[n] !== undefined) || textParsedZodiacBets[zodiac] !== undefined)
                          ? 'bg-stone-800 text-white border-stone-800 shadow-md'
                          : 'bg-stone-50 text-stone-500 hover:bg-stone-100 border-stone-100'
                      }`}
                    >
                      {zodiac}
                    </motion.button>
                  ))}
                </div>

                <div className="grid grid-cols-12 gap-1 overflow-y-auto pr-1">
                  {numbers.map((num) => {
                    const pendingAmt = textParsedBets[num] || (selectedNumbers.has(num) ? amount : null);
                    const colorClasses = getNumberColor(num);
                    return (
                      <motion.button
                        key={num}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleNumber(num)}
                        id={`btn-num-${num}`}
                        className={`
                          h-10 w-full flex flex-col items-center justify-center rounded-lg transition-colors relative border-2
                          ${(selectedNumbers.has(num) || textParsedBets[num] !== undefined || textParsedFlatBets[num] !== undefined) 
                            ? `${colorClasses.bg} text-white shadow-md ${colorClasses.border}` 
                            : `bg-white text-stone-500 border-stone-100 hover:bg-stone-50`}
                        `}
                      >
                        {((pendingAmt !== null && pendingAmt !== '') || textParsedFlatBets[num]) && (
                          <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-stone-900 text-[9px] px-1 py-0.5 rounded-full shadow-md z-10 font-black border border-amber-500/50 flex flex-col items-center gap-0">
                            {pendingAmt !== null && pendingAmt !== '' && <span>{pendingAmt}</span>}
                            {textParsedFlatBets[num] && (
                              <span className={`text-[7px] ${pendingAmt !== null && pendingAmt !== '' ? 'border-t border-amber-600/30' : ''} w-full text-center`}>
                                平:{textParsedFlatBets[num]}
                              </span>
                            )}
                          </span>
                        )}
                        <span className="text-xs font-medium leading-tight">{formatNumber(num)}</span>
                        <div className="flex flex-col items-center mt-0.5 leading-none">
                          <span className={`text-[8px] ${top5Numbers.has(num) ? 'text-red-600 font-black' : (selectedNumbers.has(num) ? 'text-stone-300' : 'text-stone-400')}`}>
                            {cumulativeAmounts[num] || 0}
                          </span>
                          {flatNumberCumulativeAmounts[num] > 0 && (
                            <span className="text-[7px] text-blue-500 font-bold">
                              平:{flatNumberCumulativeAmounts[num]}
                            </span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-2 flex items-center justify-between gap-4 border-t border-stone-100 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex bg-stone-100 p-0.5 rounded-full border border-stone-200 shadow-inner">
                      <button
                        onClick={() => {
                          setOddEvenFilter(prev => prev === 'odd' ? null : 'odd');
                          amountInputRef.current?.focus();
                        }}
                        className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${
                          oddEvenFilter === 'odd'
                          ? 'bg-stone-800 text-white shadow-md'
                          : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        单
                      </button>
                      <button
                        onClick={() => {
                          setOddEvenFilter(prev => prev === 'even' ? null : 'even');
                          amountInputRef.current?.focus();
                        }}
                        className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${
                          oddEvenFilter === 'even'
                          ? 'bg-stone-800 text-white shadow-md'
                          : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        双
                      </button>
                    </div>

                    <div className="flex bg-stone-100 p-0.5 rounded-full border border-stone-200 shadow-inner">
                      <button
                        onClick={() => {
                          setSizeFilter(prev => prev === 'small' ? null : 'small');
                          amountInputRef.current?.focus();
                        }}
                        className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${
                          sizeFilter === 'small'
                          ? 'bg-stone-800 text-white shadow-md'
                          : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        小
                      </button>
                      <button
                        onClick={() => {
                          setSizeFilter(prev => prev === 'big' ? null : 'big');
                          amountInputRef.current?.focus();
                        }}
                        className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${
                          sizeFilter === 'big'
                          ? 'bg-stone-800 text-white shadow-md'
                          : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        大
                      </button>
                    </div>

                    <div className="flex bg-stone-100 p-0.5 rounded-full border border-stone-200 shadow-inner">
                      <button
                        onClick={() => {
                          setColorFilter(prev => prev === 'red' ? null : 'red');
                          amountInputRef.current?.focus();
                        }}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
                          colorFilter === 'red'
                          ? 'bg-red-500 text-white shadow-md'
                          : 'text-red-400 hover:text-red-600'
                        }`}
                      >
                        红
                      </button>
                      <button
                        onClick={() => {
                          setColorFilter(prev => prev === 'green' ? null : 'green');
                          amountInputRef.current?.focus();
                        }}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
                          colorFilter === 'green'
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'text-emerald-400 hover:text-emerald-600'
                        }`}
                      >
                        绿
                      </button>
                      <button
                        onClick={() => {
                          setColorFilter(prev => prev === 'blue' ? null : 'blue');
                          amountInputRef.current?.focus();
                        }}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
                          colorFilter === 'blue'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'text-blue-400 hover:text-blue-600'
                        }`}
                      >
                        蓝
                      </button>
                    </div>

                    <div className="flex bg-stone-100 p-0.5 rounded-full border border-stone-200 shadow-inner">
                      <button
                        onClick={() => {
                          setDomesticWildFilter(prev => prev === 'domestic' ? null : 'domestic');
                          amountInputRef.current?.focus();
                        }}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
                          domesticWildFilter === 'domestic'
                          ? 'bg-stone-800 text-white shadow-md'
                          : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        家
                      </button>
                      <button
                        onClick={() => {
                          setDomesticWildFilter(prev => prev === 'wild' ? null : 'wild');
                          amountInputRef.current?.focus();
                        }}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
                          domesticWildFilter === 'wild'
                          ? 'bg-stone-800 text-white shadow-md'
                          : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        野
                      </button>
                    </div>

                    <div className="flex bg-stone-100 p-0.5 rounded-full border border-stone-200 shadow-inner">
                      <button
                        onClick={() => {
                          setSumOddEvenFilter(prev => prev === 'odd' ? null : 'odd');
                          amountInputRef.current?.focus();
                        }}
                        className={`px-2 py-1 rounded-full text-[9px] font-bold transition-all ${
                          sumOddEvenFilter === 'odd'
                          ? 'bg-stone-800 text-white shadow-md'
                          : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        合单
                      </button>
                      <button
                        onClick={() => {
                          setSumOddEvenFilter(prev => prev === 'even' ? null : 'even');
                          amountInputRef.current?.focus();
                        }}
                        className={`px-2 py-1 rounded-full text-[9px] font-bold transition-all ${
                          sumOddEvenFilter === 'even'
                          ? 'bg-stone-800 text-white shadow-md'
                          : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        合双
                      </button>
                    </div>
                    
                    <button
                      onClick={() => {
                        clearAllSelections();
                        setOddEvenFilter(null);
                        setColorFilter(null);
                        setSizeFilter(null);
                        setDomesticWildFilter(null);
                        setSumOddEvenFilter(null);
                      }}
                      className="px-2 py-1.5 text-[9px] font-bold text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center gap-1 border border-transparent hover:border-red-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      重置
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="confirm-button"
                      onClick={handleAddToPending}
                      className="px-6 py-2 bg-stone-800 text-white rounded-xl shadow-lg hover:bg-stone-900 active:scale-95 transition-all font-bold text-xs tracking-wide"
                    >
                      确认
                    </button>
                    <button
                      onClick={handleConfirmBets}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 active:scale-95 transition-all font-bold text-xs tracking-wide flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      下单
                    </button>
                    <div className="relative w-32">
                      <input
                        id="amount-input"
                        ref={amountInputRef}
                        type="number"
                        min="0"
                        placeholder="输入金额"
                        value={amount}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          if (val === '' || val >= 0) setAmount(val);
                        }}
                        className="w-full p-2 pr-8 bg-white border border-stone-200 rounded-xl shadow-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition-all text-stone-700 text-xs font-medium"
                      />
                      {amount !== '' && (
                        <button 
                          onClick={() => setAmount('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                        </button>
                      )}
                    </div>
                    <div className="flex bg-stone-100 p-1 rounded-xl">
                      {baskets.map(b => (
                        <button
                          key={b}
                          onClick={() => setSelectedBasketId(b)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${selectedBasketId === b ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                          篮子 {b}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex gap-4 flex-grow min-h-0">
                <section className="relative flex-grow min-h-0">
                  <div 
                    ref={inputScrollRef}
                    className="absolute inset-0 m-0 p-3 pointer-events-none whitespace-pre-wrap break-words text-sm leading-6 tracking-normal text-transparent overflow-y-scroll border border-transparent font-sans scrollbar-hide"
                    aria-hidden="true"
                  >
                    {renderHighlightedInput(inputText)}
                    {/* Add an extra character to ensure scroll height matches if ending with newline */}
                    {inputText.endsWith('\n') ? '\n ' : ''}
                  </div>
                  <textarea
                    id="input-textarea"
                    ref={textareaRef}
                    placeholder="输入备注或格式如 '鼠狗虎各20' 或 '47.48.23各20'..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onScroll={handleInputScroll}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddToPending();
                      }
                    }}
                    className="w-full h-full m-0 p-3 bg-transparent border border-stone-200 rounded-xl shadow-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition-all resize-none text-stone-700 text-sm leading-6 tracking-normal relative z-10 font-sans overflow-y-scroll scrollbar-hide appearance-none"
                  />
                  {inputText && (
                    <button 
                      onClick={() => setInputText('')}
                      className="absolute right-3 top-3 p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-lg transition-colors shadow-sm z-20"
                      title="清除内容"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </section>

                <section className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-col w-80 shrink-0 min-h-0">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <div className="h-px bg-stone-100 flex-grow"></div>
                    <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">待确认注单</h2>
                    {pendingBets.length > 0 && (
                      <button 
                        onClick={clearAllPendingBets}
                        className="p-1 bg-stone-100 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-lg transition-all shadow-sm"
                        title="清空所有注单"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                    <div className="h-px bg-stone-100 flex-grow"></div>
                  </div>
                  
                  <div 
                    id="output-container"
                    className="flex-grow bg-stone-50 border border-stone-100 rounded-xl p-2 overflow-y-auto flex flex-col gap-1 mb-3"
                  >
                    {pendingBets.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-stone-400 text-[10px] italic">暂无内容...</span>
                      </div>
                    ) : (
                      pendingBets.map((item) => (
                        <div key={item.id} className="group flex items-start justify-between gap-1.5 p-1.5 bg-white rounded-lg shadow-sm border border-stone-100 hover:border-stone-300 transition-all">
                          <span className="text-stone-600 font-mono text-[10px] leading-relaxed whitespace-pre-wrap flex-grow">
                            {renderHighlightedText(item.text, item.lotteryType)}
                          </span>
                          <button 
                            onClick={() => deletePendingBet(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all shrink-0"
                            title="删除此条"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">当前小计</span>
                      <span className="text-xs font-black text-stone-950">¥ {currentPendingTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Right Section (Flat Zodiac + Multi Zodiac) */}
            <div className="w-60 flex flex-col gap-4 shrink-0 min-h-0">
              <section className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-col min-h-0 flex-[2]">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <div className="h-px bg-stone-100 flex-grow"></div>
                  <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">平肖下单区</h2>
                  <div className="h-px bg-stone-100 flex-grow"></div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto pr-1 flex-grow">
                  {zodiacs.map(z => (
                    <div key={z} className="group flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-lg font-bold text-[10px] border transition-colors shrink-0 ${
                          (zodiacBetAmounts[z] !== undefined && zodiacBetAmounts[z] !== '') || textParsedZodiacBets[z] !== undefined
                            ? 'bg-stone-800 text-white border-stone-800 shadow-sm'
                            : 'bg-stone-50 text-stone-600 border-stone-100 group-hover:border-stone-300'
                        }`}>
                          {z}
                        </span>
                        <div className="relative flex-grow">
                          <input
                            type="number"
                            min="0"
                            placeholder="金额"
                            value={zodiacBetAmounts[z] !== undefined && zodiacBetAmounts[z] !== '' ? zodiacBetAmounts[z] : (textParsedZodiacBets[z] || '')}
                            onKeyDown={handleKeyDown}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              if (val === '' || val >= 0) {
                                setZodiacBetAmounts(prev => ({ ...prev, [z]: val }));
                              }
                            }}
                            className={`w-full p-1.5 pr-6 border rounded-lg text-[10px] outline-none transition-all ${
                              textParsedZodiacBets[z] 
                                ? 'bg-amber-50 border-amber-200 focus:ring-amber-200 focus:bg-white' 
                                : 'bg-stone-50 border-stone-100 focus:ring-stone-200 focus:bg-white'
                            }`}
                          />
                          {(zodiacBetAmounts[z] !== undefined && zodiacBetAmounts[z] !== '') || textParsedZodiacBets[z] ? (
                            <button 
                              onClick={() => {
                                setZodiacBetAmounts(prev => ({ ...prev, [z]: '' }));
                              }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] text-stone-400">累计:</span>
                        <span className="text-[8px] font-bold text-stone-600">
                          {zodiacCumulativeAmounts[z] || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-col min-h-0 flex-[1.5]">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <div className="h-px bg-stone-100 flex-grow"></div>
                  <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">连肖下单区</h2>
                  <div className="h-px bg-stone-100 flex-grow"></div>
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                  <div className="flex flex-wrap gap-1">
                    {zodiacs.map(z => (
                      <button
                        key={z}
                        onClick={() => {
                          setMultiZodiacSelection(prev => 
                            prev.includes(z) ? prev.filter(item => item !== z) : [...prev, z]
                          );
                        }}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all border ${
                          (multiZodiacSelection.includes(z) || 
                           textParsedMultiZodiacBets.some(b => b.zodiacs.includes(z)) ||
                           textParsedSixZodiacBets.some(b => b.zodiacs.includes(z)) ||
                           textParsedFiveZodiacBets.some(b => b.zodiacs.includes(z)) ||
                           textParsedFourZodiacBets.some(b => b.zodiacs.includes(z)))
                            ? 'bg-stone-800 text-white border-stone-800 shadow-sm'
                            : 'bg-stone-50 text-stone-600 border-stone-100 hover:border-stone-300'
                        }`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-grow">
                      <input
                        type="number"
                        min="0"
                        placeholder="金额"
                        value={multiZodiacAmount}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          if (val === '' || val >= 0) setMultiZodiacAmount(val);
                        }}
                        className="w-full p-1.5 pr-6 bg-stone-50 border border-stone-100 rounded-lg focus:ring-2 focus:ring-stone-200 focus:bg-white outline-none transition-all text-stone-700 text-[10px] font-medium"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (multiZodiacSelection.length < 2) {
                          alert('连肖至少选择2个生肖');
                          return;
                        }
                        if (multiZodiacAmount === '' || multiZodiacAmount <= 0) {
                          alert('请输入有效的连肖金额');
                          return;
                        }
                        handleAddToPending();
                      }}
                      className="px-3 py-1.5 bg-stone-800 text-white rounded-lg shadow-md hover:bg-stone-900 active:scale-95 transition-all font-bold text-[10px]"
                    >
                      添加
                    </button>
                  </div>
                  {multiZodiacSelection.length > 0 && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[8px] text-stone-400">已选: {multiZodiacSelection.length} 肖</span>
                      <button 
                        onClick={() => setMultiZodiacSelection([])}
                        className="text-[8px] text-red-400 hover:text-red-600 font-bold"
                      >
                        清空
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-col min-h-0 flex-[2]">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <div className="h-px bg-stone-100 flex-grow"></div>
                  <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">组合下注预览</h2>
                  <div className="h-px bg-stone-100 flex-grow"></div>
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                  {textParsedMultiZodiacBets.length === 0 && 
                   textParsedMultiTailBets.length === 0 && 
                   textParsedFiveZodiacBets.length === 0 && 
                   textParsedFourZodiacBets.length === 0 && 
                   textParsedSixZodiacBets.length === 0 && 
                   textParsedNotInBets.length === 0 && (
                    <div className="h-full flex items-center justify-center py-4">
                      <span className="text-[9px] text-stone-300 italic">暂无识别内容...</span>
                    </div>
                  )}
                  {textParsedMultiZodiacBets.length > 0 && (
                    <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="text-[7px] font-bold text-amber-600 uppercase mb-0.5">识别到连肖:</div>
                      <div className="flex flex-col gap-0.5">
                        {textParsedMultiZodiacBets.map((bet, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[8px]">
                            <span className="text-stone-700 font-bold">{bet.zodiacs.join('')}</span>
                            <span className="text-amber-600 font-black">¥{bet.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {textParsedMultiTailBets.length > 0 && (
                    <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="text-[7px] font-bold text-indigo-600 uppercase mb-0.5">识别到连尾:</div>
                      <div className="flex flex-col gap-0.5">
                        {textParsedMultiTailBets.map((bet, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[8px]">
                            <span className="text-stone-700 font-bold">{bet.zodiacs.join('')}尾</span>
                            <span className="text-indigo-600 font-black">¥{bet.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {textParsedFiveZodiacBets.length > 0 && (
                    <div className="p-1.5 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="text-[7px] font-bold text-purple-600 uppercase mb-0.5">识别到五中:</div>
                      <div className="flex flex-col gap-0.5">
                        {textParsedFiveZodiacBets.map((bet, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[8px]">
                            <span className="text-stone-700 font-bold">{bet.zodiacs.join('')}</span>
                            <span className="text-purple-600 font-black">¥{bet.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {textParsedFourZodiacBets.length > 0 && (
                    <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="text-[7px] font-bold text-blue-600 uppercase mb-0.5">识别到四中:</div>
                      <div className="flex flex-col gap-0.5">
                        {textParsedFourZodiacBets.map((bet, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[8px]">
                            <span className="text-stone-700 font-bold">{bet.zodiacs.join('')}</span>
                            <span className="text-blue-600 font-black">¥{bet.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {textParsedSixZodiacBets.length > 0 && (
                    <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                      <div className="text-[7px] font-bold text-emerald-600 uppercase mb-0.5">识别到六中:</div>
                      <div className="flex flex-col gap-0.5">
                        {textParsedSixZodiacBets.map((bet, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[8px]">
                            <span className="text-stone-700 font-bold">{bet.zodiacs.join('')}</span>
                            <span className="text-emerald-600 font-black">¥{bet.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {textParsedNotInBets.length > 0 && (
                    <div className="p-1.5 bg-rose-50 rounded-lg border border-rose-100">
                      <div className="text-[7px] font-bold text-rose-600 uppercase mb-0.5">识别到不中:</div>
                      <div className="flex flex-col gap-0.5">
                        {textParsedNotInBets.map((bet, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[8px]">
                            <span className="text-stone-700 font-bold">{bet.x}不中 {bet.numbers.map(n => formatNumber(n)).join('-')}</span>
                            <span className="text-rose-600 font-black">¥{bet.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        ) : currentPage === 'draw' ? (
          /* Draw Page (开奖页) */
          <div className="flex-grow flex flex-col gap-4 overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-stone-950">开奖号码设置</h1>
                <p className="text-stone-400 text-xs">锁定号码后，注单确认页将自动高亮对应彩种的中奖号码</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const allLocked = lotteryTypes.every(type => isDrawLocked[type]);
                    const newLockedState = { ...isDrawLocked };
                    lotteryTypes.forEach(type => {
                      newLockedState[type] = !allLocked;
                    });
                    setIsDrawLocked(newLockedState);
                  }}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs font-medium transition-colors border border-stone-200"
                >
                  {lotteryTypes.every(type => isDrawLocked[type]) ? '一键解锁' : '一键锁定'}
                </button>
                <button
                  onClick={() => {
                    const newDrawNumbers = { ...drawNumbers };
                    lotteryTypes.forEach(type => {
                      newDrawNumbers[type] = Array(7).fill('');
                    });
                    setDrawNumbers(newDrawNumbers);
                  }}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs font-medium transition-colors border border-stone-200"
                >
                  重置全部彩种
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                {lotteryTypes.map(type => (
                  <div key={type} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-col gap-4 relative overflow-hidden">
                    {/* Background Label */}
                    <div className="absolute -right-2 -top-2 text-stone-50 font-black text-6xl pointer-events-none select-none">
                      {type}
                    </div>

                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 bg-stone-950 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md">
                          {type[0]}
                        </span>
                        <div>
                          <h2 className="text-sm font-bold text-stone-950">{type}</h2>
                          <span className={`text-[8px] font-bold uppercase tracking-widest ${isDrawLocked[type] ? 'text-amber-500' : 'text-stone-400'}`}>
                            {isDrawLocked[type] ? '● 已锁定' : '○ 待录入'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          disabled={isDrawLocked[type]}
                          onClick={() => {
                            const newDraw = { ...drawNumbers };
                            newDraw[type] = Array(7).fill('');
                            setDrawNumbers(newDraw);
                          }}
                          className={`p-1.5 rounded-lg transition-all ${isDrawLocked[type] ? 'text-stone-100 cursor-not-allowed' : 'text-stone-300 hover:bg-stone-50 hover:text-stone-500'}`}
                          title="重置"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        </button>
                        <button 
                          onClick={() => {
                            const newLocked = { ...isDrawLocked };
                            newLocked[type] = !newLocked[type];
                            setIsDrawLocked(newLocked);
                          }}
                          className={`px-4 py-1.5 rounded-lg transition-all text-xs font-bold flex items-center gap-1.5 shadow-sm ${isDrawLocked[type] ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-stone-800 text-white hover:bg-stone-900'}`}
                        >
                          {isDrawLocked[type] ? '解锁' : '锁定'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 relative z-10">
                      <div className="flex-grow grid grid-cols-6 gap-3">
                        {drawNumbers[type].slice(0, 6).map((num, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-2">
                            <div className="relative group w-16 h-16">
                              <input
                                type="text"
                                inputMode="numeric"
                                readOnly={isDrawLocked[type]}
                                value={num === '' ? '' : formatNumber(num)}
                                onChange={(e) => {
                                  if (isDrawLocked[type]) return;
                                  const rawVal = e.target.value.replace(/\D/g, '');
                                  const val = rawVal === '' ? '' : Number(rawVal);
                                  // Allow 0 to clear the field, or 1-49
                                  if (val === '' || (val >= 0 && val <= 49)) {
                                    const newDraw = { ...drawNumbers };
                                    newDraw[type][idx] = (val === 0 || val === '') ? '' : val;
                                    setDrawNumbers(newDraw);
                                  }
                                }}
                                className={`
                                  w-full h-full rounded-full border-4 text-center text-xl font-black outline-none transition-all
                                  ${num ? `${getNumberColor(num).bg} ${getNumberColor(num).border} text-white shadow-md` : 'bg-stone-50 border-stone-100 text-stone-400 focus:border-stone-300'}
                                  ${isDrawLocked[type] ? 'cursor-not-allowed opacity-80' : 'cursor-text'}
                                `}
                              />
                              {num !== '' && !isDrawLocked[type] && (
                                <button
                                  onClick={() => {
                                    const newDraw = { ...drawNumbers };
                                    newDraw[type][idx] = '';
                                    setDrawNumbers(newDraw);
                                  }}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-stone-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              )}
                            </div>
                            <span className={`text-sm font-black ${num ? 'text-stone-700' : 'text-stone-200'}`}>
                              {getZodiacFromNumber(num) || '—'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="w-0.5 h-16 bg-stone-300 shadow-sm"></div>

                      <div className="flex flex-col items-center gap-2">
                        <div className="relative group w-16 h-16">
                          <input
                            type="text"
                            inputMode="numeric"
                            readOnly={isDrawLocked[type]}
                            value={drawNumbers[type][6] === '' ? '' : formatNumber(drawNumbers[type][6])}
                            onChange={(e) => {
                              if (isDrawLocked[type]) return;
                              const rawVal = e.target.value.replace(/\D/g, '');
                              const val = rawVal === '' ? '' : Number(rawVal);
                              // Allow 0 to clear the field, or 1-49
                              if (val === '' || (val >= 0 && val <= 49)) {
                                const newDraw = { ...drawNumbers };
                                newDraw[type][6] = (val === 0 || val === '') ? '' : val;
                                setDrawNumbers(newDraw);
                              }
                            }}
                            className={`
                              w-full h-full rounded-full border-4 text-center text-xl font-black outline-none transition-all
                              ${drawNumbers[type][6] ? `${getNumberColor(drawNumbers[type][6]).bg} ${getNumberColor(drawNumbers[type][6]).border} text-white shadow-lg` : 'bg-stone-50 border-stone-200 text-stone-400 focus:border-stone-400'}
                              ${isDrawLocked[type] ? 'cursor-not-allowed opacity-90' : 'cursor-text'}
                            `}
                          />
                          {drawNumbers[type][6] !== '' && !isDrawLocked[type] && (
                            <button
                              onClick={() => {
                                const newDraw = { ...drawNumbers };
                                newDraw[type][6] = '';
                                setDrawNumbers(newDraw);
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-stone-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          )}
                        </div>
                        <span className={`text-sm font-black ${drawNumbers[type][6] ? 'text-emerald-600' : 'text-stone-200'}`}>
                          {getZodiacFromNumber(drawNumbers[type][6]) || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Betting Confirmation Page (注单页) */
          <div className="flex-grow flex flex-col gap-6 overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-stone-950">注单页</h1>
                <div className="flex bg-stone-100 p-1 rounded-xl">
                  {baskets.map(b => (
                    <button
                      key={b}
                      onClick={() => setSelectedBasketId(b)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedBasketId === b ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      篮子 {b}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end mr-4">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest">篮子 {selectedBasketId} 总金额</span>
                  <span className="text-xl font-bold text-emerald-600">
                    ¥ {todayBets.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => setIsAddingManual(true)}
                  className="px-6 py-2.5 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-all font-bold text-sm flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  添加内容
                </button>
                <button
                  onClick={() => handleExportExcel(todayBets, `today_bets_${todayBeijing}.xlsx`)}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700 transition-all font-bold text-sm flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  生成Excel
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-y-auto flex-grow">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest w-20">序号</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest w-24">彩种</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">注单内容</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest w-32">下注金额</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest w-32">中奖类型</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest w-32">中奖金额</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest w-32 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {todayBets.length === 0 && !isAddingManual && pastBets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-stone-400 italic">暂无已确认注单</td>
                    </tr>
                  )}
                  {isAddingManual && (
                    <tr className="bg-stone-50/50">
                      <td className="px-6 py-4 text-sm font-mono text-stone-400 italic">
                        {confirmedBets.length + 1}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded">{selectedLotteryType}</span>
                      </td>
                      <td className="px-6 py-4">
                        <textarea
                          placeholder="输入注单内容..."
                          value={manualContent}
                          onChange={(e) => setManualContent(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-200 outline-none resize-none h-20"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          placeholder="金额"
                          value={manualTotal}
                          onChange={(e) => setManualTotal(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-200 outline-none"
                        />
                      </td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4 text-center space-y-2">
                        <button 
                          onClick={handleAddManualBet}
                          className="w-full px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors"
                        >
                          确认添加
                        </button>
                        <button 
                          onClick={() => {
                            setIsAddingManual(false);
                            setManualContent('');
                            setManualTotal('');
                          }}
                          className="w-full px-3 py-1.5 bg-stone-200 text-stone-600 rounded-lg text-xs font-bold hover:bg-stone-300 transition-colors"
                        >
                          取消
                        </button>
                      </td>
                    </tr>
                  )}
                  
                  {/* Today's Bets Section */}
                  {todayBets.length > 0 && (
                    <tr 
                      className="bg-stone-100/50 cursor-pointer hover:bg-stone-100 transition-colors"
                      onClick={() => setIsTodayExpanded(!isTodayExpanded)}
                    >
                      <td colSpan={7} className="px-6 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-stone-950 uppercase tracking-widest">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="14" height="14" 
                              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              className={`transition-transform duration-200 ${isTodayExpanded ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                            今日订单 ({todayBets.length})
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {isTodayExpanded && todayBets.map((order, idx) => {
                    const originalIdx = confirmedBets.indexOf(order);
                    const isEditing = editingIndex === originalIdx;

                    return (
                      <tr key={originalIdx} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-stone-400">{todayBets.length - idx}</td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <select
                                value={editingLotteryType}
                                onChange={(e) => setEditingLotteryType(e.target.value)}
                                className="w-full p-1 bg-white border border-stone-200 rounded text-[10px] font-bold text-stone-600 focus:ring-1 focus:ring-stone-200 outline-none"
                              >
                                {lotteryTypes.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded">{order.lotteryType}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-stone-700 whitespace-pre-wrap">
                            {isEditing ? (
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-200 outline-none resize-none h-24"
                              />
                            ) : (
                              renderHighlightedText(order.content, order.lotteryType)
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-stone-950">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingTotal}
                                onChange={(e) => setEditingTotal(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-200 outline-none"
                              />
                            ) : (
                              `¥ ${order.total.toLocaleString()}`
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-stone-500">
                            {(() => {
                              const winDetailsMap = (order.items || []).reduce((acc, item) => {
                                const details = getWinningDetails(item.numberDeltas, item.flatNumberDeltas || {}, item.zodiacDeltas, item.tailDeltas, item.multiZodiacDeltas, item.sixZodiacDeltas, item.fiveZodiacDeltas, item.fourZodiacDeltas, item.multiTailDeltas, item.notInDeltas, drawNumbers[item.lotteryType]);
                                Object.entries(details).forEach(([type, amt]) => {
                                  acc[type] = (acc[type] || 0) + amt;
                                });
                                return acc;
                              }, {} as Record<string, number>);
                              return Object.entries(winDetailsMap).map(([type, sum]) => `${type}${sum}`).join(' ');
                            })()}
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-red-600">
                            {(() => {
                              const totalWin = (order.items || []).reduce((sum, item) => {
                                const win = calculateWinAmount(item.numberDeltas, item.flatNumberDeltas || {}, item.zodiacDeltas, item.tailDeltas, item.multiZodiacDeltas, item.sixZodiacDeltas, item.fiveZodiacDeltas, item.fourZodiacDeltas, item.multiTailDeltas, item.notInDeltas, drawNumbers[item.lotteryType], item.lotteryType);
                                return sum + (win || 0);
                              }, 0);
                              return totalWin > 0 ? `¥ ${totalWin.toLocaleString()}` : '';
                            })()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col gap-2 items-center">
                              {isEditing ? (
                                <>
                                  <button 
                                    onClick={() => {
                                      const newBets = [...confirmedBets];
                                      const updatedItems = (newBets[originalIdx].items || []).map(item => ({
                                        ...item,
                                        lotteryType: editingLotteryType
                                      }));
                                      
                                      newBets[originalIdx] = {
                                        ...newBets[originalIdx],
                                        content: editingContent,
                                        total: Number(editingTotal) || 0,
                                        lotteryType: editingLotteryType,
                                        items: updatedItems
                                      };
                                      setConfirmedBets(newBets);
                                      setEditingIndex(null);
                                    }}
                                    className="w-full px-3 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-600"
                                  >
                                    保存
                                  </button>
                                  <button 
                                    onClick={() => setEditingIndex(null)}
                                    className="w-full px-3 py-1 bg-stone-200 text-stone-600 rounded-lg text-[10px] font-bold hover:bg-stone-300"
                                  >
                                    取消
                                  </button>
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => {
                                      setEditingIndex(originalIdx);
                                      setEditingContent(order.content);
                                      setEditingTotal(order.total);
                                      setEditingLotteryType(order.lotteryType);
                                    }}
                                    className="text-stone-400 hover:text-stone-600 transition-colors p-1"
                                    title="编辑注单"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                  </button>
                                  <button 
                                    onClick={() => deleteConfirmedBet(originalIdx)}
                                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                                    title="删除注单"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                  {/* Past Bets Section */}
                  {Object.entries(groupedPastBets).sort((a, b) => b[0].localeCompare(a[0])).map(([date, bets]) => {
                    const typedBets = bets as ConfirmedBet[];
                    return (
                      <React.Fragment key={date}>
                        <tr 
                          className="bg-stone-100/50 cursor-pointer hover:bg-stone-100 transition-colors"
                          onClick={() => toggleDateExpansion(date)}
                        >
                          <td colSpan={7} className="px-6 py-3">
                            <div className="flex items-center justify-between">
                              <div 
                                className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest cursor-pointer"
                                onClick={() => toggleDateExpansion(date)}
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="14" height="14" 
                                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                  className={`transition-transform duration-200 ${expandedDates[date] ? 'rotate-180' : ''}`}
                                >
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                                往日订单 - {date} ({typedBets.length})
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportExcel(typedBets, `bets_${date}.xlsx`);
                                  }}
                                  className="text-stone-400 hover:text-emerald-600 transition-colors p-1 flex items-center gap-1 text-[10px] font-bold"
                                  title="生成该日Excel"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                  Excel
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteOrdersByDate(date);
                                  }}
                                  className="text-stone-300 hover:text-red-500 transition-colors p-1"
                                  title="删除该日所有订单"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {expandedDates[date] && typedBets.map((order, idx) => {
                          const originalIdx = confirmedBets.indexOf(order);
                          const isEditing = editingIndex === originalIdx;

                          return (
                            <tr key={originalIdx} className={`hover:bg-stone-50 transition-colors ${isEditing ? 'bg-white' : 'bg-stone-50/30 opacity-75'}`}>
                              <td className="px-6 py-4 text-sm font-mono text-stone-400">{typedBets.length - idx}</td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <select
                                    value={editingLotteryType}
                                    onChange={(e) => setEditingLotteryType(e.target.value)}
                                    className="w-full p-1 bg-white border border-stone-200 rounded text-[10px] font-bold text-stone-600 focus:ring-1 focus:ring-stone-200 outline-none"
                                  >
                                    {lotteryTypes.map(type => (
                                      <option key={type} value={type}>{type}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-xs font-bold text-stone-300 bg-stone-50 px-2 py-1 rounded">{order.lotteryType}</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-stone-500 whitespace-pre-wrap italic">
                                {isEditing ? (
                                  <textarea
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-200 outline-none resize-none h-24"
                                  />
                                ) : (
                                  renderHighlightedText(order.content, order.lotteryType)
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-stone-400">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editingTotal}
                                    onChange={(e) => setEditingTotal(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-200 outline-none"
                                  />
                                ) : (
                                  `¥ ${order.total.toLocaleString()}`
                                )}
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-stone-300 italic">
                                {(() => {
                                  const winDetailsMap = (order.items || []).reduce((acc, item) => {
                                    const details = getWinningDetails(item.numberDeltas, item.flatNumberDeltas || {}, item.zodiacDeltas, item.tailDeltas, item.multiZodiacDeltas, item.sixZodiacDeltas, item.fiveZodiacDeltas, item.fourZodiacDeltas, item.multiTailDeltas, item.notInDeltas, drawNumbers[item.lotteryType]);
                                    Object.entries(details).forEach(([type, amt]) => {
                                      acc[type] = (acc[type] || 0) + amt;
                                    });
                                    return acc;
                                  }, {} as Record<string, number>);
                                  return Object.entries(winDetailsMap).map(([type, sum]) => `${type}${sum}`).join(' ');
                                })()}
                              </td>
                              <td className="px-6 py-4 text-sm font-black text-red-400">
                                {(() => {
                                  const totalWin = (order.items || []).reduce((sum, item) => {
                                    const win = calculateWinAmount(item.numberDeltas, item.flatNumberDeltas || {}, item.zodiacDeltas, item.tailDeltas, item.multiZodiacDeltas, item.sixZodiacDeltas, item.fiveZodiacDeltas, item.fourZodiacDeltas, item.multiTailDeltas, item.notInDeltas, drawNumbers[item.lotteryType], item.lotteryType);
                                    return sum + (win || 0);
                                  }, 0);
                                  return totalWin > 0 ? `¥ ${totalWin.toLocaleString()}` : '';
                                })()}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex flex-col gap-2 items-center">
                                  {isEditing ? (
                                    <>
                                      <button 
                                        onClick={() => {
                                          const newBets = [...confirmedBets];
                                          const updatedItems = (newBets[originalIdx].items || []).map(item => ({
                                            ...item,
                                            lotteryType: editingLotteryType
                                          }));
                                          
                                          newBets[originalIdx] = {
                                            ...newBets[originalIdx],
                                            content: editingContent,
                                            total: Number(editingTotal) || 0,
                                            lotteryType: editingLotteryType,
                                            items: updatedItems
                                          };
                                          setConfirmedBets(newBets);
                                          setEditingIndex(null);
                                        }}
                                        className="w-full px-3 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-600"
                                      >
                                        保存
                                      </button>
                                      <button 
                                        onClick={() => setEditingIndex(null)}
                                        className="w-full px-3 py-1 bg-stone-200 text-stone-600 rounded-lg text-[10px] font-bold hover:bg-stone-300"
                                      >
                                        取消
                                      </button>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => {
                                          setEditingIndex(originalIdx);
                                          setEditingContent(order.content);
                                          setEditingTotal(order.total);
                                          setEditingLotteryType(order.lotteryType);
                                        }}
                                        className="text-stone-300 hover:text-stone-500 transition-colors p-1"
                                        title="编辑注单"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                      </button>
                                      <button 
                                        onClick={() => deleteConfirmedBet(originalIdx)}
                                        className="text-stone-300 hover:text-red-400 transition-colors p-1"
                                        title="删除注单"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
