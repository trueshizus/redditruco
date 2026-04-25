import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface CommandInputProps {
  onSubmit: (text: string) => void;
  /** When set (e.g. from a chip click), seeds the input. */
  prefill?: string;
}

const ALL_COMMANDS = [
  '/start',
  '/play',
  '/envido',
  '/real',
  '/falta',
  '/truco',
  '/retruco',
  '/vale4',
  '/quiero',
  '/noquiero',
  '/mazo',
  '/seguir',
  '/restart',
  '/help',
  '/clear',
];

export function CommandInput({ onSubmit, prefill }: CommandInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (prefill !== undefined) {
      setValue(prefill);
      inputRef.current?.focus();
    }
  }, [prefill]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const text = value.trim();
      if (!text) return;
      onSubmit(text);
      setHistory((h) => [...h, text]);
      setHistoryIdx(null);
      setValue('');
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = historyIdx === null ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(idx);
      setValue(history[idx]!);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === null) return;
      const idx = historyIdx + 1;
      if (idx >= history.length) {
        setHistoryIdx(null);
        setValue('');
      } else {
        setHistoryIdx(idx);
        setValue(history[idx]!);
      }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!value.startsWith('/')) return;
      const matches = ALL_COMMANDS.filter((c) => c.startsWith(value));
      if (matches.length === 1) setValue(matches[0]! + ' ');
      else if (matches.length > 1) {
        let lcp = matches[0]!;
        for (const m of matches) {
          let i = 0;
          while (i < lcp.length && i < m.length && lcp[i] === m[i]) i += 1;
          lcp = lcp.slice(0, i);
        }
        if (lcp.length > value.length) setValue(lcp);
      }
    }
  }

  return (
    <div className="bg-[#0c0c0c] border-t border-[#1f1f1f] px-3 py-2 flex items-center font-mono text-[12px]">
      <span className="text-[#7afff7]">{t.chat.promptPrefix}</span>
      <input
        ref={inputRef}
        data-testid="chat-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder={t.chat.inputPlaceholder}
        autoComplete="off"
        spellCheck={false}
        className="flex-1 ml-2 bg-transparent text-white outline-none placeholder:text-[#3a3a3a]"
      />
      <span className="text-[#9aff8b] animate-pulse ml-1">▮</span>
    </div>
  );
}
