import { Fragment, type ReactNode } from 'react';

/**
 * 轻量 Markdown 渲染组件。
 *
 * 目的：把 AI 流式输出里的 Markdown 记号（#、**、-、1. 等）转成排版好的样式，
 * 而不是把这些符号原样显示给用户。内容本身不做任何删改，仅调整呈现样式。
 * 不依赖第三方库，兼容流式场景（每次用完整文本重新解析渲染）。
 *
 * 额外能力（针对命理解读场景定制）：
 * - 识别固定小标题（一句话结论/核心解读/关键要点/建议），渲染为差异化的
 *   结论卡 / 要点标签 / 建议框，而不是普通标题+段落。
 * - 识别【风险提示】【免责声明】前缀段落，渲染为醒目的警示条。
 * - 防御性解析三个反引号围栏代码块：即使模型未遵循"禁止代码块"的约束，
 *   也能正常渲染为 <pre><code>，而不是把裸露的 ``` 和大括号露在页面上。
 */

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'divider' }
  | { type: 'code'; text: string; lang?: string }
  | { type: 'callout'; kind: 'risk' | 'disclaimer'; text: string }
  | { type: 'conclusion'; text: string }
  | { type: 'highlights'; items: string[] }
  | { type: 'suggestions'; items: string[] }
  | { type: 'paragraph'; text: string };

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const UL_RE = /^\s*[-*•]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)、]\s+(.*)$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;
const DIVIDER_RE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const CODE_FENCE_RE = /^\s*```\s*([^\s`]*)\s*$/;
const CALLOUT_RE = /^\s*[【\[](风险提示|免责声明)[】\]]\s*(.*)$/;

/** 固定小标题 → 语义分类，用于差异化渲染 */
const SECTION_HEADING_MAP: Record<string, 'conclusion' | 'highlights' | 'suggestions' | null> = {
  一句话结论: 'conclusion',
  核心解读: null,
  关键要点: 'highlights',
  建议: 'suggestions',
};

function normalizeHeadingText(text: string): string {
  return text.replace(/[：:]\s*$/, '').trim();
}

/**
 * 将纯文本按行解析为结构化块。
 */
function parseBlocks(input: string): Block[] {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let pendingSection: 'conclusion' | 'highlights' | 'suggestions' | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      const text = paragraph.join('\n');
      if (pendingSection === 'conclusion') {
        blocks.push({ type: 'conclusion', text });
        pendingSection = null;
      } else {
        blocks.push({ type: 'paragraph', text });
      }
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trimEnd();

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    // 围栏代码块：防御性兜底，即使模型仍输出 ```json 之类内容，也整块渲染为代码样式
    const fenceOpen = CODE_FENCE_RE.exec(line);
    if (fenceOpen) {
      flushParagraph();
      const lang = fenceOpen[1] || undefined;
      const codeLines: string[] = [];
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        if (CODE_FENCE_RE.test(lines[j]) && lines[j].trim() === '```') break;
        codeLines.push(lines[j]);
      }
      blocks.push({ type: 'code', text: codeLines.join('\n'), lang });
      i = j; // 跳过闭合围栏
      continue;
    }

    if (DIVIDER_RE.test(line)) {
      flushParagraph();
      blocks.push({ type: 'divider' });
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushParagraph();
      const text = normalizeHeadingText(heading[2]);
      if (text in SECTION_HEADING_MAP) {
        const section = SECTION_HEADING_MAP[text];
        if (section === 'highlights' || section === 'suggestions') {
          // 后续的 ul/ol 项会被下面逻辑收集进 highlights/suggestions
          pendingSection = section;
          continue;
        }
        if (section === 'conclusion') {
          pendingSection = 'conclusion';
          continue;
        }
        // 核心解读等：无特殊语义，仍作普通小标题展示
        pendingSection = null;
        blocks.push({ type: 'heading', level: heading[1].length, text });
        continue;
      }
      pendingSection = null;
      blocks.push({ type: 'heading', level: heading[1].length, text });
      continue;
    }

    const callout = CALLOUT_RE.exec(line);
    if (callout) {
      flushParagraph();
      const kind = callout[1] === '风险提示' ? 'risk' : 'disclaimer';
      const rest = callout[2];
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'callout' && last.kind === kind) {
        last.text += (rest ? `\n${rest}` : '');
      } else {
        blocks.push({ type: 'callout', kind, text: rest });
      }
      continue;
    }

    const quote = QUOTE_RE.exec(line);
    if (quote) {
      flushParagraph();
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'quote') {
        last.text += '\n' + quote[1];
      } else {
        blocks.push({ type: 'quote', text: quote[1] });
      }
      continue;
    }

    const ul = UL_RE.exec(line);
    if (ul) {
      flushParagraph();
      if (pendingSection === 'highlights' || pendingSection === 'suggestions') {
        const targetType = pendingSection;
        const last = blocks[blocks.length - 1];
        if (last && last.type === targetType) {
          last.items.push(ul[1]);
        } else {
          blocks.push(
            targetType === 'highlights'
              ? { type: 'highlights', items: [ul[1]] }
              : { type: 'suggestions', items: [ul[1]] },
          );
        }
        continue;
      }
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'ul') last.items.push(ul[1]);
      else blocks.push({ type: 'ul', items: [ul[1]] });
      continue;
    }

    const ol = OL_RE.exec(line);
    if (ol) {
      flushParagraph();
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'ol') last.items.push(ol[1]);
      else blocks.push({ type: 'ol', items: [ol[1]] });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

