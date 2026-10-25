/* eslint-disable @next/next/no-img-element -- 작은 WZ PNG를 원본 그대로 표시한다. */
import { EXPERIENCE_SOURCE_LABELS } from '@/lib/experience-breakdown.mjs';
import { experienceIcon } from '@/lib/experience-source-icons.mjs';

export const sourceLabel = (id: string) => EXPERIENCE_SOURCE_LABELS[id as keyof typeof EXPERIENCE_SOURCE_LABELS] || id;
export const percent = (value: number) => value > 0 && value < 0.01 ? '<0.01' : value.toFixed(2);
export function SourceIcon({ id }: { id: string }) {
  return <span className="pb-exp-icon"><img src={experienceIcon(id)} width={32} height={32} alt="" />{id.startsWith('attendance') && <img className="pb-exp-badge" src="/experience-icons/attendance.png" width={16} height={16} alt="출석 보상" />}</span>;
}
