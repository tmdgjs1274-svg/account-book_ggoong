/** 'YYYY-MM-01' 형태의 이번 달 첫날 문자열을 반환 */
function currentMonthStart(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** 주어진 month(YYYY-MM-01)와 day로 'YYYY-MM-DD' 날짜 문자열 생성 */
function buildDateInMonth(monthStart, day) {
  const [y, m] = monthStart.split('-');
  const dd = String(day).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** month 문자열(YYYY-MM-01)을 기준으로 targetMonthStr 이하인지 비교 */
function isMonthAfterOrEqual(a, b) {
  return a >= b; // 'YYYY-MM-01' 문자열은 사전식 비교로 날짜 비교가 가능
}

module.exports = { currentMonthStart, buildDateInMonth, isMonthAfterOrEqual };
