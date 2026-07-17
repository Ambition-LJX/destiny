'use client';

import { useRef, useState } from 'react';
import { streamSse } from '@/lib/api';
import { RichText } from '../report/RichText';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 命盘问答：对话式追问，带盘面上下文（后端注入），流式回复。
 */
export function ChatPanel({ chartId }: { chartId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function send() {
    const question = input.trim();
    if (!question || busy) return;

    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);

    await streamSse(
      '/reports/ask',
      { method: 'POST', body: { chartId, question, history } },
      {
        onDelta: (text) =>
          setMessages((m) => {
            const next = [...m];
            next[next.length - 1] = {
              role: 'assistant',
              content: next[next.length - 1].content + text,
            };
            return next;
          }),
        onDone: () => setBusy(false),
        onError: (msg) => {
          setMessages((m) => {
            const next = [...m];
            next[next.length - 1] = {
              role: 'assistant',
              content: `（出错了：${msg}）`,
            };
            return next;
          });
          setBusy(false);
        },
      },
    );
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }

  return (
    <div className="card flex h-[520px] flex-col">
      <h2 className="mb-3 text-lg font-semibold text-ink-900">命盘问答</h2>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center text-sm text-ink-400">
            <div>
              <p>试着问问，例如：</p>
              <p className="mt-2 text-ink-500">「我适合什么方向的工作？」</p>
              <p className="text-ink-500">「今年的整体运势如何？」</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            {m.role === 'user' ? (
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-ink-900 px-4 py-2 text-sm text-white">
                {m.content}
              </div>
            ) : (
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-ink-50 px-4 py-2">
                {m.content ? (
                  <RichText text={m.content} />
                ) : busy && i === messages.length - 1 ? (
                  <span className="text-sm text-ink-400">思考中…</span>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="input"
          placeholder="输入你的问题…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={busy}
        />
        <button className="btn-primary shrink-0" onClick={send} disabled={busy}>
          发送
        </button>
      </div>
    </div>
  );
}
