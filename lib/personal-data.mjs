// 퍼스널 버닝 계산에 쓰는 표. 하루1소재(haru1sojae.kr)의 번들 상수표를 2026-10-04에 읽어 옮겼다.
// - 몬스터 기본 경험치: 사냥터 정보 표(레벨 260~299). 본섭 9/23 플레임 로그 3건(273·275·276레벨 몬스터)과 ×72가 정확히 일치한다.
// - 퍼스널 EXP 교환권: 같은 사이트의 교환권 표는 몬스터 기본 경험치 ×480과 레벨 260~299 전부에서 일치한다.
// - 퍼스널 보스 미션: 하루1소재 보스 표(35개). 한 번 처치한 경험치 = 표 값 × 10,000 ÷ 경험치를 받는 파티원 수(총 피해 5% 이상), 레벨과 무관한 고정 경험치다.
// 공식 update-813은 보스별 경험치를 공개하지 않는다. 하루1소재 값을 쓴다. 본섭 9/27 보스 미션 화면의 5개 값(세렌 노멀·하드, 칼로스 이지,
// 대적자 이지, 카링 이지)은 표와 정확히 같고 나머지 30개는 화면 대조 전이다. 플레임 ×72는 하루1소재의 식이 아니라 본섭 로그로 확인한 값이다.

export const PERSONAL_FLAME_MULTIPLE = 72;
export const PERSONAL_COUPON_MULTIPLE = 480;
export const BOSS_EXP_UNIT = 10_000;
export const WEEKLY_BOSS_LIMIT = 12;

// 몬스터 기본 경험치 (레벨 → 경험치)
export const MOB_BASE_EXP = {
  260: 1725461,
  261: 1750290,
  262: 1775159,
  263: 1800203,
  264: 1828409,
  265: 2056974,
  266: 2085219,
  267: 2113572,
  268: 2145596,
  269: 2174274,
  270: 2445217,
  271: 2481337,
  272: 2513634,
  273: 2546149,
  274: 2582906,
  275: 2903024,
  276: 2939616,
  277: 2981010,
  278: 3017988,
  279: 3059716,
  280: 3436027,
  281: 3482914,
  282: 3524768,
  283: 3572010,
  284: 3614278,
  285: 4062965,
  286: 4110304,
  287: 4163751,
  288: 4217526,
  289: 4265489,
  290: 4793318,
  291: 4847012,
  292: 4907812,
  293: 4968977,
  294: 5023491,
  295: 5643220,
  296: 5711948,
  297: 5781080,
  298: 5842650,
  299: 5912186,
};

