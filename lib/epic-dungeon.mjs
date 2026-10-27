// 하루1소재의 입장 경계와 엔진의 보상 전환: 악몽선경 280, 아우룸 레기스 290.
// 일별 내역은 경험치를 지급하기 직전의 레벨을 넘긴다.
export const epicDungeonForLevel = level => level >= 290
  ? { id: 'aurum', name: '아우룸 레기스', minLevel: 290, icon: '/experience-icons/epic-aurum.png' }
  : { id: 'nightmare', name: '악몽선경', minLevel: 280, icon: '/experience-icons/epic-nightmare.png' };
