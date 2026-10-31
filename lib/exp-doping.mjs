import { finiteNumber } from './market.mjs';

// 하루1소재 공개 청크의 한계 증가량. 룬·아즈모스는 고정 계수를 확인하지 못해 선택지로 넣지 않는다.
export const DOPING_GROUPS = [
  { id: 'coupon', label: '경험치 쿠폰', options: [[0, '없음'], [200, '3배 쿠폰 (+200%)'], [300, '4배 쿠폰 (+300%)']] },
  { id: 'extra', label: '추가 경험치 버프', options: [[0, '없음'], [50, '추가 경험치 50%'], [70, '추가 경험치 70%']] },
  { id: 'potion', label: '경험치 축적의 비약', options: [[0, '없음'], [10, '소경축비 (+10%)'], [20, '고농축비 (+20%)']] },
  { id: 'ring', label: '경험치 반지', options: [[0, '없음'], [10, '혈맹의 반지 (+10%)'], [15, '경험치 부스트링 (+15%)']] },
];
export function normalizeDoping(raw, fallback = 0) {
  const d = raw && typeof raw === 'object' ? raw : { other: fallback };
  const result = Object.fromEntries(DOPING_GROUPS.map(group => [group.id, group.options.some(([v]) => v === Number(d[group.id])) ? Number(d[group.id]) : 0]));
  return { ...result, pendant: d.pendant === true, title: d.title === true,
    other: Number.isFinite(Number(d.other)) && Number(d.other) >= 0 ? Math.min(9999, Number(d.other)) : 0 };
}
export const dopingTotal = raw => {
  const d = normalizeDoping(raw);
  return Math.min(9999, d.coupon + d.extra + d.potion + d.ring + (d.pendant ? 30 : 0) + (d.title ? 100 : 0) + d.other);
};

// 비교용 도핑은 기간 전체의 사냥·쿠폰 재고와 분리한다.
export function normalizeEfficiencyDoping(raw) {
  const value = finiteNumber(raw?.bonus);
  const bonus = value !== null && value >= 0 ? Math.min(9999, value) : null;
  return { bonus, doping: bonus !== null && raw?.doping && typeof raw.doping === 'object' ? normalizeDoping(raw.doping) : null };
}
