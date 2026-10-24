"use client";

import { useState } from "react";
import { compareExpEfficiency, efficiencyDefaults } from "@/lib/exp-efficiency.mjs";
import { detectiveDailyPlan } from "@/lib/main-planner.mjs";
import type { MainInput } from "./use-main-input";

const number = (value: number, digits = 0) => value.toLocaleString("ko-KR", { maximumFractionDigits: digits });
const meso = (value: number) => `${number(value)} 메소`;
const FIELDS = [
  ["level", "캐릭터 레벨", 280, 299],
  ["fieldLevel", "사냥터 몬스터 레벨", 260, 299],
  ["bonus", "사냥 추가 경험치 %", 0],
  ["maplePoints", "1억 메소 = 메이플포인트", 1],
  ["won", "1억 메소 = 원", 1],
  ["shardPrice", "솔 에르다 조각 시세 (메소)", 0],
  ["ordinaryPrice", "수상한 돋보기 시세 (메소)", 0],
  ["detectivePrice", "탐정예티 돋보기 시세 (메소)", 0],
] as const;

export default function ExpEfficiencyPanel({ input }: { input: MainInput }) {
  const [changed, setChanged] = useState<Record<string, string>>({});
  const values = { ...efficiencyDefaults(input), ...changed };
  const result = compareExpEfficiency(values, input);
  // 받기 선택을 꺼 둔 사람에게도 사냥량으로 무료 1개를 받을 수 있는지는 보여 준다.
  const daily = detectiveDailyPlan({ ...input, magnifiers: { ...input.magnifiers, detectiveFree: true } });
  return <section className="exp-compare" aria-labelledby="exp-compare-title">
    <div className="exp-compare-heading"><div><h2 id="exp-compare-title">경험치 상품 효율 비교</h2>
      <p>같은 메소로 경험치를 얼마나 받을까요? 1마리분당 메소가 작을수록 좋아요.</p></div>
      <button type="button" onClick={() => setChanged({})}>플래너 값으로 맞추기</button></div>
    <div className="exp-compare-inputs">{FIELDS.map(([key, label, min, max]) => <label className="field" key={key} htmlFor={`eff-${key}`}>
      <span>{label}</span><input id={`eff-${key}`} type="number" inputMode="decimal" min={min} max={max}
        step={key === "bonus" ? "any" : "1"} placeholder={key.endsWith("Price") && key !== "shardPrice" ? "시세를 넣어 주세요" : undefined}
        value={values[key]} onChange={event => setChanged(old => ({ ...old, [key]: event.target.value }))} />
    </label>)}</div>
    {result.errors.length > 0 ? <p role="alert">{result.errors.join(" ")}</p> : <>
      <p className="exp-compare-caption">Lv.{result.level} 몬스터 1마리분 경험치당 메소 · 좋은 순서대로 · 에픽은 주화 4개 판매액 1억 6천만 메소를 뺀 값</p>
      <table className="exp-compare-table" aria-label="경험치 상품 효율 좋은 순서">
        <thead><tr><th>상품</th><th>가격</th><th>받는 경험치</th><th>1마리분당 메소 ↓</th><th>에픽 1단계 대비</th></tr></thead>
        <tbody>{result.rows.map(row => <tr key={row.id} data-product={row.id}>
          <th scope="row">{row.label}{!row.available && <strong className="exp-unavailable">{row.id === "monster" ? "커스텀 3점을 나눠 주세요" : "구매 불가"}</strong>}</th>
          <td data-label="가격">{!row.available ? "—" : row.costMeso === null ? "시세 입력 전" : meso(row.costMeso)}<small>{row.priceNote}</small></td>
          <td data-label="받는 경험치">{number(row.percent, 4)}%<small>{number(row.rawExp / 1e8, 2)}억 EXP</small></td>
          <td data-label="1마리분당 메소">{row.mesoPerMob === null ? "—" : number(row.mesoPerMob, 2)}</td>
          <td data-label="에픽 1단계 대비">{row.relativeEpic1 === null ? "—" : `${number(row.relativeEpic1, 2)}배`}</td>
        </tr>)}</tbody></table>
      <p className="exp-compare-caption">경험치 %는 입력한 캐릭터 레벨에서의 양이에요. 패스는 무료 보상을 뺀 유료 줄만 비교해요. 9월 구매 기록에 따라 살 수 있는 줄이 달라져요.</p>
      <div className="exp-compare-breaks">{result.magnifiers.map(row => <article key={row.id} aria-labelledby={`break-${row.id}`}>
        <h3 id={`break-${row.id}`}>{row.label} · 손익분기 가격</h3>
        <p>아래 가격 이하면 같은 경험치를 더 싸게 받아요.</p>
        <dl>{row.thresholds.map(ref => <div key={ref.id}><dt>{ref.label}</dt><dd>{ref.price < 0 ? "기준 상품에서 메소가 남아요" : meso(Math.floor(ref.price))}</dd>
          {ref.verdict && <p>지금 시세로는 {ref.label}{ref.verdict === "같아요" ? "와 가격이 같아요" : `보다 ${ref.verdict}`}</p>}</div>)}</dl>
        <p>{row.id === "detective" ? `하루 1만 마리 사냥하면 매일 1개 무료 · 지금 사냥량은 하루 ${number(Math.floor(daily.huntKillsPerDay))}마리, ${daily.free ? "무료 1개를 받아요" : "무료를 받지 못해요"}. 메이플ID당 하루 3개까지 써요.` : "캐릭터당 하루 10개까지 써요."}</p>
      </article>)}</div>
      {result.rows.find(row => row.id === "epic1")!.costMeso! <= 0 && <p>에픽 1단계는 주화 판매액이 비용 이상이라 배수 비교를 표시하지 않아요.</p>}
    </>}
    <ul className="exp-compare-notes"><li>돋보기와 부스터는 100초 안에 190마리를 다 잡아야 이 경험치를 받아요. 맵을 옮기면 효과가 사라져요.</li>
      <li>탐정예티 돋보기는 높은 레벨 사냥터에서 쓸수록 좋아요. 경험치 버프는 영향을 주지 않아요.</li>
      <li>패스는 크림슨 입장권을 모두 써야 표의 경험치를 받아요.</li></ul>
  </section>;
}
