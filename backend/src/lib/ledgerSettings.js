const { supabaseAdmin } = require('../supabaseAdmin');
const { applyScope } = require('../middleware/groupContext');

const DEFAULT_SETTINGS = { income_enabled: true, expense_enabled: true };

// 현재 컨텍스트(개인/그룹)의 수입·지출 사용 여부를 가져옵니다.
// 아직 설정한 적이 없으면 기본값(둘 다 사용)으로 취급합니다.
async function getLedgerSettings(req) {
  let query = supabaseAdmin.from('ledger_settings').select('income_enabled, expense_enabled');
  query = applyScope(query, req);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || DEFAULT_SETTINGS;
}

module.exports = { getLedgerSettings, DEFAULT_SETTINGS };
