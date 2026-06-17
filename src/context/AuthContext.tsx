import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  points: number;
  monthly_card_expires_at: string | null;
  status: 'active' | 'frozen';
}

interface CaptchaData {
  question: string;
  captchaToken: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (payload: any) => Promise<User>;
  logout: () => Promise<void>;
  fetchCaptcha: () => Promise<CaptchaData>;
  refreshUser: () => Promise<void>;
  deductPoints: (action: 'import' | 'download') => Promise<{ points: number; monthly_card_expires_at: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to restore user session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '登录失败');
    setUser(data.user);
    return data.user;
  };

  const register = async (payload: any): Promise<User> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '注册失败');
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    setUser(null);
  };

  const fetchCaptcha = async (): Promise<CaptchaData> => {
    const res = await fetch('/api/auth/captcha');
    if (!res.ok) throw new Error('无法获取验证码');
    return res.json();
  };

  const deductPoints = async (action: 'import' | 'download') => {
    const res = await fetch('/api/billing/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '积分扣减失败');

    // Update local user state points and monthly card info
    setUser(prev => prev ? {
      ...prev,
      points: data.points,
      monthly_card_expires_at: data.monthly_card_expires_at
    } : null);

    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchCaptcha, refreshUser, deductPoints }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
