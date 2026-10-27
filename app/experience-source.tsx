/* eslint-disable @next/next/no-img-element -- 작은 WZ PNG를 원본 그대로 표시한다. */
import { EXPERIENCE_SOURCE_LABELS } from '@/lib/experience-breakdown.mjs';
import { experienceIcon } from '@/lib/experience-source-icons.mjs';
import { epicDungeonForLevel } from '@/lib/epic-dungeon.mjs';
import { assetUrl } from './asset-url';

export const sourceLabel = (id: string, level?: number) => id === 'epic' && Number.isFinite(level)
  ? `에픽 던전 (${epicDungeonForLevel(level).name})`
  : EXPERIENCE_SOURCE_LABELS[id as keyof typeof EXPERIENCE_SOURCE_LABELS] || id;
export const percent = (value: number) => value > 0 && value < 0.01 ? '<0.01' : value.toFixed(2);
export function SourceIcon({ id, level }: { id: string; level?: number }) {
  return <span className={`pb-exp-icon${id==='extreme'?' pb-exp-npc':''}`}><img src={assetUrl(experienceIcon(id,level))} width={32} height={32} alt="" />{id.startsWith('attendance') && <img className="pb-exp-badge" src={assetUrl("/experience-icons/attendance.png")} width={16} height={16} alt="출석 보상" />}</span>;
}