// 어센틱포스 사냥터. 플레임은 레벨 범위 몬스터가 있는 아케인·어센틱포스 필드에 나온다. 아케인 지역은 표가 없어 몬스터 레벨을 직접 입력한다.
// { region, monster, level, maps }
export const HUNTING_FIELDS = [
  { region: "세르니움", monster: "흑태양 보병", level: 260, maps: ["해변 암석 지대 1","해변 암석 지대 2"] },
  { region: "세르니움", monster: "흑태양 궁병", level: 260, maps: ["해변 암석 지대 3","해변 암석 지대 4"] },
  { region: "세르니움", monster: "괴물 갈매기", level: 260, maps: ["세르니움 서쪽 성벽 1","세르니움 서쪽 성벽 2","세르니움 서쪽 성벽 3"] },
  { region: "세르니움", monster: "화염 정령", level: 261, maps: ["세르니움 동쪽 성벽 1","세르니움 동쪽 성벽 2","세르니움 동쪽 성벽 3"] },
  { region: "세르니움", monster: "떠도는 학자 유령", level: 261, maps: ["왕립 도서관 제1구역","왕립 도서관 제2구역","왕립 도서관 제3구역"] },
  { region: "세르니움", monster: "호기심 많은 학자 유령", level: 261, maps: ["왕립 도서관 제4구역","왕립 도서관 제5구역","왕립 도서관 제6구역"] },
  { region: "불타는 세르니움", monster: "레프 보병", level: 262, maps: ["격전의 서쪽 성벽 1","격전의 서쪽 성벽 2"] },
  { region: "불타는 세르니움", monster: "레프 법사", level: 262, maps: ["격전의 서쪽 성벽 3","격전의 서쪽 성벽 4"] },
  { region: "불타는 세르니움", monster: "레프 암살자", level: 263, maps: ["격전의 동쪽 성벽 1","격전의 동쪽 성벽 2","격전의 동쪽 성벽 3"] },
  { region: "불타는 세르니움", monster: "레프 기갑병", level: 263, maps: ["격전의 동쪽 성벽 4","격전의 동쪽 성벽 5","격전의 동쪽 성벽 6"] },
  { region: "불타는 세르니움", monster: "흑태양 폭탄병", level: 264, maps: ["불타는 왕립 도서관 제1구역","불타는 왕립 도서관 제2구역","불타는 왕립 도서관 제3구역"] },
  { region: "불타는 세르니움", monster: "흑태양 법사", level: 264, maps: ["불타는 왕립 도서관 제4구역","불타는 왕립 도서관 제5구역","불타는 왕립 도서관 제6구역"] },
  { region: "호텔 아르크스", monster: "모래칼날 약탈꾼", level: 265, maps: ["무법자들이 지배하는 황야 1","무법자들이 지배하는 황야 2"] },
  { region: "호텔 아르크스", monster: "무쇠탄환 학살꾼", level: 265, maps: ["무법자들이 지배하는 황야 3","무법자들이 지배하는 황야 4"] },
  { region: "호텔 아르크스", monster: "탐색하는 폭실리언", level: 266, maps: ["낭만이 저무는 자동차 극장 1","낭만이 저무는 자동차 극장 2","낭만이 저무는 자동차 극장 3"] },
  { region: "호텔 아르크스", monster: "고물수집가 폭실리언", level: 267, maps: ["낭만이 저무는 자동차 극장 4","낭만이 저무는 자동차 극장 5","낭만이 저무는 자동차 극장 6"] },
  { region: "호텔 아르크스", monster: "엄격한 역무원", level: 268, maps: ["종착지 없는 횡단열차 1","종착지 없는 횡단열차 2","종착지 없는 횡단열차 3"] },
  { region: "호텔 아르크스", monster: "주인잃은 왓치독", level: 269, maps: ["종착지 없는 횡단열차 4","종착지 없는 횡단열차 5","종착지 없는 횡단열차 6"] },
  { region: "오디움", monster: "강화형 파수꾼 산호", level: 270, maps: ["성문으로 가는 길 5","성문으로 가는 길 4"] },
  { region: "오디움", monster: "강화형 파수꾼 감람", level: 270, maps: ["성문으로 가는 길 3","성문으로 가는 길 2"] },
  { region: "오디움", monster: "강화형 파수꾼 금강", level: 270, maps: ["성문으로 가는 길 2","성문으로 가는 길 1"] },
  { region: "오디움", monster: "앵글러 포격형 시험기", level: 271, maps: ["점령당한 골목 1"] },
  { region: "오디움", monster: "앵글러 근접형 시험기", level: 271, maps: ["점령당한 골목 2","점령당한 골목 3"] },
  { region: "오디움", monster: "앵글러 전자전 시험기", level: 271, maps: ["점령당한 골목 3","점령당한 골목 4"] },
  { region: "오디움", monster: "경비병 강옥", level: 272, maps: ["볕 드는 실험실 1","볕 드는 실험실 2"] },
  { region: "오디움", monster: "경비병 마노", level: 272, maps: ["볕 드는 실험실 2","볕 드는 실험실 3"] },
  { region: "오디움", monster: "무너지는 실험체", level: 273, maps: ["잠긴 문 뒤 실험실 1","잠긴 문 뒤 실험실 2"] },
  { region: "오디움", monster: "실패한 피험체", level: 274, maps: ["잠긴 문 뒤 실험실 2","잠긴 문 뒤 실험실 3","잠긴 문 뒤 실험실 4"] },
  { region: "도원경", monster: "시든 봄의 연구자", level: 275, maps: ["생기가 돌아오는 봄 1","생기가 돌아오는 봄 2"] },
  { region: "도원경", monster: "먹그늘 나비", level: 275, maps: ["생기가 돌아오는 봄 2","생기가 돌아오는 봄 3","생기가 돌아오는 봄 4","생기가 돌아오는 봄 5"] },
  { region: "도원경", monster: "빛 없는 여름의 연구자", level: 276, maps: ["빛이 약한 여름 1","빛이 약한 여름 2"] },
  { region: "도원경", monster: "묵그림자 두루미", level: 276, maps: ["빛이 약한 여름 2","빛이 약한 여름 3","빛이 약한 여름 4","빛이 약한 여름 5"] },
  { region: "도원경", monster: "색 잃은 가을의 연구자", level: 277, maps: ["색깔이 옅은 가을 1","색깔이 옅은 가을 2"] },
  { region: "도원경", monster: "먹자국 담비", level: 277, maps: ["색깔이 옅은 가을 2","색깔이 옅은 가을 3","색깔이 옅은 가을 4","색깔이 옅은 가을 5"] },
  { region: "도원경", monster: "참혹한 겨울의 연구자", level: 278, maps: ["참혹한 흔적의 겨울 1","참혹한 흔적의 겨울 2"] },
  { region: "도원경", monster: "묵날개 올빼미", level: 279, maps: ["참혹한 흔적의 겨울 2","참혹한 흔적의 겨울 3","참혹한 흔적의 겨울 4","참혹한 흔적의 겨울 5"] },
  { region: "아르테리아", monster: "하이레프 보병", level: 280, maps: ["북쪽 외곽지역","외곽 전투지역 1","서쪽 외곽지역"] },
  { region: "아르테리아", monster: "하이레프 법사", level: 281, maps: ["남쪽 외곽지역","외곽 전투지역 2","동쪽 외곽지역"] },
  { region: "아르테리아", monster: "하이레프 기갑병", level: 282, maps: ["최하층 통로 1","최하층 통로 2","최하층 통로 3"] },
  { region: "아르테리아", monster: "하이레프 장검병", level: 283, maps: ["최하층 통로 4","최하층 통로 5","최하층 통로 6"] },
  { region: "아르테리아", monster: "얼어붙은 레프 보병", level: 284, maps: ["최상층 통로 1","최상층 통로 2","최상층 통로 3","최상층 통로 4","최상층 통로 7","최상층 통로 8"] },
  { region: "아르테리아", monster: "얼어붙은 레프 법사", level: 284, maps: ["최상층 통로 3","최상층 통로 4","최상층 통로 5","최상층 통로 6","최상층 통로 7","최상층 통로 8"] },
  { region: "카르시온", monster: "절망의 파수꾼", level: 285, maps: ["거대 산호 군락1","거대 산호 군락2"] },
  { region: "카르시온", monster: "어둠이 파고든 괴조", level: 286, maps: ["거대 산호 군락 3","잔잔한 해안가 1"] },
  { region: "카르시온", monster: "심연의 파수꾼", level: 286, maps: ["잔잔한 해안가 2","잔잔한 해안가 3"] },
  { region: "카르시온", monster: "절망의 사냥꾼", level: 287, maps: ["휘감기는 숲 1","휘감기는 숲 2"] },
  { region: "카르시온", monster: "어둠이 스며든 흑표", level: 288, maps: ["휘감기는 숲 3","어둠이 내리는 나무줄기 1"] },
  { region: "카르시온", monster: "심연의 사냥꾼", level: 288, maps: ["어둠이 내리는 나무줄기 2","어둠이 내리는 나무줄기 3"] },
  { region: "카르시온", monster: "근원에 다다른 기사", level: 289, maps: ["숨이 멎어드는 동굴 1","숨이 멎어드는 동굴 2","숨이 멎어드는 동굴 3","숨이 멎어드는 동굴 4"] },
  { region: "카르시온", monster: "근원에 다가간 사제", level: 289, maps: ["가라앉은 유적지 1","가라앉은 유적지 2","가라앉은 유적지 3","가라앉은 유적지 4"] },
  { region: "탈라하트", monster: "재를 먹는 사념", level: 290, maps: ["재와 침묵의 땅 1","재와 침묵의 땅 2","재와 침묵의 땅 3"] },
  { region: "탈라하트", monster: "침묵을 삼키는 사념", level: 291, maps: ["재와 침묵의 땅 3","재와 침묵의 땅 4","재와 침묵의 땅 5"] },
  { region: "탈라하트", monster: "영혼 도살자", level: 291, maps: ["섭리와 운명의 전쟁터 1","섭리와 운명의 전쟁터 2","섭리와 운명의 전쟁터 3"] },
  { region: "탈라하트", monster: "폭풍의 심판자", level: 292, maps: ["심판과 운명의 전쟁터 1","심판과 운명의 전쟁터 2","심판과 운명의 전쟁터 3"] },
  { region: "탈라하트", monster: "영원의 집행자", level: 293, maps: ["영원과 운명의 전쟁터 1","영원과 운명의 전쟁터 2","영원과 운명의 전쟁터 3"] },
  { region: "탈라하트", monster: "밤의 인도자", level: 294, maps: ["밤의 길 1","밤의 길 2","밤의 길 3","밤의 길 4"] },
  { region: "탈라하트", monster: "환영의 인도자", level: 294, maps: ["환영의 길 1","환영의 길 2","환영의 길 3","환영의 길 4"] },
  { region: "기어드락", monster: "순찰형 경비 로봇", level: 295, maps: ["지하 1층","지하 2층 1구역","지하 2층 2구역"] },
  { region: "기어드락", monster: "공격형 경비 로봇", level: 296, maps: ["지하 3층 1구역","지하 3층 2구역","지하 4층"] },
  { region: "기어드락", monster: "일반형 병기 로봇", level: 297, maps: ["로봇 창고 1","로봇 창고 2","로봇 창고 3","로봇 창고 4"] },
  { region: "기어드락", monster: "강화형 병기 로봇", level: 298, maps: ["로봇 창고 5","로봇 창고 6","로봇 창고 7","로봇 창고 8"] },
  { region: "기어드락", monster: "크로노스의 잔재", level: 299, maps: ["고브의 작업실 1","고브의 작업실 2","고브의 작업실 3","고브의 작업실 4"] },
  { region: "기어드락", monster: "크로노스의 원념", level: 299, maps: ["고브의 작업실 5","고브의 작업실 6","고브의 작업실 7","고브의 작업실 8"] },
];

