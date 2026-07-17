/**
 * 免责声明横幅。首页与报告页显著展示。
 */
export function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-xs leading-relaxed text-ink-500">
        本产品属传统文化与娱乐范畴，排盘由算法完成、解读由 AI
        辅助生成，不构成医疗、投资、法律、婚恋等任何专业建议，请理性看待。
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-earth/30 bg-earth/5 px-5 py-4 text-sm leading-relaxed text-ink-600">
      <b className="text-earth">文化娱乐声明</b>
      ：本产品以传统命理文化为主题，八字排盘由确定性规则引擎计算，解读文字由大模型辅助生成，
      仅供文化娱乐与自我参考之用，<b>不构成医疗、投资、法律、婚恋等任何专业建议</b>
      。请勿据此做出重大决策，重要事项请咨询相应领域的专业人士。
    </div>
  );
}
