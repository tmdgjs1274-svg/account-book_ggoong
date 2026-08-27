const { supabaseAdmin } = require('../supabaseAdmin');

/**
 * 요청 헤더 `X-Group-Id`로 현재 컨텍스트(개인 vs 그룹)를 판별합니다.
 * - 헤더가 없으면 개인 컨텍스트: req.groupId = null
 * - 헤더가 있으면 해당 그룹의 멤버인지 확인 후 req.groupId에 설정
 *   (멤버가 아니면 403 — 다른 그룹 데이터에 접근하지 못하도록 여기서 막습니다)
 */
async function resolveGroupContext(req, res, next) {
  const groupId = req.headers['x-group-id'];

  if (!groupId) {
    req.groupId = null;
    return next();
  }

  const { data, error } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('group_id', groupId)
    .eq('user_id', req.userId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!data) {
    return res.status(403).json({ error: '이 그룹에 접근할 권한이 없습니다.' });
  }

  req.groupId = groupId;
  return next();
}

/** 현재 컨텍스트(개인/그룹)에 맞는 필터를 쿼리에 적용하는 헬퍼 */
function applyScope(query, req, column = 'user_id') {
  if (req.groupId) {
    return query.eq('group_id', req.groupId);
  }
  return query.eq(column, req.userId).is('group_id', null);
}

module.exports = { resolveGroupContext, applyScope };
