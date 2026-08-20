'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Lang,
  LANGS,
  translations,
  MONTHS_FULL,
  MONTHS_SHORT,
  DAYS,
  DAYS_SUN_FIRST,
  UI_LOCALES,
} from './translations';

const LANG_KEY = 'hostelhaven_lang';

type Params = Record<string, string | number>;

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Params) => string;
  tp: (n: number, forms: [string, string, string], params?: Params) => string;
  monthFull: string[];
  monthShort: string[];
  dayNames: string[];
  dayNamesSunFirst: string[];
  locale: string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function readLang(): Lang {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw === 'ru' || raw === 'uk') return raw;
  } catch {
    /* ignore */
  }
  return 'ru';
}

function pluralIndex(n: number): 0 | 1 | 2 {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 2;
  if (last > 1 && last < 5) return 1;
  if (last === 1) return 0;
  return 2;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageContextType>(() => {
    const dict = translations[lang] ?? {};

    const t = (key: string, params?: Params): string => {
      let str = dict[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.split(`{${k}}`).join(String(v));
        }
      }
      return str;
    };

    const tp = (n: number, forms: [string, string, string], params?: Params): string => {
      return t(forms[pluralIndex(n)], { n, ...params });
    };

    return {
      lang,
      setLang: (l: Lang) => {
        try {
          localStorage.setItem(LANG_KEY, l);
        } catch {
          /* ignore */
        }
        setLangState(l);
      },
      t,
      tp,
      monthFull: MONTHS_FULL[lang],
      monthShort: MONTHS_SHORT[lang],
      dayNames: DAYS[lang],
      dayNamesSunFirst: DAYS_SUN_FIRST[lang],
      locale: UI_LOCALES[lang],
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export { LANGS };
