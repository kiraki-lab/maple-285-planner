const item = name => `/efficiency-icons/${name}.png`;
const game = name => `/experience-icons/${name}.png`;
export const EXPERIENCE_SOURCE_ICONS = {
  monsterPark: game('monster-park'), grandis: game('grandis'), extreme: game('extreme-park'), epic: game('epic-dungeon'),
  routine: game('grandis'), weekly: game('epic-dungeon'),
  flame: game('personal-flame'), coupon: item('personal-exp-coupon'), boss: game('boss-mission'), missionReward: game('growth-mission'),
  crimson: item('crimson-mekaberry'), adv: item('adv-exp-coupon'), sauna: item('vip-sauna'), blue: item('blueberry'), mech: item('mekaberry'), potion: item('growth-potion-279'),
  detectiveFreeMagnifier: game('detective-magnifier'), detectiveBoughtMagnifier: game('detective-magnifier'), ordinaryMagnifier: game('ordinary-magnifier'),
  hunt: game('hunting'), coupon4x: item('exp-4x-coupon'), booster: item('vip-booster'),
  compensationAdv: item('adv-exp-coupon'), compensationBooster: item('vip-booster'),
  attendanceAdv: item('adv-exp-coupon'), attendanceSauna: item('vip-sauna'), attendanceBooster: item('vip-booster'), attendancePotion269: item('growth-potion-269'), attendancePotion279: item('growth-potion-279'),
};
export const experienceIcon = id => EXPERIENCE_SOURCE_ICONS[id] || game('growth-mission');
