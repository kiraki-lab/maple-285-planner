import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);

  return {
    metadataBase: base,
    title: "285 플래너 · 모멘텀 패스 성장 전략 계산기",
    description: "챌린저스 EXP 패스, 모멘텀 패스, 몬스터파크와 메이린 보상까지 반영한 285레벨 도달 전략 계산기",
    openGraph: {
      title: "285, 언제 찍을까?",
      description: "몬파 7판을 필요한 날까지만. 하드 메이린 한 주의 실제 가격을 계산합니다.",
      type: "website",
      url: base,
      images: [{ url: new URL("/og.png", base), width: 1536, height: 1024, alt: "285 플래너 전략 계산기" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "285, 언제 찍을까?",
      description: "모멘텀 패스 성장 전략 계산기",
      images: [new URL("/og.png", base)],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
