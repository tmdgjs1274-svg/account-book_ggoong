const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { ensureRecurringGenerated } = require('../lib/recurring');

const router = express.Router();

// GET /api/transactions?month=YYYY-MM&type=expense&category_id=...
router.get('/', async (req, res) => {
  await ensureRecurringGenerated(req.userId);

  const { month, type, category_id: categoryId } = req.query;

  let query = supabaseAdmin
    .from('transactions')
    .select('*, category:categories(id, name, color, icon, type)')
    .eq('user_id', req.userId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });

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
  const { category_id: categoryId, type, amount, memo, occurred_on: occurredOn } = req.body;

  if (!['income', 'expense'].includes(type) || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'type(income|expense)과 amount(양수)는 필수입니다.' });
  }

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: req.userId,
      category_id: categoryId || null,
      type,
      amount,
      memo: memo || null,
      occurred_on: occurredOn || new Date().toISOString().slice(0, 10),
    })
    .select('*, category:categories(id, name, color, icon, type)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/transactions/:id - 거래 수정
router.put('/:id', async (req, res) => {
  const { category_id: categoryId, type, amount, memo, occurred_on: occurredOn } = req.body;

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .update({
      category_id: categoryId,
      type,
      amount,
      memo,
      occurred_on: occurredOn,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select('*, category:categories(id, name, color, icon, type)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: '거래를 찾을 수 없습니다.' });
  res.json(data);
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
