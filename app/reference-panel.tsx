"use client";

import { couponRawForLevel, flameModelRaw, mobBaseExp, stepRawForLevel } from "@/lib/main-planner.mjs";
import { itemConversionRequiredExperience, MOMENTUM_PLUS_FREE, MOMENTUM_PLUS_PREMIUM, MOMENTUM_PLUS_PRIME } from "@/lib/exp-tables";
import { PERSONAL_BOSS_TABLE, PERSONAL_COUPON_MULTIPLE, PERSONAL_FLAME_MULTIPLE } from "@/lib/personal-data.mjs";

// 모멘텀 패스 PLUS 레벨별 보상 (넥슨 공지 update-813, 2026-10-03 대조). 계산에는 경험치가 되는 것만 쓴다.
const PLUS_LEVEL_ROWS: { level: number; free: string; premium: string; prime: string }[] = [
  { level: 1, free: "크림슨 메카베리 농장 1", premium: "VIP 부스터 10", prime: "경험치 4배 쿠폰(30분) 2" },
  { level: 2, free: "VIP 사우나 1", premium: "크림슨 메카베리 농장 1", prime: "상급 EXP 3,000" },
  { level: 3, free: "솔 에르다 1", premium: "경험치 4배 쿠폰 2", prime: "크림슨 메카베리 농장 3" },
  { level: 4, free: "상급 EXP 100", premium: "상급 EXP 1,500", prime: "경험치 4배 쿠폰 2" },
  { level: 5, free: "VIP 사우나 1", premium: "크림슨 메카베리 농장 2", prime: "상급 EXP 3,000" },
  { level: 6, free: "솔 에르다 1", premium: "VIP 부스터 10", prime: "크림슨 메카베리 농장 4" },
  { level: 7, free: "상급 EXP 100", premium: "상급 EXP 1,500", prime: "경험치 4배 쿠폰 2" },
  { level: 8, free: "VIP 사우나 1", premium: "크림슨 메카베리 농장 2", prime: "상급 EXP 3,000" },
  { level: 9, free: "솔 에르다 1", premium: "경험치 4배 쿠폰 2", prime: "VIP 부스터 20" },
  { level: 10, free: "상급 EXP 300", premium: "상급 EXP 1,500", prime: "크림슨 메카베리 농장 4" },
];

type Rewards = Record<number, { crimson?: number; adv?: number; sauna?: number; coupon4x?: number; booster?: number }>;
const total = (...tables: Rewards[]) => {
  const sum = { crimson: 0, adv: 0, sauna: 0, coupon4x: 0, booster: 0 };
  tables.forEach(table => Object.values(table).forEach(row => { sum.crimson += row.crimson || 0; sum.adv += row.adv || 0; sum.sauna += row.sauna || 0; sum.coupon4x += row.coupon4x || 0; sum.booster += row.booster || 0; }));
  return sum;
};
const fmt = (n: number) => n.toLocaleString("ko-KR");
const totalText = (sum: ReturnType<typeof total>) => `크림슨 ${sum.crimson} · 사우나 ${sum.sauna}시간 · 상급 EXP ${fmt(sum.adv)}${sum.coupon4x ? ` · 4배 쿠폰 ${sum.coupon4x}` : ""}${sum.booster ? ` · VIP 부스터 ${sum.booster}` : ""}`;

const LEVEL_ROWS = Array.from({ length: 20 }, (_, index) => 280 + index);
const jo = (raw: number, digits = 2) => `${(raw / 1e12).toFixed(digits)}조`;
const eok = (raw: number) => `${(raw / 1e8).toFixed(raw >= 1e10 ? 0 : 1)}억`;

