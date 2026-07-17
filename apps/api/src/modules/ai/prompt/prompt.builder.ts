import type { BaziChart, Pillar } from '@app/bazi-engine';
import type { ChatMessage } from '../llm/llm.types';
import type { KnowledgeChunk } from '../rag/knowledge.data';

/**
 * 报告维度定义。
 */
export const REPORT_DIMENSIONS = [
  'personality',
  'career',
  'wealth',
  'relationship',
  'health',
  'family',
  'luck',
] as const;

export type ReportDimension = (typeof REPORT_DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<ReportDimension, string> = {
  personality: '性格特质',
  career: '事业',
  wealth: '财运',
  relationship: '感情婚姻',
  health: '健康提示',
  family: '六亲关系',
  luck: '大运流年走势',
};

/** 免责声明（报告头尾展示） */
export const DISCLAIMER =
  '【免责声明】本报告基于传统命理规则由算法排盘、AI 辅助解读，属文化娱乐性质，不构成医疗、投资、法律、婚恋等任何专业建议。请理性看待，重要决策请咨询专业人士。';

/**
 * 系统级硬约束提示词。
 *
 * 核心：AI 只负责"讲"，绝不允许自行排盘或修改任何干支/五行数据。
 */
const SYSTEM_CONSTRAINTS = `你是一位资深、严谨且富有同理心的八字命理解读顾问。你的职责是把"排盘引擎已经算好的结构化结果"翻译成通俗易懂、有温度的白话解读。

必须严格遵守以下硬性规则：
1. 以下提供的排盘结果为唯一事实来源。你【绝对不得】重新排盘、重新计算或修改任何天干、地支、藏干、十神、五行、大运、流年等数据。
2. 若排盘数据中时柱缺失（时辰未知），涉及时柱与晚年、子女宫等维度要主动说明"因时辰未知，此部分仅供参考或从略"，不得臆造时柱。
3. 解读要基于提供的"命理知识参考"展开，结合具体盘面特征说明，不空泛套话。
4. 语气温和、正向、给建议而非下断言。多用"倾向于""可留意""建议"等措辞。
5. 【严禁】做以下内容：疾病诊断、寿命长短断言、生死预测、具体投资/买房/买卖股票指令、鼓动赌博、制造焦虑或恐吓。健康维度只做养生方向提示。
6. 输出使用简体中文，条理清晰，可用小标题和要点，但不要过度冗长。`;

/**
 * 把单柱格式化为可读文本。
 */
function formatPillar(name: string, p: Pillar | null): string {
  if (!p) return `${name}：（时辰未知，未排时柱）`;
  return `${name}：${p.heavenlyStem}${p.earthlyBranch}（天干十神：${p.tenGod}；纳音：${p.naYin}；藏干：${p.hiddenStems.join('、')}；藏干十神：${p.hiddenStemTenGods.join('、')}）`;
}

/**
 * 把命盘结构化结果格式化为提示词事实块。
 */
export function formatChartFacts(chart: BaziChart): string {
  const fe = chart.fiveElements;
  const strengthLabel = {
    strong: '身强',
    weak: '身弱',
    balanced: '中和',
  }[fe.dayMasterStrength];

  const lines: string[] = [];
  lines.push('【排盘结果 · 唯一事实来源，不可更改】');
  lines.push(`生肖：${chart.zodiac}`);
  lines.push(formatPillar('年柱', chart.pillars.year));
  lines.push(formatPillar('月柱', chart.pillars.month));
  lines.push(`${formatPillar('日柱', chart.pillars.day)} ← 日主为「${chart.pillars.day.heavenlyStem}」（${fe.dayMasterElement}）`);
  lines.push(formatPillar('时柱', chart.pillars.hour));
  lines.push('');
  lines.push(
    `五行力量（得分）：木 ${fe.scores.木}、火 ${fe.scores.火}、土 ${fe.scores.土}、金 ${fe.scores.金}、水 ${fe.scores.水}`,
  );
  lines.push(`日主旺衰：${strengthLabel}（力量分 ${fe.dayMasterScore}/100）`);
  lines.push(`喜用神：${fe.favorable.join('、')}；忌神：${fe.unfavorable.join('、')}`);
  lines.push('');
  lines.push(
    `起运：${chart.luckStart.description}；起运虚岁约 ${chart.luckStart.startAge} 岁`,
  );
  const luckText = chart.luckCycles
    .map(
      (c) =>
        `${c.startAge}岁起 ${c.heavenlyStem}${c.earthlyBranch}(${c.tenGod},${c.element})`,
    )
    .join('；');
  lines.push(`大运：${luckText}`);
  lines.push(
    `当前流年（${chart.currentYear.year}）：${chart.currentYear.heavenlyStem}${chart.currentYear.earthlyBranch}（${chart.currentYear.tenGod}，${chart.currentYear.element}），虚岁 ${chart.currentYear.age}`,
  );
  if (chart.shensha.length) {
    lines.push(`神煞（参考）：${chart.shensha.join('、')}`);
  }
  lines.push(
    `性别：${chart.meta.gender === 'male' ? '男' : '女'}；时辰是否已知：${chart.meta.hourKnown ? '是' : '否'}；真太阳时校正：${chart.meta.trueSolarTimeApplied ? '已应用' : '未应用'}`,
  );
  return lines.join('\n');
}

/**
 * 把知识片段格式化为参考块。
 */
export function formatKnowledge(chunks: KnowledgeChunk[]): string {
  if (!chunks.length) return '';
  const lines = ['【命理知识参考 · 供解读依据】'];
  chunks.forEach((c, i) => {
    lines.push(`${i + 1}. [${c.topic}] ${c.content}`);
  });
  return lines.join('\n');
}

/**
 * 构建单维度报告生成的消息序列。
 */
export function buildReportMessages(
  chart: BaziChart,
  dimension: ReportDimension,
  knowledge: KnowledgeChunk[],
): ChatMessage[] {
  const facts = formatChartFacts(chart);
  const kb = formatKnowledge(knowledge);
  const label = DIMENSION_LABELS[dimension];

  const userContent = [
    facts,
    '',
    kb,
    '',
    `请仅针对【${label}】这一个维度，给出一段结构清晰、贴合上述盘面的白话解读（约 300-500 字）。`,
    '要求：结合具体的十神、五行旺衰与喜用神展开；给出可执行的正向建议；不要重复罗列原始干支数据；不要涉及其他维度。',
    dimension === 'health'
      ? '健康维度仅做五行养生方向的温和提示，严禁任何疾病诊断或病症断言。'
      : '',
    !chart.meta.hourKnown && (dimension === 'family' || dimension === 'luck')
      ? '注意：本命时辰未知，凡涉及时柱（如晚年、子女宫）的部分请说明其局限性。'
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    { role: 'system', content: SYSTEM_CONSTRAINTS },
    { role: 'user', content: userContent },
  ];
}

/**
 * 构建命盘问答的消息序列（带盘面上下文与历史）。
 */
export function buildAskMessages(
  chart: BaziChart,
  knowledge: KnowledgeChunk[],
  question: string,
  history: ChatMessage[] = [],
): ChatMessage[] {
  const facts = formatChartFacts(chart);
  const kb = formatKnowledge(knowledge);

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_CONSTRAINTS },
    {
      role: 'system',
      content: `${facts}\n\n${kb}`,
    },
    ...history,
    {
      role: 'user',
      content: `${question}\n\n（请基于以上排盘结果作答，不要重新排盘；若问题超出命理解读范畴或涉及医疗/投资/寿命等，请温和说明无法给出确定性断言。）`,
    },
  ];
  return messages;
}
