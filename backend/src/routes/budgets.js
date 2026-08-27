const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');

const router = express.Router();

function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { start, next };
}

// GET /api/budgets?month=YYYY-MM - 해당 월의 카테고리별 예산 + 지출 현황
router.get('/', async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01`;
  const { start, next } = monthRange(month);

  const [{ data: budgets, error: budgetError }, { data: transactions, error: txError }] =
    await Promise.all([
      supabaseAdmin
        .from('budgets')
        .select('*, category:categories(id, name, color, icon)')
        .eq('user_id', req.userId)
        .eq('month', monthStart),
      supabaseAdmin
        .from('transactions')
        .select('category_id, amount')
        .eq('user_id', req.userId)
        .eq('type', 'expense')
        .gte('occurred_on', start)
        .lt('occurred_on', next),
    ]);

  if (budgetError) return res.status(500).json({ error: budgetError.message });
  if (txError) return res.status(500).json({ error: txError.message });

  const spentByCategory = {};
  for (const t of transactions) {
    spentByCategory[t.category_id] = (spentByCategory[t.category_id] || 0) + Number(t.amount);
  }

  const result = budgets.map((b) => {
    const spent = spentByCategory[b.category_id] || 0;
    return {
      ...b,
      spent,
      remaining: Number(b.amount) - spent,
      usage_rate: Number(b.amount) > 0 ? Math.round((spent / Number(b.amount)) * 100) : 0,
    };
  });

  res.json(result);
});

// POST /api/budgets - 예산 설정(생성 또는 수정, upsert)
router.post('/', async (req, res) => {
  const { category_id: categoryId, month, amount } = req.body;
  if (!categoryId || !month || amount === undefined) {
    return res.status(400).json({ error: 'category_id, month(YYYY-MM), amount는 필수입니다.' });
  }
  const monthStart = `${month}-01`;

  const { data, error } = await supabaseAdmin
    .from('budgets')
    .upsert(
      { user_id: req.userId, category_id: categoryId, month: monthStart, amount },
      { onConflict: 'user_id,category_id,month' }
    )
    .select('*, category:categories(id, name, color, icon)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin
    .from('budgets')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
