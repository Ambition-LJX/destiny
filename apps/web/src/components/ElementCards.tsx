/**
 * 金木水火土五元素展示卡片组。
 * 桌面端：五行一行横排布局；
 * 平板：自动折行；
 * 移动端：单列堆叠。
 */

type ElementKey = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

interface ElementSpec {
  key: ElementKey;
  symbol: string;
  label: string;
  slogan: string;
  desc: string;
  features: string[];
  from: string;
  to: string;
  accent: string;
  glow: string;
}

/** 展示顺序：金 → 木 → 水 → 火 → 土 */
const ELEMENTS: ElementSpec[] = [
  {
    key: 'metal',
    symbol: '金',
    label: '从革·锐利',
    slogan: '金 · 守护',
    desc: '如金玉般可靠：加密存储、权限隔离、一键导出删除，尊重你的数据主权。',
    features: ['端到端加密', '权限分级', '数据可携'],
    from: '#d4af37',
    to: '#9b7e1f',
    accent: 'linear-gradient(90deg, #d4af37, #f5d977, #d4af37)',
    glow: 'rgba(212, 175, 55, 0.45)',
  },
  {
    key: 'wood',
    symbol: '木',
    label: '曲直·生发',
    slogan: '木 · 定盘',
    desc: '像栋梁之材一样，有条不紊地把四柱十神从历书中推导出来，结果可复现。',
    features: ['历法换算', '节气校正', '十神排盘'],
    from: '#3fa34d',
    to: '#2b8a3e',
    accent: 'linear-gradient(90deg, #3fa34d, #8fce9e, #3fa34d)',
    glow: 'rgba(63, 163, 77, 0.35)',
  },
  {
    key: 'water',
    symbol: '水',
    label: '润下·流变',
    slogan: '水 · 流转',
    desc: '大运流年如水流般延绵不绝，追踪一生运势起伏，洞察时机与节奏。',
    features: ['大运推演', '流年展望', '节奏洞察'],
    from: '#3b82f6',
    to: '#1f5fbf',
    accent: 'linear-gradient(90deg, #3b82f6, #93c5fd, #3b82f6)',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
  {
    key: 'fire',
    symbol: '火',
    label: '炎上·光耀',
    slogan: '火 · 解读',
    desc: '把冰冷的干支翻译成有温度的白话，让千年命理也能娓娓道来。',
    features: ['AI 白话解读', '结构化输入', '低幻觉生成'],
    from: '#e5484d',
    to: '#c0363a',
    accent: 'linear-gradient(90deg, #e5484d, #f5a2a5, #e5484d)',
    glow: 'rgba(229, 72, 77, 0.35)',
  },
  {
    key: 'earth',
    symbol: '土',
    label: '稼穑·厚德',
    slogan: '土 · 根基',
    desc: '沉淀命理知识库，像大地一样承载每一次推演，让系统更稳、更可信。',
    features: ['命理知识库', '规则优先', '专家经验沉淀'],
    from: '#c8952f',
    to: '#9c7220',
    accent: 'linear-gradient(90deg, #c8952f, #e6c372, #c8952f)',
    glow: 'rgba(200, 149, 47, 0.4)',
  },
];

const ELEMENT_BG: Record<ElementKey, string> = {
  wood: 'radial-gradient(circle at 70% 20%, rgba(63,163,77,0.18) 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(143,206,158,0.15) 0%, transparent 50%)',
  fire: 'radial-gradient(circle at 75% 25%, rgba(229,72,77,0.18) 0%, transparent 55%), radial-gradient(circle at 25% 75%, rgba(245,162,165,0.15) 0%, transparent 50%)',
  earth: 'radial-gradient(circle at 70% 20%, rgba(200,149,47,0.2) 0%, transparent 55%), radial-gradient(circle at 25% 75%, rgba(230,195,114,0.15) 0%, transparent 50%)',
  metal: 'radial-gradient(circle at 75% 25%, rgba(212,175,55,0.2) 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(245,217,119,0.15) 0%, transparent 50%)',
  water: 'radial-gradient(circle at 70% 20%, rgba(59,130,246,0.2) 0%, transparent 55%), radial-gradient(circle at 25% 75%, rgba(147,197,253,0.15) 0%, transparent 50%)',
};

export function ElementCards() {
  return (
    <section className="relative mt-20">
      {/* 标题区 */}
      <div className="mb-10 text-center">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-wood/30 bg-white/70 px-3 py-1 text-xs text-ink-500 backdrop-blur dark:border-wood/30 dark:bg-ink-900/70 dark:text-ink-400">
          <span className="flex gap-1">
            {ELEMENTS.map((el, idx) => (
              <span
                key={el.key}
                className="h-1.5 w-1.5 rounded-full animate-elem-pulse"
                style={{
                  backgroundColor: el.from,
                  animationDelay: `${idx * 0.2}s`,
                }}
              />
            ))}
          </span>
          五行相生 · 循环有序
        </p>
        <h2 className="font-serif text-3xl font-bold text-ink-900 dark:text-ink-100 sm:text-4xl">
          八字的五个核心维度
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-500 dark:text-ink-400 sm:text-base">
          以「金 · 木 · 水 · 火 · 土」五行相生为骨架，构建从确定性排盘到 AI 解读再到隐私守护的完整体验。
        </p>
      </div>

      {/* 一行横排：桌面端5列，平板3列，移动端单列 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
        {ELEMENTS.map((el, i) => (
          <ElementCard key={el.key} spec={el} index={i} />
        ))}
      </div>
    </section>
  );
}

/** 五行元素卡片 */
function ElementCard({ spec, index }: { spec: ElementSpec; index: number }) {
  return (
    <article
      className="group relative flex flex-col rounded-2xl border border-ink-100 bg-white/90 p-5 shadow-card backdrop-blur-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-2xl animate-elem-rise dark:border-ink-800 dark:bg-ink-900/90 dark:shadow-none"
      style={{
        ['--card-accent' as string]: spec.accent,
        animationDelay: `${index * 0.08}s`,
        backgroundImage: ELEMENT_BG[spec.key],
      }}
    >
      {/* 悬浮光晕 */}
      <span
        className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-80"
        style={{ backgroundColor: spec.glow }}
      />

      {/* 元素图标 + 标题 */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/60 font-serif text-xl font-bold text-white shadow-lg transition-transform duration-500 group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${spec.from} 0%, ${spec.to} 100%)`,
            boxShadow: `0 6px 20px -6px ${spec.glow}`,
          }}
        >
          <span className="relative z-10 drop-shadow-sm">{spec.symbol}</span>
          <span
            className="absolute inset-0 rounded-2xl opacity-30 animate-elem-pulse"
            style={{ background: spec.glow }}
          />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-ink-400 dark:text-ink-500">
            {spec.label}
          </div>
          <div
            className="font-serif text-base font-bold transition-colors"
            style={{ color: spec.from }}
          >
            {spec.slogan}
          </div>
        </div>
      </div>

      {/* 描述 */}
      <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-400">
        {spec.desc}
      </p>

      {/* 特性标签 */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {spec.features.map((f) => (
          <span
            key={f}
            className="rounded-full border px-2 py-0.5 text-[11px] transition-colors"
            style={{
              borderColor: `${spec.from}40`,
              color: spec.from,
              backgroundColor: `${spec.from}12`,
            }}
          >
            {f}
          </span>
        ))}
      </div>
    </article>
  );
}
