import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface PasswordInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  minLength?: number;
  required?: boolean;
  autoComplete?: string;
}

export default function PasswordInput({ value, onChange, placeholder, className, minLength, required, autoComplete }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        autoComplete={autoComplete}
        className={`w-full pr-11 ${className ?? ''}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('Скрыть пароль') : t('Показать пароль')}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
