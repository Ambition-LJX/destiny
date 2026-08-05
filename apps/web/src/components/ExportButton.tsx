'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * 命盘导出按钮：PNG + PDF（A4 多页）。
 *
 * 核心改进：
 * - 自动滚动到元素顶部再截图，避免视口截断
 * - 处理 echarts 等 canvas 元素（临时冻结为 <img>）
 * - 检测深色模式使用对应背景色
 * - 截图前等待 DOM 稳定（数据加载、动画结束）
 * - PDF 多页分页：按毫米精确切分，使用 canvas 切片保证每页内容完整
 */
export function ExportButton({
  getTarget,
  zodiac,
}: {
  getTarget: () => HTMLElement | null;
  zodiac?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    const onScroll = () => setMenuOpen(false);
    const onResize = () => setMenuOpen(false);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  /**
   * 截图核心：返回 dataURL 和实际尺寸信息。
   */
  async function capture() {
    const target = getTarget();
    if (!target) return null;

    // 保存当前滚动位置，滚动到元素顶部确保完整渲染，截图后还原
    const origScrollX = window.scrollX;
    const origScrollY = window.scrollY;
    const rect = target.getBoundingClientRect();
    window.scrollTo(origScrollX, window.scrollY + rect.top - 20);

    // 检测深色模式
    const isDark = document.documentElement.classList.contains('dark')
      || window.matchMedia('(prefers-color-scheme: dark)').matches;
    const bgColor = isDark ? '#1a1a1a' : '#ffffff';

    // 预处理：把所有 <canvas>（echarts 等）替换为对应的 <img dataURL>，html2canvas 才能正确捕获
    const restores: Array<() => void> = [];
    target.querySelectorAll('canvas').forEach((canvas) => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.width = canvas.style.width || `${canvas.width}px`;
        img.style.height = canvas.style.height || `${canvas.height}px`;
        img.style.display = 'block';
        const parent = canvas.parentElement;
        if (parent) {
          parent.insertBefore(img, canvas);
          canvas.style.display = 'none';
          restores.push(() => {
            canvas.style.display = '';
            img.remove();
          });
        }
      } catch {
        // cross-origin canvas，无法导出，保留原 canvas
      }
    });

    try {
      await sleep(150);
      await nextFrame();

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: bgColor,
        logging: false,
        imageTimeout: 15000,
        removeContainer: false,
        foreignObjectRendering: false,
        onclone(doc, cloned) {
          // 克隆后强制设置浅色文本（深色模式下导出白底时文字应为深色）
          if (!isDark) {
            cloned.querySelectorAll('.dark\\:text-ink-100, .dark\\:text-ink-200, .dark\\:text-ink-300').forEach((el) => {
              (el as HTMLElement).style.color = '#1f2937';
            });
          }
          // 移除可能干扰的动画和过渡
          cloned.querySelectorAll('*').forEach((el) => {
            const s = (el as HTMLElement).style;
            s.animation = 'none';
            s.transition = 'none';
          });
        },
      });

      return { dataUrl: canvas.toDataURL('image/png', 1.0), width: canvas.width, height: canvas.height, bgColor };
    } finally {
      // 还原 canvas 元素
      restores.forEach((r) => r());
      window.scrollTo(origScrollX, origScrollY);
    }
  }

  async function downloadPng() {
    setMenuOpen(false);
    setLoading(true);
    try {
      const res = await capture();
      if (!res) return;
      const link = document.createElement('a');
      link.download = `命盘${zodiac ? `（${zodiac}）` : ''}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = res.dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG 导出失败：', err);
      alert('导出失败，请重试。');
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    setMenuOpen(false);
    setLoading(true);
    try {
      const res = await capture();
      if (!res) return;

      const { dataUrl, width: pxW, height: pxH, bgColor } = res;

      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((ok) => { img.onload = () => ok(); });

      // A4 纵向
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();   // 210
      const pdfH = pdf.internal.pageSize.getHeight();  // 297

      const marginTop = 12;
      const marginBottom = 20;
      const marginSide = 12;
      const contentW = pdfW - marginSide * 2;  // 可用宽度
      const contentH = pdfH - marginTop - marginBottom;

      // 图片按宽度等比缩放
      const ratio = contentW / pxW;
      const drawW = pxW * ratio;    // mm
      const drawH = pxH * ratio;    // mm

      const x = (pdfW - drawW) / 2;
      const footerText = `玄学五术 · 命盘导出  ${new Date().toLocaleDateString('zh-CN')}  仅供娱乐参考`;

      const drawFooter = (pageNum: number, total: number) => {
        pdf.setFontSize(8);
        pdf.setTextColor(140);
        pdf.text(`${footerText}  ${pageNum}/${total}`, pdfW / 2, pdfH - 8, { align: 'center' });
      };

      // 设置 PDF 背景色（与截图背景一致）
      const setPageBg = () => {
        pdf.setFillColor(bgColor);
        pdf.rect(0, 0, pdfW, pdfH, 'F');
      };

      if (drawH <= contentH) {
        // 单页
        setPageBg();
        pdf.addImage(img, 'PNG', x, marginTop, drawW, drawH);
        drawFooter(1, 1);
      } else {
        // 多页：按像素切片，确保每页内容完整对齐
        const pages = Math.ceil(drawH / contentH);
        // 每页对应源图像的像素高度
        const pxPerPage = Math.ceil(pxH / pages);

        for (let p = 0; p < pages; p++) {
          if (p > 0) pdf.addPage();
          setPageBg();

          const srcY = p * pxPerPage;
          const srcH = Math.min(pxPerPage, pxH - srcY);
          const segH = srcH * ratio;

          // 用离屏 canvas 精确切片，避免 jsPDF addImage 的裁剪 bug
          const slice = document.createElement('canvas');
          slice.width = pxW;
          slice.height = srcH;
          const ctx = slice.getContext('2d')!;
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, pxW, srcH);
          ctx.drawImage(img, 0, srcY, pxW, srcH, 0, 0, pxW, srcH);
          const segUrl = slice.toDataURL('image/jpeg', 0.95);

          pdf.addImage(segUrl, 'JPEG', x, marginTop, drawW, segH);
          drawFooter(p + 1, pages);
        }
      }

      pdf.save(`命盘${zodiac ? `（${zodiac}）` : ''}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF 导出失败：', err);
      alert('PDF 导出失败，请尝试使用 PNG 导出。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        ref={btnRef}
        onClick={() => setMenuOpen((v) => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-700 shadow-sm transition-colors hover:border-ink-300 hover:bg-ink-50 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin text-ink-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            生成中…
          </>
        ) : (
          <>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v12" />
            </svg>
            导出命盘
          </>
        )}
      </button>

      {menuOpen && menuPos && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute rounded-xl border border-ink-200 bg-white p-1.5 shadow-xl dark:border-ink-700 dark:bg-ink-800"
            style={{ top: menuPos.top, right: menuPos.right, minWidth: 160 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={downloadPng}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-700 transition-colors hover:bg-wood/10 hover:text-wood dark:text-ink-200 dark:hover:text-wood"
            >
              <svg className="h-4 w-4 text-wood" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              导出 PNG 图片
            </button>
            <div className="my-1 border-t border-ink-100 dark:border-ink-700" />
            <button
              onClick={downloadPdf}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-700 transition-colors hover:bg-fire/10 hover:text-fire dark:text-ink-200 dark:hover:text-fire"
            >
              <svg className="h-4 w-4 text-fire" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
              </svg>
              导出 PDF（A4）
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function nextFrame() { return new Promise((r) => requestAnimationFrame(r)); }
