import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QuickPhrase } from '../types';
import { insertTextAtCursor } from '../utils/textInsertion';

interface QuickPhrasePanelProps {
  phrases: QuickPhrase[];
  onAdd: (text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, text: string) => Promise<void>;
  onReorder: (reorderedPhrases: QuickPhrase[]) => Promise<void>;
}

export const QuickPhrasePanel: React.FC<QuickPhrasePanelProps> = ({
  phrases,
  onAdd,
  onDelete,
  onUpdate,
  onReorder
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newPhraseText, setNewPhraseText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [position, setPosition] = useState<{ left: number; bottom: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPhraseId, setDraggedPhraseId] = useState<string | null>(null);
  const [dragOverPhraseId, setDragOverPhraseId] = useState<string | null>(null);
  const dragStartRef = useRef<{
    x: number; y: number; left: number; bottom: number; width: number; height: number;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const lastActiveElementRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // 跟踪最后活动的 textarea/input（忽略面板自身的新增/编辑输入框）
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        lastActiveElementRef.current = target as HTMLTextAreaElement | HTMLInputElement;
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // 拖动面板（只在拖动手柄或空白处时生效）
  const handlePanelMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // 点击在按钮、输入框或可拖动元素上时，不拖动面板
    const target = e.target as HTMLElement;
    if (target.closest('button, input') || target.closest('[draggable="true"]')) return;

    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;

    e.preventDefault();

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: position?.left ?? 24,
      bottom: position?.bottom ?? 100,
      width: rect.width,
      height: rect.height
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;

      const { x, y, left, bottom, width, height } = dragStartRef.current;
      const newLeft = Math.max(0, Math.min(window.innerWidth - width, left + e.clientX - x));
      const newBottom = Math.max(0, Math.min(window.innerHeight - height, bottom + y - e.clientY));

      const newPosition = { left: newLeft, bottom: newBottom };
      setPosition(newPosition);
      localStorage.setItem('quick-phrase-position', JSON.stringify(newPosition));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const saved = localStorage.getItem('quick-phrase-position');
    if (!saved) return;
    try {
      setPosition(JSON.parse(saved));
    } catch {
      localStorage.removeItem('quick-phrase-position');
    }
  }, []);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const handleInsertPhrase = (text: string) => {
    // 优先使用最后记录的活动元素
    let targetElement = lastActiveElementRef.current;

    // 如果没有记录，尝试获取当前焦点元素
    if (!targetElement || !document.body.contains(targetElement)) {
      const activeElement = document.activeElement as HTMLTextAreaElement | HTMLInputElement | null;
      if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
        targetElement = activeElement;
      }
    }

    // 如果还是没有，尝试查找主输入框
    if (!targetElement) {
      targetElement = document.getElementById('input-textarea') as HTMLTextAreaElement;
    }

    if (targetElement) {
      insertTextAtCursor(targetElement, text);
    }
  };

  const handleAddPhrase = async () => {
    if (!newPhraseText.trim()) return;

    try {
      await onAdd(newPhraseText.trim());
      setNewPhraseText('');
      setIsAdding(false);
    } catch (err) {
      alert('添加失败，请重试');
    }
  };

  const handleUpdatePhrase = async (id: string) => {
    if (!editingText.trim()) return;

    try {
      await onUpdate(id, editingText.trim());
      setEditingId(null);
      setEditingText('');
    } catch (err) {
      alert('更新失败，请重试');
    }
  };

  const handleDeletePhrase = async (id: string) => {
    if (!window.confirm('确定要删除这个常用词吗？')) return;

    try {
      await onDelete(id);
    } catch (err) {
      alert('删除失败，请重试');
    }
  };

  // 拖拽排序处理
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedPhraseId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox 需要 setData 才会开始拖拽；用自定义类型避免被拖进 textarea 时插入文本
    e.dataTransfer.setData('application/x-quick-phrase', id);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedPhraseId(null);
    setDragOverPhraseId(null);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedPhraseId && draggedPhraseId !== id) {
      setDragOverPhraseId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverPhraseId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedPhraseId || draggedPhraseId === targetId) {
      setDragOverPhraseId(null);
      return;
    }

    const draggedIndex = phrases.findIndex(p => p.id === draggedPhraseId);
    const targetIndex = phrases.findIndex(p => p.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDragOverPhraseId(null);
      return;
    }

    // 重新排序
    const newPhrases = [...phrases];
    const [draggedPhrase] = newPhrases.splice(draggedIndex, 1);
    newPhrases.splice(targetIndex, 0, draggedPhrase);

    // 更新 order 字段
    const reorderedPhrases = newPhrases.map((phrase, index) => ({
      ...phrase,
      order: index
    }));

    try {
      await onReorder(reorderedPhrases);
    } catch (err: any) {
      alert(`排序失败：${err?.message || '请重试'}`);
    }

    setDragOverPhraseId(null);
  };

  const userPhrasesCount = phrases.filter(p => !p.isSystem).length;

  return (
    <>
      {/* 收起状态的容器 */}
      {!isExpanded && (
        <div className="fixed left-4 bottom-24 z-50">
          <AnimatePresence mode="wait">
            <motion.button
              key="collapsed"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm border-2 border-stone-200 rounded-xl shadow-lg hover:shadow-xl hover:border-stone-300 transition-all group"
              title="展开常用词"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-stone-600 group-hover:text-stone-900 transition-colors"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span className="text-xs font-bold text-stone-500 group-hover:text-stone-700 transition-colors">
                ({phrases.length})
              </span>
            </motion.button>
          </AnimatePresence>
        </div>
      )}

      {/* 展开状态的容器 - 独立的 fixed 定位 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            ref={panelRef}
            key="expanded"
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            style={{
              position: 'fixed',
              left: position?.left ?? 24,
              bottom: position?.bottom ?? 100,
              cursor: isDragging ? 'grabbing' : 'default',
              zIndex: 50
            }}
            onMouseDown={handlePanelMouseDown}
            className="flex items-center gap-2 pl-1 pr-2 py-2 bg-white/95 backdrop-blur-sm border-2 border-stone-200 rounded-2xl shadow-2xl max-w-[600px]"
          >
            {/* 拖动手柄 */}
            <div
              className="self-stretch flex items-center px-0.5 shrink-0 cursor-grab active:cursor-grabbing hover:bg-stone-100 rounded-lg transition-colors"
              title="拖动调整位置"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-stone-400"
              >
                <circle cx="9" cy="5" r="1"></circle>
                <circle cx="9" cy="12" r="1"></circle>
                <circle cx="9" cy="19" r="1"></circle>
                <circle cx="15" cy="5" r="1"></circle>
                <circle cx="15" cy="12" r="1"></circle>
                <circle cx="15" cy="19" r="1"></circle>
              </svg>
            </div>

            <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
              {/* 系统预设词 */}
              {phrases.filter(p => p.isSystem).map(phrase => (
                <button
                  key={phrase.id}
                  onMouseDown={(e) => {
                    e.preventDefault(); // 防止按钮获取焦点
                    handleInsertPhrase(phrase.text);
                  }}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-all border border-stone-200 hover:border-stone-300 active:scale-95"
                  title="点击插入"
                >
                  {phrase.text}
                </button>
              ))}

              {/* 分隔线 */}
              {userPhrasesCount > 0 && (
                <div className="w-px h-6 bg-stone-300"></div>
              )}

              {/* 用户自定义词 - 支持拖拽排序 */}
              {phrases.filter(p => !p.isSystem).map(phrase => (
                editingId === phrase.id ? (
                  <div key={phrase.id} className="flex items-center gap-1">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdatePhrase(phrase.id);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditingText('');
                        }
                      }}
                      onBlur={() => handleUpdatePhrase(phrase.id)}
                      className="px-2 py-1 w-24 bg-white border-2 border-blue-400 rounded-lg text-xs font-bold outline-none"
                      maxLength={50}
                    />
                  </div>
                ) : (
                  <div
                    key={phrase.id}
                    className="group relative flex items-center"
                    draggable
                    onDragStart={(e) => handleDragStart(e, phrase.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, phrase.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, phrase.id)}
                  >
                    <button
                      onMouseDown={(e) => {
                        // 不阻止默认行为，让拖拽能够开始
                        if (e.detail === 1) {
                          // 单击时插入（但要在拖拽结束后确认不是拖拽操作）
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const mouseUpHandler = (upEvent: MouseEvent) => {
                            const dx = Math.abs(upEvent.clientX - startX);
                            const dy = Math.abs(upEvent.clientY - startY);
                            // 移动距离小于5px才算点击，否则是拖拽
                            if (dx < 5 && dy < 5) {
                              handleInsertPhrase(phrase.text);
                            }
                            document.removeEventListener('mouseup', mouseUpHandler);
                          };
                          document.addEventListener('mouseup', mouseUpHandler);
                        }
                      }}
                      onDoubleClick={() => {
                        setEditingId(phrase.id);
                        setEditingText(phrase.text);
                      }}
                      className={`px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all border border-blue-200 hover:border-blue-300 active:scale-95 ${
                        dragOverPhraseId === phrase.id ? 'ring-2 ring-blue-400' : ''
                      }`}
                      title="点击插入 | 双击编辑 | 拖动排序"
                    >
                      {phrase.text}
                    </button>
                    <button
                      onClick={() => handleDeletePhrase(phrase.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="删除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                )
              ))}

              {/* 新增输入框或按钮 */}
              {isAdding ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={addInputRef}
                    type="text"
                    value={newPhraseText}
                    onChange={(e) => setNewPhraseText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddPhrase();
                      } else if (e.key === 'Escape') {
                        setIsAdding(false);
                        setNewPhraseText('');
                      }
                    }}
                    onBlur={() => {
                      if (!newPhraseText.trim()) {
                        setIsAdding(false);
                      } else {
                        handleAddPhrase();
                      }
                    }}
                    className="px-2 py-1 w-24 bg-white border-2 border-emerald-400 rounded-lg text-xs font-bold outline-none"
                    placeholder="输入..."
                    maxLength={50}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-8 h-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg border-2 border-dashed border-emerald-300 hover:border-emerald-400 transition-all active:scale-95"
                  title="新增常用词"
                  disabled={userPhrasesCount >= 20}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              )}
            </div>

            {/* 收起按钮 */}
            <div className="w-px h-6 bg-stone-300 shrink-0"></div>
            <button
              onClick={() => {
                setIsExpanded(false);
                setIsAdding(false);
                setNewPhraseText('');
                setEditingId(null);
                setEditingText('');
                // 收起时清除自定义位置，下次展开回到默认位置
                setPosition(null);
                localStorage.removeItem('quick-phrase-position');
              }}
              className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-all active:scale-95 shrink-0"
              title="收起"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
