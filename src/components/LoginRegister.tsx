import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, User as UserIcon, Lock, Sparkles, ShieldCheck } from 'lucide-react';

interface LoginRegisterProps {
  onSuccess?: () => void;
}

export const LoginRegister: React.FC<LoginRegisterProps> = ({ onSuccess }) => {
  const { login, register, fetchCaptcha } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load captcha when view changes to Register or on demand
  const handleFetchCaptcha = async () => {
    setLoadingCaptcha(true);
    setErrorMsg('');
    try {
      const data = await fetchCaptcha();
      setCaptchaQuestion(data.question);
      setCaptchaToken(data.captchaToken);
    } catch (err: any) {
      setErrorMsg(err.message || '获取验证码失败，请重试');
    } finally {
      setLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    if (!isLoginView) {
      handleFetchCaptcha();
    } else {
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isLoginView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMsg('请输入用户名');
      return;
    }
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      setErrorMsg('用户名长度必须在3-20个字符之间');
      return;
    }
    if (!password) {
      setErrorMsg('请输入密码');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('密码长度不能少于6位字符');
      return;
    }

    setLoadingSubmit(true);
    try {
      if (isLoginView) {
        await login(trimmedUsername, password);
        setSuccessMsg('登录成功！');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1000);
        }
      } else {
        if (!captchaAnswer) {
          setErrorMsg('请输入验证码');
          setLoadingSubmit(false);
          return;
        }
        await register({
          username: trimmedUsername,
          password,
          captchaAnswer,
          captchaToken
        });
        setSuccessMsg('注册成功！正在进入系统...');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isLoginView ? '登录失败' : '注册失败'));
      // If register fails, refresh captcha
      if (!isLoginView) {
        handleFetchCaptcha();
        setCaptchaAnswer('');
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center border border-stone-200 mb-4 shadow-sm">
          <Sparkles className="w-6 h-6 text-stone-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-stone-800 tracking-tight">
          {isLoginView ? '欢迎回来' : '开启您的智能账单助手'}
        </h2>
        <p className="text-xs text-stone-400 font-bold mt-1.5">
          {isLoginView ? '请登录以访问您的数据和设置' : '创建新账户以同步和备份您的数据'}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-500 flex items-start gap-2.5 shadow-sm">
          <span className="shrink-0 pt-0.5">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-600 flex items-start gap-2.5 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase text-stone-400 tracking-wider">用户名</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-inner"
              placeholder="请输入用户名"
              disabled={loadingSubmit}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase text-stone-400 tracking-wider">密码</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-inner"
              placeholder="请输入密码 (不少于6位)"
              disabled={loadingSubmit}
            />
          </div>
        </div>

        {!isLoginView && (
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-stone-400 tracking-wider">计算验证码</label>
            <div className="flex gap-3">
              <input
                type="number"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                className="w-1/2 px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-inner"
                placeholder="验证码结果"
                disabled={loadingSubmit}
              />
              <button
                type="button"
                onClick={handleFetchCaptcha}
                disabled={loadingCaptcha || loadingSubmit}
                className="w-1/2 flex items-center justify-center gap-2 border border-stone-200 rounded-2xl text-xs font-black text-stone-600 bg-stone-50 hover:bg-stone-100 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span className="font-mono">{loadingCaptcha ? '加载中...' : captchaQuestion || '点击加载'}</span>
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCaptcha ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loadingSubmit}
          className="w-full py-3.5 bg-stone-800 text-white rounded-2xl text-sm font-black hover:bg-stone-700 active:scale-[0.98] transition-all shadow-md shadow-stone-800/10 cursor-pointer flex items-center justify-center disabled:opacity-50"
        >
          {loadingSubmit ? '请稍候...' : isLoginView ? '登 录' : '注 册'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => setIsLoginView(!isLoginView)}
          className="text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
        >
          {isLoginView ? '还没有账号？立即免费注册' : '已有账号？返回登录'}
        </button>
      </div>
    </div>
  );
};
