"use client";

import { useState } from "react";
import {
  formatItemConversionExperience,
  itemConversionPercent,
  itemConversionRawExperience,
  simulateItemInventoryConversion,
} from "@/lib/exp-tables";
import type { CustomRewardType } from "@/lib/exp-tables";
import { assetUrl } from "./asset-url";
import type { MainInputState } from "./use-main-input";

const LEVEL_MIN = 260;
const LEVEL_MAX = 295;

const ROWS: { type: CustomRewardType; mark: string; iconSrc: string; label: string; unit: string; sampleAmount: number; sampleUnit: string }[] = [
  { type: "crimson", mark: "CR", iconSrc: "", label: "크림슨 메카베리 농장", unit: "개", sampleAmount: 1, sampleUnit: "1개" },
  { type: "mech", mark: "ME", iconSrc: "/efficiency-icons/mekaberry.png", label: "메카베리 농장", unit: "개", sampleAmount: 1, sampleUnit: "1개" },
  { type: "blue", mark: "BL", iconSrc: "/efficiency-icons/blueberry.png", label: "블루베리 농장", unit: "개", sampleAmount: 1, sampleUnit: "1개" },
  { type: "potion279", mark: "비약", iconSrc: "", label: "전설 성장의 비약", unit: "개", sampleAmount: 1, sampleUnit: "1개" },
  { type: "sauna", mark: "VIP", iconSrc: "/efficiency-icons/vip-sauna.png", label: "VIP 사우나", unit: "시간", sampleAmount: 1, sampleUnit: "1시간" },
  { type: "adv", mark: "EXP", iconSrc: "", label: "상급 EXP 교환권", unit: "장", sampleAmount: 1000, sampleUnit: "1,000장" },
];

const clampLevel = (value: number) => Math.max(LEVEL_MIN, Math.min(LEVEL_MAX, Math.round(Number.isFinite(value) ? value : LEVEL_MIN)));
const clampExp = (value: number) => Math.max(0, Math.min(99.999, Number.isFinite(value) ? value : 0));