export default function ReferencePanel() {
  const free = total(MOMENTUM_PLUS_FREE as Rewards);
  const premium = total(MOMENTUM_PLUS_FREE as Rewards, MOMENTUM_PLUS_PREMIUM as Rewards);
  const prime = total(MOMENTUM_PLUS_FREE as Rewards, MOMENTUM_PLUS_PREMIUM as Rewards, MOMENTUM_PLUS_PRIME as Rewards);
  const bosses = [...PERSONAL_BOSS_TABLE].sort((a, b) => b.unitExp - a.unitExp);
  const req287 = itemConversionRequiredExperience(287);

  return <section className="rewards-section passes-panel tab-panel" id="reference-panel" role="tabpanel" aria-labelledby="reference-tab">
    <div className="section-heading light"><span>표</span><div><p>본섭 · 2026-10-03 대조</p><h2>보상표와 자료</h2></div></div>
    <div className="pass-grid">
      <article>
        <div className="table-title"><span>MOMENTUM PLUS · 10/21 23:59 수령 마감</span><h3>모멘텀 패스 PLUS</h3></div>
        <div className="pb-table-wrap"><table>
          <thead><tr><th>레벨</th><th>무료</th><th>프리미엄</th><th>프라임</th></tr></thead>
          <tbody>
            {PLUS_LEVEL_ROWS.map(row => <tr key={row.level}><td>{row.level}</td><td>{row.free}</td><td>{row.premium}</td><td>{row.prime}</td></tr>)}
            <tr className="total"><td>무료 합계</td><td colSpan={3}>{totalText(free)}</td></tr>
            <tr className="total"><td>프리미엄까지</td><td colSpan={3}>{totalText(premium)} · 29,800 넥슨캐시</td></tr>
            <tr className="total"><td>프라임까지</td><td colSpan={3}>{totalText(prime)} · 69,600 넥슨캐시</td></tr>
          </tbody>
        </table></div>
        <p className="pb-note light">750포인트마다 1레벨, 주간 최대 2,500포인트 → 1주 Lv.3, 2주 Lv.6, 3주 Lv.10. 모든 보상은 10/22 02:00까지 사용합니다. 프라임은 프리미엄을 먼저 사야 하고 명의당 1회입니다. 프리미엄·프라임은 10/21 23:00까지 판매합니다. 전 주에 못 얻은 포인트는 100포인트당 1,000 메이플포인트로 살 수 있습니다.</p>
      </article>

      <article>
        <div className="table-title"><span>PERSONAL BURNING · 9/17 ~ 11/18 23:59</span><h3>퍼스널 버닝 규칙</h3></div>
        <div className="pb-table-wrap"><table>
          <tbody>
            <tr><td>대상</td><td>260~299레벨 · 어센틱포스 퀘스트 완료 · 명의당 1캐릭터 · 지정 후 취소 불가</td></tr>
            <tr><td>성장 미션</td><td>30단계. 목표를 넘으면 경험치와 퍼스널 코인 1,000개를 즉시 지급. 299레벨 약 68% 초과로 지정하면 300 초과 단계는 경험치 없음</td></tr>
            <tr><td>플레임</td><td>매주 목요일 0시 24,000마리 추가 · 보유 36,000 상한 · 처치 시 몬스터 레벨 경험치와 리워드 포인트 3 · 추가 경험치 효과 적용 안 됨 · 못 받은 수는 10 메이플포인트당 1마리 충전</td></tr>
            <tr><td>커스텀</td><td>포인트 3개를 솔 에르다 / 조각 / EXP에 분배. 모두 써야 플레임이 나옴</td></tr>
            <tr><td>교환</td><td>솔 에르다 포인트 1,500p → 희미한 솔 에르다의 기운 6 · 조각 포인트 1,500p → 솔 에르다 조각 1(영구) · EXP 포인트 100p → 퍼스널 EXP 교환권 1</td></tr>
            <tr><td>보스 미션</td><td>9/24부터. 지정 35개 보스·난이도, 보상 몬스터 처치 시 지급, 연습모드 제외, 파티원 수로 나눔, 파티 데미지 5% 미만이면 불가, 300레벨 지급 없음</td></tr>
            <tr><td>코인샵</td><td>같은 메이플ID의 260레벨 이상 모두 이용 · 카르마 블랙 큐브 85(100개) · 화이트 에디셔널 큐브 130(100개) · 심연의 환생의 불꽃 85(100개) · 솔 에르다 200(10개) · 솔 에르다 조각 15(300개) · 전 품목 36,500 / 30단계 30,000</td></tr>
            <tr><td>사용 기한</td><td>교환권·코인샵 구매품(조각 제외) 11/19 02:00까지</td></tr>
          </tbody>
        </table></div>
      </article>

      <article>
        <div className="table-title"><span>하루1소재 · 몬스터 기본 경험치</span><h3>레벨별 플레임·교환권</h3></div>
        <div className="pb-table-wrap"><table>
          <thead><tr><th>레벨</th><th>몬스터 기본 EXP</th><th>플레임 ×{PERSONAL_FLAME_MULTIPLE}</th><th>교환권 ×{PERSONAL_COUPON_MULTIPLE}</th><th>교환권 %</th><th>미션 한 칸</th></tr></thead>
          <tbody>{LEVEL_ROWS.map(level => {
            const required = level <= 295 ? itemConversionRequiredExperience(level) : 0;
            return <tr key={level}>
              <td>{level}</td><td>{fmt(mobBaseExp(level))}</td><td>{eok(flameModelRaw(level))}</td><td>{eok(couponRawForLevel(level))}</td>
              <td>{required ? `${(couponRawForLevel(level) / required * 100).toFixed(5)}%` : "-"}</td>
              <td>{level >= 280 && level <= 295 ? jo(stepRawForLevel(level)) : "-"}</td></tr>;
          })}</tbody>
        </table></div>
        <p className="pb-note light">플레임은 사냥터 몬스터 레벨, 교환권은 내 레벨 기준입니다. 본섭 9/23 플레임 로그 3건(273·275·276레벨 몬스터)이 ×72와 정확히 맞고, 교환권 표는 ×480과 260~299 전부 일치합니다. 미션 한 칸은 285 이상 표본 모형값이며 296 이상은 필요 경험치 표가 없어 비워 둡니다.</p>
      </article>

      <article>
        <div className="table-title"><span>하루1소재 · 솔로 경험치 · 레벨과 무관</span><h3>퍼스널 보스 미션 35개</h3></div>
        <div className="pb-table-wrap"><table>
          <thead><tr><th>보스</th><th>난이도</th><th>솔로 경험치</th><th>Lv.287 환산</th><th>최대 파티</th></tr></thead>
          <tbody>{bosses.map(entry => {
            const raw = entry.unitExp * 10_000;
            return <tr key={entry.id}><td>{entry.boss}</td><td>{entry.difficulty}</td><td>{jo(raw)}</td><td>{(raw / req287 * 100).toFixed(2)}%</td><td>{entry.maxParty}인</td></tr>;
          })}</tbody>
        </table></div>
        <p className="pb-note light">한 번 처치한 경험치 = 표 값 ÷ 파티원 수. 주간 보스는 보스당 난이도 1개, 최대 12개까지 셉니다. 공식 공지에 보스별 수치가 없어 하루1소재 값을 씁니다. 본섭 9/27 보스 미션 화면의 5개 값(세렌 노멀·하드, 칼로스 이지, 대적자 이지, 카링 이지)은 표와 정확히 일치했고 나머지 30개는 대조 전입니다. 경험치를 받는 인원은 총 피해의 5% 이상을 가한 파티원입니다.</p>
      </article>
    </div>
  </section>;
}
