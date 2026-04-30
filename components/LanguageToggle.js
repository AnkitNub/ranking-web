'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

export default function LanguageToggle() {
  const { i18n, t } = useTranslation('common');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentLang = i18n.language.startsWith('jp') ? 'jp' : 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'jp' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-95"
      title={currentLang === 'en' ? '日本語に切り替え' : 'Switch to English'}
    >
      <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px]">
        {currentLang === 'en' ? 'EN' : 'JP'}
      </span>
      <span>{currentLang === 'en' ? '日本語' : 'English'}</span>
    </button>
  );
}
