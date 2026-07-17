import { Fragment, type ReactNode } from 'react';

/**
 * 轻量 Markdown 渲染组件。
 *
 * 目的：把 AI 流式输出里的 Markdown 记号（#、**、-、1. 等）转成排版好的样式，
 * 而不是把这些符号原样显示给用户。内容本身不做任何删改，仅调整呈现样式。
 * 不依赖第三方库，兼容流式场景（每次用完整文本重新解析渲染）。
 */

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'divider' }
  | { type: 'paragraph'; text: string };

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const UL_RE = /^\s*[-*•]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)、]\s+(.*)$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;
const DIVIDER_RE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;

/**
 * 将纯文本按行解析为结构化块。
 */
function parseBlocks(input: string): Block[] {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
      paragraph = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushParagraph();
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
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
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
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-ink-900">
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
          className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[0.85em] text-ink-800"
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
  1: 'mt-4 mb-2 text-base font-semibold text-ink-900',
  2: 'mt-4 mb-2 text-sm font-semibold text-ink-900',
  3: 'mt-3 mb-1.5 text-sm font-semibold text-ink-800',
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
    <div className={`text-sm leading-relaxed text-ink-700 ${className}`}>
      {blocks.map((block, idx) => {
        const key = `blk-${idx}`;
        switch (block.type) {
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
                    <span className="mt-[0.5em] h-1 w-1 shrink-0 rounded-full bg-ink-300" />
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
                    <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-medium text-ink-600">
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
                className="my-2 border-l-2 border-ink-200 pl-3 text-ink-500"
              >
                {renderMultiline(block.text, key)}
              </blockquote>
            );
          case 'divider':
            return <hr key={key} className="my-3 border-ink-100" />;
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
