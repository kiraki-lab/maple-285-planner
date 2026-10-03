// GitHub Pages는 /maple-285-planner/ 하위에 배포된다. JSX에 문자열로 박은 절대 경로는
// 번들러가 base를 붙여주지 않아 루트에서 404가 나므로 렌더할 때 직접 붙인다.
const ASSET_BASE = ((import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/").replace(/\/+$/, "");
export const assetUrl = (path: string) => `${ASSET_BASE}${path}`;
