import { SourceIcon, sourceLabel, percent } from './experience-source';

type Part = { level: number; percent: number; shownPercent: number };
type Entry = { id: string; shown: number; percent: number; shownPercent: number; parts: Part[] };
type DisplayDay = { entries: Entry[]; total: number; percent: number; shownPercent: number };
type Day = { date: string; level: number; exp: number; steps: number; start: { level: number; exp: number; steps: number }; levelUps: { from: number; to: number; source: string }[] };
const dateLabel = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const position = (level: number, exp: number) => `Lv.${level} ${exp.toFixed(2)}%`;
const integer = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 0 });

function SourceLine({ entry, total }: { entry: Entry; total: number }) {
  return <li className="pb-gain-source" data-exp-source={entry.id} data-exp-shown={entry.shown} data-exp-percent={entry.shownPercent}>
    <SourceIcon id={entry.id} />
    <div className="pb-gain-source-body"><div className="pb-gain-source-title"><span>{sourceLabel(entry.id)}</span><b>+{percent(entry.shownPercent)}%</b></div>
      <div className="pb-gain-bar" aria-hidden="true"><i style={{ width: `${total ? entry.percent / total * 100 : 0}%` }} /></div>
      {entry.parts.length > 1 && <small>{entry.parts.map(part => `Lv.${part.level} +${percent(part.shownPercent)}%`).join(' · ')}</small>}
    </div>
  </li>;
}

export default function DailyExperience({ rows, displayDays }: { rows: Day[]; displayDays: DisplayDay[] }) {
  const weeks = Array.from({ length: Math.ceil(rows.length / 7) }, (_, index) => rows.slice(index * 7, index * 7 + 7));
  return <section className="pb-daily-trace" aria-label="날짜별 경험치 획득 근거">
    <div className="pb-exp-section-title"><h3>날짜별 경험치 획득 근거</h3><span>획득 당시 레벨 기준</span></div>
    <p className="pb-note">얼마나 올랐는지 한눈에 확인하세요. 레벨업 전후의 경험치는 각 레벨에서 얻은 %로 더했어요.</p>
    {weeks.map((week, index) => <details key={week[0].date} open={index === 0} className="pb-trace-week">
      <summary><span>{dateLabel(week[0].date)}~{dateLabel(week.at(-1)!.date)}</span><b>+{percent(displayDays.slice(index * 7, index * 7 + 7).reduce((sum, day) => sum + day.shownPercent, 0))}%</b></summary>
      <div className="pb-gain-days">{week.map((day, dayIndex) => {
        const display = displayDays[index * 7 + dayIndex], large = display.entries.slice(0, 4), small = display.entries.slice(4);
        return <article className="pb-gain-day" key={day.date} data-exp-date={day.date} aria-label={`${dateLabel(day.date)} 경험치`}>
          <header className="pb-gain-day-head"><h4>{dateLabel(day.date)}</h4><strong data-exp-percent-total={display.shownPercent}>+{percent(display.shownPercent)}%</strong></header>
          <p className="pb-gain-journey"><span>{position(day.start.level, day.start.exp)}</span><span aria-hidden="true">→</span><b>{position(day.level, day.exp)}</b></p>
          {!!day.levelUps.length && <p className="pb-gain-levelup">{day.levelUps.map(up => <span key={up.to}>Lv.{up.from} → Lv.{up.to} 레벨업 · {sourceLabel(up.source)}</span>)}</p>}
          <ul className="pb-gain-list">{large.map(entry => <SourceLine key={entry.id} entry={entry} total={display.percent} />)}</ul>
          {!!small.length && <details className="pb-gain-more"><summary>그 외 {small.length}개 <b>+{percent(small.reduce((sum, entry) => sum + entry.shownPercent, 0))}%</b></summary><ul className="pb-gain-list">{small.map(entry => <SourceLine key={entry.id} entry={entry} total={display.percent} />)}</ul></details>}
          {!display.entries.length && <p className="pb-note">획득한 경험치가 없어요.</p>}
          <footer className="pb-gain-day-foot"><span>성장 미션</span><b>{day.start.steps === day.steps ? `${day.steps}/45단계` : `${day.start.steps} → ${day.steps}/45단계`}</b></footer>
          <details className="pb-gain-raw"><summary>EXP 숫자 보기</summary><dl>{display.entries.map(entry => <div key={entry.id}><dt>{sourceLabel(entry.id)}</dt><dd>{integer(entry.shown)}</dd></div>)}<div className="pb-gain-raw-total"><dt>그날 합계</dt><dd data-exp-total={display.total}>{integer(display.total)}</dd></div></dl></details>
        </article>;
      })}</div>
    </details>)}
    {!rows.length && <p>계산 기간에 표시할 날짜가 없습니다.</p>}
  </section>;
}
