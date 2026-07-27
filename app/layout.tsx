import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-static";

const siteBase = new URL(
  process.env.GITHUB_PAGES === "true"
    ? "https://kiraki-lab.github.io/maple-285-planner/"
    : "https://maple-285-planner.nms070.chatgpt.site/",
);
const ogImage = new URL(
  process.env.GITHUB_PAGES === "true" ? "/maple-285-planner/og.png" : "/og.png",
  siteBase,
);

export const metadata: Metadata = {
  metadataBase: siteBase,
  title: "285 플래너 · 모멘텀 패스 성장 전략 계산기",
  description: "챌린저스 EXP 패스, 모멘텀 패스, 몬스터파크와 메이린 보상까지 반영한 285레벨 도달 전략 계산기",
  openGraph: {
    title: "285, 언제 찍을까?",
    description: "몬파 7판을 필요한 날까지만. 하드 메이린 한 주의 실제 가격을 계산합니다.",
    type: "website",
    url: siteBase,
    images: [{ url: ogImage, width: 1536, height: 1024, alt: "285 플래너 전략 계산기" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "285, 언제 찍을까?",
    description: "모멘텀 패스 성장 전략 계산기",
    images: [ogImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
