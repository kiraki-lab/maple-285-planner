import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-static";

const siteBase = new URL("https://kiraki-lab.github.io/maple-285-planner/");
const ogImage = new URL("og.png", siteBase);

export const metadata: Metadata = {
  metadataBase: siteBase,
  title: "285 플래너 · 290 성장 전략 계산기",
  description: "챌린저스 EXP 패스, 모멘텀 패스, 몬스터파크와 메이린 보상까지 반영한 285·290레벨 도달 전략 계산기",
  openGraph: {
    title: "285·290, 언제 찍을까?",
    description: "몬파 7판을 필요한 날까지만. 285 마일스톤과 290 도달일을 함께 계산합니다.",
    type: "website",
    url: siteBase,
    images: [{ url: ogImage, width: 1536, height: 1024, alt: "285·290 플래너 전략 계산기" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "285·290, 언제 찍을까?",
    description: "모멘텀 패스 성장 전략 계산기",
    images: [ogImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
