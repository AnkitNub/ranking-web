'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="flex items-center gap-2">
      <button
        onClick={toggleLanguage}
        className="relative flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden group"
        aria-label="Toggle language"
      >
        <div className="relative flex items-center h-7 w-20">
          {/* Slider Background */}
          <motion.div
            className="absolute h-full w-1/2 bg-white dark:bg-zinc-600 rounded-full shadow-sm"
            initial={false}
            animate={{
              x: currentLang === 'en' ? 0 : '100%',
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />

          {/* Labels */}
          <div className="relative z-10 flex w-full justify-between px-2.5">
            <span
              className={`text-[10px] font-bold transition-colors duration-300 ${
                currentLang === 'en'
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              EN
            </span>
            <span
              className={`text-[10px] font-bold transition-colors duration-300 ${
                currentLang === 'jp'
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              JP
            </span>
          </div>
        </div>
      </button>

      {/* Pulsing indicator to show change happened */}
      <AnimatePresence mode="wait">
        <motion.span
          key={currentLang}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="hidden lg:block text-[10px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-widest"
        >
          {currentLang === 'en' ? 'English' : '日本語'}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
