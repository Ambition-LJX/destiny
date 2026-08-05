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
 * 单维度报告的字数上限（用于控制 Token 预算）。
 * - prompt 用户输入中也声明"约 300-500 字"
 * - 防止模型跑偏输出超长文本
 */
export const REPORT_TARGET_LENGTH = 450;
export const REPORT_HARD_MAX_LENGTH = 800;

/**
 * 离线的 token 估算，用于成本模型等无需精确计量的场景。
 *
 * 按 DeepSeek 官方换算比例估算（https://api-docs.deepseek.com/zh-cn/quick_start/token_usage）：
 * - 1 个中文字符 ≈ 0.6 token
 * - 1 个非中文（英文字符/数字/符号）≈ 0.3 token
 * 实际以模型返回的 usage 为准，此处仅作成本估算参考。
 */
export function estimateTokens(text: string): number {
  let cjk = 0;
  let other = 0;
  for (const ch of text) {
    if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(ch)) cjk += 1;
    else other += 1;
  }
  return Math.ceil(cjk * 0.6 + other * 0.3);
}

/**
 * 各维度报告统一的固定小标题输出模板。
 *
 * 设计动机：报告是逐字 SSE 流式返回的，前端无法等待整段结束再解析 JSON。
 * 改用固定的中文小标题（Markdown ## 二级标题）作为结构骨架，前端按标题名
 * 做差异化渲染（结论卡/要点标签/建议框），无需等待整段完成、无需 JSON 解析，
 * 且比自由格式长文本有更强的可扫读性。
 */
export const STRUCTURED_OUTPUT_GUIDE =
  '【输出结构 · 必须严格遵守】请【只使用】以下四个二级标题，按顺序输出，不要增删、改写或替换为其他标题：\n\n' +
  '## 一句话结论\n' +
  '（不超过 40 字，直接给出本维度最核心的判断，不要铺垫）\n\n' +
  '## 核心解读\n' +
  '（分 2-4 段展开，结合具体的十神、五行旺衰喜用神、合冲关系、格局、神煞说明依据，不要空泛套话）\n\n' +
  '## 关键要点\n' +
  '- 要点1（每条不超过 25 字）\n' +
  '- 要点2\n' +
  '- 要点3（3-5 条即可）\n\n' +
  '## 建议\n' +
  '- 建议1（可执行、正向，每条不超过 30 字）\n' +
  '- 建议2（2-4 条即可）';

/**
 * 系统级硬约束提示词。
 *
 * 核心：AI 只负责"讲"，绝不允许自行排盘或修改任何干支/五行数据。
 */
export const SYSTEM_CONSTRAINTS = `你是一位资深、严谨且富有同理心的八字命理解读顾问。你的职责是把"排盘引擎已经算好的结构化结果"翻译成通俗易懂、有温度的白话解读。

必须严格遵守以下硬性规则：
1. 以下提供的排盘结果为唯一事实来源。你【绝对不得】重新排盘、重新计算或修改任何天干、地支、藏干、十神、五行、大运、流年、合冲、格局、十二长生、神煞等任何数据。
2. 若排盘数据中时柱缺失（时辰未知），涉及时柱与晚年、子女宫等维度要主动说明"因时辰未知，此部分仅供参考或从略"，不得臆造时柱。
3. 解读要基于提供的"命理知识参考"展开，结合具体盘面特征（合冲、格局、十二长生、神煞）说明，不空泛套话。
4. 语气温和、正向、给建议而非下断言。多用"倾向于""可留意""建议"等措辞。
5. 【严禁】做以下内容：疾病诊断、寿命长短断言、生死预测、具体投资/买房/买卖股票指令、鼓动赌博、制造焦虑或恐吓。健康维度只做养生方向提示。
6. 输出使用简体中文，条理清晰，不要过度冗长。
7. 【严禁】输出代码块（形如 \`\`\`包裹的内容）、JSON、YAML 或任何编程语言格式的内容；正文只能是普通 Markdown 文本（二级标题 \`##\`、无序列表 \`-\`、加粗 \`**\`）。
8. 若用户消息中给出了固定的输出结构（标题名称与顺序），必须逐一严格遵守，不得增删、改写、合并或换用其他标题措辞。`;

/**
 * 十二长生阶段的口语化解读（仅供 AI 解读时的语气参考）。
 * 阶段的多/空相位 → 强/弱/中性。AI 解读时引用但不局限于此。
 */
const TWELVE_STAGE_HINT: Record<string, string> = {
  长生: '初生、萌芽、起步之象',
  沐浴: '沐浴、易感、桃花位（中性偏浮）',
  冠带: '自立、初步有成',
  临官: '事业起步、已有作为',
  帝旺: '顶峰、最旺之时',
  衰: '由盛转衰，宜守',
  病: '脆弱、需注意休养',
  死: '受克极重、低迷',
  墓: '收藏、库中、待时而动',
  绝: '气机断绝、转换期',
  胎: '受胎、新周期孕育',
  养: '蓄养、待发',
};

/**
 * 把单柱格式化为可读文本（含十二长生、纳音五行）。
 */
