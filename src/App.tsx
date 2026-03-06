/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
const zodiacs = ['马', '蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊'];

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
  
  // Final confirmed bets for the table
  const [confirmedBets, setConfirmedBets] = useState<{ content: string; total: number; timestamp: number }[]>([]);

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

  const [drawNumbers, setDrawNumbers] = useState<(number | '')[]>(Array(7).fill(''));
  const [isDrawLocked, setIsDrawLocked] = useState(false);

  // Persistence: Load from localStorage on mount
  useEffect(() => {
    const savedBets = localStorage.getItem('confirmedBets');
    const savedCumulative = localStorage.getItem('cumulativeAmounts');
    const savedZodiacCumulative = localStorage.getItem('zodiacCumulativeAmounts');
    const savedDrawNumbers = localStorage.getItem('drawNumbers');
    const savedIsDrawLocked = localStorage.getItem('isDrawLocked');

    if (savedBets) setConfirmedBets(JSON.parse(savedBets));
    if (savedCumulative) setCumulativeAmounts(JSON.parse(savedCumulative));
    if (savedZodiacCumulative) setZodiacCumulativeAmounts(JSON.parse(savedZodiacCumulative));
    if (savedDrawNumbers) setDrawNumbers(JSON.parse(savedDrawNumbers));
    if (savedIsDrawLocked) setIsDrawLocked(JSON.parse(savedIsDrawLocked));
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

      // 1. Existing "各" Pattern for numbers and zodiac-to-numbers
      const regexEach = /([^各\n]+)各(\d+)/g;
      let match;
      const newSelected = new Set<number>();
      const newParsedBets: Record<number, number> = {};
      const newParsedZodiacBets: Record<string, number> = {};
      let lastAmount: number | '' = '';
      let anyPatternFound = false;

      while ((match = regexEach.exec(inputText)) !== null) {
        anyPatternFound = true;
        const prefix = match[1];
        const amtStr = match[2];
        const parsedAmt = parseInt(amtStr);
        
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

        if (!isNaN(parsedAmt)) {
          lastAmount = parsedAmt;
          currentNums.forEach(n => {
            newSelected.add(n);
            newParsedBets[n] = (newParsedBets[n] || 0) + parsedAmt;
          });
        }
      }

      // 2. New "平肖" Pattern for direct zodiac betting
      // Matches "平肖狗1000" or "平狗1000"
      const regexPingXiao = /(?:平肖|平)([马蛇龙兔虎牛鼠猪狗鸡猴羊])(\d+)/g;
      while ((match = regexPingXiao.exec(inputText)) !== null) {
        anyPatternFound = true;
        const zodiacName = match[1];
        const amtStr = match[2];
        const parsedAmt = parseInt(amtStr);
        if (!isNaN(parsedAmt)) {
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
      setPendingBets(prev => [...prev, ...itemsToAdd]);
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
    setConfirmedBets(prev => [...prev, { content: finalContent, total: currentPendingTotal, timestamp: Date.now() }]);
    setPendingBets([]);
    setDeletedBetsHistory([]);
  };

  const handleExportExcel = () => {
    if (confirmedBets.length === 0) {
      alert('没有注单可以导出');
      return;
    }

    // Prepare data with specific column order: Content, Index, Total
    const data = confirmedBets.map((order, index) => ({
      '注单内容': order.content,
      '序号': index + 1,
      '总金额': order.total
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Add summary after 3 empty rows
    const totalSum = confirmedBets.reduce((sum, order) => sum + order.total, 0);
    const summaryRowIndex = data.length + 4; // +1 for header, +3 for gap
    
    XLSX.utils.sheet_add_aoa(ws, [
      ['总下注', totalSum]
    ], { origin: `A${summaryRowIndex}` });

    // Set column widths for better visibility
    ws['!cols'] = [
      { wch: 50 }, // Content
      { wch: 10 }, // Index
      { wch: 15 }  // Total
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Confirmed Bets');
    XLSX.writeFile(wb, 'confirmed_bets.xlsx');
  };

  const handleAddManualBet = () => {
    if (!manualContent.trim() || manualTotal === '') {
      alert('请填写注单内容和金额');
      return;
    }
    setConfirmedBets(prev => [...prev, { content: manualContent, total: Number(manualTotal), timestamp: Date.now() }]);
    setManualContent('');
    setManualTotal('');
    setIsAddingManual(false);
  };

  const deleteConfirmedBet = (index: number) => {
    const newBets = [...confirmedBets];
    newBets.splice(index, 1);
    setConfirmedBets(newBets);
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
                <div className="mb-4 text-center">
                  <h1 className="text-xl font-light tracking-tight text-stone-800">数字下单区</h1>
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
          <div className="flex-grow flex flex-col items-center justify-center gap-12">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-light tracking-widest text-stone-800">开奖号码录入</h1>
              <p className="text-stone-400 text-sm">
                {isDrawLocked ? '号码已锁定，点击下方按钮解锁后可修改' : '请输入 1-49 之间的数字'}
              </p>
            </div>

            <div className={`flex items-center gap-6 bg-white p-12 rounded-[40px] shadow-xl border transition-all ${isDrawLocked ? 'border-amber-200 bg-stone-50/30' : 'border-stone-100'}`}>
              {/* First 6 Numbers (Normal Numbers / 平码) */}
              <div className="flex gap-4">
                {drawNumbers.slice(0, 6).map((num, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <input
                        type="text"
                        inputMode="numeric"
                        readOnly={isDrawLocked}
                        value={num === '' ? '' : formatNumber(num)}
                        onChange={(e) => {
                          if (isDrawLocked) return;
                          const rawVal = e.target.value.replace(/\D/g, '');
                          const val = rawVal === '' ? '' : Number(rawVal);
                          if (val === '' || (val >= 1 && val <= 49)) {
                            const newDraw = [...drawNumbers];
                            newDraw[idx] = val;
                            setDrawNumbers(newDraw);
                          }
                        }}
                        className={`
                          w-20 h-20 rounded-full border-2 text-center text-2xl font-bold outline-none transition-all
                          ${num ? `${getNumberColor(num)} text-white shadow-lg` : 'bg-stone-50 border-stone-200 text-stone-400 focus:border-stone-400'}
                          ${isDrawLocked ? 'cursor-not-allowed opacity-90' : 'cursor-text'}
                        `}
                      />
                      {num && !isDrawLocked && (
                        <button 
                          onClick={() => {
                            const newDraw = [...drawNumbers];
                            newDraw[idx] = '';
                            setDrawNumbers(newDraw);
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                    <div className="h-8 flex items-center justify-center">
                      <span className={`text-lg font-bold transition-all ${num ? 'text-stone-800 scale-110' : 'text-stone-200'}`}>
                        {getZodiacFromNumber(num) || '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Separator */}
              <div className="w-px h-32 bg-stone-200 mx-2"></div>

              {/* Special Number (7th / 特码) */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <input
                    type="text"
                    inputMode="numeric"
                    readOnly={isDrawLocked}
                    value={drawNumbers[6] === '' ? '' : formatNumber(drawNumbers[6])}
                    onChange={(e) => {
                      if (isDrawLocked) return;
                      const rawVal = e.target.value.replace(/\D/g, '');
                      const val = rawVal === '' ? '' : Number(rawVal);
                      if (val === '' || (val >= 1 && val <= 49)) {
                        const newDraw = [...drawNumbers];
                        newDraw[6] = val;
                        setDrawNumbers(newDraw);
                      }
                    }}
                    className={`
                      w-24 h-24 rounded-full border-4 text-center text-3xl font-black outline-none transition-all
                      ${drawNumbers[6] ? `${getNumberColor(drawNumbers[6])} text-white shadow-xl rotate-3` : 'bg-stone-50 border-stone-200 text-stone-400 focus:border-stone-400'}
                      ${isDrawLocked ? 'cursor-not-allowed opacity-90' : 'cursor-text'}
                    `}
                  />
                  {drawNumbers[6] && !isDrawLocked && (
                    <button 
                      onClick={() => {
                        const newDraw = [...drawNumbers];
                        newDraw[6] = '';
                        setDrawNumbers(newDraw);
                      }}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
                <div className="h-8 flex items-center justify-center">
                  <span className={`text-xl font-black transition-all ${drawNumbers[6] ? 'text-emerald-600 scale-125' : 'text-stone-200'}`}>
                    {getZodiacFromNumber(drawNumbers[6]) || '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                disabled={isDrawLocked}
                onClick={() => setDrawNumbers(Array(7).fill(''))}
                className={`px-8 py-3 rounded-full transition-all text-sm font-bold flex items-center gap-2 ${isDrawLocked ? 'bg-stone-50 text-stone-300 cursor-not-allowed' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                重置开奖号码
              </button>

              <button 
                onClick={() => setIsDrawLocked(!isDrawLocked)}
                className={`px-8 py-3 rounded-full transition-all text-sm font-bold flex items-center gap-2 shadow-md ${isDrawLocked ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-stone-800 text-white hover:bg-stone-900'}`}
              >
                {isDrawLocked ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    解锁号码
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                    锁定号码
                  </>
                )}
              </button>
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
                      <td colSpan={4} className="px-6 py-12 text-center text-stone-400 italic">暂无已确认注单</td>
                    </tr>
                  ) : (
                    [...todayBets].reverse().map((order) => {
                      const originalIdx = confirmedBets.indexOf(order);
                      return (
                        <tr key={originalIdx} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-stone-400">{originalIdx + 1}</td>
                          <td className="px-6 py-4 text-sm text-stone-700 whitespace-pre-wrap">{order.content}</td>
                          <td className="px-6 py-4 text-sm font-bold text-emerald-600">¥ {order.total.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => deleteConfirmedBet(originalIdx)}
                              className="text-red-400 hover:text-red-600 transition-colors p-1"
                              title="删除注单"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
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
                        <td colSpan={4} className="px-6 py-3">
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
                            <td className="px-6 py-4 text-sm text-stone-500 whitespace-pre-wrap italic">{order.content}</td>
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
