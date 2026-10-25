import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {compareExpEfficiency,efficiencyDefaults} from '../lib/exp-efficiency.mjs';
import {createMainContext} from '../lib/exp-tables.ts';
import {defaultMainInput} from '../lib/main-planner.mjs';

const root=new URL('./fixtures/',import.meta.url);
const source=fs.readFileSync(new URL('haru1sojae-2026-10-25-core.txt',root),'utf8');
const metadata=JSON.parse(fs.readFileSync(new URL('haru1sojae-2026-10-25-core.json',root),'utf8'));
const sandbox=vm.createContext(Object.create(null),{codeGeneration:{strings:false,wasm:false}});
new vm.Script(source,{filename:'haru1sojae-public-core-2026-10-25.js'}).runInContext(sandbox,{timeout:1000});
const h=sandbox.haru,ctx=createMainContext();
const fields=level=>Array.from({length:11},(_,i)=>level-5+i).filter(x=>x>=260&&x<=299);
const ledger=()=>({comparisons:0,nonzero:0,maxDelta:0});
const same=(actual,expected,tolerance,stats,label)=>{
  const delta=Math.abs(actual-expected);stats.comparisons++;if(delta>0)stats.nonzero++;stats.maxDelta=Math.max(stats.maxDelta,delta);
  assert.ok(Number.isFinite(actual)&&Number.isFinite(expected)&&delta<=tolerance,`${label}: ${actual} vs ${expected}; delta=${delta}, tolerance=${tolerance}`);
};

test('하루 공개 함수 원문·범위·해시를 고정하고 외부 권한 없는 VM에서 실행한다',()=>{
  const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
  assert.equal(hash(source),metadata.fixtureSha256);
  assert.ok(source.endsWith(metadata.exportSuffix));
  const original=source.slice(0,-metadata.exportSuffix.length);
  assert.equal(hash(original),metadata.originalSha256);
  assert.equal(Buffer.byteLength(original),metadata.byteEndExclusive-metadata.byteStart);
  assert.equal(vm.runInContext('typeof process + ":" + typeof require + ":" + typeof fetch',sandbox),'undefined:undefined:undefined');
  assert.throws(()=>vm.runInContext('eval("1")',sandbox),/Code generation/);
  for(const fn of ['I','F','f','P','E','R','B','D','q','N','U'])assert.equal(typeof h[fn],'function');
});

test('280~299·사냥터±5·추경0~700 모든 정수에서 수상한/VIP·탐정·사냥 원문 재현',()=>{
  const raw=ledger(),hunt=ledger();let cases=0;
  for(let level=280;level<=299;level++)for(const fieldLevel of fields(level))for(let bonus=0;bonus<=700;bonus++){
    const v={charLevel:level,monsterLevel:fieldLevel,boosterMonsterLevel:fieldLevel,expBonus:bonus,mobCount:40};
    same(ctx.boosterRaw(fieldLevel)*(1+bonus/100),h.I(v),1,raw,`VIP ${level}/${fieldLevel}/${bonus}`);
    same(800*190*h.n[fieldLevel],h.F(v),0,raw,'탐정 도핑 무관');
    same(ctx.huntRaw({level,fieldLevel}),h.N(v),1,hunt,'사냥 레벨 차');
    cases++;
  }
  console.log('HARU_ALL_BONUS',JSON.stringify({cases,raw,hunt}));
});

