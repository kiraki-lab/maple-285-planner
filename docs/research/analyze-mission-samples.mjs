import fs from 'node:fs';
import { buildMissionTable, stepRawForLevel, stepRewardRawForLevel } from '../../lib/main-planner.mjs';
import { createMainContext } from '../../lib/exp-tables.ts';
import { MOB_BASE_EXP } from '../../lib/personal-data.mjs';
const ctx = createMainContext();
const ai = JSON.parse(fs.readFileSync(new URL('./maple-ai-mission-samples.json', import.meta.url), 'utf8'));
const text = fs.readFileSync(new URL('../../tests/main-planner.test.mjs', import.meta.url), 'utf8');
const targets = JSON.parse(text.match(/const SAMPLE_TARGETS = (\[[\s\S]*?\]);/)[1].replace(/,\s*]/g, ']'));
const main = { source: 'https://gnswo1207.tistory.com/105', designationConfirmed: true, designation: {level:287,percent:20.162}, stages: targets.map(([level,percent],i)=>({stage:i+1,level,percent,rewardRaw:i<8?2093653887402:i<19?2120693506122:2144810694332})) };
const account = { source: 'representative in-game screen, literal regression sample in tests/main-planner.test.mjs', designationConfirmed:false, current:{level:286,percent:68,stepsDone:4}, stages:[[5,286,69.714],[6,286,80.123],[7,286,90.532],[8,287,.866],[9,287,10.446],[30,289,2.496]].map(([stage,level,percent])=>({stage,level,percent})) };
const finals = [[260,0,283,23],[270,5,284,15],[275,6.9,285,.9],[280,11,286,3],[285,71.5,288,65.61],[286,0,288,87.75],[290,6.3,291,51.851],[291,0,292,34.842],[293,8.4,294,22.975],[294,0,295,4.01]].map(([level,percent,targetLevel,targetPercent])=>({source:'https://www.inven.co.kr/board/maple/5974/7170777',server:'KMST 1.2.206, 2026-09-11',designation:{level,percent},target:{stage:30,level:targetLevel,percent:targetPercent}}));
const all = [...ai.samples.map((s,i)=>({...s,id:'ai-'+i})),{...main,id:'live-287'},{...account,id:'live-286'}];
function rawDistance(a,b) {let raw=0;for(let l=a.level;l<=b.level;l++)raw+=ctx.reqRaw(l)*((l===b.level?b.percent:100)-(l===a.level?a.percent:0))/100;return raw;}
const intervals=[];
for(const s of all)for(let i=1;i<s.stages.length;i++){const a=s.stages[i-1],b=s.stages[i];if(b.stage!==a.stage+1)continue;const raw=rawDistance(a,b);intervals.push({sample:s.id,fromStage:a.stage,toStage:b.stage,fromLevel:a.level,toLevel:b.level,raw,gapPct:a.level===b.level?b.percent-a.percent:null,rewardSubtractedRaw:raw-(a.rewardRaw??stepRewardRawForLevel(a.level))});}
const errors=all.map(s=>{const first=s.stages[0];const built=buildMissionTable({mode:'screen',stepsDone:first.stage-1,nextTarget:{level:first.level,exp:first.percent},nextRewardPct:first.rewardPercent??0},ctx);let max=0,last=0;for(const t of s.stages){const p=built.steps.find(p=>p.index===t.stage);if(!p)continue;const err=100*(p.level-t.level)+p.exp-t.percent;max=Math.max(max,Math.abs(err));last=err;}return {sample:s.id,maxErrorPctPoints:max,lastErrorPctPoints:last};});
function affine(rows){const n=rows.length,x=rows.map(r=>MOB_BASE_EXP[r.fromLevel]/1e6),y=rows.map(r=>r.raw/1e12);const mx=x.reduce((a,b)=>a+b,0)/n,my=y.reduce((a,b)=>a+b,0)/n;const a=x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0)/x.reduce((s,v)=>s+(v-mx)**2,0);const b=my-a*mx;return {slope:a*1e6,interceptRaw:b*1e12,maxRawResidual:Math.max(...rows.map((r,i)=>Math.abs((a*x[i]+b-y[i])*1e12))),maxPercentPointResidual:Math.max(...rows.map((r,i)=>Math.abs((a*x[i]+b-y[i])*1e12/ctx.reqRaw(r.fromLevel)*100)))};}
const fits={};for(const [name,lo,hi] of [['286-289',286,289],['290-293-excluding-conflict',290,293],['290-293-all',290,293]]){const rows=intervals.filter(r=>r.fromLevel===r.toLevel&&r.fromLevel>=lo&&r.fromLevel<=hi&&(!name.includes('excluding')||!(r.sample==='ai-3'&&r.fromLevel===290)));fits[name]=affine(rows);}
// 표시값 자체를 정답으로 역산해 점을 맞추는 대신, 각 목표의 반올림 오차 ±0.0005%p를 허용한다.
// 모든 두 목표 쌍이 허용하는 일정 간격의 교집합이 비면 그 레벨의 일정 간격으로는 재현할 수 없다.
const roundingChecks = [];
for (const sample of all) {
  const levels = [...new Set(sample.stages.map(row => row.level))];
  for (const level of levels) {
    const rows = sample.stages.filter(row => row.level === level);
    if (rows.length < 3) continue;
    let low = -Infinity, high = Infinity, lowerPair, upperPair;
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      const distance = rows[j].stage - rows[i].stage;
      const gap = rows[j].percent - rows[i].percent;
      const lo = (gap - 0.001) / distance, hi = (gap + 0.001) / distance;
      if (lo > low) { low = lo; lowerPair = [rows[i].stage, rows[j].stage]; }
      if (hi < high) { high = hi; upperPair = [rows[i].stage, rows[j].stage]; }
    }
    roundingChecks.push({sample:sample.id,level,minGapPercent:low,maxGapPercent:high,possible:low<=high+1e-12,lowerPair,upperPair});
  }
}
const finalTargetErrors = finals.map(sample => {
  if (sample.designation.level < 280) return { designation:sample.designation, supported:false };
  const last = buildMissionTable({mode:'model',stepsDone:0,designLevel:sample.designation.level,designExp:sample.designation.percent},ctx).steps.at(-1);
  return {designation:sample.designation,supported:true,predicted:{level:last.level,percent:last.exp},observed:sample.target,errorPercentPoints:100*(last.level-sample.target.level)+last.exp-sample.target.percent};
});
const representativeInputs = [{current:{level:288,percent:45,stepsDone:13},nextTarget:{level:288,percent:49.948},rewardPercent:1.601,duplicateOf:'live-287'},{current:{level:286,percent:68,stepsDone:4},nextTarget:{level:286,percent:69.714},rewardPercent:1.888,duplicateOf:'live-286'}];
const officialIllustration = {source:'https://m.maplestory.nexon.com/News/Event/Ongoing/1389',image:'https://lwi.nexon.com/maplestory/2026/0917_board/260917_WQDV38E75N6S4W24.png',kind:'official guide illustration, not an independently observed character',current:{level:260,percent:0},stages:[[1,262,49.622],[2,265,1.330],[3,267,21.499],[4,269,43.199],[5,270,87.889],[6,272,6.327],[7,273,25.142],[8,274,44.340],[30,283,23.118]].map(([stage,level,percent])=>({stage,level,percent}))};
const result={fetchedAt:'2026-10-10',samples:all,finalTargets:finals,intervals,currentRuleErrors:errors,affineFits:fits,roundingChecks,finalTargetErrors,representativeInputs,officialIllustration,notes:['declaredStartLevel/Percent are NOT confirmed designation values','inven 48328 is a schedule infographic, not target table','No verified 294/295 adjacent target sample obtained']};
fs.writeFileSync(new URL('./mission-target-evidence.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({errors,fits,conflict:intervals.filter(r=>r.sample==='ai-3'&&r.fromLevel===290)},null,2));