// 퍼스널 보스 미션 대상 35개. unitExp × BOSS_EXP_UNIT 이 솔로 처치 경험치다. maxParty 는 경험치를 나눌 수 있는 최대 파티원 수다.
export const PERSONAL_BOSS_TABLE = [
  { id: "damien-hard", boss: "데미안", difficulty: "하드", unitExp: 3434980, maxParty: 6 },
  { id: "lotus-hard", boss: "스우", difficulty: "하드", unitExp: 3462860, maxParty: 6 },
  { id: "lucid-hard", boss: "루시드", difficulty: "하드", unitExp: 4419800, maxParty: 6 },
  { id: "gas-chaos", boss: "가디언 엔젤 슬라임", difficulty: "카오스", unitExp: 5049150, maxParty: 6 },
  { id: "dusk-chaos", boss: "더스크", difficulty: "카오스", unitExp: 5121720, maxParty: 6 },
  { id: "will-hard", boss: "윌", difficulty: "하드", unitExp: 5419380, maxParty: 6 },
  { id: "dunkel-hard", boss: "듄켈", difficulty: "하드", unitExp: 6345160, maxParty: 6 },
  { id: "hilla-hard", boss: "진 힐라", difficulty: "하드", unitExp: 7403370, maxParty: 6 },
  { id: "seren-normal", boss: "선택받은 세렌", difficulty: "노멀", unitExp: 11288530, maxParty: 6 },
  { id: "kalos-easy", boss: "감시자 칼로스", difficulty: "이지", unitExp: 16087580, maxParty: 6 },
  { id: "adversary-easy", boss: "최초의 대적자", difficulty: "이지", unitExp: 17642300, maxParty: 3 },
  { id: "kaling-easy", boss: "카링", difficulty: "이지", unitExp: 21630780, maxParty: 6 },
  { id: "seren-hard", boss: "선택받은 세렌", difficulty: "하드", unitExp: 23330230, maxParty: 6 },
  { id: "bellona-easy", boss: "벨로나", difficulty: "이지", unitExp: 26768080, maxParty: 3 },
  { id: "kalos-normal", boss: "감시자 칼로스", difficulty: "노멀", unitExp: 32378520, maxParty: 6 },
  { id: "adversary-normal", boss: "최초의 대적자", difficulty: "노멀", unitExp: 35961100, maxParty: 3 },
  { id: "lotus-extreme", boss: "스우", difficulty: "익스트림", unitExp: 40348100, maxParty: 2 },
  { id: "star-normal", boss: "찬란한 흉성", difficulty: "노멀", unitExp: 41993020, maxParty: 3 },
  { id: "kaling-normal", boss: "카링", difficulty: "노멀", unitExp: 44497300, maxParty: 6 },
  { id: "bellona-normal", boss: "벨로나", difficulty: "노멀", unitExp: 63655780, maxParty: 3 },
  { id: "limbo-normal", boss: "림보", difficulty: "노멀", unitExp: 76865980, maxParty: 3 },
  { id: "kalos-chaos", boss: "감시자 칼로스", difficulty: "카오스", unitExp: 83142670, maxParty: 6 },
  { id: "baldrix-normal", boss: "발드릭스", difficulty: "노멀", unitExp: 97724320, maxParty: 3 },
  { id: "adversary-hard", boss: "최초의 대적자", difficulty: "하드", unitExp: 98432390, maxParty: 3 },
  { id: "kaling-hard", boss: "카링", difficulty: "하드", unitExp: 110470810, maxParty: 6 },
  { id: "jupiter-normal", boss: "유피테르", difficulty: "노멀", unitExp: 115492080, maxParty: 3 },
  { id: "seren-extreme", boss: "선택받은 세렌", difficulty: "익스트림", unitExp: 130298820, maxParty: 6 },
  { id: "limbo-hard", boss: "림보", difficulty: "하드", unitExp: 191923460, maxParty: 3 },
  { id: "star-hard", boss: "찬란한 흉성", difficulty: "하드", unitExp: 198261240, maxParty: 3 },
  { id: "bellona-hard", boss: "벨로나", difficulty: "하드", unitExp: 227893990, maxParty: 3 },
  { id: "baldrix-hard", boss: "발드릭스", difficulty: "하드", unitExp: 237782370, maxParty: 3 },
  { id: "kalos-extreme", boss: "감시자 칼로스", difficulty: "익스트림", unitExp: 303832960, maxParty: 6 },
  { id: "adversary-extreme", boss: "최초의 대적자", difficulty: "익스트림", unitExp: 379179480, maxParty: 3 },
  { id: "jupiter-hard", boss: "유피테르", difficulty: "하드", unitExp: 389882120, maxParty: 3 },
  { id: "kaling-extreme", boss: "카링", difficulty: "익스트림", unitExp: 416157790, maxParty: 6 },
];

