const { supabaseAdmin } = require('../supabaseAdmin');

/**
 * Supabase Auth가 발급한 JWT(Access Token)를 검증하는 미들웨어.
 * 프론트엔드는 Supabase 클라이언트로 로그인 후 access_token을
 * `Authorization: Bearer <token>` 헤더로 백엔드에 전달합니다.
 *
 * 이 프로젝트는 "새 JWT Signing Keys"(비대칭 키, 예: ES256)로 마이그레이션되어 있어서
 * access token이 더 이상 HS256 + Legacy JWT Secret 조합으로 서명되지 않습니다.
 * 그래서 로컬에서 jwt.verify로 직접 검증하는 대신, service role 키를 가진 Supabase
 * 관리자 클라이언트로 Supabase Auth 서버에 직접 토큰 검증을 위임합니다.
 * (서명 알고리즘이 무엇이든, legacy든 새 키든 상관없이 항상 정확하게 동작합니다.)
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      console.error('[auth] getUser failed:', error?.message);
      return res.status(401).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
    }
    req.userId = data.user.id;
    req.userEmail = data.user.email;
    return next();
  } catch (err) {
    console.error('[auth] unexpected error:', err.message);
    return res.status(401).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
  }
}

module.exports = { requireAuth };
