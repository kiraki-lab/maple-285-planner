"use client";
/* eslint-disable @next/next/no-img-element -- WZ 원본 아이콘을 정적 경로로 표시한다. */
import { useState } from 'react';
import { compareExpEfficiency, efficiencyDefaults } from '@/lib/exp-efficiency.mjs';
import { DOPING_GROUPS, normalizeDoping, dopingTotal } from '@/lib/exp-doping.mjs';
import { epicDungeonForLevel } from '@/lib/epic-dungeon.mjs';
import { MARKET_DATE, MARKET_DEFAULTS } from '@/lib/market.mjs';
import { DAILY_HUNT_LABEL, dailyHuntDescription, dailyHuntStatus } from '@/lib/main-planner.mjs';
import { assetUrl } from './asset-url';
import type { MainInput, MainInputState } from './use-main-input';

const number = (n: number, d = 0) => n.toLocaleString('ko-KR', { maximumFractionDigits: d });
const money = (n: number) => `${number(n / 10000, 2)}만 메소`;
const ICONS: Record<string, string> = {
  ordinary: '/experience-icons/ordinary-magnifier.png', detective: '/experience-icons/detective-magnifier.png',
  vipBooster: '/efficiency-icons/vip-booster.png', premium: '/efficiency-icons/momentum-premium.png',
  prime: '/efficiency-icons/momentum-prime.png', both: '/efficiency-icons/momentum-premium.png',
  monster: '/experience-icons/personal-flame.png', coupon: '/efficiency-icons/personal-exp-coupon.png',
};
const SHORT: Record<string, string> = {
  ordinary: '수상한 돋보기', detective: '탐정예티 돋보기', vipBooster: 'VIP 부스터',
  premium: '10월 패스 · 프리미엄', prime: '10월 패스 · 프라임 추가분', both: '10월 패스 · 두 줄 모두',
  monster: '플레임 1마리 충전', coupon: '퍼스널 EXP 교환권',
};
function Icon({ id, level }: { id: string; level: number }) {
  const src = id === 'epic1' || id === 'epic2' ? epicDungeonForLevel(level).icon : ICONS[id];
  return <img className="eff-icon" src={assetUrl(src)} alt="" width={38} height={38} />;
}
type Product = { id: string; label: string; rawExp: number; costMeso: number | null; available: boolean; priceNote: string; percent: number; mesoPerMob: number | null; relativeEpic1: number | null };
type Magnifier = Product & { thresholds: { id: string; label: string; price: number }[] };

