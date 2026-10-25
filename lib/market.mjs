export const MARKET_DATE = '2026년 10월 25일 기준';
export const MARKET_DEFAULTS = Object.freeze({ maplePoints: 2150, won: 1550, shardPrice: 5900000, ordinaryPrice: 2050000, detectivePrice: 100000000 });
export const MAPLE_MARKET_FEE = 0.01;
export function normalizeMarket(raw) {
  return Object.fromEntries(Object.entries(MARKET_DEFAULTS).map(([key, fallback]) => {
    const n = raw?.[key];
    const valid = n !== null && n !== '' && n !== undefined && Number.isFinite(Number(n)) && (key === 'maplePoints' || key === 'won' ? Number(n) > 0 : Number(n) >= 0);
    return [key, valid ? Number(n) : fallback];
  }));
}
export const maplePointMeso = (mp, rate) => mp / (1 - MAPLE_MARKET_FEE) / rate * 1e8;