test('280~299·메포2000~2600 모든 정수에서 에픽 추가 EXP·단계별 순비용 재현',()=>{
  const raw=ledger(),meso=ledger();let cases=0;
  for(let level=280;level<=299;level++)for(let rate=2000;rate<=2600;rate++){
    const zone=level>=290?'아우룸 레기스':'악몽선경';
    const point=level>=290?15000:12500;
    const extra=ctx.weeklyRaw({level,epicMult:5}).epic-ctx.weeklyRaw({level,epicMult:1}).epic;
    same(extra,h.P(zone,level),0,raw,'에픽 0→1 추가 EXP');
    same(extra,h.E(zone,level),0,raw,'에픽 1→2 추가 EXP');
    same(point/.99/rate*1e8-16e7,h.R(zone,rate),0,meso,'에픽 0→1 순비용');
    same(point*3/.99/rate*1e8-16e7,h.B(zone,rate),0,meso,'에픽 1→2 순비용');
    cases++;
  }
  console.log('HARU_ALL_RATES',JSON.stringify({cases,raw,meso}));
});

test('전체 레벨·±5 사냥터 × 추경50% 간격 × 메포100 간격 × 4시세의 lib 효율/가격선 재현',()=>{
  const planner=defaultMainInput('2026-10-25');planner.plus.tier='free';
  const raw=ledger(),meso=ledger(),ratios=ledger();let cases=0;
  const prices=[[1000000,50000000],[2050000,100000000],[2100000,100000000],[5000000,150000000]];
  for(let level=280;level<=299;level++)for(const fieldLevel of fields(level))for(let bonus=0;bonus<=700;bonus+=50)for(let rate=2000;rate<=2600;rate+=100)for(const [ordinaryPrice,detectivePrice]of prices){
    const v={charLevel:level,monsterLevel:fieldLevel,boosterMonsterLevel:fieldLevel,mobCount:40,expBonus:bonus,mesoMarketRate:rate,waterBottleRate:1550};
    const r=compareExpEfficiency({...efficiencyDefaults(planner),level,fieldLevel,bonus,maplePoints:rate,ordinaryPrice,detectivePrice},planner);
    assert.equal(r.errors.length,0);
    const rows=Object.fromEntries(r.rows.map(row=>[row.id,row]));
    const zone=level>=290?'아우룸 레기스':'악몽선경',epic1=h.P(zone,level),epic2=h.E(zone,level),cost1=h.R(zone,rate),cost2=h.B(zone,rate);
    const reference={ordinary:[h.I(v),ordinaryPrice],detective:[h.F(v),detectivePrice],vipBooster:[h.I(v),null],epic1:[epic1,cost1],epic2:[epic2,cost2],premium:[h.D(h.A,v),h.j(29800,1550)],prime:[h.D(h.$,v),h.j(39800,1550)],both:[h.q(v),h.T(1550)]};
    for(const [id,[exp,cost]]of Object.entries(reference)){
      same(rows[id].rawExp,exp,1,raw,id+' EXP');
      if(cost!==null){same(rows[id].costMeso,cost,0.000001,meso,id+' 비용');same(rows[id].mesoPerMob,cost/(exp/h.n[level]),0.000001,ratios,id+' 1마리당 메소');}
    }
    for(const row of r.magnifiers){
      const exp=row.id==='ordinary'?h.I(v):h.F(v);
      same(row.thresholds[0].price,exp/epic1*cost1,0.000001,meso,row.id+' 에픽1 가격선');
      same(row.thresholds[1].price,exp/epic2*cost2,0.000001,meso,row.id+' 에픽2 가격선');
    }
    for(const band of r.dopingRows){
      const exp=h.I({...v,expBonus:band.bonus});
      same(band.rawExp,exp,1,raw,'도핑 기준표');
      same(band.epic1Price,exp/epic1*cost1,0.000001,meso,'도핑 가격선1');
      same(band.epic2Price,exp/epic2*cost2,0.000001,meso,'도핑 가격선2');
      same(band.mesoPerExp,ordinaryPrice/exp,1e-12,ratios,'1 EXP당 메소');
    }
    const cutoff=r.breakBonus.value;
    same(h.I({...v,expBonus:cutoff})/ordinaryPrice,epic1/cost1,0.000001,ratios,'갈림길 동률');
    cases++;
  }
  console.log('HARU_COMBINED',JSON.stringify({cases,raw,meso,ratios}));
});
