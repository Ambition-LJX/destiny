import Link from 'next/link';
import { NavBar } from '@/components/NavBar';
import { Disclaimer } from '@/components/Disclaimer';
import { ElementCards } from '@/components/ElementCards';

/**
 * 首页：产品介绍 + 五行卡片 + 免责声明 + 引导入口。
 */
export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <NavBar />

      <main className="relative mx-auto max-w-6xl px-4 pb-24 pt-14 sm:pt-20">
        {/* ===== Hero ===== */}
        <section className="relative text-center">
          {/* 背景装饰：五行光晕缓慢漂移 */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-[520px] w-[900px] max-w-[120vw] -translate-x-1/2 animate-hero-drift opacity-60"
          >
            <div
              className="absolute left-[12%] top-[20%] h-56 w-56 rounded-full blur-3xl"
              style={{ background: 'rgba(63, 163, 77, 0.22)' }}
            />
            <div
              className="absolute right-[8%] top-[10%] h-64 w-64 rounded-full blur-3xl"
              style={{ background: 'rgba(229, 72, 77, 0.18)' }}
            />
            <div
              className="absolute left-[40%] top-[50%] h-72 w-72 rounded-full blur-3xl"
              style={{ background: 'rgba(200, 149, 47, 0.18)' }}
            />
            <div
              className="absolute right-[20%] bottom-[4%] h-44 w-44 rounded-full blur-3xl"
              style={{ background: 'rgba(212, 175, 55, 0.2)' }}
            />
            <div
              className="absolute left-[8%] bottom-[10%] h-52 w-52 rounded-full blur-3xl"
              style={{ background: 'rgba(59, 130, 246, 0.2)' }}
            />
          </div>

          {/* 标签徽章 */}
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-wood/30 bg-white/70 px-4 py-1.5 text-xs text-ink-500 shadow-sm backdrop-blur dark:border-wood/30 dark:bg-ink-900/70 dark:text-ink-400">
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-wood animate-elem-pulse" />
              <span
                className="h-1.5 w-1.5 rounded-full bg-fire animate-elem-pulse"
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className="h-1.5 w-1.5 rounded-full bg-earth animate-elem-pulse"
                style={{ animationDelay: '0.4s' }}
              />
              <span
                className="h-1.5 w-1.5 rounded-full bg-metal animate-elem-pulse"
                style={{ animationDelay: '0.6s' }}
              />
              <span
                className="h-1.5 w-1.5 rounded-full bg-water animate-elem-pulse"
                style={{ animationDelay: '0.8s' }}
              />
            </span>
            规则引擎排盘 · AI 白话解读 · 文化娱乐
          </p>

          {/* 主标题：大字 + 渐变流光 */}
          <h1 className="font-serif text-5xl font-extrabold leading-[1.1] text-ink-900 dark:text-ink-100 sm:text-6xl md:text-7xl">
            读懂你的
            <span className="relative ml-2 inline-block">
              <span
                className="animate-hero-shine bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, #3fa34d 0%, #c8952f 25%, #d4af37 50%, #e5484d 75%, #3b82f6 100%)',
                }}
              >
                八字
              </span>
            </span>
          </h1>

          {/* 副标题 */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-600 dark:text-ink-400 sm:text-lg">
            由确定性规则引擎完成四柱、五行、大运流年的排盘计算，
            <span className="whitespace-nowrap">结果确定可复现</span>；
            再由大模型把结构化命盘翻译成通俗易懂的解读报告。
            <br className="hidden sm:block" />
            <span className="font-semibold text-ink-700 dark:text-ink-200">
              算法负责「准」，AI 负责「讲」
            </span>
            。
          </p>

          {/* CTA 按钮 */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/new"
              className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-earth via-metal to-fire px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-earth/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-earth/40 sm:text-base"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-earth via-metal to-fire opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-70" />
              <span className="relative">开始排盘</span>
              <svg
                className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white/80 px-6 py-3.5 text-sm font-medium text-ink-700 shadow-sm transition hover:-translate-y-0.5 hover:border-wood/40 hover:text-wood hover:shadow-md dark:border-ink-700 dark:bg-ink-900/70 dark:text-ink-200 dark:hover:border-wood/40 dark:hover:text-wood sm:text-base"
            >
              我的命盘
            </Link>
          </div>

          {/* 次要数据徽章 */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-500 dark:text-ink-400 sm:text-sm">
            <StatPill label="确定性" value="100%" />
            <Divider />
            <StatPill label="引擎排盘" value="纯函数 · 可复现" />
            <Divider />
            <StatPill label="AI 解读" value="多模型可选" />
            <Divider />
            <StatPill label="数据主权" value="随时导出 / 删除" />
          </div>
        </section>

        {/* ===== 金木水火土五行卡片 ===== */}
        <ElementCards />

        {/* ===== 底部免责声明 ===== */}
        <div className="mt-20">
          <Disclaimer />
        </div>
      </main>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-ink-400 dark:text-ink-500">{label}</span>
      <span className="font-semibold text-ink-700 dark:text-ink-200">{value}</span>
    </span>
  );
}

function Divider() {
  return <span className="h-3 w-px bg-ink-200 dark:bg-ink-700" />;
}
