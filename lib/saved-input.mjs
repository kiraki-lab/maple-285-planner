// 이 브라우저에 저장해 둔 입력을 읽고 쓰는 규칙. 화면(app/use-main-input.ts)과 분리해 두어 테스트가 저장소 없이 돌린다.
import { defaultMainInput, isValidDay, normalizeInput } from "./main-planner.mjs";

export const SAVED_INPUT_VERSION = 2;
export const SAVED_INPUT_KEY = "maple-personal-planner-v2";

// 저장값에 새로 생긴 항목이 없어도 기본값으로 채우고, 값의 형식도 엔진과 같은 규칙으로 바로잡는다.
// 화면은 저장값을 그대로 숫자로 읽어 소수점을 찍으므로(exp.toFixed 등) 문자열·null 이 들어오면 렌더가 죽는다.
// 옛 형식의 보스 항목(id 없음)은 버린다.
export function mergeSaved(saved, today) {
  const base = defaultMainInput(today);
  const data = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  const personal = data.personal && typeof data.personal === "object" ? data.personal : {};
  const merged = {
    ...base, ...data,
    routine: { ...base.routine, ...data.routine },
    plus: { ...base.plus, ...data.plus },
    items: { ...base.items, ...data.items },
    personal: {
      ...base.personal, ...personal,
      mission: { ...base.personal.mission, ...personal.mission, nextTarget: { ...base.personal.mission.nextTarget, ...personal.mission?.nextTarget } },
      flame: { ...base.personal.flame, ...personal.flame, alloc: { ...base.personal.flame.alloc, ...personal.flame?.alloc } },
      bosses: Array.isArray(personal.bosses) ? personal.bosses.filter(boss => boss && typeof boss.id === "string") : [],
    },
  };
  // 일요일 판수는 나중에 생긴 항목이다. 저장값에 없으면 기본값(2)이 아니라 저장된 평일 판수를 따른다.
  if (!data.routine || data.routine.sundayRuns == null) merged.routine.sundayRuns = merged.routine.runsPerDay;
  // 깨진 기준일은 이벤트 시작일이 아니라 오늘로 돌린다.
  if (!isValidDay(merged.start)) merged.start = today;
  if (!isValidDay(merged.personal.designDate)) merged.personal.designDate = merged.start;
  const clean = normalizeInput(merged, { levelCap: 296 });
  delete clean.inputWarnings;
  delete clean.end;
  return clean;
}

/** 저장된 문자열을 입력으로 되살린다. 깨졌거나 버전이 다르면 null 이라 호출한 쪽이 기본값을 쓴다. */
export function parseSaved(text, today) {
  if (typeof text !== "string" || !text) return null;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || parsed.version !== SAVED_INPUT_VERSION || !parsed.input || typeof parsed.input !== "object") return null;
    return mergeSaved(parsed.input, today);
  } catch {
    return null;
  }
}

export const serializeSaved = input => JSON.stringify({ version: SAVED_INPUT_VERSION, input });

// 저장소를 못 쓰는 환경(사생활 보호 모드, 차단된 사이트 데이터)에서도 화면이 죽지 않게 모든 접근을 감싼다.
export function loadSaved(storage, today, key = SAVED_INPUT_KEY) {
  try { return parseSaved(storage.getItem(key), today); } catch { return null; }
}
export function persistSaved(storage, input, key = SAVED_INPUT_KEY) {
  try { storage.setItem(key, serializeSaved(input)); return true; } catch { return false; }
}