// 환산 사이트 공통 보스 목록(qR=C)의 낮은 쪽부터의 표시 순서. 2026-10-12 원본 조회.
// https://maplescouter.com/_next/static/chunks/4281-f828af29791f20d9.js
// 직업별 솔로/파티 보스컷 수치 순위를 뜻하지 않는다. 검은 마법사 등 퍼스널 미션 대상이 아닌 항목은 제외.
export const BOSS_CUT_ORDER = Object.freeze([
  "lotus-hard", "damien-hard", "lucid-hard", "will-hard", "gas-chaos", "dusk-chaos", "dunkel-hard", "hilla-hard",
  "seren-normal", "kalos-easy", "adversary-easy", "seren-hard", "kaling-easy", "bellona-easy", "kalos-normal",
  "adversary-normal", "lotus-extreme", "star-normal", "kaling-normal", "bellona-normal", "kalos-chaos", "limbo-normal",
  "seren-extreme", "kaling-hard", "baldrix-normal", "adversary-hard", "jupiter-normal", "star-hard", "limbo-hard",
  "bellona-hard", "baldrix-hard", "kalos-extreme", "adversary-extreme", "kaling-extreme", "jupiter-hard",
]);
const CUT_BOSS_BY_ID = new Map(PERSONAL_BOSS_TABLE.map(entry => [entry.id, entry]));
// 같은 보스는 선택 범위 안에서 가장 높은 난이도 하나만 남긴다. 12개 선택은 실제 파티 경험치를 계산한 뒤 엔진에서 한다.
export function bossCutCandidates(cutoffId) {
  const index = BOSS_CUT_ORDER.indexOf(cutoffId);
  if (index < 0) return [];
  const best = new Map();
  BOSS_CUT_ORDER.slice(0, index + 1).forEach(id => { const entry = CUT_BOSS_BY_ID.get(id); best.set(entry.boss, entry); });
  return [...best.values()];
}
// ids는 솔로 구성의 표시·대조용이다. 실제 선택은 cutoffId의 전체 후보에서 파티 EXP로 고른다.
const cutPreset = (id, label, cutoffId) => ({ id, label, cutoffId,
  detail: CUT_BOSS_BY_ID.get(cutoffId).difficulty + " " + CUT_BOSS_BY_ID.get(cutoffId).boss + "까지",
  ids: bossCutCandidates(cutoffId).sort((a, b) => b.unitExp - a.unitExp).slice(0, WEEKLY_BOSS_LIMIT).map(entry => entry.id),
});

