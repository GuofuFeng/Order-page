import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, ArrowUpRight, ArrowDownRight, Edit2, Calendar, ShieldCheck, X, ToggleLeft, ToggleRight } from 'lucide-react';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  points: number;
  monthly_card_expires_at: string | null;
  status: 'active' | 'frozen';
  created_at?: string;
}

interface PointHistoryLog {
  id: number;
  userId: number;
  username: string;
  action: string;
  pointsChanged: number;
  currentPoints: number;
  description: string;
  createdAt: string;
}

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<PointHistoryLog[]>([]);
  const [isRegisterEnabled, setIsRegisterEnabled] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pointsChange, setPointsChange] = useState<number>(0);
  const [pointsReason, setPointsReason] = useState('');
  const [submittingPoints, setSubmittingPoints] = useState(false);
  
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch Users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        const err = await res.json();
        showMsg(err.error || '获取用户列表失败', 'error');
      }
    } catch (err) {
      showMsg('网络请求失败', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Fetch logs error:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Fetch Registration setting
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setIsRegisterEnabled(data.registration_enabled);
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
    fetchSettings();
  }, []);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage(null);
    }, 4000);
  };

  // Toggle Self-Registration
  const handleToggleRegister = async () => {
    const nextState = !isRegisterEnabled;
    try {
      const res = await fetch('/api/admin/settings/toggle-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
      const data = await res.json();
      if (res.ok) {
        setIsRegisterEnabled(data.registration_enabled);
        showMsg(data.message || '系统设置已更新', 'success');
        fetchLogs();
      } else {
        showMsg(data.error || '操作失败', 'error');
      }
    } catch (err) {
      showMsg('网络请求失败', 'error');
    }
  };

  // Adjust User Points
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (pointsChange === 0) {
      showMsg('积分变化值不能为0', 'error');
      return;
    }

    setSubmittingPoints(true);
    try {
      const res = await fetch('/api/admin/user/adjust-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: editingUser.id,
          amount: pointsChange,
          reason: pointsReason.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(data.message || '积分更新成功', 'success');
        // Update user inside local array
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, points: data.points } : u));
        setPointsChange(0);
        setPointsReason('');
        setEditingUser(null);
        fetchLogs();
      } else {
        showMsg(data.error || '积分更新失败', 'error');
      }
    } catch (err) {
      showMsg('网络请求失败', 'error');
    } finally {
      setSubmittingPoints(false);
    }
  };

  // Adjust User Monthly Card
  const handleAdjustMonthlyCard = async (days: number) => {
    if (!editingUser) return;
    try {
      const res = await fetch('/api/admin/user/adjust-monthly-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: editingUser.id,
          days
        })
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(data.message || '月卡更新成功', 'success');
        // Update user locally
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, monthly_card_expires_at: data.monthly_card_expires_at } : u));
        
        // Update current editing user state expiry as well so UI refreshes
        setEditingUser(prev => prev ? { ...prev, monthly_card_expires_at: data.monthly_card_expires_at } : null);
        
        fetchLogs();
      } else {
        showMsg(data.error || '月卡更新失败', 'error');
      }
    } catch (err) {
      showMsg('网络请求失败', 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 max-h-[85vh] overflow-y-auto pr-2">
      {/* Messages */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-lg border text-xs font-bold flex items-center gap-2.5 animate-bounce ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
        }`}>
          <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="text-stone-700">{message.text}</span>
        </div>
      )}

      {/* Header bar controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
            <Calendar className="w-5 h-5 text-stone-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-stone-800 tracking-tight">管理后台</h2>
            <p className="text-[11px] text-stone-400 font-bold">查看及配置系统状态、用户账单积分</p>
          </div>
        </div>

        {/* Global toggles */}
        <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between sm:justify-start border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-600">允许自主注册:</span>
            <button 
              onClick={handleToggleRegister} 
              className="text-stone-700 hover:text-stone-800 transition-colors cursor-pointer"
              title={isRegisterEnabled ? '关闭注册通道' : '开启注册通道'}
            >
              {isRegisterEnabled ? (
                <ToggleRight className="w-10 h-10 text-stone-800 fill-stone-800" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-stone-300" />
              )}
            </button>
          </div>

          <button
            onClick={() => {
              fetchUsers();
              fetchLogs();
              fetchSettings();
            }}
            disabled={loadingUsers}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-50 hover:bg-stone-100 active:bg-stone-200 border border-stone-200 rounded-xl text-xs font-black text-stone-600 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* Search and User Grid */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-wider">用户列表 ({filteredUsers.length})</h3>
          
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-inner"
              placeholder="搜索用户名..."
            />
          </div>
        </div>

        {loadingUsers ? (
          <div className="py-12 text-center text-xs font-bold text-stone-400">正在拉取用户数据...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map(u => (
              <div 
                key={u.id} 
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 bg-stone-50/30 ${
                  u.role === 'admin' ? 'border-amber-200 bg-amber-50/5' : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-stone-800">{u.username}</span>
                      {u.role === 'admin' && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded-md">管理员</span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400 font-medium">角色: {u.role === 'admin' ? '管理员' : '普通用户'}</span>
                  </div>
                  
                  <button
                    onClick={() => setEditingUser(u)}
                    className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                    title="修改积分/月卡"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-stone-100 pt-2 font-bold">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-stone-400 font-medium uppercase">剩余积分</span>
                    <span className="text-stone-700 font-mono text-sm">¥ {u.points}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-stone-400 font-medium uppercase">包月状态</span>
                    {u.monthly_card_expires_at ? (
                      <span className="text-emerald-600 font-mono text-xs truncate" title={u.monthly_card_expires_at}>
                        {u.monthly_card_expires_at.split('T')[0]} 到期
                      </span>
                    ) : (
                      <span className="text-stone-400 italic text-xs">未办理</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs font-bold text-stone-400">没有查找到符合条件的账号</div>
            )}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <div>
                <h4 className="text-base font-black text-stone-800">配置用户: {editingUser.username}</h4>
                <p className="text-[10px] text-stone-400 font-bold">修改当前账号的额度或月卡服务</p>
              </div>
              <button 
                onClick={() => {
                  setEditingUser(null);
                  setPointsChange(0);
                  setPointsReason('');
                }}
                className="p-1 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Modify Points */}
            <form onSubmit={handleAdjustPoints} className="space-y-3">
              <h5 className="text-xs font-black text-stone-500 uppercase tracking-wider">手动积分修改</h5>
              
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="例如: +100 或 -50"
                  value={pointsChange || ''}
                  onChange={(e) => setPointsChange(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-1/3 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-inner"
                />
                
                <input
                  type="text"
                  placeholder="修改备注 (可选)..."
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  className="flex-grow px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold pl-1">
                <span>当前积分: {editingUser.points} 分</span>
                <span>调整后预计: {Math.max(0, editingUser.points + pointsChange)} 分</span>
              </div>

              <button
                type="submit"
                disabled={submittingPoints || pointsChange === 0}
                className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
              >
                确定更新积分
              </button>
            </form>

            <div className="w-full h-px bg-stone-100"></div>

            {/* 2. Monthly Card Adjustment */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h5 className="text-xs font-black text-stone-500 uppercase tracking-wider">包月套餐调整</h5>
                <span className="text-[10px] text-stone-400 font-bold">
                  {editingUser.monthly_card_expires_at ? `已开通，${editingUser.monthly_card_expires_at.split('T')[0]}到期` : '未开通月卡'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleAdjustMonthlyCard(7)}
                  className="py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-bold text-[11px] rounded-xl cursor-pointer shadow-sm"
                >
                  +7天
                </button>
                <button
                  onClick={() => handleAdjustMonthlyCard(30)}
                  className="py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-bold text-[11px] rounded-xl cursor-pointer shadow-sm"
                >
                  +30天
                </button>
                <button
                  onClick={() => handleAdjustMonthlyCard(90)}
                  className="py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-bold text-[11px] rounded-xl cursor-pointer shadow-sm"
                >
                  +90天
                </button>
                <button
                  onClick={() => handleAdjustMonthlyCard(0)}
                  disabled={!editingUser.monthly_card_expires_at}
                  className="py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-[11px] rounded-xl cursor-pointer shadow-sm disabled:opacity-50"
                >
                  清除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Logs */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-stone-800 uppercase tracking-wider">流水历史日志</h3>

        {loadingLogs ? (
          <div className="py-12 text-center text-xs font-bold text-stone-400">正在拉取流水日志...</div>
        ) : (
          <div className="max-h-80 overflow-y-auto pr-1 border border-stone-100 rounded-xl">
            <table className="min-w-full divide-y divide-stone-100 text-[11px] font-bold">
              <thead className="bg-stone-50 text-stone-400 sticky top-0 uppercase tracking-wider text-left">
                <tr>
                  <th className="px-4 py-2">时间</th>
                  <th className="px-4 py-2">用户</th>
                  <th className="px-4 py-2 text-center">动账积分</th>
                  <th className="px-4 py-2 text-center">余额</th>
                  <th className="px-4 py-2">描述</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-600 font-medium">
                {logs.map(log => {
                  const isPositive = log.pointsChanged > 0;
                  const isNegative = log.pointsChanged < 0;

                  return (
                    <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-2 font-mono text-[10px] text-stone-400">
                        {new Date(log.createdAt).toLocaleString('zh-CN', { hour12: false })}
                      </td>
                      <td className="px-4 py-2 text-stone-800 font-bold">{log.username}</td>
                      <td className="px-4 py-2 text-center font-mono font-black">
                        {isPositive && <span className="text-emerald-600">+{log.pointsChanged}</span>}
                        {isNegative && <span className="text-rose-500">{log.pointsChanged}</span>}
                        {!isPositive && !isNegative && <span className="text-stone-400">0</span>}
                      </td>
                      <td className="px-4 py-2 text-center font-mono font-black text-stone-700">{log.currentPoints}</td>
                      <td className="px-4 py-2 text-stone-500 font-medium text-[10px]">{log.description}</td>
                    </tr>
                  );
                })}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-stone-400 italic">没有任何日志记录</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
