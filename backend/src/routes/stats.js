const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { ensureRecurringGenerated } = require('../lib/recurring');

const router = express.Router();

function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { start, next };
}

function shiftMonth(month, delta) {
  let [y, m] = month.split('-').map(Number);
  m += delta;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

async function sumIncomeExpense(userId, month) {
  const { start, next } = monthRange(month);
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .gte('occurred_on', start)
    .lt('occurred_on', next);
  if (error) throw error;

  let income = 0;
  let expense = 0;
  for (const t of data) {
    if (t.type === 'income') income += Number(t.amount);
    else expense += Number(t.amount);
  }
  return { income, expense };
}

// GET /api/stats/summary?month=YYYY-MM - 이번 달 요약 (대시보드용)
router.get('/summary', async (req, res) => {
  try {
    await ensureRecurringGenerated(req.userId);
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const prevMonth = shiftMonth(month, -1);

    const [current, previous] = await Promise.all([
      sumIncomeExpense(req.userId, month),
      sumIncomeExpense(req.userId, prevMonth),
    ]);

    res.json({
      month,
      income: current.income,
      expense: current.expense,
      balance: current.income - current.expense,
      prev_expense: previous.expense,
      expense_change_rate:
        previous.expense > 0
          ? Math.round(((current.expense - previous.expense) / previous.expense) * 100)
          : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/trend?months=6 - 최근 N개월 수입/지출 추이
router.get('/trend', async (req, res) => {
  try {
    const months = Math.min(Number(req.query.months) || 6, 24);
    const currentMonth = new Date().toISOString().slice(0, 7);

    const monthList = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      monthList.push(shiftMonth(currentMonth, -i));
    }

    const results = await Promise.all(monthList.map((m) => sumIncomeExpense(req.userId, m)));

    res.json(monthList.map((m, i) => ({ month: m, ...results[i] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/breakdown?month=YYYY-MM&type=expense - 카테고리별 비중
router.get('/breakdown', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const type = req.query.type === 'income' ? 'income' : 'expense';
    const { start, next } = monthRange(month);

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('amount, category:categories(id, name, color, icon)')
      .eq('user_id', req.userId)
      .eq('type', type)
      .gte('occurred_on', start)
      .lt('occurred_on', next);

    if (error) return res.status(500).json({ error: error.message });

    const byCategory = new Map();
    let total = 0;
    for (const t of data) {
      total += Number(t.amount);
      const key = t.category?.id || 'none';
      if (!byCategory.has(key)) {
        byCategory.set(key, {
          category_id: key,
          name: t.category?.name || '미분류',
          color: t.category?.color || '#B0B8C1',
          icon: t.category?.icon || 'etc',
          amount: 0,
        });
      }
      byCategory.get(key).amount += Number(t.amount);
    }

    const result = Array.from(byCategory.values())
      .map((c) => ({ ...c, percent: total > 0 ? Math.round((c.amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);

    res.json({ month, type, total, categories: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
