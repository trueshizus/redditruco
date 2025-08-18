import { en } from './en';
import { es } from './es';

export const translations = {
  en,
  es,
};

export type Language = keyof typeof translations;
export type Translations = typeof en;

export { en, es };