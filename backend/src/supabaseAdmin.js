const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabaseAdmin] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.'
  );
}

// 서버 전용 클라이언트: service role 키를 사용하므로 RLS를 우회합니다.
// 따라서 모든 쿼리에는 반드시 명시적으로 user_id 필터를 걸어야 합니다.
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = { supabaseAdmin };
