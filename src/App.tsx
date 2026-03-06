/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

export default function App() {
  const [currentPage, setCurrentPage] = useState('order');
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(new Set());
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [cumulativeAmounts, setCumulativeAmounts] = useState<Record<number, number>>({});
  
  const [zodiacBetAmounts, setZodiacBetAmounts] = useState<Record<string, number | ''>>({});
  const [zodiacCumulativeAmounts, setZodiacCumulativeAmounts] = useState<Record<string, number>>({});
  
  // Final confirmed orders for the table
  const [confirmedOrders, setConfirmedOrders] = useState<{ content: string; total: number; timestamp: number }[]>([]);
  const [currentTotal, setCurrentTotal] = useState(0);

  // Manual entry state
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [manualTotal, setManualTotal] = useState<number | ''>('');

  // Folding state for past orders
  const [isPastOrdersExpanded, setIsPastOrdersExpanded] = useState(false);

  const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
  const zodiacs = ['马', '蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊'];

  // Persistence: Load from localStorage on mount
  useEffect(() => {
    const savedOrders = localStorage.getItem('confirmedOrders');
    const savedCumulative = localStorage.getItem('cumulativeAmounts');
    const savedZodiacCumulative = localStorage.getItem('zodiacCumulativeAmounts');

    if (savedOrders) setConfirmedOrders(JSON.parse(savedOrders));
    if (savedCumulative) setCumulativeAmounts(JSON.parse(savedCumulative));
    if (savedZodiacCumulative) setZodiacCumulativeAmounts(JSON.parse(savedZodiacCumulative));
  }, []);

  // Persistence: Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('confirmedOrders', JSON.stringify(confirmedOrders));
  }, [confirmedOrders]);

  useEffect(() => {
    localStorage.setItem('cumulativeAmounts', JSON.stringify(cumulativeAmounts));
  }, [cumulativeAmounts]);

  useEffect(() => {
    localStorage.setItem('zodiacCumulativeAmounts', JSON.stringify(zodiacCumulativeAmounts));
  }, [zodiacCumulativeAmounts]);

  // Helper to get Beijing Date String (YYYY-MM-DD)
  const getBeijingDateString = (timestamp: number) => {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(timestamp)).replace(/\//g, '-');
  };

  const todayBeijing = getBeijingDateString(Date.now());

  // Split orders into Today and Past
  const todayOrders = confirmedOrders.filter(o => getBeijingDateString(o.timestamp) === todayBeijing);
  const pastOrders = confirmedOrders.filter(o => getBeijingDateString(o.timestamp) !== todayBeijing);

  // Parsing logic for textarea input
  useEffect(() => {
    const parseInput = () => {
      // Pattern: numbers separated by commas/Chinese commas, followed by "各", then the amount
      // Example: 20，18，38各20
      const regex = /(\d+(?:[，,]\d+)*)各(\d+)/g;
      let match;
      const newSelected = new Set(selectedNumbers);
      let lastAmount: number | '' = amount;

      while ((match = regex.exec(inputText)) !== null) {
        const numsStr = match[1];
        const amtStr = match[2];
        
        const parsedNums = numsStr.split(/[，,]/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 49);
        const parsedAmt = parseInt(amtStr);

        if (parsedNums.length > 0) {
          parsedNums.forEach(n => newSelected.add(n));
        }
        if (!isNaN(parsedAmt)) {
          lastAmount = parsedAmt;
        }
      }

      if (newSelected.size !== selectedNumbers.size) {
        setSelectedNumbers(newSelected);
      }
      if (lastAmount !== amount) {
        setAmount(lastAmount);
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
  };

  const clearAllSelections = () => {
    setSelectedNumbers(new Set());
  };

  // Merged confirm function
  const handleConfirm = () => {
    let newEntries: string[] = [];
    const newCumulative = { ...cumulativeAmounts };
    const newZodiacCumulative = { ...zodiacCumulativeAmounts };
    const newZodiacBetAmounts = { ...zodiacBetAmounts };
    let hasAction = false;

    // 1. Handle selected numbers
    if (selectedNumbers.size > 0 && amount !== '') {
      if (amount < 0) {
        alert('金额不能为负数');
        return;
      }
      const sortedNums = Array.from(selectedNumbers).sort((a: number, b: number) => a - b);
      newEntries.push(`${sortedNums.join('，')}各号下单${amount}元`);
      
      selectedNumbers.forEach(num => {
        newCumulative[num] = (newCumulative[num] || 0) + (amount as number);
      });
      hasAction = true;
    }

    // 2. Handle zodiac bets
    let hasNegativeZodiac = false;
    let addedZodiacTotal = 0;
    zodiacs.forEach(z => {
      const val = zodiacBetAmounts[z];
      if (val !== undefined && val !== '') {
        if (val < 0) {
          hasNegativeZodiac = true;
          return;
        }
        newEntries.push(`平肖${z}下单${val}元`);
        newZodiacCumulative[z] = (newZodiacCumulative[z] || 0) + (val as number);
        newZodiacBetAmounts[z] = '';
        addedZodiacTotal += (val as number);
      }
    });

    if (hasNegativeZodiac) {
      alert('生肖金额不能为负数');
      return;
    }

    if (newEntries.length > 0) {
      const addedNumberTotal = (selectedNumbers.size > 0 && amount !== '') ? (selectedNumbers.size * (amount as number)) : 0;
      setCurrentTotal(prev => prev + addedNumberTotal + addedZodiacTotal);
      
      setOutputText(prev => prev ? `${prev}\n${newEntries.join('\n')}` : newEntries.join('\n'));
      setCumulativeAmounts(newCumulative);
      setZodiacCumulativeAmounts(newZodiacCumulative);
      setZodiacBetAmounts(newZodiacBetAmounts);
      setSelectedNumbers(new Set());
      setAmount('');
      hasAction = true;
    }

    if (!hasAction) {
      alert('请先选择数字或生肖并输入金额');
    }
  };

  // Final submit to table
  const handleFinalSubmit = () => {
    if (!outputText.trim()) {
      alert('输出框中没有内容可以提交');
      return;
    }
    
    // Submit the entire outputText as a single "batch"
    setConfirmedOrders(prev => [...prev, { content: outputText, total: currentTotal, timestamp: Date.now() }]);
    setOutputText('');
    setCurrentTotal(0);
    // Removed alert as requested
  };

  const handleExportExcel = () => {
    if (confirmedOrders.length === 0) {
      alert('没有订单可以导出');
      return;
    }

    // Prepare data with specific column order: Content, Index, Total
    const data = confirmedOrders.map((order, index) => ({
      '订单内容': order.content,
      '序号': index + 1,
      '总金额': order.total
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Add summary after 3 empty rows
    const totalSum = confirmedOrders.reduce((sum, order) => sum + order.total, 0);
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
    XLSX.utils.book_append_sheet(wb, ws, 'Confirmed Orders');
    XLSX.writeFile(wb, 'confirmed_orders.xlsx');
  };

  const handleAddManualOrder = () => {
    if (!manualContent.trim() || manualTotal === '') {
      alert('请填写订单内容和金额');
      return;
    }
    setConfirmedOrders(prev => [...prev, { content: manualContent, total: Number(manualTotal), timestamp: Date.now() }]);
    setManualContent('');
    setManualTotal('');
    setIsAddingManual(false);
  };

  const deleteOrder = (index: number) => {
    const newOrders = [...confirmedOrders];
    newOrders.splice(index, 1);
    setConfirmedOrders(newOrders);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex">
      {/* 1. Sidebar (Left Section) */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col shrink-0">
        <div className="p-6 border-bottom border-stone-100">
          <h2 className="text-xl font-bold text-stone-800 tracking-tight">系统管理</h2>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          <button 
            onClick={() => setCurrentPage('order')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${currentPage === 'order' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            下单页
          </button>
          <button 
            onClick={() => setCurrentPage('confirm')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${currentPage === 'confirm' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            订单确认页
            {confirmedOrders.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{confirmedOrders.length}</span>
            )}
          </button>
        </nav>
        <div className="p-6 border-t border-stone-100 text-stone-400 text-[10px] text-center">
          © 2026 数字订单系统
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-grow flex p-8 gap-8 overflow-auto">
        {currentPage === 'order' ? (
          <>
            {/* 2. Middle Section (Number Grid + Input + Output) */}
            <div className="flex-grow flex flex-col gap-8 min-w-[800px]">
              <div className="space-y-6">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <div className="mb-6 text-center">
                    <h1 className="text-2xl font-light tracking-tight text-stone-800">数字下单区</h1>
                  </div>
                  
                  <div className="grid grid-cols-12 gap-2 mb-4">
                    {zodiacs.map((zodiac, idx) => (
                      <motion.button
                        key={zodiac}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => selectZodiacColumn(idx)}
                        className="h-10 w-full flex items-center justify-center rounded-lg text-sm font-bold bg-stone-50 text-stone-500 hover:bg-stone-100 border border-stone-100 transition-colors"
                      >
                        {zodiac}
                      </motion.button>
                    ))}
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    {numbers.map((num) => (
                      <motion.button
                        key={num}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleNumber(num)}
                        id={`btn-num-${num}`}
                        className={`
                          h-12 w-full flex flex-col items-center justify-center rounded-lg transition-colors
                          ${selectedNumbers.has(num) 
                            ? 'bg-stone-800 text-white shadow-md' 
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}
                        `}
                      >
                        <span className="text-sm font-medium leading-tight">{num}</span>
                        <span className={`text-[9px] mt-0.5 leading-none ${selectedNumbers.has(num) ? 'text-stone-300' : 'text-stone-400'}`}>
                          {cumulativeAmounts[num] || 0}
                        </span>
                      </motion.button>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-xs text-stone-400 uppercase tracking-widest">
                      <span>12列布局 (1-49) · 已选: {selectedNumbers.size}</span>
                    </div>
                    <button
                      onClick={clearAllSelections}
                      className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      清除所有选择
                    </button>
                  </div>
                </section>

                <section className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="flex-grow w-full relative">
                    <textarea
                      id="input-textarea"
                      placeholder="输入备注或格式如 '20，18，38各20'..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full h-32 p-4 bg-white border border-stone-200 rounded-xl shadow-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition-all resize-none text-stone-700"
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
                  </div>
                  
                  <div className="flex flex-row md:flex-col gap-3 w-full md:w-48">
                    <div className="relative flex-grow md:w-full">
                      <input
                        id="amount-input"
                        type="number"
                        min="0"
                        placeholder="输入金额"
                        value={amount}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          if (val === '' || val >= 0) setAmount(val);
                        }}
                        className="w-full p-3 pr-8 bg-white border border-stone-200 rounded-xl shadow-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition-all text-stone-700"
                      />
                      {amount !== '' && (
                        <button 
                          onClick={() => setAmount('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                        </button>
                      )}
                    </div>
                    <button
                      id="confirm-button"
                      onClick={handleConfirm}
                      className="px-6 py-3 bg-stone-800 text-white rounded-xl shadow-md hover:bg-stone-900 active:scale-95 transition-all font-medium whitespace-nowrap"
                    >
                      确认
                    </button>
                  </div>
                </section>
              </div>

              <section className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-grow w-full">
                  <textarea
                    id="output-textarea"
                    readOnly
                    placeholder="生成的订单内容将显示在这里..."
                    value={outputText}
                    className="w-full h-32 p-4 bg-stone-100 border border-stone-200 rounded-xl shadow-inner outline-none transition-all resize-none text-stone-600 font-mono text-sm"
                  />
                </div>
                
                <div className="w-full md:w-48">
                  <button
                    onClick={handleFinalSubmit}
                    className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700 active:scale-95 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    确认下单
                  </button>
                </div>
              </section>
            </div>

            {/* 3. Right Section (Zodiac Betting Panel) */}
            <section className="w-96 bg-white p-6 rounded-2xl shadow-sm border border-stone-200 shrink-0 flex flex-col h-fit">
              <div className="mb-4 flex items-center justify-center gap-2">
                <div className="h-px bg-stone-100 flex-grow"></div>
                <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">平肖下单区</h2>
                <div className="h-px bg-stone-100 flex-grow"></div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 flex-grow content-start">
                {zodiacs.map(z => (
                  <div key={z} className="group flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 flex items-center justify-center bg-stone-50 rounded-xl font-bold text-stone-600 border border-stone-100 group-hover:border-stone-300 transition-colors shrink-0">
                        {z}
                      </span>
                      <div className="relative flex-grow">
                        <input
                          type="number"
                          min="0"
                          placeholder="金额"
                          value={zodiacBetAmounts[z] || ''}
                          onKeyDown={handleKeyDown}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            if (val === '' || val >= 0) {
                              setZodiacBetAmounts(prev => ({ ...prev, [z]: val }));
                            }
                          }}
                          className="w-full p-2.5 pr-8 bg-stone-50 border border-stone-100 rounded-xl text-sm focus:ring-2 focus:ring-stone-200 focus:bg-white outline-none transition-all"
                        />
                        {zodiacBetAmounts[z] !== undefined && zodiacBetAmounts[z] !== '' && (
                          <button 
                            onClick={() => setZodiacBetAmounts(prev => ({ ...prev, [z]: '' }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] text-stone-400">累计:</span>
                      <span className="text-[10px] font-bold text-stone-600">
                        {zodiacCumulativeAmounts[z] || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center text-[10px] text-stone-400 italic">
                输入金额后按回车或点击左侧确认
              </div>
            </section>
          </>
        ) : (
          /* Order Confirmation Page */
          <div className="flex-grow flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-stone-800">订单确认</h1>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end mr-4">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest">下单总金额</span>
                  <span className="text-xl font-bold text-emerald-600">
                    ¥ {confirmedOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
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
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">订单内容</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest w-32">总金额</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest w-32 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {isAddingManual && (
                    <tr className="bg-stone-50/50">
                      <td className="px-6 py-4 text-sm font-mono text-stone-400 italic">
                        {confirmedOrders.length + 1}
                      </td>
                      <td className="px-6 py-4">
                        <textarea
                          placeholder="输入订单内容..."
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
                          onClick={handleAddManualOrder}
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
                  
                  {/* Today's Orders */}
                  {todayOrders.length === 0 && !isAddingManual && pastOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-stone-400 italic">暂无已确认订单</td>
                    </tr>
                  ) : (
                    [...todayOrders].reverse().map((order) => {
                      const originalIdx = confirmedOrders.indexOf(order);
                      return (
                        <tr key={originalIdx} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-stone-400">{originalIdx + 1}</td>
                          <td className="px-6 py-4 text-sm text-stone-700 whitespace-pre-wrap">{order.content}</td>
                          <td className="px-6 py-4 text-sm font-bold text-emerald-600">¥ {order.total.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => deleteOrder(originalIdx)}
                              className="text-red-400 hover:text-red-600 transition-colors p-1"
                              title="删除订单"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Past Orders Section */}
                  {pastOrders.length > 0 && (
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
                            过往订单 ({pastOrders.length})
                          </div>
                        </td>
                      </tr>
                      {isPastOrdersExpanded && [...pastOrders].reverse().map((order) => {
                        const originalIdx = confirmedOrders.indexOf(order);
                        return (
                          <tr key={originalIdx} className="bg-stone-50/30 hover:bg-stone-50 transition-colors opacity-75">
                            <td className="px-6 py-4 text-sm font-mono text-stone-400">{originalIdx + 1}</td>
                            <td className="px-6 py-4 text-sm text-stone-500 whitespace-pre-wrap italic">{order.content}</td>
                            <td className="px-6 py-4 text-sm font-bold text-stone-400">¥ {order.total.toLocaleString()}</td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => deleteOrder(originalIdx)}
                                className="text-stone-300 hover:text-red-400 transition-colors p-1"
                                title="删除订单"
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
