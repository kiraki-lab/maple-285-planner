import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-static";

const siteBase = new URL("https://kiraki-lab.github.io/maple-285-planner/");
const ogImage = new URL("og.png", siteBase);

export const metadata: Metadata = {
  metadataBase: siteBase,
  title: "퍼스널 버닝 플래너 · 본섭 성장 계산기",
  description: "본섭 퍼스널 버닝 성장 미션·플레임·교환권·보스 미션과 모멘텀 패스 PLUS를 한 타임라인에 올려 11월 18일 마감 위치와 단계별 도달일을 계산합니다. 하루1소재 표 기준.",
  openGraph: {
    title: "퍼스널 버닝, 언제 어디까지?",
    description: "성장 미션 단계, 플레임, 교환권, 보스 미션을 11월 18일 마감까지 한 번에 계산합니다.",
    type: "website",
    url: siteBase,
    images: [{ url: ogImage, width: 1536, height: 1024, alt: "퍼스널 버닝 플래너: 11월 18일 마감 위치와 단계별 도달일 계산" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "퍼스널 버닝, 언제 어디까지?",
    description: "본섭 퍼스널 버닝 · 모멘텀 PLUS 성장 계산기",
    images: [ogImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
