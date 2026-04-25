import type { ReactNode } from 'react';

interface ChatLayoutProps {
  header: ReactNode;
  log: ReactNode;
  chips: ReactNode;
  input: ReactNode;
}

export function ChatLayout({ header, log, chips, input }: ChatLayoutProps) {
  return (
    <main
      data-testid="chat-root"
      className="h-full flex flex-col bg-[#0c0c0c] text-[#bdbdb0] font-mono"
      style={{ fontFamily: "'JetBrains Mono', 'SF Mono', ui-monospace, monospace" }}
    >
      {header}
      {log}
      {chips}
      {input}
    </main>
  );
}
