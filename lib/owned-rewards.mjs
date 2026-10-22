import { MAIN_SCHEDULE } from "./main-planner.mjs";

// 즉시 환산은 기준일에 쓸 수 있는 보유분만 센다. 미래 자동 수령분은 포함하지 않는다.
// 일 단위 엔진과 같이 만료 다음 날 00:00~02:00은 계산하지 않는다.
export function ownedRewardInventory(input) {
  const date = input.start;
  const september = date >= MAIN_SCHEDULE.plusStart && date <= MAIN_SCHEDULE.plusLastUseDay ? input.items : {};
  const october = date >= MAIN_SCHEDULE.plusOctoberStart && date <= MAIN_SCHEDULE.plusOctoberLastUseDay ? input.plusOctober?.items : {};
  const attendance = date <= MAIN_SCHEDULE.attendanceLastUseDay ? input.attendance : {};
  const compensation = date >= MAIN_SCHEDULE.compensationStart && date <= MAIN_SCHEDULE.compensationLastUseDay ? input.compensation : {};
  const count = (inventory, key) => Math.max(0, Number(inventory?.[key]) || 0);
  return {
    crimson: count(september, "crimson") + count(october, "crimson"),
    adv: count(september, "adv") + count(october, "adv") + count(attendance, "adv") + count(compensation, "adv"),
    sauna: count(september, "sauna") + count(october, "sauna") + count(attendance, "sauna"),
    mech: count(input.items, "mech"),
    blue: count(input.items, "blue"),
    potion279: count(attendance, "potion279") + count(input.items, "potion279"),
    potion269: count(attendance, "potion269"),
  };
}
