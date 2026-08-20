import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import PasswordInput from '../components/PasswordInput';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Ошибка авторизации'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e1b4b] p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <h1 className="text-3xl font-bold tracking-tight">HostelHaven</h1>
          <p className="text-white/60 mt-1 text-sm">{t('Управление хостелами')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('Email или имя пользователя')}</label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('Пароль')}</label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                required
                minLength={8}
                autoComplete="current-password"
                placeholder={t('Минимум 8 символов')}
                className="px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {submitting ? t('Подождите...') : t('Войти')}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          {t('Данные защищены. Доступ только для администраторов.')}
        </p>
      </div>
    </div>
  );
}
