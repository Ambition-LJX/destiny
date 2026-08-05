'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { streamSse, reportApi } from '@/lib/api';
import { RichText } from '../report/RichText';
import { LoadingDots } from '@/components/LoadingDots';
import { UnlockPrompt } from '@/components/UnlockPrompt';
import { useBillingStore } from '@/lib/billingStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

/**
 * 命盘问答：对话式追问，带盘面上下文（后端注入），流式回复。
 * 支持：停止生成、加载状态动画、字符计数、耗时显示。
 */
export function ChatPanel({ chartId }: { chartId: string }) {
  const plan = useBillingStore((s) => s.plan);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // 挂载时加载该命盘的问答历史（持久化记忆，刷新后恢复）
  useEffect(() => {
    let cancelled = false;
    reportApi
      .chatList(chartId)
      .then((list) => {
        if (cancelled) return;
        setMessages(
          list.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt).getTime(),
          })),
        );
      })
      .catch(() => {
        /* 无历史或加载失败时保持空会话 */
      });
    return () => {
      cancelled = true;
    };
  }, [chartId]);

  // 更新耗时计时器
  useEffect(() => {
    if (!busy) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [busy]);

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth',
        });
      });
    }
  }, [messages]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }, []);

  const send = useCallback(async () => {
    const question = input.trim();
    if (!question || busy) return;

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: question, timestamp: Date.now() },
      { role: 'assistant', content: '', timestamp: Date.now() },
    ];
    setMessages(newMessages);
    setInput('');
    setBusy(true);
    setElapsed(0);
    startTimeRef.current = Date.now();
    abortRef.current = new AbortController();

    try {
      await streamSse(
        '/reports/ask',
        { method: 'POST', body: { chartId, question } },
        {
          onDelta: (text) =>
            setMessages((prev) => {
              const next = [...prev];
              const lastIdx = next.length - 1;
              next[lastIdx] = {
                role: 'assistant',
                content: next[lastIdx].content + text,
                timestamp: Date.now(),
              };
              return next;
            }),
          onDone: () => setBusy(false),
          onError: (msg) => {
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: 'assistant',
                content: `（出错了：${msg}）`,
                timestamp: Date.now(),
              };
              return next;
            });
            setBusy(false);
          },
        },
        abortRef.current?.signal,
      );
    } catch {
      // 被用户中断或网络错误
      if (!abortRef.current?.signal.aborted) {
        setMessages((prev) => {
          const next = [...prev];
          if (next[next.length - 1]?.content === '') {
            next[next.length - 1] = {
              role: 'assistant',
              content: '（请求被中断）',
              timestamp: Date.now(),
            };
          }
          return next;
        });
      }
      setBusy(false);
    }
  }, [input, busy, messages, chartId]);

  const formatElapsed = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m${sec}s`;
  };

  const getAssistantCharCount = (): number => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant') {
      return lastMsg.content.length;
    }
    return 0;
  };

  return (
    <div className="card flex h-[520px] flex-col">
      {plan === 'free' && (
        <div className="flex flex-1 items-center justify-center">
          <UnlockPrompt
            title="命盘问答需解锁"
            desc="可围绕你的命盘无限次追问：事业、财运、婚恋、健康、流年等。"
          />
        </div>
      )}

      {plan !== 'free' && (<>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">命盘问答</h2>
        {busy && (
          <span className="flex items-center gap-2 text-xs text-ink-400">
            <LoadingDots text="AI 思考中" dotClassName="bg-wood" />
            <span className="tabular-nums">{formatElapsed(elapsed)}</span>
          </span>
        )}
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-ink-400">
            <div className="mb-4 text-4xl">🗨️</div>
            <p>试着问问你的命盘，例如：</p>
            <p className="mt-2 text-ink-500">「我适合什么方向的工作？」</p>
            <p className="text-ink-500">「今年的整体运势如何？」</p>
            <p className="text-ink-500">「我命里缺什么五行？」</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'user' ? (
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-gradient-to-r from-ink-800 to-ink-900 px-4 py-2 text-sm text-white shadow-sm">
                {m.content}
              </div>
            ) : (
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-ink-50 px-4 py-2 dark:bg-ink-800/50">
                {m.content ? (
                  <div className="relative">
                    <RichText text={m.content} />
                    {busy && i === messages.length - 1 && (
                      <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-ink-400 align-middle" />
                    )}
                  </div>
                ) : busy && i === messages.length - 1 ? (
                  <div className="flex items-center gap-2 py-1">
                    <LoadingDots text="思考中" dotClassName="bg-ink-400" />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 生成中的状态条 */}
      {busy && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-ink-50 px-3 py-1.5 text-xs dark:bg-ink-800/30">
          <span className="text-ink-400">
            已生成 <span className="font-medium text-ink-600 dark:text-ink-300">{getAssistantCharCount()}</span> 字
            {' · '}
            耗时 <span className="font-medium tabular-nums text-ink-600 dark:text-ink-300">{formatElapsed(elapsed)}</span>
          </span>
          <button
            onClick={stopGeneration}
            className="rounded-md border border-fire/30 bg-fire/5 px-2 py-0.5 text-fire hover:border-fire/50 hover:bg-fire/10 dark:border-fire/40 dark:bg-fire/10 dark:text-fire"
          >
            停止生成
          </button>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          className="input"
          placeholder="输入你的问题…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={busy}
        />
        {busy ? (
          <button
            className="btn-ghost shrink-0 border-fire/40 text-fire hover:border-fire hover:bg-fire/5"
            onClick={stopGeneration}
          >
            停止
          </button>
        ) : (
          <button
            className="btn-primary shrink-0"
            onClick={send}
            disabled={busy || !input.trim()}
          >
            发送
          </button>
        )}
      </div>
      </>)}
    </div>
  );
}