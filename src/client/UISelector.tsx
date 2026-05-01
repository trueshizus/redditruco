// Tiny mode-selector strip. Shown only when no ?ui= param is set; lets
// the user pick a renderer without crafting URLs (which Reddit's playtest
// doesn't pass through to the webview anyway).

import { useState } from 'react';
import { App } from './App';
import { ChatApp } from './ChatApp';
import { MultiplayerApp } from './multiplayer';

type Mode = 'table' | 'chat' | 'multi' | 'pick';

const STORAGE_KEY = 'reditruco-ui-mode';

export function UISelector() {
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Mode | null;
      return saved && ['table', 'chat', 'multi'].includes(saved) ? saved : 'pick';
    } catch {
      return 'pick';
    }
  });

  const choose = (m: Mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
    setMode(m);
  };

  if (mode === 'pick') {
    return (
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          background: '#0e1014',
          color: '#d6dde8',
          minHeight: '100vh',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <h1 style={{ fontSize: '1.4rem', color: '#7fbf7f', marginBottom: '0.5rem' }}>
          reditruco · pick a mode
        </h1>
        <button type="button" onClick={() => choose('table')} style={btn('#5577cc')}>
          🃏 Table (single-player vs CPU)
        </button>
        <button type="button" onClick={() => choose('chat')} style={btn('#3ab36a')}>
          💬 Chat (IRC-style vs CPU)
        </button>
        <button type="button" onClick={() => choose('multi')} style={btn('#cc8855')}>
          ⚔ Multiplayer (1v1 humans)
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          background: '#181d24',
          color: '#9bb',
          padding: '0.4rem 0.75rem',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.7rem',
          display: 'flex',
          gap: '0.6rem',
          alignItems: 'center',
          borderBottom: '1px solid #2a3340',
        }}
      >
        <span style={{ color: '#7fbf7f' }}>reditruco</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <button type="button" onClick={() => choose('table')} style={tab(mode === 'table')}>
          table
        </button>
        <button type="button" onClick={() => choose('chat')} style={tab(mode === 'chat')}>
          chat
        </button>
        <button type="button" onClick={() => choose('multi')} style={tab(mode === 'multi')}>
          multi
        </button>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => choose('pick')} style={tab(false)}>
          ↩ pick
        </button>
      </div>
      {mode === 'table' && <App />}
      {mode === 'chat' && <ChatApp />}
      {mode === 'multi' && <MultiplayerApp />}
    </>
  );
}

function btn(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    padding: '0.7rem 1.4rem',
    borderRadius: 4,
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    cursor: 'pointer',
    minWidth: 280,
  };
}

function tab(active: boolean): React.CSSProperties {
  return {
    background: active ? '#2a3340' : 'transparent',
    color: active ? '#d6dde8' : '#9bb',
    border: '1px solid #2a3340',
    padding: '0.15rem 0.55rem',
    borderRadius: 3,
    fontFamily: 'inherit',
    fontSize: '0.7rem',
    cursor: 'pointer',
  };
}