// 2026-10-12 대표 지시: 비슷한 구간의 네 버튼. 모든 버튼은 공통 보스컷 순서의 해당 지점까지 선택한다.
// 영상에 사용한 첫 화면의 10마리는 버튼 정의와 분리한다. 저장된 목록은 그대로 유지한다.
export const DEFAULT_BOSS_PRESET_ID = "minimum";
export const DEFAULT_BOSS_IDS = ["damien-hard", "lotus-hard", "lucid-hard", "will-hard", "dunkel-hard", "hilla-hard", "dusk-chaos", "gas-chaos", "seren-hard", "kaling-easy"];
export const BOSS_COMMUNITY_PRESETS = [
  { ...cutPreset("geommitsol", "검밑솔", "hilla-hard"), detail: "하드 진힐라까지: 하드 스우·데미안·루시드·윌·듄켈·진힐라, 카오스 가엔슬·더스크" },
  { ...cutPreset("minimum", "하세이카", "kaling-easy"), detail: "하드 세렌·이지 칼로스·이지 대적자·이지 카링 추가" },
  { ...cutPreset("nokal-nojeok", "노칼·노적자", "adversary-normal"), detail: "이지 벨로나·노멀 칼로스·노멀 대적자 추가" },
  { ...cutPreset("nohyung-exlotus", "노흉·익스우", "star-normal"), detail: "익스트림 스우·노멀 흉성 추가" },
];