export default function ExpEfficiencyPanel({ state }: { state: MainInputState }) {
  const { input, upd } = state;
  const [changed, setChanged] = useState<Record<string, string>>({});
  const [display, setDisplay] = useState<Record<string, string>>({});
  const [bases, setBases] = useState<Record<string, string>>({});
  const defaults = efficiencyDefaults(input);
  // 유효한 입력은 공유 상태에 저장하고, 입력 중인 문자열만 임시로 보존한다.
  const active = Object.fromEntries(Object.entries(changed).filter(([key]) => key === 'level' || key === 'fieldLevel' || String(defaults[key as keyof typeof defaults]) === bases[key]));
  const values = { ...defaults, ...active };
  const result = compareExpEfficiency(values, input);
  const level = Number(values.level), dungeon = epicDungeonForLevel(level);
  const doping = normalizeDoping(input.efficiency?.doping, Number(values.bonus));
  const updateValue = (key: string, text: string, shown = text) => {
    setBases(old => ({ ...old, [key]: String(defaults[key as keyof typeof defaults]) }));
    setDisplay(old => ({ ...old, [key]: shown }));
    setChanged(old => ({ ...old, [key]: text }));
    const value = Number(text);
    if (text === '' || !Number.isFinite(value) || value < 0 || (['maplePoints', 'won'].includes(key) && value === 0)) return;
    if (key in MARKET_DEFAULTS || (key === 'bonus' && value <= 9999)) {
      setChanged(old => { const next = { ...old }; delete next[key]; return next; });
      setDisplay(old => { const next = { ...old }; delete next[key]; return next; });
    }
    upd((draft: MainInput) => {
      if (key in MARKET_DEFAULTS) draft.market = { ...MARKET_DEFAULTS, ...draft.market, [key]: value };
      if (key === 'bonus' && value <= 9999) draft.efficiency = { bonus: value, doping: null };
    });
  };
  const updateDoping = (next: typeof doping) => {
    const bonus = dopingTotal(next);
    setChanged(old => { const rest = { ...old }; delete rest.bonus; return rest; });
    setDisplay(old => { const rest = { ...old }; delete rest.bonus; return rest; });
    upd((draft: MainInput) => { draft.efficiency = { doping: next, bonus }; });
  };
  const field = (key: keyof typeof values, label: string, min = 0, max?: number, scale = 1) => <label className="field eff-field" key={key} htmlFor={`eff-${key}`}><span>{label}</span><input id={`eff-${key}`} type="number" inputMode="decimal" step="any" min={min} max={max} value={key in active ? display[key] : (values[key] === '' ? '' : Number(values[key]) / scale)} onChange={e => updateValue(key, e.target.value === '' ? '' : String(Number(e.target.value) * scale), e.target.value)} /></label>;
  const rows = result.rows as Product[];
  const available = rows.filter(row => row.available), locked = rows.filter(row => !row.available);
  const ordinary = result.magnifiers[0] as Magnifier | undefined;
  const primary = ordinary?.thresholds[0].price ?? 0, current = ordinary?.costMeso;
  const verdict = current === null || current === undefined ? '시세를 넣어 주세요' : primary <= 0 ? '에픽 1단계가 유리해요' : current < primary ? '이득' : current > primary ? '손해' : '같아요';
  const good = primary > 0 && current !== null && current !== undefined && current <= primary;
  const maxCost = Math.max(1, ...available.map(row => row.mesoPerMob ?? 0));
  const comparison = (row: Product) => {
    if (!row.available) return row.id === 'vipBooster' ? '보유분부터 쓰세요' : '구매 불가';
    if (row.id === 'epic1') return '비교 기준';
    if (row.relativeEpic1 === null) return row.costMeso === null ? '시세를 넣어 주세요' : '에픽 1단계가 유리해요';
    if (row.relativeEpic1 <= 0) return '추가 비용 없어요';
    if (row.relativeEpic1 === 1) return '에픽 1단계와 같아요';
    return <>에픽 1단계보다 <b>{number(row.relativeEpic1 < 1 ? 1 / row.relativeEpic1 : row.relativeEpic1, 2)}배</b> {row.relativeEpic1 < 1 ? '싸요' : '비싸요'}</>;
  };
  const graph = (row: Product) => <article key={row.id} className={`eff-bar-row ${!row.available ? 'locked' : ''}`} data-product={row.id}>
    <div className="eff-bar-top"><Icon id={row.id} level={level} /><div><b>{SHORT[row.id] || row.label}</b><small>{row.id === 'detective' ? '도핑과 무관' : row.priceNote}</small></div><span className="eff-product-exp">+{number(row.percent, 4)}%<small>받는 경험치</small></span></div>
    <strong className={`eff-comparison ${row.relativeEpic1 !== null && row.relativeEpic1 < 1 ? 'good' : ''}`}>{comparison(row)}</strong>
    <div className="eff-bar-track" aria-hidden="true"><i style={{ width: `${row.mesoPerMob === null ? 0 : Math.max(1, row.mesoPerMob / maxCost * 100)}%` }} /></div>
    <div className="eff-bar-bottom"><span>{!row.available ? '구매 불가' : row.costMeso === null ? '시세 입력 전' : money(row.costMeso)}</span><small>{row.mesoPerMob === null ? '—' : number(row.mesoPerMob, 1)} 메소 / 1마리분</small></div>
  </article>;
  const priceCard = (row: Magnifier) => {
    const priceLine = row.thresholds[0].price, price = row.costMeso, vip = row.id === 'vipBooster';
    const limit = Math.max(priceLine * 2, (price ?? 0) * 1.2, 1);
    return <article className="eff-price-card" key={row.id} data-price-card={row.id}>
      <header><Icon id={row.id} level={level} /><div><h4>{SHORT[row.id]}</h4><p>{vip ? '보유분부터 쓰세요 · 수상한과 같은 경험치' : row.id === 'detective' ? '도핑과 무관' : '추가 경험치가 높을수록 유리해요'}</p></div></header>
      <p className="eff-price-reference"><Icon id="epic1" level={level} /><span>에픽 던전 1단계 ({dungeon.name}) 기준</span></p>
      <strong className="eff-price-number">{priceLine <= 0 ? '에픽 1단계가 먼저예요' : money(Math.floor(priceLine))}<small>{priceLine > 0 && (vip ? '보유분의 가치로 참고하세요' : '이하면 사세요')}</small></strong>
      {priceLine > 0 && !vip && <div className="eff-price-gauge" aria-label={`지금 시세 ${money(price ?? 0)}, 가격선 ${money(priceLine)}`}><i style={{ width: `${(price ?? 0) / limit * 100}%` }} /><b style={{ left: `${priceLine / limit * 100}%` }} /><div><span>지금 {price === null ? '시세 입력 전' : money(price)}</span><span>가격선</span></div></div>}
      <details className="eff-other-prices"><summary>1→2단계·교환권과도 비교하기</summary><dl>{row.thresholds.slice(1).map(ref => <div key={ref.id}><dt><Icon id={ref.id} level={level} />{ref.id === 'epic2' ? `에픽 1→2단계 (${dungeon.name})` : '퍼스널 EXP 교환권'}</dt><dd>{ref.price <= 0 ? '기준 상품이 유리해요' : money(Math.floor(ref.price))}</dd></div>)}</dl></details>
    </article>;
  };
  return <section className="exp-compare eff-redesign eff-simple" aria-labelledby="exp-compare-title">
    <div className="eff-page-heading"><div><span className="eff-eyebrow">지금 시세로 비교하기</span><h2 id="exp-compare-title">돋보기, 얼마면 사도 될까요?</h2></div><button type="button" onClick={() => { setChanged({}); setDisplay({}); setBases({}); upd((draft: MainInput) => { draft.efficiency = { bonus: null, doping: null }; }); }}>플래너 값으로 맞추기</button></div>
    {result.errors.length === 0 && <section className={`eff-verdict ${good ? 'is-good' : current === null || current === undefined ? '' : 'is-bad'}`} aria-label="지금의 구매 판단">
      <div className="eff-verdict-heading"><Icon id="ordinary" level={level} /><div><p>Lv.{values.level} · 사냥터 Lv.{values.fieldLevel} · 추가 경험치 {number(Number(values.bonus), 2)}%</p><h3>수상한 돋보기{primary > 0 ? <><strong data-price-line={primary}>{money(Math.floor(primary))}</strong><span>이하면 사세요</span></> : <strong>에픽 1단계가 먼저예요</strong>}</h3></div></div>
      <div className="eff-current-price" role="status" aria-live="polite"><span>지금 시세 {current === null || current === undefined ? '입력 전' : money(current)}</span><span aria-hidden="true">→</span><b className={current === null || current === undefined ? '' : good ? 'good' : 'bad'}>{verdict}</b></div>
      <p className="eff-verdict-reference"><Icon id="epic1" level={level} />에픽 던전 1단계 ({dungeon.name})와 같은 경험치로 비교해요.</p>
    </section>}

    <div className="eff-primary-inputs" aria-label="효율 비교 기본 입력">
      <div>{field('level', '캐릭터 레벨', 280, 299)}<small>사냥터 Lv.{values.fieldLevel} · 더 보기에서 변경</small></div>
      <div>{field('bonus', '추가 경험치 (%)', 0, 9999)}<input className="eff-doping-slider" type="range" aria-label="추가 경험치로 가격선 바꾸기" min={0} max={Math.max(700, Number(values.bonus) || 0)} step={1} value={Number(values.bonus) || 0} onChange={e => updateValue('bonus', e.target.value)} /></div>
      <div>{field('ordinaryPrice', '수상한 돋보기 (만 메소)', 0, undefined, 10000)}<small>{MARKET_DATE}</small></div>
      <div>{field('maplePoints', '1억 메소 = 메이플포인트', 1)}<small>{MARKET_DATE} · 수수료 1%</small></div>
    </div>
    <details className="eff-more-inputs"><summary>더 보기 <span>사냥터 · 탐정 시세 · 도핑 도우미</span></summary>
      <div className="eff-fields">{field('fieldLevel', '사냥터 몬스터 레벨', 260, 299)}{field('detectivePrice', '탐정예티 돋보기 (만 메소)', 0, undefined, 10000)}{field('won', '1억 메소 = 원', 1)}{field('shardPrice', '솔 에르다 조각 (만 메소)', 0, undefined, 10000)}</div>
      <p className="eff-help">탐정 시세는 {MARKET_DATE} 스카니아 매물 기준이에요. 메포 시세를 바꾸면 플래너의 에픽 비용도 함께 바뀌어요.</p>
      <details className="eff-helper"><summary>도핑 항목으로 합계 만들기</summary><p className="eff-help">이 비교에만 적용해요. 기간 사냥량과 보유 쿠폰은 바뀌지 않아요. 이미 포함한 버프는 중복해서 더하지 마세요.</p><div className="eff-fields">
        {DOPING_GROUPS.map(group => <label className="field" key={group.id}><span>{group.label}</span><select value={doping[group.id]} onChange={e => updateDoping({ ...doping, [group.id]: Number(e.target.value) })}>{group.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}
        <label className="eff-check"><input type="checkbox" checked={doping.pendant} onChange={e => updateDoping({ ...doping, pendant: e.target.checked })} />정령의 펜던트 +30%</label>
        <label className="eff-check"><input type="checkbox" checked={doping.title} onChange={e => updateDoping({ ...doping, title: e.target.checked })} />부티크 사냥 칭호 +100%</label>
        <label className="field"><span>그 외 추가 경험치 %</span><input type="number" min={0} max={9999} step="any" value={doping.other} onChange={e => updateDoping({ ...doping, other: Math.max(0, Number(e.target.value) || 0) })} /></label>
      </div></details>
      <p className="eff-help">추가 경험치를 직접 바꾸면 비교값으로 저장돼요. 플래너의 도핑을 가져오려면 「플래너 값으로 맞추기」를 누르세요.</p>
    </details>
    {result.errors.length > 0 ? <p role="alert">{result.errors.join(' ')}</p> : <>
      <section className="eff-chart" aria-labelledby="eff-chart-title"><div className="eff-section-heading"><h3 id="eff-chart-title">에픽 1단계보다 얼마나 쌀까요?</h3><span>{dungeon.name} 기준 · 짧은 막대가 더 저렴해요</span></div>
        {available.map(graph)}
        {locked.length > 0 && <details className="eff-locked"><summary>구매 불가 상품·VIP 부스터 보기 ({locked.length}개)</summary><div className="eff-locked-list">{locked.map(graph)}</div>{ordinary && priceCard({ ...ordinary, id: 'vipBooster', costMeso: null })}</details>}
        <p className="eff-help">에픽 비용은 주화 4개 판매금 1억 6천만 메소를 뺀 금액이에요. 경험치는 Lv.{result.level} 기준이에요.</p>
      </section>
      <section className="eff-price-section" aria-labelledby="eff-price-title"><div className="eff-section-heading"><h3 id="eff-price-title">돋보기별 살 만한 가격</h3><span>에픽 던전 1단계 기준</span></div><div className="eff-price-cards">{(result.magnifiers as Magnifier[]).map(priceCard)}</div></section>
      <section className="eff-doping-section"><p className="eff-doping-result" role="status">{result.breakBonus.kind === 'missing' ? '수상한 돋보기 시세를 넣어 주세요.' : result.breakBonus.kind === 'unavailable' ? '주화 판매액이 비용 이상이라 에픽 1단계가 먼저예요.' : result.breakBonus.kind === 'always' ? '지금 시세라면 추가 경험치 0%부터 수상한 돋보기가 저렴해요.' : <>지금 시세에서는 추가 경험치 약 <b>{number(result.breakBonus.value, 2)}%</b>가 손익분기예요. 더 높으면 수상한 돋보기가 저렴해요.</>}</p>
        <details className="eff-doping-bands"><summary>추가 경험치별 가격선 표 보기</summary><table className="exp-doping-table"><thead><tr><th>추가 경험치</th><th>1 EXP당 메소<br />수상한 / VIP</th><th>에픽 1단계 가격선</th><th>에픽 1→2단계 가격선</th></tr></thead><tbody>{result.dopingRows.map(row => <tr key={row.bonus} data-doping={row.bonus} className={row.selected ? 'selected' : ''} aria-current={row.selected ? 'true' : undefined}><th scope="row">{number(row.bonus, 2)}%{row.selected && <small>현재 입력</small>}</th><td data-label="1 EXP당 메소">{row.mesoPerExp === null ? '시세 입력 전' : number(row.mesoPerExp, 8)}<small>VIP 구매 불가</small></td><td data-label="에픽 1단계">{row.epic1Price <= 0 ? '에픽이 유리해요' : money(Math.floor(row.epic1Price))}</td><td data-label="에픽 1→2단계">{row.epic2Price <= 0 ? '에픽이 유리해요' : money(Math.floor(row.epic2Price))}</td></tr>)}</tbody></table></details>
      </section>
    </>}
    <details className="eff-notes"><summary>사용 전에 확인하세요</summary><ul><li>돋보기와 부스터는 100초에 190마리를 모두 잡는 기준이에요. 맵을 옮기면 효과가 사라져요.</li><li>탐정예티 돋보기는 도핑과 무관해요. 캐릭터당 수상한은 하루 10개, 메이플ID당 탐정은 하루 3개까지 쓸 수 있어요.</li><li>{DAILY_HUNT_LABEL}: {input.routine.dailyTenThousand ? '켬' : '끔'}. {dailyHuntDescription(input)} {dailyHuntStatus(input)}.</li><li>패스는 무료 보상을 뺀 유료 줄만 비교해요. 크림슨 입장권을 모두 써야 표시된 경험치를 받아요.</li><li>VIP 부스터는 구매할 수 없어요. 보유분을 먼저 쓰세요.</li></ul></details>
  </section>;
}