function formatPillar(name: string, p: Pillar | null): string {
  if (!p) return `${name}：（时辰未知，未排时柱）`;
  const stage = `；长生十二：${p.twelveStage}`;
  return `${name}：${p.heavenlyStem}${p.earthlyBranch}（天干十神：${p.tenGod}；纳音：${p.naYin}(${p.naYinElement})；藏干：${p.hiddenStems.join('、')}；藏干十神：${p.hiddenStemTenGods.join('、')}${stage}）`;
}

/**
 * 重点段：十二长生速览（按柱汇总，给 LLM 一眼定位）。
 * 强制暴露在排盘结果区最前部，作为"重点段"。
 */
function formatTwelveStages(chart: BaziChart): string {
  const items = [
    { name: '年柱', p: chart.pillars.year },
    { name: '月柱', p: chart.pillars.month },
    { name: '日柱', p: chart.pillars.day },
    { name: '时柱', p: chart.pillars.hour },
  ];
  const lines: string[] = [];
  lines.push('【重点段 · 十二长生（按柱汇总）】');
  lines.push(
    '说明：每个地支相对日主天干所处的"长生十二"状态，是判断各柱旺衰与气机走向的关键指标。帝旺/临官/冠带为强；长生/养/胎为中性；沐浴/衰/病/死/墓/绝为弱/转化期。',
  );
  for (const it of items) {
    if (!it.p) {
      lines.push(`- ${it.name}：未知（时辰未排）`);
      continue;
    }
    const stage = it.p.twelveStage ?? '未取';
    const hint = TWELVE_STAGE_HINT[stage] ?? '';
    lines.push(
      `- ${it.name}：${it.p.heavenlyStem}${it.p.earthlyBranch} → ${stage}${hint ? `（${hint}）` : ''}`,
    );
  }
  return lines.join('\n');
}

/**
 * 重点段：合冲关系汇总（突出标注，强化 AI 解读权重）。
 * - 六合/三合/三会 → 化为"合局"
 * - 六冲/六害/三刑/破 → 主冲克
 */
