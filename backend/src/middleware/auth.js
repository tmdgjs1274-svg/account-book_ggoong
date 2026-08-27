const jwt = require('jsonwebtoken');

// Supabase의 "Legacy JWT secret"은 (특히 신규/마이그레이션된 프로젝트에서는) base64로 인코딩된
// 키 값으로 발급됩니다(문자열에 +, /, = 가 섞여 있으면 base64입니다). jsonwebtoken은 secret을
// 그냥 원문 문자열의 UTF-8 바이트로 취급하기 때문에, base64 디코딩을 해주지 않으면 Supabase가
// 실제로 서명할 때 쓰는 키와 달라져서 모든 토큰이 "유효하지 않은 토큰"으로 검증 실패합니다.
const RAW_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const JWT_SECRET = RAW_JWT_SECRET ? Buffer.from(RAW_JWT_SECRET, 'base64') : null;

// 임시 진단 로그: 서버 시작 시 한 번, 실제로 어떤 값을 읽어들였는지 확인합니다.
// (시크릿 원문은 출력하지 않고 길이/일부만 출력합니다. 문제 해결 후 제거 예정입니다.)
console.log(
  '[auth] RAW_JWT_SECRET length:',
  RAW_JWT_SECRET ? RAW_JWT_SECRET.length : 0,
  '/ decoded byte length:',
  JWT_SECRET ? JWT_SECRET.length : 0,
  '/ raw starts with:',
  RAW_JWT_SECRET ? JSON.stringify(RAW_JWT_SECRET.slice(0, 6)) : null,
  '/ raw ends with:',
  RAW_JWT_SECRET ? JSON.stringify(RAW_JWT_SECRET.slice(-6)) : null
);

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
    // 임시 진단 로그: 실제 실패 사유(만료/서명불일치/포맷오류 등)를 서버 로그에 남깁니다.
    console.error('[auth] jwt.verify failed:', err.name, '-', err.message);
    return res.status(401).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
  }
}

module.exports = { requireAuth };
