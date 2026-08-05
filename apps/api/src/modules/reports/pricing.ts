/**
 * LLM 成本估算工具。
 *
 * 价格以「人民币 / 每百万 token」为单位，来自 DeepSeek 官方定价页：
 * https://api-docs.deepseek.com/zh-cn/quick_start/pricing
 *
 * deepseek 输入区分「缓存命中」与「缓存未命中」两档价（prompt caching 命中时
 * 输入按缓存价计费）；输出单价统一。其他供应商（gpt 等）价格按 7.2 汇率换算为
 * 人民币仅供参考，实际以供应商为准，可在此调整。
 */
import type { LlmUsage } from '../ai/llm/llm.types';

/** 模型单价（人民币 / 每百万 token）。costCacheHitPerM 表示输入缓存命中价。 */
interface ModelPrice {
  key: string;
  inputPerM: number;
  outputPerM: number;
  /** 输入缓存命中单价（无缓存优惠的模型为与 inputPerM 相同） */
  inputCacheHitPerM: number;
}

const PRICING: ModelPrice[] = [
  // deepseek 官方价（人民币），参考 https://api-docs.deepseek.com/zh-cn/quick_start/pricing
  {
    key: 'deepseek-v4-flash',
    inputPerM: 1,
    outputPerM: 2,
    inputCacheHitPerM: 0.02,
  },
  {
    key: 'deepseek-v4-pro',
    inputPerM: 3,
    outputPerM: 6,
    inputCacheHitPerM: 0.025,
  },
  // 兼容旧模型名：deepseek-chat/reasoner 对应 v4-flash 的非思考/思考模式
  {
    key: 'deepseek-reasoner',
    inputPerM: 1,
    outputPerM: 2,
    inputCacheHitPerM: 0.02,
  },
  {
    key: 'deepseek-chat',
    inputPerM: 1,
    outputPerM: 2,
    inputCacheHitPerM: 0.02,
  },
  // gpt 系列（美元按 7.2 折算为人民币，仅供参考）
  { key: 'gpt-4o-mini', inputPerM: 1.08, outputPerM: 4.32, inputCacheHitPerM: 1.08 },
  { key: 'gpt-4o', inputPerM: 18, outputPerM: 72, inputCacheHitPerM: 18 },
  { key: 'gpt-4', inputPerM: 216, outputPerM: 432, inputCacheHitPerM: 216 },
  // 默认兜底（未知模型，按 flash 价保守估算）
  { key: '*', inputPerM: 1, outputPerM: 2, inputCacheHitPerM: 0.02 },
];

/** 解析模型单价，未知模型回退到兜底价。 */
export function resolvePrice(model: string): ModelPrice {
  const lower = model.toLowerCase();
  return (
    PRICING.find((p) => p.key !== '*' && lower.includes(p.key)) ??
    PRICING[PRICING.length - 1]
  );
}

/**
 * 根据模型名与用量估算成本（人民币）。
 * 输入按缓存命中/未命中分别计价；无用量时返回 0。
 */
export function estimateCost(model: string, usage?: LlmUsage | null): number {
  if (!usage || !usage.totalTokens) return 0;
  const price = resolvePrice(model);
  const hit = usage.promptCacheHitTokens ?? 0;
  const miss = usage.promptCacheMissTokens ?? usage.promptTokens - hit;
  const inputCost =
    (hit / 1_000_000) * price.inputCacheHitPerM +
    (Math.max(miss, 0) / 1_000_000) * price.inputPerM;
  const outputCost = (usage.completionTokens / 1_000_000) * price.outputPerM;
  return roundCost(inputCost + outputCost);
}

/**
 * 按模型名与给定输入/输出 token 数估算成本（人民币）。
 * 可指定命中缓存的输入 token 数 inputCacheHitTokens，默认全部按未命中计价。
 */
export function estimateCostFromTokens(
  model: string,
  inputTokens: number,
  outputTokens: number,
  inputCacheHitTokens = 0,
): number {
  const price = resolvePrice(model);
  const hit = Math.min(inputCacheHitTokens, inputTokens);
  const miss = Math.max(inputTokens - hit, 0);
  const inputCost =
    (hit / 1_000_000) * price.inputCacheHitPerM +
    (miss / 1_000_000) * price.inputPerM;
  const outputCost = (outputTokens / 1_000_000) * price.outputPerM;
  return roundCost(inputCost + outputCost);
}

/** 保留到 6 位小数，避免浮点误差。 */
export function roundCost(cost: number): number {
  return Math.round(cost * 1_000_000) / 1_000_000;
}