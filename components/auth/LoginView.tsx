import React, { useState } from 'react';

interface LoginViewProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  defaultEmail?: string;
  mode?: 'page' | 'dialog';
  onCancel?: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({
  onSignIn,
  defaultEmail,
  mode = 'page',
  onCancel,
}) => {
  const [email, setEmail] = useState(defaultEmail || '');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSignIn((defaultEmail || email).trim(), password);
    } catch {
      setError('Email hoặc mật khẩu không đúng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={
        mode === 'page'
          ? 'min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4'
          : 'w-full'
      }
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-6"
      >
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          {defaultEmail ? 'Chỉnh sửa lịch trực' : 'Lịch trực khối Ngoại'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {defaultEmail
            ? 'Nhập mật khẩu chỉnh sửa. Nếu không đăng nhập, bạn vẫn xem được lịch.'
            : 'Đăng nhập để chỉnh sửa dữ liệu lịch trực.'}
        </p>

        {!defaultEmail && (
          <>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
          </>
        )}

        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          {defaultEmail ? 'Mật khẩu chỉnh sửa' : 'Mật khẩu'}
        </label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-6 flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-11 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginView;
