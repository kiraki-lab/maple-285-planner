"use client";

import { useEffect, useState } from "react";
import { defaultMainInput } from "@/lib/main-planner.mjs";
import { loadSaved, persistSaved } from "@/lib/saved-input.mjs";

// 서버 렌더와 첫 화면이 같도록 고정 날짜로 시작하고, 마운트 뒤에 오늘 날짜와 저장값을 적용한다.
export const SSR_START = "2026-10-04";

// 엔진 입력은 중첩 객체라 화면에서는 느슨하게 다룬다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MainInput = any;

export const kstToday = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

export function useMainInput() {
  const [input, setInput] = useState<MainInput>(() => defaultMainInput(SSR_START));
  const [today, setToday] = useState(SSR_START);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 서버 렌더와 같은 첫 화면을 유지한 뒤 브라우저 값(오늘 날짜·저장소)을 적용하는 것이 목적이라 효과 안에서 상태를 바꾼다.
    /* eslint-disable react-hooks/set-state-in-effect */
    const now = kstToday();
    setToday(now);
    // 저장소 접근은 loadSaved/persistSaved 안에서 모두 감싸져 있다. window.localStorage 자체를 읽는 것도 막힐 수 있어 따로 감싼다.
    let restored: MainInput | null = null;
    try { restored = loadSaved(window.localStorage, now); } catch { /* 저장소를 못 쓰면 기본값으로 계산한다 */ }
    setInput(restored ?? defaultMainInput(now));
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { persistSaved(window.localStorage, input); } catch { /* 저장소를 못 쓰면 저장하지 않는다 */ }
  }, [input, ready]);

  const upd = (change: (draft: MainInput) => void) => setInput((current: MainInput) => { const next = structuredClone(current); change(next); return next; });
  const reset = () => setInput(defaultMainInput(today));
  return { input, setInput, upd, reset, today };
}

export type MainInputState = ReturnType<typeof useMainInput>;