export default function ItemsPanel({ state, goPersonal }: { state: MainInputState; goPersonal: () => void }) {
  const { input } = state;
  // 레벨·경험치는 퍼스널 탭 값으로 시작하되 이 탭에서 따로 바꿔 볼 수 있다.
  const [levelText, setLevelText] = useState<string | null>(null);
  const [expText, setExpText] = useState<string | null>(null);
  const level = clampLevel(levelText === null ? input.level : Number(levelText));
  const exp = clampExp(expText === null ? input.exp : Number(expText));
  const inventory = {
    crimson: Math.max(0, input.items.crimson), adv: Math.max(0, input.items.adv), mech: Math.max(0, input.items.mech),
    blue: Math.max(0, input.items.blue), sauna: Math.max(0, input.items.sauna), potion279: Math.max(0, input.items.potion279),
  };
  const result = simulateItemInventoryConversion({ level, exp, inventory });
  const gain = (result.level - result.startLevel) * 100 + result.exp - result.startExp;
  const hasInventory = ROWS.some(row => inventory[row.type] > 0);

  return <section className="standalone-panel tab-panel efficiency-screen" id="items-panel" role="tabpanel" aria-labelledby="items-tab">
    <section className="item-conversion-panel" aria-labelledby="item-conversion-title">
      <div className="item-conversion-head">
        <div><span>보유 보상 · 획득량 환산</span><h2 id="item-conversion-title">전부 쓰면 어디까지 오르나요?</h2><p>퍼스널 버닝 탭에 입력한 보유량을 선택 레벨부터 순서대로 사용합니다. 레벨이 오르면 다음 아이템은 새 레벨 값을 적용합니다.</p></div>
        <div className="item-conversion-inputs">
          <label className="efficiency-level-picker" htmlFor="item-level-input">
            <span>현재 레벨</span>
            <div className="efficiency-level-control"><b>Lv.</b><input id="item-level-input" type="number" min={LEVEL_MIN} max={LEVEL_MAX} step="1" inputMode="numeric" aria-describedby="item-level-help"
              value={levelText ?? String(input.level)} onChange={event => setLevelText(event.target.value)} onBlur={() => setLevelText(String(level))} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></div>
            <small id="item-level-help">260~295</small>
          </label>
          <label className="item-conversion-exp" htmlFor="item-exp-input"><span>현재 경험치</span><div>
            <input id="item-exp-input" type="number" min="0" max="99.999" step="0.001" inputMode="decimal" value={expText ?? String(input.exp)} onChange={event => setExpText(event.target.value)} onBlur={() => setExpText(String(exp))} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /><b>%</b></div></label>
          <button type="button" className="item-conversion-sync" onClick={() => { setLevelText(null); setExpText(null); }}>퍼스널 탭 현재값 불러오기</button>
        </div>
      </div>
      <div className="item-conversion-result" aria-live="polite">
        <div className="item-conversion-route"><span>현재</span><b>Lv.{result.startLevel} {result.startExp.toFixed(3)}%</b><i aria-hidden="true">→</i><span>사용 후</span><strong>{result.reachedUpperLimit ? "Lv.296 이상" : `Lv.${result.level} ${result.exp.toFixed(3)}%`}</strong></div>
        <div className="item-conversion-totals"><span><small>레벨 진행도</small><b>+{Math.max(0, gain).toFixed(2)}%p</b></span><span><small>사용 경험치</small><b>{formatItemConversionExperience(result.totalRawExperience)}</b></span></div>
      </div>
      <div className="item-conversion-list" aria-label={`Lv.${level} 아이템별 경험치 환산`}>
        {ROWS.map(row => {
          const available = row.type !== "mech" || level >= 280;
          const raw = itemConversionRawExperience(row.type, level) * row.sampleAmount;
          const percent = itemConversionPercent(row.type, level, row.sampleAmount);
          return <article className={!available ? "unavailable" : ""} key={row.type}>
            <span className={`item-conversion-mark type-${row.type}`} aria-hidden="true">{row.iconSrc ? <i className="item-conversion-icon" style={{ backgroundImage: `url(${assetUrl(row.iconSrc)})` }} /> : row.mark}</span>
            <div className="item-conversion-name"><b>{row.label}</b><small>보유 {inventory[row.type].toLocaleString("ko-KR", { maximumFractionDigits: 2 })}{row.unit}</small></div>
            <div className="item-conversion-value"><small>{available ? row.sampleUnit : "사용 조건"}</small><b>{available ? formatItemConversionExperience(raw) : "Lv.280부터"}</b></div>
            <div className="item-conversion-percent"><small>획득량</small><b>{available ? `+${percent.toFixed(percent >= 1 ? 2 : 3)}%p` : "-"}</b></div>
          </article>;
        })}
      </div>
      {!hasInventory && <div className="item-conversion-empty"><p>보유량이 0이라 결과가 그대로입니다. 퍼스널 버닝 탭의 「모멘텀 패스 PLUS · 보유 아이템」에 실제 남은 수량을 입력해 주세요.</p><button type="button" onClick={goPersonal}>퍼스널 버닝 탭으로 이동</button></div>}
      <div className="item-conversion-notes">
        <p><b>사용 순서:</b> 블루베리 → 메카베리 → 크림슨 → VIP 사우나 → 전설 성장의 비약 → 상급 EXP. 크림슨은 메카베리와 같은 농장이지만 동렙몹 마릿수가 고정입니다.</p>
        <p><b>보유량:</b> 퍼스널 버닝 탭의 입력값입니다. PLUS 아이템은 10/22 02:00에 사라지니 이 탭은 사용 가능한 기간 안에 쓸 때의 환산입니다.</p>
        {level < 280 && <p><b>260~279:</b> 이 표는 아이템 자체 경험치 환산입니다.</p>}
        <a href="https://maplescouter.com/ko/exp/item" target="_blank" rel="noreferrer">메이플스카우터 소비아이템 환산과 대조</a>
      </div>
    </section>
  </section>;
}
