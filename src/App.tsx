/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import ExcelJS from 'exceljs';

const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
const zodiacs = ['马', '蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊'];
const lotteryTypes = ['新澳', '老澳', '香港', 'cc', '老cc'];

// Helper to convert Chinese numbers to Arabic numerals
const chineseToNumber = (chStr: string): number => {
  const chMap: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '壹': 1, '贰': 2, '叁': 3, '肆': 4, '伍': 5, '陆': 6, '柒': 7, '捌': 8, '玖': 9, '拾': 10,
    '两': 2, '廿': 20, '卅': 30, '百': 100, '佰': 100, '千': 1000, '仟': 1000, '万': 10000
  };
  
  if (!isNaN(Number(chStr))) return Number(chStr);
  
  let total = 0;
  let temp = 0;
  let lastUnit = 1;
  
  for (let i = 0; i < chStr.length; i++) {
    const char = chStr[i];
    const val = chMap[char];
    
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

// Helper to get Beijing Date String (YYYY-MM-DD)
const getBeijingDateString = (timestamp: number) => {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(timestamp)).replace(/\//g, '-');
};

// Helper to format numbers as 01, 02, etc.
const formatNumber = (num: number | string) => {
  const n = typeof num === 'string' ? parseInt(num) : num;
  if (isNaN(n)) return num.toString();
  return n < 10 ? `0${n}` : n.toString();
};

// Helper to get color for a number
const getNumberColor = (num: number | '') => {
  if (num === '') return '';
  const red = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
  const blue = [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48];
  const green = [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49];
  
  if (red.includes(num as number)) return 'bg-red-500 border-red-500';
  if (blue.includes(num as number)) return 'bg-blue-500 border-blue-500';
  if (green.includes(num as number)) return 'bg-emerald-500 border-emerald-500';
  return 'bg-stone-800 border-stone-800';
};

// Helper to get zodiac from number
const getZodiacFromNumber = (num: number | '') => {
  if (num === '' || num < 1 || num > 49) return '';
  const index = (num - 1) % 12;
  return zodiacs[index];
};

export default function App() {
  const [currentPage, setCurrentPage] = useState('order');
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(new Set());
  const [inputText, setInputText] = useState('');
  const [pendingBets, setPendingBets] = useState<{
    id: string;
    text: string;
    numberDeltas: Record<number, number>;
    zodiacDeltas: Record<string, number>;
    total: number;
    lotteryType: string;
  }[]>([]);
  const [deletedBetsHistory, setDeletedBetsHistory] = useState<{
    item: any;
    index: number;
  }[]>([]);
  const [amount, setAmount] = useState<number | ''>('');
  const [cumulativeAmounts, setCumulativeAmounts] = useState<Record<number, number>>({});
  const [textParsedBets, setTextParsedBets] = useState<Record<number, number>>({});
  const [textParsedZodiacBets, setTextParsedZodiacBets] = useState<Record<string, number>>({});
  
  const amountInputRef = useRef<HTMLInputElement>(null);
  
  const [zodiacBetAmounts, setZodiacBetAmounts] = useState<Record<string, number | ''>>({});
  const [zodiacCumulativeAmounts, setZodiacCumulativeAmounts] = useState<Record<string, number>>({});
  
  const [selectedLotteryType, setSelectedLotteryType] = useState<string>(lotteryTypes[0]);

  // Final confirmed bets for the table
  const [confirmedBets, setConfirmedBets] = useState<{ 
    content: string; 
    total: number; 
    timestamp: number;
    lotteryType: string;
  }[]>([]);

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

  // Folding state for past orders
  const [isPastOrdersExpanded, setIsPastOrdersExpanded] = useState(false);

  // Editing state for confirmed bets
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingTotal, setEditingTotal] = useState<number | ''>('');

  const [drawNumbers, setDrawNumbers] = useState<Record<string, (number | '')[]>>(
    lotteryTypes.reduce((acc, type) => ({ ...acc, [type]: Array(7).fill('') }), {})
  );
  const [isDrawLocked, setIsDrawLocked] = useState<Record<string, boolean>>(
    lotteryTypes.reduce((acc, type) => ({ ...acc, [type]: false }), {})
  );

  // Persistence: Load from localStorage on mount
  useEffect(() => {
    const savedBets = localStorage.getItem('confirmedBets');
    const savedCumulative = localStorage.getItem('cumulativeAmounts');
    const savedZodiacCumulative = localStorage.getItem('zodiacCumulativeAmounts');
    const savedDrawNumbers = localStorage.getItem('drawNumbers');
    const savedIsDrawLocked = localStorage.getItem('isDrawLocked');
    const savedSelectedLotteryType = localStorage.getItem('selectedLotteryType');

    if (savedBets) setConfirmedBets(JSON.parse(savedBets));
    if (savedCumulative) setCumulativeAmounts(JSON.parse(savedCumulative));
    if (savedZodiacCumulative) setZodiacCumulativeAmounts(JSON.parse(savedZodiacCumulative));
    if (savedDrawNumbers) setDrawNumbers(JSON.parse(savedDrawNumbers));
    if (savedIsDrawLocked) setIsDrawLocked(JSON.parse(savedIsDrawLocked));
    if (savedSelectedLotteryType) setSelectedLotteryType(savedSelectedLotteryType);
  }, []);

  // Persistence: Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('confirmedBets', JSON.stringify(confirmedBets));
  }, [confirmedBets]);

  useEffect(() => {
    localStorage.setItem('cumulativeAmounts', JSON.stringify(cumulativeAmounts));
  }, [cumulativeAmounts]);

  useEffect(() => {
    localStorage.setItem('zodiacCumulativeAmounts', JSON.stringify(zodiacCumulativeAmounts));
  }, [zodiacCumulativeAmounts]);

  useEffect(() => {
    localStorage.setItem('drawNumbers', JSON.stringify(drawNumbers));
  }, [drawNumbers]);

  useEffect(() => {
    localStorage.setItem('isDrawLocked', JSON.stringify(isDrawLocked));
  }, [isDrawLocked]);

  useEffect(() => {
    localStorage.setItem('selectedLotteryType', selectedLotteryType);
  }, [selectedLotteryType]);

  const todayBeijing = useMemo(() => getBeijingDateString(Date.now()), []);

  // Split bets into Today and Past
  const todayBets = useMemo(() => confirmedBets.filter(o => getBeijingDateString(o.timestamp) === todayBeijing), [confirmedBets, todayBeijing]);
  const pastBets = useMemo(() => confirmedBets.filter(o => getBeijingDateString(o.timestamp) !== todayBeijing), [confirmedBets, todayBeijing]);


  // Parsing logic for textarea input
  useEffect(() => {
    const parseInput = () => {
      // If text is empty, clear selections and amount
      if (!inputText.trim()) {
        setSelectedNumbers(new Set());
        setAmount('');
        setTextParsedBets({});
        setTextParsedZodiacBets({});
        return;
      }

      // Pre-process: replace "免" with "兔"
      const processedText = inputText.replace(/免/g, '兔');

      const newSelected = new Set<number>();
      const newParsedBets: Record<number, number> = {};
      const newParsedZodiacBets: Record<string, number> = {};
      let lastAmount: number | '' = '';
      let anyPatternFound = false;

      // 1. "各" Pattern for numbers and zodiac-to-numbers
      // Handles "各", "各号", and flexible symbols/spaces after "各"
      const regexEach = /([^各\n]+)各(?:号)?(?:[\s\W\u4e00-\u9fa5]*?)(\d+|[一二三四五六七八九十百千万]+)/g;
      let match;

      while ((match = regexEach.exec(processedText)) !== null) {
        anyPatternFound = true;
        const prefix = match[1];
        const amtStr = match[2];
        const parsedAmt = chineseToNumber(amtStr);
        
        const currentNums: number[] = [];

        // Check for zodiac names in the prefix
        zodiacs.forEach((z, idx) => {
          if (prefix.includes(z)) {
            for (let i = idx + 1; i <= 49; i += 12) {
              currentNums.push(i);
            }
          }
        });

        // Check for numbers in the prefix
        const numMatches = prefix.match(/\d+/g);
        if (numMatches) {
          numMatches.forEach(nStr => {
            const n = parseInt(nStr);
            if (!isNaN(n) && n >= 1 && n <= 49) {
              currentNums.push(n);
            }
          });
        }

        if (!isNaN(parsedAmt) && parsedAmt > 0) {
          lastAmount = parsedAmt;
          currentNums.forEach(n => {
            newSelected.add(n);
            newParsedBets[n] = (newParsedBets[n] || 0) + parsedAmt;
          });
        }
      }

      // 2. "包" Pattern: "兔包100" or "包兔100" -> 100 divided by the number of numbers in that zodiac
      const regexBao = /([马蛇龙兔虎牛鼠猪狗鸡猴羊])包(\d+|[一二三四五六七八九十百千万]+)|包(?:[\s\W\u4e00-\u9fa5]*?)([马蛇龙兔虎牛鼠猪狗鸡猴羊])(\d+|[一二三四五六七八九十百千万]+)/g;
      while ((match = regexBao.exec(processedText)) !== null) {
        anyPatternFound = true;
        const zodiacName = match[1] || match[3];
        const amtStr = match[2] || match[4];
        const totalAmt = chineseToNumber(amtStr);
        
        if (!isNaN(totalAmt) && totalAmt > 0) {
          const zodiacIdx = zodiacs.indexOf(zodiacName);
          const zodiacNums: number[] = [];
          for (let i = zodiacIdx + 1; i <= 49; i += 12) {
            zodiacNums.push(i);
          }
          
          const perNumAmt = Math.floor(totalAmt / zodiacNums.length);
          zodiacNums.forEach(n => {
            newSelected.add(n);
            newParsedBets[n] = (newParsedBets[n] || 0) + perNumAmt;
          });
          lastAmount = perNumAmt;
        }
      }

      // 3. "平" Pattern for direct zodiac betting
      // Matches "平肖狗1000", "平狗1000", "狗平1000"
      // New: "猪狗牛平各1000", "平猪狗牛各1000"
      const regexPingMulti = /(?:平肖|平)?([马蛇龙兔虎牛鼠猪狗鸡猴羊]+)(?:平肖|平)?各(\d+|[一二三四五六七八九十百千万]+)/g;
      while ((match = regexPingMulti.exec(processedText)) !== null) {
        anyPatternFound = true;
        const zodiacNames = match[1];
        const amtStr = match[2];
        const parsedAmt = chineseToNumber(amtStr);
        if (!isNaN(parsedAmt) && parsedAmt > 0) {
          for (const zName of zodiacNames) {
            if (zodiacs.includes(zName)) {
              newParsedZodiacBets[zName] = (newParsedZodiacBets[zName] || 0) + parsedAmt;
            }
          }
        }
      }

      const regexPingSingle = /(?:平肖|平)([马蛇龙兔虎牛鼠猪狗鸡猴羊])(\d+|[一二三四五六七八九十百千万]+)|([马蛇龙兔虎牛鼠猪狗鸡猴羊])平(\d+|[一二三四五六七八九十百千万]+)/g;
      while ((match = regexPingSingle.exec(processedText)) !== null) {
        anyPatternFound = true;
        const zodiacName = match[1] || match[3];
        const amtStr = match[2] || match[4];
        const parsedAmt = chineseToNumber(amtStr);
        if (!isNaN(parsedAmt) && parsedAmt > 0) {
          newParsedZodiacBets[zodiacName] = (newParsedZodiacBets[zodiacName] || 0) + parsedAmt;
        }
      }

      // If we found at least one valid pattern, sync the UI to the text
      if (anyPatternFound) {
        setSelectedNumbers(newSelected);
        setAmount(lastAmount);
        setTextParsedBets(newParsedBets);
        setTextParsedZodiacBets(newParsedZodiacBets);
      } else {
        setSelectedNumbers(new Set());
        setAmount('');
        setTextParsedBets({});
        setTextParsedZodiacBets({});
      }
    };

    parseInput();
  }, [inputText]);

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
    const itemsToAdd: typeof pendingBets = [];
    const newCumulative = { ...cumulativeAmounts };
    const newZodiacCumulative = { ...zodiacCumulativeAmounts };
    const newZodiacBetAmounts = { ...zodiacBetAmounts };
    
    let hasAction = false;

    // 1. Handle text input (Numbers and Zodiacs)
    if (inputText.trim()) {
      const numberDeltas: Record<number, number> = {};
      const zodiacDeltas: Record<string, number> = {};
      let addedTotal = 0;
      
      // Process parsed numbers
      (Object.entries(textParsedBets) as [string, number][]).forEach(([numStr, amt]) => {
        const num = parseInt(numStr);
        numberDeltas[num] = (numberDeltas[num] || 0) + amt;
        addedTotal += amt;
        newCumulative[num] = (newCumulative[num] || 0) + amt;
      });

      // Process parsed zodiacs
      (Object.entries(textParsedZodiacBets) as [string, number][]).forEach(([z, amt]) => {
        zodiacDeltas[z] = (zodiacDeltas[z] || 0) + amt;
        addedTotal += amt;
        newZodiacCumulative[z] = (newZodiacCumulative[z] || 0) + amt;
      });

      if (addedTotal > 0 || inputText.trim()) {
        itemsToAdd.push({
          id: Math.random().toString(36).substr(2, 9),
          text: inputText.trim(),
          numberDeltas,
          zodiacDeltas,
          total: addedTotal
        });
        hasAction = true;
      }
    }

    // 2. Handle manually selected numbers (that aren't already in textParsedBets)
    if (selectedNumbers.size > 0 && amount !== '') {
      if (amount < 0) {
        alert('金额不能为负数');
        return;
      }
      
      const processedNums = new Set(Object.keys(textParsedBets).map(Number));
      const manualNums = [...selectedNumbers].filter(n => !processedNums.has(n));
      
      if (manualNums.length > 0) {
        const numberDeltas: Record<number, number> = {};
        let addedTotal = 0;
        
        manualNums.forEach(num => {
          const amt = amount as number;
          numberDeltas[num] = amt;
          addedTotal += amt;
          newCumulative[num] = (newCumulative[num] || 0) + amt;
        });

        const sortedNums = manualNums.sort((a, b) => a - b);
        itemsToAdd.push({
          id: Math.random().toString(36).substr(2, 9),
          text: `${sortedNums.map(n => formatNumber(n)).join('，')}各号下单${amount}元`,
          numberDeltas,
          zodiacDeltas: {},
          total: addedTotal
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
        newZodiacCumulative[z] = (newZodiacCumulative[z] || 0) + (val as number);
        newZodiacBetAmounts[z] = '';
        
        itemsToAdd.push({
          id: Math.random().toString(36).substr(2, 9),
          text: `平肖${z}下单${val}元`,
          numberDeltas: {},
          zodiacDeltas,
          total: val as number
        });
        hasAction = true;
      }
    });

    if (hasNegativeZodiac) {
      alert('生肖金额不能为负数');
      return;
    }

    if (hasAction) {
      const lotteryPrefix = `【${selectedLotteryType}】`;
      const finalItemsToAdd = itemsToAdd.map(item => ({
        ...item,
        text: item.text.startsWith('【') ? item.text : `${lotteryPrefix}${item.text}`,
        lotteryType: selectedLotteryType
      }));
      
      setPendingBets(prev => [...prev, ...finalItemsToAdd]);
      setCumulativeAmounts(newCumulative);
      setZodiacCumulativeAmounts(newZodiacCumulative);
      setZodiacBetAmounts(newZodiacBetAmounts);
      setSelectedNumbers(new Set());
      setAmount('');
      setInputText('');
      setTextParsedBets({});
      setTextParsedZodiacBets({});
    } else {
      alert('请先选择数字或生肖并输入金额');
    }
  };

  const deletePendingBet = (id: string) => {
    const index = pendingBets.findIndex(item => item.id === id);
    if (index === -1) return;

    const itemToDelete = pendingBets[index];
    
    // Revert cumulative amounts
    const newCumulative = { ...cumulativeAmounts };
    Object.entries(itemToDelete.numberDeltas).forEach(([num, amt]) => {
      newCumulative[Number(num)] = (newCumulative[Number(num)] || 0) - (amt as number);
    });

    const newZodiacCumulative = { ...zodiacCumulativeAmounts };
    Object.entries(itemToDelete.zodiacDeltas).forEach(([z, amt]) => {
      newZodiacCumulative[z] = (newZodiacCumulative[z] || 0) - (amt as number);
    });

    setCumulativeAmounts(newCumulative);
    setZodiacCumulativeAmounts(newZodiacCumulative);
    
    setPendingBets(prev => prev.filter(item => item.id !== id));
    setDeletedBetsHistory(prev => [...prev, { item: itemToDelete, index }]);
  };

  const undoDeletePendingBet = () => {
    if (deletedBetsHistory.length === 0) return;

    const lastDeleted = deletedBetsHistory[deletedBetsHistory.length - 1];
    const itemToRestore = lastDeleted.item;
    
    // Restore cumulative amounts
    const newCumulative = { ...cumulativeAmounts };
    Object.entries(itemToRestore.numberDeltas).forEach(([num, amt]) => {
      newCumulative[Number(num)] = (newCumulative[Number(num)] || 0) + (amt as number);
    });

    const newZodiacCumulative = { ...zodiacCumulativeAmounts };
    Object.entries(itemToRestore.zodiacDeltas).forEach(([z, amt]) => {
      newZodiacCumulative[z] = (newZodiacCumulative[z] || 0) + (amt as number);
    });

    setCumulativeAmounts(newCumulative);
    setZodiacCumulativeAmounts(newZodiacCumulative);

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
    
    const finalContent = pendingBets.map(item => item.text).join('\n');
    // Collect all unique lottery types from pendingBets
    const uniqueLotteryTypes = Array.from(new Set(pendingBets.map(item => item.lotteryType)));
    const lotteryTypeDisplay = uniqueLotteryTypes.map(type => `【${type}】`).join('');
    
    setConfirmedBets(prev => [...prev, { 
      content: finalContent, 
      total: currentPendingTotal, 
      timestamp: Date.now(),
      lotteryType: lotteryTypeDisplay
    }]);
    setPendingBets([]);
    setDeletedBetsHistory([]);
  };

  const handleExportExcel = async () => {
    if (confirmedBets.length === 0) {
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
      { header: '总金额', key: 'total', width: 15 },
      { header: '下单时间', key: 'time', width: 25 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data
    confirmedBets.forEach((order, index) => {
      const row = worksheet.addRow({
        index: index + 1,
        type: order.lotteryType,
        content: '', // Will be set as rich text
        total: order.total,
        time: new Date(order.timestamp).toLocaleString()
      });

      // Handle rich text for content (highlighting)
      const contentCell = row.getCell('content');
      const lines = order.content.split('\n');
      const richText: any[] = [];

      lines.forEach((line, lineIdx) => {
        let currentLotteryType = '';
        const match = line.match(/^【(.+?)】/);
        if (match) {
          currentLotteryType = match[1];
        } else if (order.lotteryType && !order.lotteryType.includes('】【')) {
          currentLotteryType = order.lotteryType.replace(/[【】]/g, '');
        }

        const draw = drawNumbers[currentLotteryType];
        const locked = isDrawLocked[currentLotteryType];

        // Split line into parts to highlight
        // We look for numbers 01-49 and zodiac names
        const parts = line.split(/(\d{1,2}|[马蛇龙兔虎牛鼠猪狗鸡猴羊])/);
        
        parts.forEach(part => {
          if (!part) return;
          
          let isWinner = false;
          if (locked && draw) {
            // Check if it's a number
            if (/^\d{1,2}$/.test(part)) {
              const n = parseInt(part);
              if (draw.includes(n)) isWinner = true;
            } 
            // Check if it's a zodiac
            else if (zodiacs.includes(part)) {
              const winningZodiacs = draw.map(n => getZodiacFromNumber(n)).filter(Boolean);
              if (winningZodiacs.includes(part)) isWinner = true;
            }
          }

          richText.push({
            text: part,
            font: isWinner ? { color: { argb: 'FFFF0000' }, bold: true } : {}
          });
        });

        if (lineIdx < lines.length - 1) {
          richText.push({ text: '\n' });
        }
      });

      contentCell.value = { richText };
      contentCell.alignment = { wrapText: true, vertical: 'top' };
    });

    // Add summary
    const totalSum = confirmedBets.reduce((sum, order) => sum + order.total, 0);
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow(['总下注', '', '', totalSum]);
    const summaryRow = worksheet.lastRow;
    if (summaryRow) {
      summaryRow.getCell(1).font = { bold: true };
      summaryRow.getCell(4).font = { bold: true, color: { argb: 'FF008000' } };
    }

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `confirmed_bets_${new Date().getTime()}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAddManualBet = () => {
    if (!manualContent.trim() || manualTotal === '') {
      alert('请填写注单内容和金额');
      return;
    }
    setConfirmedBets(prev => [...prev, { 
      content: manualContent, 
      total: Number(manualTotal), 
      timestamp: Date.now(),
      lotteryType: selectedLotteryType
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

  const renderHighlightedText = (text: string, fallbackLotteryType?: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Detect lottery type from prefix like 【新澳】
      let currentLotteryType = '';
      const match = line.match(/^【(.+?)】/);
      if (match) {
        currentLotteryType = match[1];
      } else if (fallbackLotteryType) {
        // If fallbackLotteryType is something like "【新澳】", extract "新澳"
        // If it's multiple like "【新澳】【香港】", we can't easily fallback, so we require prefix
        if (!fallbackLotteryType.includes('】【')) {
          currentLotteryType = fallbackLotteryType.replace(/[【】]/g, '');
        }
      }

      // If no lottery type detected or it's not locked, return plain line
      if (!currentLotteryType || !isDrawLocked[currentLotteryType]) {
        return <div key={lineIdx}>{line}</div>;
      }

      const specialNum = drawNumbers[currentLotteryType][6];
      const specialZodiac = getZodiacFromNumber(specialNum);

      if (specialNum === '') return <div key={lineIdx}>{line}</div>;

      // Split by "各" or "下单" to separate bet content from amount
      let betPart = line;
      let amountPart = '';
      
      if (line.includes('各')) {
        const parts = line.split('各');
        betPart = parts[0];
        amountPart = '各' + parts.slice(1).join('各');
      } else if (line.includes('下单')) {
        const parts = line.split('下单');
        betPart = parts[0];
        amountPart = '下单' + parts.slice(1).join('下单');
      }

      // Highlight in betPart
      const formattedSpecialNum = formatNumber(specialNum);
      
      // Use a regex to find numbers and zodiacs in the betPart
      // We want to match the special number or special zodiac
      const parts = betPart.split(new RegExp(`(${formattedSpecialNum}|${specialZodiac})`, 'g'));
      
      return (
        <div key={lineIdx}>
          {parts.map((part, partIdx) => {
            if (part === formattedSpecialNum || part === specialZodiac) {
              return <span key={partIdx} className="text-red-600 font-black underline decoration-2 underline-offset-2">{part}</span>;
            }
            return <span key={partIdx}>{part}</span>;
          })}
          <span className="text-stone-300">{amountPart}</span>
        </div>
      );
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddToPending();
    }
  };

  return (
    <div className="h-screen bg-stone-50 text-stone-900 font-sans flex overflow-hidden">
      {/* 1. Sidebar (Left Section) */}
      <aside className="w-52 bg-white border-r border-stone-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-800 tracking-tight text-center">系统管理</h2>
        </div>
        <nav className="flex-grow p-3 space-y-1 overflow-y-auto">
          <button 
            onClick={() => setCurrentPage('order')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${currentPage === 'order' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            下单页
          </button>
          <button 
            onClick={() => setCurrentPage('draw')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${currentPage === 'draw' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 10-4 4-4-4"/></svg>
            开奖页
          </button>
          <button 
            onClick={() => setCurrentPage('confirm')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${currentPage === 'confirm' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            注单确认页
            {confirmedBets.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{confirmedBets.length}</span>
            )}
          </button>
        </nav>
        <div className="p-4 border-t border-stone-100 text-stone-400 text-[10px] text-center">
          © 2026 数字订单系统
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-grow flex p-6 gap-6 overflow-hidden">
        {currentPage === 'order' ? (
          <>
            {/* 2. Middle Section (Number Grid + Input) */}
            <div className="flex-grow flex flex-col gap-6 min-w-0">
              <section className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex flex-col min-h-0">
                <div className="mb-4 flex items-center justify-between">
                  <h1 className="text-xl font-light tracking-tight text-stone-800">数字下单区</h1>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">彩种:</span>
                    <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
                      {lotteryTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => setSelectedLotteryType(type)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${selectedLotteryType === type ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-12 gap-1.5 mb-3">
                  {zodiacs.map((zodiac, idx) => (
                    <motion.button
                      key={zodiac}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => selectZodiacColumn(idx)}
                      className="h-8 w-full flex items-center justify-center rounded-lg text-xs font-bold bg-stone-50 text-stone-500 hover:bg-stone-100 border border-stone-100 transition-colors"
                    >
                      {zodiac}
                    </motion.button>
                  ))}
                </div>

                <div className="grid grid-cols-12 gap-1.5 overflow-y-auto pr-1">
                  {numbers.map((num) => {
                    const pendingAmt = textParsedBets[num] || (selectedNumbers.has(num) ? amount : null);
                    return (
                      <motion.button
                        key={num}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleNumber(num)}
                        id={`btn-num-${num}`}
                        className={`
                          h-12 w-full flex flex-col items-center justify-center rounded-lg transition-colors relative
                          ${selectedNumbers.has(num) 
                            ? 'bg-stone-800 text-white shadow-md' 
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}
                        `}
                      >
                        {pendingAmt !== null && pendingAmt !== '' && (
                          <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-stone-900 text-[9px] px-1 py-0.5 rounded-full shadow-md z-10 font-black border border-amber-500/50">
                            {pendingAmt}
                          </span>
                        )}
                        <span className="text-xs font-medium leading-tight">{formatNumber(num)}</span>
                        <span className={`text-[8px] mt-0.5 leading-none ${top5Numbers.has(num) ? 'text-red-600 font-black' : (selectedNumbers.has(num) ? 'text-stone-300' : 'text-stone-400')}`}>
                          {cumulativeAmounts[num] || 0}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 border-t border-stone-100 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex bg-stone-100 p-1 rounded-full border border-stone-200 shadow-inner">
                      <button
                        onClick={() => {
                          const oddNumbers = numbers.filter(n => n % 2 !== 0);
                          setSelectedNumbers(new Set(oddNumbers));
                          amountInputRef.current?.focus();
                        }}
                        className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${
                          selectedNumbers.size === numbers.filter(n => n % 2 !== 0).length && 
                          numbers.filter(n => n % 2 !== 0).every(n => selectedNumbers.has(n))
                          ? 'bg-stone-800 text-white shadow-md'
                          : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        单
                      </button>
                      <button
                        onClick={() => {
                          const evenNumbers = numbers.filter(n => n % 2 === 0);
                          setSelectedNumbers(new Set(evenNumbers));
                          amountInputRef.current?.focus();
                        }}
                        className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${
                          selectedNumbers.size === numbers.filter(n => n % 2 === 0).length && 
                          numbers.filter(n => n % 2 === 0).every(n => selectedNumbers.has(n))
                          ? 'bg-stone-800 text-white shadow-md'
                          : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        双
                      </button>
                    </div>
                    
                    <button
                      onClick={clearAllSelections}
                      className="px-3 py-1.5 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center gap-1.5 border border-transparent hover:border-red-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      重置
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
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
                    <button
                      id="confirm-button"
                      onClick={handleAddToPending}
                      className="px-6 py-2 bg-stone-800 text-white rounded-xl shadow-lg hover:bg-stone-900 active:scale-95 transition-all font-bold text-xs tracking-wide"
                    >
                      确认
                    </button>
                  </div>
                </div>
              </section>

              <section className="relative flex-grow min-h-0">
                <textarea
                  id="input-textarea"
                  placeholder="输入备注或格式如 '鼠狗虎各20' 或 '47.48.23各20' 或 '平肖狗1000'..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddToPending();
                    }
                  }}
                  className="w-full h-full p-4 bg-white border border-stone-200 rounded-xl shadow-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition-all resize-none text-stone-700 text-sm"
                />
                {inputText && (
                  <button 
                    onClick={() => setInputText('')}
                    className="absolute right-3 top-3 p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-lg transition-colors shadow-sm"
                    title="清除内容"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </section>
            </div>

            {/* 3. Right Section (Zodiac Betting Panel + Output) */}
            <div className="w-96 flex flex-col gap-6 shrink-0 min-h-0">
              <section className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex flex-col min-h-0">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <div className="h-px bg-stone-100 flex-grow"></div>
                  <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">平肖下单区</h2>
                  <div className="h-px bg-stone-100 flex-grow"></div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 overflow-y-auto pr-1">
                  {zodiacs.map(z => (
                    <div key={z} className="group flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-8 h-8 flex items-center justify-center bg-stone-50 rounded-lg font-bold text-xs text-stone-600 border border-stone-100 group-hover:border-stone-300 transition-colors shrink-0">
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
                            className={`w-full p-2 pr-7 border rounded-lg text-xs outline-none transition-all ${
                              textParsedZodiacBets[z] 
                                ? 'bg-amber-50 border-amber-200 focus:ring-amber-200 focus:bg-white' 
                                : 'bg-stone-50 border-stone-100 focus:ring-stone-200 focus:bg-white'
                            }`}
                          />
                          {(zodiacBetAmounts[z] !== undefined && zodiacBetAmounts[z] !== '') || textParsedZodiacBets[z] ? (
                            <button 
                              onClick={() => {
                                if (zodiacBetAmounts[z] !== undefined && zodiacBetAmounts[z] !== '') {
                                  setZodiacBetAmounts(prev => ({ ...prev, [z]: '' }));
                                } else {
                                  // If it's from text, we can't easily "clear" it without clearing text, 
                                  // but we can set manual to 0 or something. 
                                  // For now, let's just clear manual.
                                  setZodiacBetAmounts(prev => ({ ...prev, [z]: '' }));
                                }
                              }}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] text-stone-400">累计:</span>
                        <span className="text-[9px] font-bold text-stone-600">
                          {zodiacCumulativeAmounts[z] || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex flex-col flex-grow min-h-0">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <div className="h-px bg-stone-100 flex-grow"></div>
                  <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">待确认注单</h2>
                  <div className="h-px bg-stone-100 flex-grow"></div>
                </div>
                
                <div 
                  id="output-container"
                  className="flex-grow bg-stone-50 border border-stone-100 rounded-xl p-3 overflow-y-auto flex flex-col gap-1.5 mb-4"
                >
                  {pendingBets.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-stone-400 text-[11px] italic">暂无内容...</span>
                    </div>
                  ) : (
                    pendingBets.map((item) => (
                      <div key={item.id} className="group flex items-start justify-between gap-2 p-2 bg-white rounded-lg shadow-sm border border-stone-100 hover:border-stone-300 transition-all">
                        <span className="text-stone-600 font-mono text-[11px] leading-relaxed whitespace-pre-wrap flex-grow">{item.text}</span>
                        <button 
                          onClick={() => deletePendingBet(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all shrink-0"
                          title="删除此条"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {deletedBetsHistory.length > 0 && (
                    <button 
                      onClick={undoDeletePendingBet}
                      className="text-[10px] font-bold text-stone-400 hover:text-stone-600 flex items-center justify-center gap-1 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                      撤回删除
                    </button>
                  )}
                  
                  <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">当前小计</span>
                    <span className="text-sm font-black text-emerald-600">¥ {currentPendingTotal.toLocaleString()}</span>
                  </div>

                  <button
                    onClick={handleConfirmBets}
                    className="w-full py-2.5 bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700 active:scale-95 transition-all font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    确认下单
                  </button>
                </div>
              </section>
            </div>
          </>
        ) : currentPage === 'draw' ? (
          /* Draw Page (开奖页) */
          <div className="flex-grow flex flex-col gap-4 overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
              <h1 className="text-xl font-bold text-stone-800">开奖号码设置</h1>
              <p className="text-stone-400 text-xs">锁定号码后，注单确认页将自动高亮对应彩种的中奖号码</p>
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
                        <span className="w-8 h-8 bg-stone-800 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md">
                          {type[0]}
                        </span>
                        <div>
                          <h2 className="text-sm font-bold text-stone-800">{type}</h2>
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
                      <div className="flex-grow grid grid-cols-6 gap-2">
                        {drawNumbers[type].slice(0, 6).map((num, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1">
                            <div className="relative group w-10 h-10">
                              <input
                                type="text"
                                inputMode="numeric"
                                readOnly={isDrawLocked[type]}
                                value={num === '' ? '' : formatNumber(num)}
                                onChange={(e) => {
                                  if (isDrawLocked[type]) return;
                                  const rawVal = e.target.value.replace(/\D/g, '');
                                  const val = rawVal === '' ? '' : Number(rawVal);
                                  if (val === '' || (val >= 1 && val <= 49)) {
                                    const newDraw = { ...drawNumbers };
                                    newDraw[type][idx] = val;
                                    setDrawNumbers(newDraw);
                                  }
                                }}
                                className={`
                                  w-full h-full rounded-full border-2 text-center text-xs font-bold outline-none transition-all
                                  ${num ? `${getNumberColor(num)} text-white shadow-md` : 'bg-stone-50 border-stone-100 text-stone-400 focus:border-stone-300'}
                                  ${isDrawLocked[type] ? 'cursor-not-allowed opacity-80' : 'cursor-text'}
                                `}
                              />
                            </div>
                            <span className={`text-[10px] font-bold ${num ? 'text-stone-600' : 'text-stone-200'}`}>
                              {getZodiacFromNumber(num) || '—'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="w-px h-12 bg-stone-100"></div>

                      <div className="flex flex-col items-center gap-1">
                        <div className="relative group">
                          <input
                            type="text"
                            inputMode="numeric"
                            readOnly={isDrawLocked[type]}
                            value={drawNumbers[type][6] === '' ? '' : formatNumber(drawNumbers[type][6])}
                            onChange={(e) => {
                              if (isDrawLocked[type]) return;
                              const rawVal = e.target.value.replace(/\D/g, '');
                              const val = rawVal === '' ? '' : Number(rawVal);
                              if (val === '' || (val >= 1 && val <= 49)) {
                                const newDraw = { ...drawNumbers };
                                newDraw[type][6] = val;
                                setDrawNumbers(newDraw);
                              }
                            }}
                            className={`
                              w-16 h-16 rounded-full border-4 text-center text-xl font-black outline-none transition-all
                              ${drawNumbers[type][6] ? `${getNumberColor(drawNumbers[type][6])} text-white shadow-lg` : 'bg-stone-50 border-stone-200 text-stone-400 focus:border-stone-400'}
                              ${isDrawLocked[type] ? 'cursor-not-allowed opacity-90' : 'cursor-text'}
                            `}
                          />
                        </div>
                        <span className={`text-[12px] font-black ${drawNumbers[type][6] ? 'text-emerald-600' : 'text-stone-200'}`}>
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
          /* Betting Confirmation Page (注单确认页) */
          <div className="flex-grow flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-stone-800">注单确认</h1>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end mr-4">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest">下注总金额</span>
                  <span className="text-xl font-bold text-emerald-600">
                    ¥ {confirmedBets.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
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
                  onClick={handleExportExcel}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700 transition-all font-bold text-sm flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  生成Excel
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest w-20">序号</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest w-24">彩种</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">注单内容</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest w-32">总金额</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest w-32 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
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
                  
                  {/* Today's Bets */}
                  {todayBets.length === 0 && !isAddingManual && pastBets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">暂无已确认注单</td>
                    </tr>
                  ) : (
                    [...todayBets].reverse().map((order) => {
                      const originalIdx = confirmedBets.indexOf(order);
                      const isEditing = editingIndex === originalIdx;

                      return (
                        <tr key={originalIdx} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-stone-400">{originalIdx + 1}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded">{order.lotteryType}</span>
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
                          <td className="px-6 py-4 text-sm font-bold text-emerald-600">
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
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col gap-2 items-center">
                              {isEditing ? (
                                <>
                                  <button 
                                    onClick={() => {
                                      const newBets = [...confirmedBets];
                                      newBets[originalIdx] = {
                                        ...newBets[originalIdx],
                                        content: editingContent,
                                        total: Number(editingTotal) || 0
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
                    })
                  )}

                  {/* Past Bets Section */}
                  {pastBets.length > 0 && (
                    <>
                      <tr 
                        className="bg-stone-100/50 cursor-pointer hover:bg-stone-100 transition-colors"
                        onClick={() => setIsPastOrdersExpanded(!isPastOrdersExpanded)}
                      >
                        <td colSpan={5} className="px-6 py-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="14" height="14" 
                              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              className={`transition-transform duration-200 ${isPastOrdersExpanded ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                            过往注单 ({pastBets.length})
                          </div>
                        </td>
                      </tr>
                      {isPastOrdersExpanded && [...pastBets].reverse().map((order) => {
                        const originalIdx = confirmedBets.indexOf(order);
                        return (
                          <tr key={originalIdx} className="bg-stone-50/30 hover:bg-stone-50 transition-colors opacity-75">
                            <td className="px-6 py-4 text-sm font-mono text-stone-400">{originalIdx + 1}</td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-stone-300 bg-stone-50 px-2 py-1 rounded">{order.lotteryType}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-stone-500 whitespace-pre-wrap italic">
                              {renderHighlightedText(order.content, order.lotteryType)}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-stone-400">¥ {order.total.toLocaleString()}</td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => deleteConfirmedBet(originalIdx)}
                                className="text-stone-300 hover:text-red-400 transition-colors p-1"
                                title="删除注单"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
