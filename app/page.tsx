"use client";

import { useState } from "react";
import { createMainContext } from "@/lib/exp-tables";
import ItemsPanel from "./items-panel";
import PersonalPlanner from "./personal-planner";
import ReferencePanel from "./reference-panel";
import { useMainInput } from "./use-main-input";

export const dynamic = "force-static";

type ViewTab = "personal" | "items" | "reference";

const viewTabs: { id: ViewTab; label: string; description: string }[] = [
  { id: "personal", label: "퍼스널 버닝", description: "본섭 · 11/18 마감" },
  { id: "items", label: "아이템 환산", description: "보유 보상 전부 쓰면" },
  { id: "reference", label: "보상표·자료", description: "PLUS · 퍼스널 · 보스" },
];

const mainContext = createMainContext();

export default function Home() {
  const [activeTab, setActiveTab] = useState<ViewTab>("personal");
  const state = useMainInput();

  return <main>
    <header className="topbar"><a className="brand" href="#top" aria-label="퍼스널 버닝 계산기 홈"><span className="brand-mark">M</span><span>PERSONAL BURNING PLANNER</span></a><span className="topbar-status">본섭 · 9/17~11/18</span></header>
    <section className="hero pb-hero" id="top">
      <div className="eyebrow"><span /> MAIN SERVER · PERSONAL BURNING</div>
      <h1>퍼스널 버닝, 언제 어디까지?</h1>
    </section>

    <nav className="view-tabs" role="tablist" aria-label="계산기 화면 선택">
      {viewTabs.map(tab => <button key={tab.id} id={`${tab.id}-tab`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`${tab.id}-panel`} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}><b>{tab.label}</b><span>{tab.description}</span></button>)}
    </nav>

    {activeTab === "personal" && <PersonalPlanner ctx={mainContext} state={state} />}
    {activeTab === "items" && <ItemsPanel state={state} goPersonal={() => setActiveTab("personal")} />}
    {activeTab === "reference" && <ReferencePanel />}

    <footer><div className="brand"><span className="brand-mark">M</span><span>PERSONAL BURNING PLANNER</span></div></footer>
  </main>;
}
