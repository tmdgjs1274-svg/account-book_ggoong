const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');

const router = express.Router();

const DEFAULT_SETTINGS = { transactions_view_mode: 'flat' };

// GET /api/user-settings - 로그인한 계정 단위로 저장되는 개인 UI 설정
// (그룹 컨텍스트와 무관하게 항상 같은 계정 값을 돌려줘요)
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('user_settings')
    .select('transactions_view_mode')
    .eq('user_id', req.userId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || DEFAULT_SETTINGS);
});

// PUT /api/user-settings - 개인 설정 변경 (없으면 새로 생성)
router.put('/', async (req, res) => {
  const { transactions_view_mode: transactionsViewMode } = req.body;

  if (!['grouped', 'flat'].includes(transactionsViewMode)) {
    return res
      .status(400)
      .json({ error: "transactions_view_mode는 'grouped' 또는 'flat'이어야 해요." });
  }

  const { data, error } = await supabaseAdmin
    .from('user_settings')
    .upsert(
      {
        user_id: req.userId,
        transactions_view_mode: transactionsViewMode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('transactions_view_mode')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
