const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { applyScope } = require('../middleware/groupContext');

const router = express.Router();

function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { start, next };
}

// GET /api/budgets?month=YYYY-MM - 해당 월의 카테고리별 예산 + 지출 현황 (개인 또는 현재 그룹)
router.get('/', async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01`;
  const { start, next } = monthRange(month);

  let budgetQuery = supabaseAdmin
    .from('budgets')
    .select('*, category:categories(id, name, color, icon)')
    .eq('month', monthStart);
  budgetQuery = applyScope(budgetQuery, req);

  let txQuery = supabaseAdmin
    .from('transactions')
    .select('category_id, amount')
    .eq('type', 'expense')
    .gte('occurred_on', start)
    .lt('occurred_on', next);
  txQuery = applyScope(txQuery, req);

  const [{ data: budgets, error: budgetError }, { data: transactions, error: txError }] =
    await Promise.all([budgetQuery, txQuery]);

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

// POST /api/budgets - 예산 설정(있으면 수정, 없으면 생성)
router.post('/', async (req, res) => {
  const { category_id: categoryId, month, amount } = req.body;
  if (!categoryId || !month || amount === undefined) {
    return res.status(400).json({ error: 'category_id, month(YYYY-MM), amount는 필수입니다.' });
  }
  const monthStart = `${month}-01`;

  let findQuery = supabaseAdmin
    .from('budgets')
    .select('id')
    .eq('category_id', categoryId)
    .eq('month', monthStart);
  findQuery = applyScope(findQuery, req);

  const { data: existing, error: findError } = await findQuery.maybeSingle();
  if (findError) return res.status(500).json({ error: findError.message });

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('budgets')
      .update({ amount })
      .eq('id', existing.id)
      .select('*, category:categories(id, name, color, icon)')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  const { data, error } = await supabaseAdmin
    .from('budgets')
    .insert({
      user_id: req.userId,
      group_id: req.groupId,
      category_id: categoryId,
      month: monthStart,
      amount,
    })
    .select('*, category:categories(id, name, color, icon)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res) => {
  let query = supabaseAdmin.from('budgets').delete().eq('id', req.params.id);
  query = applyScope(query, req);

  const { error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
