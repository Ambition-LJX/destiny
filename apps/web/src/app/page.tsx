import Link from 'next/link';
import { NavBar } from '@/components/NavBar';
import { Disclaimer } from '@/components/Disclaimer';

/**
 * 首页：产品介绍 + 免责声明 + 引导入口。
 */
export default function HomePage() {
  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 py-16">
        <section className="text-center">
          <p className="mb-3 inline-flex rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-500">
            规则引擎排盘 · AI 白话解读 · 文化娱乐
          </p>
          <h1 className="font-serif text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
            读懂你的八字
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-ink-600">
            由确定性规则引擎完成四柱、五行、大运流年的排盘计算，结果确定可复现；
            再由大模型把结构化命盘翻译成通俗易懂的解读报告。算法负责"准"，AI 负责"讲"。
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/new" className="btn-primary">
              开始排盘
            </Link>
            <Link href="/dashboard" className="btn-ghost">
              我的命盘
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          <Feature
            title="确定性排盘"
            desc="历法换算、二十四节气、真太阳时校正、四柱十神、五行旺衰、大运流年，全部由纯函数计算。"
          />
          <Feature
            title="AI 只负责解读"
            desc="大模型只接收引擎算好的结构化结果，禁止自行排盘，配合命理知识库降低幻觉。"
          />
          <Feature
            title="隐私与合规"
            desc="出生信息应用层加密存储，可一键导出与删除；全程娱乐免责，不做医疗投资等断言。"
          />
        </section>

        <div className="mt-16">
          <Disclaimer />
        </div>
      </main>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">{desc}</p>
    </div>
  );
}
