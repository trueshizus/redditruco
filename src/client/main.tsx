import './index.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ChatApp } from './ChatApp';
import { MultiplayerApp } from './multiplayer';
import { UISelector } from './UISelector';
import { TranslationProvider } from './components/TranslationProvider';

const ui = new URLSearchParams(window.location.search).get('ui');
const Root =
  ui === 'multi'
    ? MultiplayerApp
    : ui === 'chat'
      ? ChatApp
      : ui === 'table'
        ? App
        : UISelector;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TranslationProvider>
      <Root />
    </TranslationProvider>
  </StrictMode>,
);