function formatRelationshipsSummary(chart: BaziChart): string {
  if (chart.relationships.length === 0) {
    return '【重点段 · 合冲关系汇总】\n- 无显著合冲（命局结构相对静态）';
  }
  const lines: string[] = ['【重点段 · 合冲关系汇总】'];
  lines.push(
    '说明：合局（六合/三合/三会）合化后有"成局"之意，会强化某五行；冲/破/害/刑多为动荡、冲突、变化的信号。请在解读时重点引用。',
  );
  const grouped = new Map<string, string[]>();
  for (const r of chart.relationships) {
    const head = `${r.kind}：${r.positions.map((pos, k) => `${pos}[${r.chars[k]}]`).join(' ↔ ')}`;
    const tail = r.transformed ? ` → ${r.transformed}` : '';
    const note = r.note ? `（${r.note}）` : '';
    const tag = r.kind.includes('冲') || r.kind.includes('刑') || r.kind.includes('害') || r.kind.includes('破')
      ? '冲克'
      : '合局';
    const key = tag;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(`- ${head}${tail}${note}`);
  }
  for (const [tag, items] of grouped) {
    lines.push(`【${tag}】`);
    for (const i of items) lines.push(i);
  }
  return lines.join('\n');
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

  // ★ 重点段：十二长生（紧跟四柱之后，最显眼位置）
  lines.push(formatTwelveStages(chart));
  lines.push('');

  // ★ 重点段：合冲关系汇总（紧跟十二长生之后）
  lines.push(formatRelationshipsSummary(chart));
  lines.push('');

  lines.push(
    `五行力量（得分）：木 ${fe.scores.木}、火 ${fe.scores.火}、土 ${fe.scores.土}、金 ${fe.scores.金}、水 ${fe.scores.水}`,
  );
  // 五行强弱排序 + 缺失
  const ranked = fe.rankByScore.map((el) => `${el}(${fe.scores[el]})`).join(' > ');
  lines.push(`五行强弱排序：${ranked}`);
  if (fe.missingElements.length > 0) {
    lines.push(`五行缺失：${fe.missingElements.join('、')}（对应领域可能偏弱，可通过方位/颜色/职业调候）`);
  }
  lines.push(`日主旺衰：${strengthLabel}（力量分 ${fe.dayMasterScore}/100）`);
  lines.push(`喜用神：${fe.favorable.join('、')}；忌神：${fe.unfavorable.join('、')}`);
  lines.push('');

  // 命局格局
  if (chart.patterns.length > 0) {
    lines.push('【命局格局】');
    for (const p of chart.patterns) {
      lines.push(`- ${p.name}（${p.code}）：${p.description}`);
    }
    lines.push('');
  }

  // 详细合冲关系（配合重点段一起喂）
  if (chart.relationships.length > 0) {
    lines.push('【合冲关系 · 详细】');
    for (const r of chart.relationships) {
      const head = `${r.kind}：${r.positions.map((pos, k) => `${pos}[${r.chars[k]}]`).join(' ↔ ')}`;
      const tail = r.transformed ? ` → ${r.transformed}` : '';
      const note = r.note ? `（${r.note}）` : '';
      lines.push(`- ${head}${tail}${note}`);
    }
    lines.push('');
  }

  // 神煞（带出处）
  if (chart.shenshaDetail.length > 0) {
    lines.push('【神煞（带出处）】');
    const grouped = new Map<string, string[]>();
    for (const s of chart.shenshaDetail) {
      if (!grouped.has(s.name)) grouped.set(s.name, []);
      grouped.get(s.name)!.push(`${s.position}（${s.source}）`);
    }
    for (const [name, sources] of grouped) {
      lines.push(`- ${name}：${sources.join('、')}`);
    }
    lines.push('');
  }

  // 旬空
  if (chart.dayXunKong.length > 0) {
    lines.push(`【日柱旬空（空亡）】：${chart.dayXunKong.join('、')}`);
  }
  if (chart.mingGong) {
    lines.push(`【命宫】：${chart.mingGong}`);
  }

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
  lines.push(
    `性别：${chart.meta.gender === 'male' ? '男' : '女'}；时辰是否已知：${chart.meta.hourKnown ? '是' : '否'}；真太阳时校正：${chart.meta.trueSolarTimeApplied ? '已应用' : '未应用'}；引擎版本：${chart.engineVersion}`,
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
    `请仅针对【${label}】这一个维度，按下方指定的结构给出贴合上述盘面的白话解读（全文约 ${REPORT_TARGET_LENGTH} 字以内）。`,
    '要求：结合具体的十神、五行旺衰与喜用神、合冲关系、格局、神煞展开；给出可执行的正向建议；不要重复罗列原始干支数据；不要涉及其他维度。',
    dimension === 'health'
      ? '健康维度仅做五行养生方向的温和提示，严禁任何疾病诊断或病症断言。'
      : '',
    !chart.meta.hourKnown && (dimension === 'family' || dimension === 'luck')
      ? '注意：本命时辰未知，凡涉及时柱（如晚年、子女宫）的部分请说明其局限性。'
      : '',
    '',
    STRUCTURED_OUTPUT_GUIDE,
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

/**
 * 构建命盘概览（通俗解读）的消息序列。
 * 这是一个整体概览，比单维度报告更口语化、更通俗易懂，
 * 目标是让完全不懂命理的用户一眼看懂自己命盘的核心特点。
 */
export function buildOverviewMessages(
  chart: BaziChart,
  knowledge: KnowledgeChunk[],
): ChatMessage[] {
  const facts = formatChartFacts(chart);
  const kb = formatKnowledge(knowledge);

  const overviewGuide =
    '【输出结构 · 必须严格遵守】请【只使用】以下五个二级标题，按顺序输出，不要增删、改写或替换为其他标题：\n\n' +
    '## 一句话总结\n' +
    '（不超过 50 字，用最通俗的话概括这张命盘是什么样的人，不要铺垫）\n\n' +
    '## 你的日主是什么意思\n' +
    '（用大白话解释：日主天干是什么五行？这个五行代表什么性格？比如"丁火像烛光一样，外柔内刚，心思细腻"）\n\n' +
    '## 五行强弱怎么看\n' +
    '（解释：哪行最旺？哪行最弱或缺？缺了会怎么样？用比喻说明，比如"你的火很旺，像夏天的太阳，热情但容易急躁；金比较弱，做事可能不够果断"）\n\n' +
    '## 命盘里的关键信号\n' +
    '- 信号1：解释格局是什么意思（比如"伤官生财"格局就是靠才华/技术赚钱）\n' +
    '- 信号2：解释合冲关系是什么意思（比如"年月相冲，早年可能离家发展或与家人聚少离多"）\n' +
    '- 信号3：解释神煞/十二长生里值得注意的点\n' +
    '（3-5条即可，每条后面都要用括号加上人话翻译）\n\n' +
    '## 给你的小建议\n' +
    '- 建议1：适合的方向（方位/颜色/行业）\n' +
    '- 建议2：性格上可以调整的地方\n' +
    '- 建议3：今年大运流年的小提示\n' +
    '（2-3条即可，要具体、可执行、正向积极）';

  const userContent = [
    facts,
    '',
    kb,
    '',
    '请为这张命盘做一个【整体通俗解读】，全文约 600-800 字。',
    '【关键要求】',
    '1. 目标读者是【完全不懂命理术语】的普通人，所有专业术语（十神、格局、合冲、神煞、十二长生等）第一次出现时【必须用括号或直接用大白话解释】，不要让用户看不懂。',
    '2. 语气像朋友聊天一样轻松自然，不要用"命主""此造""逢凶化吉"之类的命理黑话，要用"你""我跟你说"这种口语化表达。',
    '3. 不要堆砌术语，不要罗列数据，重点是"翻译成人话"。',
    '4. 多打比方，比如把五行比作季节/天气/食材，把合冲比作人与人的关系。',
    '5. 必须严格遵守下方指定的输出结构。',
    '',
    overviewGuide,
  ].join('\n');

  return [
    { role: 'system', content: SYSTEM_CONSTRAINTS },
    { role: 'user', content: userContent },
  ];
}
