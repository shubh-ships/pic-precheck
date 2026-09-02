// The supplied DB does not contain PIC_FRA_CATEGORY master rows for 505/506.
// These values are the FRA IDs used by the existing Java logic.
// Keep the mapping here so it can be changed in one place when the official
// FRA master is added to the new DB.
const FRA_RULES = {
  505: 'Banned',
  506: 'Severely Restricted'
};

function getFraName(fraid) {
  return FRA_RULES[Number(fraid)] || 'N/A';
}

module.exports = { FRA_RULES, getFraName };
