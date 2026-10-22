import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 로컬 조사 자료·다운로드 번들·빌드 산출물은 애플리케이션 소스가 아니다.
    "outputs/**",
    "work/**",
    "archive/**",
    "dist/**",
  ]),
]);

export default eslintConfig;
