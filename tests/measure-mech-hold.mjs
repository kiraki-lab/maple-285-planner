import { readFileSync } from "node:fs";
const root=new URL("file:///C:/Users/nms07/OneDrive/%EB%AC%B8%EC%84%9C/New%20project/maple-285-strategy/");
const man=JSON.parse(readFileSync(new URL("dist/client/.vite/manifest.json",root),"utf8"));
const m=await import(new URL(`dist/client/${man["app/page.tsx"].file}`,root).href);
// 네 사례 모두 동일 조건: 2026-08-30 시작 · 예측 모드 · 크림슨 17장 보유 · 몬파 7판
const far=(lvl,exp,hold)=>{
  const s={...m.createDefaultSettings("2026-08-30"), level:lvl, exp, calcMode:"forecast", ownedCrimson:17, momentumMechLevel:hold, mechHoldAuto:false};
  const r=m.simulate(s,{fixedRuns:7});
  return {lv:r.finalLevel, ex:r.finalExp, p:r.finalLevel+r.finalExp/100};
};
console.log("조건: 2026-08-30 시작 · 예측(9/16) · 크림슨 17장 · 몬파 7판 · mechHoldAuto=false\n");
for(const [lvl,exp] of [[283,0],[286,74],[287,0],[288,50]]){
  const a=far(lvl,exp,280), b=far(lvl,exp,295);
  const d=(b.p-a.p)*100;
  console.log(`Lv.${lvl} ${exp}%: 즉시 Lv.${a.lv} ${a.ex.toFixed(2)}% · 모음 Lv.${b.lv} ${b.ex.toFixed(2)}%  → ${d>0?"모으기 +":"즉시 "}${Math.abs(d).toFixed(2)}%p`);
}
