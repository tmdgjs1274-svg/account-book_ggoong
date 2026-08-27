const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');

const router = express.Router();

// GET /api/recurring - 내 반복 거래 목록
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('recurring_transactions')
    .select('*, category:categories(id, name, color, icon, type)')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/recurring - 반복 거래 등록
router.post('/', async (req, res) => {
  const {
    category_id: categoryId,
    type,
    amount,
    memo,
    day_of_month: dayOfMonth,
    start_month: startMonth,
    end_month: endMonth,
  } = req.body;

  if (!['income', 'expense'].includes(type) || !amount || !dayOfMonth) {
    return res.status(400).json({ error: 'type, amount, day_of_month은 필수입니다.' });
  }

  const thisMonth = startMonth || new Date().toISOString().slice(0, 7) + '-01';

  const { data, error } = await supabaseAdmin
    .from('recurring_transactions')
    .insert({
      user_id: req.userId,
      category_id: categoryId || null,
      type,
      amount,
      memo: memo || null,
      day_of_month: dayOfMonth,
      start_month: thisMonth,
      end_month: endMonth || null,
    })
    .select('*, category:categories(id, name, color, icon, type)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/recurring/:id - 수정(비활성화 포함)
router.put('/:id', async (req, res) => {
  const {
    category_id: categoryId,
    type,
    amount,
    memo,
    day_of_month: dayOfMonth,
    end_month: endMonth,
    is_active: isActive,
  } = req.body;

  const { data, error } = await supabaseAdmin
    .from('recurring_transactions')
    .update({
      category_id: categoryId,
      type,
      amount,
      memo,
      day_of_month: dayOfMonth,
      end_month: endMonth,
      is_active: isActive,
    })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select('*, category:categories(id, name, color, icon, type)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: '반복 거래를 찾을 수 없습니다.' });
  res.json(data);
});

// DELETE /api/recurring/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin
    .from('recurring_transactions')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
