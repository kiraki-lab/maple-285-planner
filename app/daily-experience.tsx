import { EXPERIENCE_SOURCE_LABELS } from "@/lib/experience-breakdown.mjs";

type Day = { date: string; level: number; exp: number; steps: number; totalRaw: number; sourceRaw: Record<string, number> };
const dateLabel = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const integer = (value: number) => value.toLocaleString("ko-KR", { maximumFractionDigits: 0 });

type DisplayDay = { entries: { id: string; shown: number }[]; total: number };
export default function DailyExperience({ rows, displayDays }: { rows: Day[]; displayDays: DisplayDay[] }) {
  const weeks = Array.from({ length: Math.ceil(rows.length / 7) }, (_, index) => rows.slice(index * 7, index * 7 + 7));
  return <section className="pb-daily-trace" aria-label="날짜별 경험치 획득 근거">
    <h3>날짜별 경험치 획득 근거</h3>
    <p className="pb-note">실제로 받은 EXP를 출처별로 표시합니다. 주를 펼쳐 확인하세요. 일별·주별·기간 합계가 맞도록 1 EXP 단위 표시만 반올림해 배분합니다.</p>
    {weeks.map((week, index) => <details key={week[0].date} open={index === 0} className="pb-trace-week">
      <summary>{dateLabel(week[0].date)}~{dateLabel(week.at(-1)!.date)} · {integer(displayDays.slice(index * 7, index * 7 + 7).reduce((sum, day) => sum + day.total, 0))} EXP</summary>
      <table className="pb-trace-table" aria-label={`${dateLabel(week[0].date)}부터 날짜별 경험치`}>
        <thead><tr><th scope="col">날짜</th><th scope="col">출처별 경험치(EXP)</th><th scope="col">그날 합계(EXP)</th><th scope="col">그날 끝 위치 · 통과 단계</th></tr></thead>
        <tbody>{week.map((day, dayIndex) => { const display = displayDays[index * 7 + dayIndex]; return <tr key={day.date} data-exp-date={day.date}>
          <th scope="row">{dateLabel(day.date)}</th>
          <td className="pb-trace-sources">{display.entries.length ? <dl>{display.entries.map(entry => <div key={entry.id} data-exp-source={entry.id} data-exp-shown={entry.shown}><dt>{EXPERIENCE_SOURCE_LABELS[entry.id as keyof typeof EXPERIENCE_SOURCE_LABELS] || entry.id}</dt><dd>{integer(entry.shown)}</dd></div>)}</dl> : <span>획득 없음</span>}</td>
          <td className="pb-trace-total" data-exp-total={display.total}><span className="pb-trace-mobile-label">그날 합계</span>{integer(display.total)}</td>
          <td className="pb-trace-end">Lv.{day.level} {day.exp.toFixed(3)}%<br />{day.steps}/45단계</td>
        </tr>; })}</tbody>
      </table>
    </details>)}
    {!rows.length && <p>계산 기간에 표시할 날짜가 없습니다.</p>}
  </section>;
}
