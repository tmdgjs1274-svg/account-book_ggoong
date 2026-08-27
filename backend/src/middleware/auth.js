const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

/**
 * Supabase Auth가 발급한 JWT(Access Token)를 검증하는 미들웨어.
 * 프론트엔드는 Supabase 클라이언트로 로그인 후 access_token을
 * `Authorization: Bearer <token>` 헤더로 백엔드에 전달합니다.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: '서버에 SUPABASE_JWT_SECRET이 설정되지 않았습니다.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.userId = payload.sub;
    req.userEmail = payload.email;
    return next();
  } catch (err) {
    return res.status(401).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
  }
}

module.exports = { requireAuth };
