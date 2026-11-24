export const AI_REVIEW_DECLINED = "AI_REVIEW_DECLINED";

export function assessComparablePrice(askingPrice: number, comparablePrices: number[]) {
  if (comparablePrices.length < 3) return null;
  const prices = [...comparablePrices].sort((a, b) => a - b);
  const lower = prices[Math.floor((prices.length - 1) / 2)];
  const upper = prices[Math.floor(prices.length / 2)];
  const median = Math.round((lower + upper) / 2);
  if (median <= 0 || prices.at(-1)! > prices[0] * 2) return null;
  const score = Math.max(0, Math.min(100, Math.round(100 - 50 * askingPrice / median)));
  return { median, score, belowTypical: askingPrice < median * 0.9 };
}
