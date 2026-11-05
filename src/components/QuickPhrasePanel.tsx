import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QuickPhrase } from '../types';

interface QuickPhrasePanelProps {
  phrases: QuickPhrase[];
  onAdd: (text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, text: string) => Promise<void>;
  onReorder: (reordered: QuickPhrase[]) => Promise<void>;
}

export const QuickPhrasePanel: React.FC<QuickPhrasePanelProps> = ({
  phrases,
  onAdd,
  onDelete,
  onUpdate,
  onReorder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Load saved panel position
  useEffect(() => {
    try {
      const saved = localStorage.getItem('quick-phrase-position');
      if (saved) setPosition(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const savePosition = (pos: { x: number; y: number }) => {
    try {
      localStorage.setItem('quick-phrase-position', JSON.stringify(pos));
    } catch { /* ignore */ }
  };

  const handlePanelMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea')) return;
    setIsDraggingPanel(true);
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  };

  useEffect(() => {
    if (!isDraggingPanel) return;
    const onMove = (e: MouseEvent) => {
      const newPos = {
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      };
      setPosition(newPos);
      savePosition(newPos);
    };
    const onUp = () => setIsDraggingPanel(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingPanel]);

  const handleAdd = async () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      await onAdd(trimmed);
      setNewText('');
    } catch (err: any) {
      setError(err.message || '添加失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
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

  const handleStartEdit = (phrase: QuickPhrase) => {
    setEditingId(phrase.id);
    setEditingText(phrase.text);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editingText.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      await onUpdate(editingId, trimmed);
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  // Drag-to-reorder
  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const userPhrases = phrases.filter(p => !p.isSystem);
    const from = userPhrases.findIndex(p => p.id === draggedId);
    const to = userPhrases.findIndex(p => p.id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...userPhrases];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const systemPhrases = phrases.filter(p => p.isSystem);
    onReorder([...systemPhrases, ...reordered]).catch(() => {});
  };
  const handleDragEnd = () => setDraggedId(null);

  const systemPhrases = phrases.filter(p => p.isSystem);
  const userPhrases = phrases.filter(p => !p.isSystem);

  const panelStyle: React.CSSProperties = position
    ? { position: 'fixed', left: position.x, top: position.y, zIndex: 9999 }
    : { position: 'fixed', bottom: '80px', right: '16px', zIndex: 9999 };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-4 right-4 z-[9998] w-12 h-12 rounded-full bg-amber-500 text-white shadow-lg flex items-center justify-center hover:bg-amber-600 active:scale-95 transition-all"
        title="常用词"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          style={panelStyle}
          className="w-80 bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden select-none"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100 cursor-move"
            onMouseDown={handlePanelMouseDown}
          >
            <span className="font-bold text-amber-800 text-sm">常用词</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-amber-400 hover:text-amber-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-2 bg-red-50 text-red-600 text-xs border-b border-red-100">
              {error}
            </div>
          )}

          {/* Phrase list */}
          <div className="flex-1 overflow-y-auto max-h-72 p-2 flex flex-col gap-1">
            {systemPhrases.map(phrase => (
              <div
                key={phrase.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 border border-stone-100 group"
              >
                <span className="flex-1 text-xs text-stone-600 truncate">{phrase.text}</span>
                <span className="text-[10px] text-stone-300 shrink-0">系统</span>
              </div>
            ))}

            {userPhrases.map(phrase => (
              <div
                key={phrase.id}
                draggable
                onDragStart={() => handleDragStart(phrase.id)}
                onDragOver={e => handleDragOver(e, phrase.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border group transition-all cursor-grab active:cursor-grabbing ${
                  draggedId === phrase.id
                    ? 'opacity-50 border-amber-300 bg-amber-50'
                    : 'bg-white border-stone-100 hover:border-stone-200'
                }`}
              >
                {editingId === phrase.id ? (
                  <>
                    <input
                      autoFocus
                      className="flex-1 text-xs border border-amber-300 rounded px-1 py-0.5 outline-none"
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <button onClick={handleSaveEdit} className="text-emerald-500 hover:text-emerald-700 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-stone-400 hover:text-stone-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-xs text-stone-700 truncate">{phrase.text}</span>
                    <button
                      onClick={() => handleStartEdit(phrase)}
                      className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-amber-500 transition-all shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(phrase.id)}
                      className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </>
                )}
              </div>
            ))}

            {phrases.length === 0 && (
              <div className="text-center text-stone-300 text-xs py-6">
                还没有常用词，在下方输入添加
              </div>
            )}
          </div>

          {/* Add new phrase */}
          <div className="p-3 border-t border-stone-100">
            <div className="flex gap-2">
              <input
                className="flex-1 text-xs border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                placeholder="输入新常用词..."
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                maxLength={100}
                disabled={loading}
              />
              <button
                onClick={handleAdd}
                disabled={!newText.trim() || loading}
                className="px-3 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-amber-600 transition-colors shrink-0"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
