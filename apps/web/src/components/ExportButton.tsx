'use client';

import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * 命盘导出按钮组件。
 *
 * 使用方式：
 *   <ExportButton targetRef={chartContentRef} zodiac="马" />
 *
 * 点击后弹出菜单，可导出为 PNG 或 PDF。
 * - PNG：直接下载当前可见的 DOM 截图（保留样式）。
 * - PDF：生成 A4 纵向 PDF，命盘截图居中放置。
 */
export function ExportButton({
  targetRef,
  zodiac,
}: {
  /** 指向要捕获的 DOM 元素的 ref（如命盘区域的 ref） */
  targetRef: RefObject<HTMLElement>;
  zodiac?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function capture(): Promise<string | null> {
    if (!targetRef.current) return null;
    const canvas = await html2canvas(targetRef.current, {
      scale: 2, // 2x 高清
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    return canvas.toDataURL('image/png', 1.0);
  }

  async function downloadPng() {
    setMenuOpen(false);
    setLoading(true);
    try {
      const dataUrl = await capture();
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.download = `命盘${zodiac ? `（${zodiac}）` : ''}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    setMenuOpen(false);
    setLoading(true);
    try {
      const dataUrl = await capture();
      if (!dataUrl) return;
      const canvas = document.createElement('canvas');
      // 重建 canvas 以便获取尺寸
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => (img.onload = res));

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfH = pdf.internal.pageSize.getHeight(); // 297mm

      // 计算宽高比适配 A4
      const imgW = img.width;
      const imgH = img.height;
      const ratio = Math.min(pdfW / (imgW / 2), (pdfH - 30) / (imgH / 2));
      const outW = (imgW / 2) * ratio;
      const outH = (imgH / 2) * ratio;
      const x = (pdfW - outW) / 2;
      const y = 15;

      pdf.addImage(dataUrl, 'PNG', x, y, outW, outH);

      // 页脚
      pdf.setFontSize(9);
      pdf.setTextColor(150);
      pdf.text(
        `玄学五术 · 命盘导出  ${new Date().toLocaleDateString('zh-CN')}  仅供娱乐参考，不构成专业建议`,
        pdfW / 2,
        pdfH - 8,
        { align: 'center' },
      );

      pdf.save(`命盘${zodiac ? `（${zodiac}）` : ''}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-700 shadow-sm transition-colors hover:border-ink-300 hover:bg-ink-50 disabled:opacity-50"
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

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-36 rounded-lg border border-ink-200 bg-white shadow-lg">
            <button
              onClick={downloadPng}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
            >
              <svg className="h-4 w-4 text-wood" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              导出 PNG 图片
            </button>
            <div className="border-t border-ink-100" />
            <button
              onClick={downloadPdf}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
            >
              <svg className="h-4 w-4 text-fire" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
              </svg>
              导出 PDF（A4）
            </button>
          </div>
        </>
      )}
    </div>
  );
}