/**
 * 解析行内记号：**加粗**、*斜体*、`代码`，返回 React 节点。
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-ink-900 dark:text-ink-100">
          {match[2]}
        </strong>,
      );
    } else if (match[4] !== undefined) {
      nodes.push(
        <em key={`${keyPrefix}-i-${i}`} className="italic">
          {match[4]}
        </em>,
      );
    } else if (match[6] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${i}`}
          className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[0.85em] text-ink-800 dark:bg-ink-800 dark:text-ink-200"
        >
          {match[6]}
        </code>,
      );
    }
    lastIndex = regex.lastIndex;
    i += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

/**
 * 渲染多行文本（段落内换行转 <br />）。
 */
function renderMultiline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split('\n');
  return parts.map((part, idx) => (
    <Fragment key={`${keyPrefix}-l-${idx}`}>
      {idx > 0 && <br />}
      {renderInline(part, `${keyPrefix}-${idx}`)}
    </Fragment>
  ));
}

const HEADING_CLASS: Record<number, string> = {
  1: 'mt-4 mb-2 text-base font-semibold text-ink-900 dark:text-ink-100',
  2: 'mt-4 mb-2 text-sm font-semibold text-ink-900 dark:text-ink-100',
  3: 'mt-3 mb-1.5 text-sm font-semibold text-ink-800 dark:text-ink-200',
};

/**
 * 富文本渲染。传入原始（含 Markdown 记号）文本，输出排版样式。
 */
