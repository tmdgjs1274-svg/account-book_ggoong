const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { ensureRecurringGenerated } = require('../lib/recurring');
const { applyScope } = require('../middleware/groupContext');
const { getLedgerSettings } = require('../lib/ledgerSettings');

const router = express.Router();

const SELECT_WITH_JOINS =
  '*, category:categories(id, name, color, icon, type), spender:spenders(id, name, color)';

// 그룹(또는 개인) 설정에서 꺼둔 유형(수입/지출)으로는 거래를 기록할 수 없도록 막습니다.
async function assertTypeAllowed(req, type) {
  const settings = await getLedgerSettings(req);
  if (type === 'income' && !settings.income_enabled) {
    throw Object.assign(new Error('수입 사용이 꺼져 있어요. 설정에서 먼저 켜주세요.'), {
      status: 400,
    });
  }
  if (type === 'expense' && !settings.expense_enabled) {
    throw Object.assign(new Error('지출 사용이 꺼져 있어요. 설정에서 먼저 켜주세요.'), {
      status: 400,
    });
  }
}

// GET /api/transactions?month=YYYY-MM&type=expense&category_id=...
router.get('/', async (req, res) => {
  await ensureRecurringGenerated(req.userId, req.groupId);

  const { month, type, category_id: categoryId } = req.query;

  let query = supabaseAdmin
    .from('transactions')
    .select(SELECT_WITH_JOINS)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });
  query = applyScope(query, req);

  if (month) {
    const start = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    query = query.gte('occurred_on', start).lt('occurred_on', nextMonth);
  }
  if (type) query = query.eq('type', type);
  if (categoryId) query = query.eq('category_id', categoryId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/transactions - 거래 추가
router.post('/', async (req, res) => {
  const {
    category_id: categoryId,
    spender_id: spenderId,
    type,
    amount,
    memo,
    occurred_on: occurredOn,
  } = req.body;

  if (!['income', 'expense'].includes(type) || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'type(income|expense)과 amount(양수)는 필수입니다.' });
  }

  try {
    await assertTypeAllowed(req, type);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: req.userId,
      group_id: req.groupId,
      category_id: categoryId || null,
      spender_id: spenderId || null,
      type,
      amount,
      memo: memo || null,
      occurred_on: occurredOn || new Date().toISOString().slice(0, 10),
    })
    .select(SELECT_WITH_JOINS)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/transactions/:id - 거래 수정
router.put('/:id', async (req, res) => {
  const {
    category_id: categoryId,
    spender_id: spenderId,
    type,
    amount,
    memo,
    occurred_on: occurredOn,
  } = req.body;

  if (type && ['income', 'expense'].includes(type)) {
    try {
      await assertTypeAllowed(req, type);
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message });
    }
  }

  let query = supabaseAdmin
    .from('transactions')
    .update({
      category_id: categoryId,
      spender_id: spenderId,
      type,
      amount,
      memo,
      occurred_on: occurredOn,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id);
  query = applyScope(query, req);

  const { data, error } = await query.select(SELECT_WITH_JOINS).single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: '거래를 찾을 수 없습니다.' });
  res.json(data);
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  let query = supabaseAdmin.from('transactions').delete().eq('id', req.params.id);
  query = applyScope(query, req);

  const { error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
