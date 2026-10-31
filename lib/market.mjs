export const MARKET_DATE = '2026년 10월 25일 기준';
export const MARKET_DEFAULTS = Object.freeze({ maplePoints: 2150, won: 1550, shardPrice: 5900000, ordinaryPrice: 2050000, detectivePrice: 100000000 });
export const MAPLE_MARKET_FEE = 0.01;
// 저장값·입력칸은 숫자 문자열을 넘길 수 있다. 숫자와 숫자 문자열만 받고 true·[]·빈칸은 값이 없는 것으로 본다.
export const finiteNumber = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') { const n = Number(value); return Number.isFinite(n) ? n : null; }
  return null;
};
export function normalizeMarket(raw) {
  return Object.fromEntries(Object.entries(MARKET_DEFAULTS).map(([key, fallback]) => {
    const n = finiteNumber(raw?.[key]);
    const valid = n !== null && (key === 'maplePoints' || key === 'won' ? n > 0 : n >= 0);
    return [key, valid ? n : fallback];
  }));
}
export const maplePointMeso = (mp, rate) => mp / (1 - MAPLE_MARKET_FEE) / rate * 1e8;