export function RichText({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseBlocks(text);

  return (
    <div className={`text-sm leading-relaxed text-ink-700 dark:text-ink-300 ${className}`}>
      {blocks.map((block, idx) => {
        const key = `blk-${idx}`;
        switch (block.type) {
          case 'conclusion':
            return (
              <div
                key={key}
                className="mb-3 flex items-start gap-2.5 rounded-xl border border-fire/25 bg-fire/[0.06] px-4 py-3 dark:border-fire/30 dark:bg-fire/10"
              >
                <span className="mt-0.5 shrink-0 rounded-full bg-fire/15 px-2 py-0.5 text-[11px] font-medium text-fire dark:bg-fire/20">
                  结论
                </span>
                <p className="text-[0.95rem] font-medium leading-snug text-ink-900 dark:text-ink-100">
                  {renderInline(block.text, key)}
                </p>
              </div>
            );
          case 'highlights':
            return (
              <div key={key} className="my-3">
                <p className="mb-1.5 text-xs font-medium text-ink-400 dark:text-ink-500">关键要点</p>
                <div className="flex flex-wrap gap-1.5">
                  {block.items.map((it, i) => (
                    <span
                      key={`${key}-${i}`}
                      className="rounded-full border border-earth/30 bg-earth/[0.08] px-2.5 py-1 text-xs text-ink-700 dark:border-earth/30 dark:bg-earth/10 dark:text-ink-200"
                    >
                      {renderInline(it, `${key}-${i}`)}
                    </span>
                  ))}
                </div>
              </div>
            );
          case 'suggestions':
            return (
              <div
                key={key}
                className="my-3 rounded-xl border border-wood/25 bg-wood/[0.06] p-3 dark:border-wood/30 dark:bg-wood/10"
              >
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-wood">
                  <span aria-hidden>🌱</span>建议
                </p>
                <ul className="space-y-1">
                  {block.items.map((it, i) => (
                    <li key={`${key}-${i}`} className="flex gap-2 text-ink-700 dark:text-ink-300">
                      <span className="mt-[0.5em] h-1 w-1 shrink-0 rounded-full bg-wood" />
                      <span>{renderInline(it, `${key}-${i}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          case 'callout': {
            const isRisk = block.kind === 'risk';
            return (
              <div
                key={key}
                className={`my-3 rounded-lg border px-3 py-2 text-xs leading-relaxed ${
                  isRisk
                    ? 'border-fire/30 bg-fire/5 text-ink-600 dark:border-fire/30 dark:bg-fire/10 dark:text-ink-300'
                    : 'border-ink-200 bg-ink-50 text-ink-500 dark:border-ink-700 dark:bg-ink-800/60 dark:text-ink-400'
                }`}
              >
                <span className="mr-1 font-medium">{isRisk ? '⚠️ 风险提示' : '免责声明'}</span>
                {renderMultiline(block.text, key)}
              </div>
            );
          }
          case 'code':
            return (
              <pre
                key={key}
                className="my-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-100 dark:bg-ink-950"
              >
                <code>{block.text}</code>
              </pre>
            );
          case 'heading': {
            const cls = HEADING_CLASS[block.level] ?? HEADING_CLASS[3];
            const first = idx === 0 ? 'mt-0 ' : '';
            return (
              <p key={key} className={first + cls}>
                {renderInline(block.text, key)}
              </p>
            );
          }
          case 'ul':
            return (
              <ul key={key} className="my-2 space-y-1 pl-1">
                {block.items.map((it, i) => (
                  <li key={`${key}-${i}`} className="flex gap-2">
                    <span className="mt-[0.5em] h-1 w-1 shrink-0 rounded-full bg-ink-300 dark:bg-ink-600" />
                    <span>{renderInline(it, `${key}-${i}`)}</span>
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={key} className="my-2 space-y-1">
                {block.items.map((it, i) => (
                  <li key={`${key}-${i}`} className="flex gap-2">
                    <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                      {i + 1}
                    </span>
                    <span className="pt-px">{renderInline(it, `${key}-${i}`)}</span>
                  </li>
                ))}
              </ol>
            );
          case 'quote':
            return (
              <blockquote
                key={key}
                className="my-2 border-l-2 border-ink-200 pl-3 text-ink-500 dark:border-ink-700 dark:text-ink-400"
              >
                {renderMultiline(block.text, key)}
              </blockquote>
            );
          case 'divider':
            return <hr key={key} className="my-3 border-ink-100 dark:border-ink-800" />;
          case 'paragraph':
          default:
            return (
              <p key={key} className="my-2 first:mt-0 last:mb-0">
                {renderMultiline(block.text, key)}
              </p>
            );
        }
      })}
    </div>
  );
}
