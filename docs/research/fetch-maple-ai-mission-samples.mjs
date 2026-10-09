import fs from 'node:fs';
import assert from 'node:assert/strict';

// 공개 계산 청크만 읽는다. 캐릭터의 이름·계정 정보는 수집하지 않는다.
const source = 'https://maple.ai.kr/_next/static/chunks/eddec45464324ed0.js';
const response = await fetch(source);
assert.equal(response.status, 200);
const text = await response.text();
const samples = [...text.matchAll(/\{startLevel:(\d+),startPercent:([\d.]+),stages:\[([^\]]+)\]\}/g)].map(match => ({
  source, declaredStartLevel: Number(match[1]), declaredStartPercent: Number(match[2]),
  // 두 표의 startPercent가 1단계 목표보다 높다. 지정 당시 값이라는 근거가 없다.
  designationConfirmed: false,
  stages: [...match[3].matchAll(/\{stage:(\d+),level:(\d+),percent:([\d.]+),reward:([\d.]+)\}/g)].map(row => ({
    stage: Number(row[1]), level: Number(row[2]), percent: Number(row[3]), rewardPercent: Number(row[4]),
  })),
}));
assert.equal(samples.length, 5);
for (const sample of samples) assert.deepEqual(sample.stages.map(row => row.stage), Array.from({ length: 30 }, (_, i) => i + 1));
fs.writeFileSync(new URL('./maple-ai-mission-samples.json', import.meta.url), JSON.stringify({ fetchedAt: '2026-10-10', source, samples }, null, 2) + '\n');
console.log('공개 표본 5개 · 목표와 보상 150행');
