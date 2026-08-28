const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { applyScope } = require('../middleware/groupContext');
const { getLedgerSettings } = require('../lib/ledgerSettings');

const router = express.Router();

// GET /api/ledger-settings - 현재 컨텍스트(개인/그룹)의 수입·지출 사용 여부
router.get('/', async (req, res) => {
  try {
    const settings = await getLedgerSettings(req);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/ledger-settings - 수입·지출 사용 여부 변경 (그룹이면 그룹 전체에 공통 적용)
router.put('/', async (req, res) => {
  const { income_enabled: incomeEnabled, expense_enabled: expenseEnabled } = req.body;

  if (typeof incomeEnabled !== 'boolean' || typeof expenseEnabled !== 'boolean') {
    return res
      .status(400)
      .json({ error: 'income_enabled, expense_enabled(boolean)은 필수입니다.' });
  }
  if (!incomeEnabled && !expenseEnabled) {
    return res.status(400).json({ error: '수입과 지출 중 최소 하나는 사용해야 해요.' });
  }

  let findQuery = supabaseAdmin.from('ledger_settings').select('id');
  findQuery = applyScope(findQuery, req);
  const { data: existing, error: findError } = await findQuery.maybeSingle();
  if (findError) return res.status(500).json({ error: findError.message });

  if (existing) {
    let updateQuery = supabaseAdmin
      .from('ledger_settings')
      .update({
        income_enabled: incomeEnabled,
        expense_enabled: expenseEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    updateQuery = applyScope(updateQuery, req);

    const { data, error } = await updateQuery
      .select('income_enabled, expense_enabled')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  const { data, error } = await supabaseAdmin
    .from('ledger_settings')
    .insert({
      user_id: req.userId,
      group_id: req.groupId,
      income_enabled: incomeEnabled,
      expense_enabled: expenseEnabled,
    })
    .select('income_enabled, expense_enabled')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;
