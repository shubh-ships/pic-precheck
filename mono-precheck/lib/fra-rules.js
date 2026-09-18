export const FRA_RULES = Object.freeze({
  505: "Banned",
  506: "Severely Restricted",
});

export function getFraName(fraId) {
  return FRA_RULES[Number(fraId)] ?? "N/A";
}
