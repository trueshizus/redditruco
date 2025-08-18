import { useState, ReactNode } from 'react';
import { TranslationContext, getTranslations } from '../hooks/useTranslation';
import type { Language } from '../translations';

interface TranslationProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export function TranslationProvider({ 
  children, 
  defaultLanguage = 'en' 
}: TranslationProviderProps) {
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const t = getTranslations(language);

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}