const METRIKA_ID = 102000769;

export function reachGoal(target) {
  if (typeof window !== 'undefined' && window.ym) {
    window.ym(METRIKA_ID, 'reachGoal', target);
  }
}
