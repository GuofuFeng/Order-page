/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TextReplacement } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface TextReplacementPanelProps {
  replacements: TextReplacement[];
  onAdd: (fromText: string, toText: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<TextReplacement>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

interface Conflict {
  type: 'chain' | 'circular' | 'overlap';
  severity: 'warning' | 'error';
  message: string;
  relatedRules: {
    id: string;
    fromText: string;
    toText: string;
  }[];
}

export const TextReplacementPanel: React.FC<TextReplacementPanelProps> = ({
  replacements,
  onAdd,
  onUpdate,
  onDelete,
  onClose
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newFromText, setNewFromText] = useState('');
  const [newToText, setNewToText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFromText, setEditFromText] = useState('');
  const [editToText, setEditToText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [previewText, setPreviewText] = useState('');
  const [previewResult, setPreviewResult] = useState<{ result: string; appliedRules: any[] } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleAdd = async () => {
    if (!newFromText.trim() || !newToText.trim()) {
      setError('原文字和替换词不能为空');
      return;
    }

    setLoading(true);
    setError('');
    setConflicts([]);

    try {
      await onAdd(newFromText.trim(), newToText.trim());
      // 立即清空输入和关闭表单
      setNewFromText('');
      setNewToText('');
      setIsAdding(false);
    } catch (err: any) {
      // 检查返回的冲突信息
      if (err.conflicts && err.conflicts.length > 0) {
        setConflicts(err.conflicts);
      }
      setError(err.message || '添加失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editFromText.trim() || !editToText.trim()) {
      setError('原文字和替换词不能为空');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onUpdate(id, {
        fromText: editFromText.trim(),
        toText: editToText.trim()
      });
      setEditingId(null);
      setEditFromText('');
      setEditToText('');
    } catch (err: any) {
      setError(err.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (id: string, currentEnabled: boolean) => {
    setLoading(true);
    try {
      await onUpdate(id, { enabled: !currentEnabled });
    } catch (err: any) {
      setError(err.message || '切换状态失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条替换规则吗？')) return;

    setLoading(true);
    setError('');

    try {
      await onDelete(id);
    } catch (err: any) {
      setError(err.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!previewText.trim()) {
      setError('请输入预览文本');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/text-replacements/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: previewText })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '预览失败');
      }

      const data = await res.json();
      setPreviewResult(data);
    } catch (err: any) {
      setError(err.message || '预览替换失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-gradient-to-r from-stone-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-950">文字替换设置</h2>
              <p className="text-xs text-stone-400">在解析注单时自动替换错别字</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-50 border-b border-red-100 px-6 py-3 flex items-center gap-2 text-red-600 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conflict Warnings */}
        <AnimatePresence>
          {conflicts.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-orange-100 bg-orange-50 px-6 py-3"
            >
              <div className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600 shrink-0 mt-0.5">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div className="flex-grow">
                  <p className="text-sm font-bold text-orange-900 mb-1">检测到 {conflicts.length} 个潜在冲突</p>
                  <div className="space-y-1">
                    {conflicts.map((conflict, idx) => (
                      <div key={idx} className="text-xs text-orange-800">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-1 ${
                          conflict.severity === 'error' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                        }`}>
                          {conflict.type === 'chain' ? '链式' : conflict.type === 'circular' ? '循环' : '重叠'}
                        </span>
                        {conflict.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6">
          {/* Tab Switcher */}
          <div className="flex gap-2 mb-4 bg-stone-100 p-1 rounded-lg">
            <button
              onClick={() => setShowPreview(false)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                !showPreview
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              规则管理
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                showPreview
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              预览测试
            </button>
          </div>

          {!showPreview ? (
            <>
              {/* Add New Button */}
              {!isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  disabled={loading}
                  className="w-full mb-4 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14"/>
                    <path d="M5 12h14"/>
                  </svg>
                  添加新替换规则
                </button>
              )}

          {/* Add Form */}
          <AnimatePresence mode="wait">
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-100"
              >
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">原文字</label>
                    <input
                      type="text"
                      value={newFromText}
                      onChange={(e) => setNewFromText(e.target.value)}
                      placeholder="例如：托"
                      maxLength={20}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">替换词</label>
                    <input
                      type="text"
                      value={newToText}
                      onChange={(e) => setNewToText(e.target.value)}
                      placeholder="例如：拖"
                      maxLength={20}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setNewFromText('');
                      setNewToText('');
                      setError('');
                    }}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    取消
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replacements List */}
          <div className="space-y-2">
            {replacements.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-30">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
                <p className="text-sm font-medium">暂无替换规则</p>
                <p className="text-xs mt-1">点击上方按钮添加新规则</p>
              </div>
            ) : (
              replacements.map((replacement) => {
                const isEditing = editingId === replacement.id;

                return (
                  <motion.div
                    key={replacement.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-xl border transition-all ${
                      replacement.enabled
                        ? 'bg-white border-stone-200 hover:border-stone-300'
                        : 'bg-stone-50 border-stone-100 opacity-60'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-stone-600 mb-1">原文字</label>
                            <input
                              type="text"
                              value={editFromText}
                              onChange={(e) => setEditFromText(e.target.value)}
                              maxLength={20}
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-stone-600 mb-1">替换词</label>
                            <input
                              type="text"
                              value={editToText}
                              onChange={(e) => setEditToText(e.target.value)}
                              maxLength={20}
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(replacement.id)}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditFromText('');
                              setEditToText('');
                              setError('');
                            }}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-grow">
                          <button
                            onClick={() => handleToggleEnabled(replacement.id, replacement.enabled)}
                            disabled={loading}
                            className={`w-10 h-6 rounded-full transition-all relative ${
                              replacement.enabled ? 'bg-purple-500' : 'bg-stone-300'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <div
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                                replacement.enabled ? 'left-5' : 'left-1'
                              }`}
                            />
                          </button>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-bold text-stone-700 px-2 py-1 bg-stone-100 rounded">
                              {replacement.fromText}
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
                              <path d="M5 12h14"/>
                              <path d="m12 5 7 7-7 7"/>
                            </svg>
                            <span className="font-bold text-purple-600 px-2 py-1 bg-purple-50 rounded">
                              {replacement.toText}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingId(replacement.id);
                              setEditFromText(replacement.fromText);
                              setEditToText(replacement.toText);
                              setError('');
                            }}
                            disabled={loading}
                            className="p-2 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="编辑"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9"/>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(replacement.id)}
                            disabled={loading}
                            className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="删除"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"/>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
          </>
          ) : (
            /* Preview Section */
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-100">
                <label className="block text-sm font-bold text-stone-700 mb-2">输入测试文本</label>
                <textarea
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="例如：01 02托03名5"
                  className="w-full p-3 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none h-24"
                />
                <button
                  onClick={handlePreview}
                  disabled={loading || !previewText.trim()}
                  className="mt-3 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  预览替换效果
                </button>
              </div>

              {previewResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm"
                >
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase mb-1">原文</label>
                      <div className="p-3 bg-stone-50 rounded-lg text-sm font-mono text-stone-700 border border-stone-100">
                        {previewText}
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                        <path d="M12 5v14"/>
                        <path d="m19 12-7 7-7-7"/>
                      </svg>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-purple-600 uppercase mb-1">替换后</label>
                      <div className="p-3 bg-purple-50 rounded-lg text-sm font-mono text-purple-900 border border-purple-200 font-bold">
                        {previewResult.result}
                      </div>
                    </div>

                    {previewResult.appliedRules.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-emerald-600 uppercase mb-2">应用的规则 ({previewResult.appliedRules.length})</label>
                        <div className="space-y-1">
                          {previewResult.appliedRules.map((rule, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs bg-emerald-50 px-2 py-1.5 rounded border border-emerald-100">
                              <span className="text-emerald-900 font-medium">{rule.fromText}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                                <path d="M5 12h14"/>
                                <path d="m12 5 7 7-7 7"/>
                              </svg>
                              <span className="text-emerald-700 font-bold">{rule.toText}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {previewResult.appliedRules.length === 0 && (
                      <div className="text-center py-3 text-stone-400 text-sm italic">
                        未应用任何替换规则
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 text-xs text-stone-500">
          <div className="flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            <div className="space-y-1">
              <p>• 替换规则会在下单页和批量导入页的文本解析时自动生效</p>
              <p>• 最多可添加 50 条替换规则，禁用的规则不会生效</p>
              <p>• 替换顺序按添加时间先后执行，请注意规则之间可能的冲突</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
