const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { ensureRecurringGenerated } = require('../lib/recurring');
const { applyScope } = require('../middleware/groupContext');

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

async function sumIncomeExpense(req, month) {
  const { start, next } = monthRange(month);
  let query = supabaseAdmin
    .from('transactions')
    .select('type, amount')
    .gte('occurred_on', start)
    .lt('occurred_on', next);
  query = applyScope(query, req);

  const { data, error } = await query;
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
    await ensureRecurringGenerated(req.userId, req.groupId);
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const prevMonth = shiftMonth(month, -1);

    const [current, previous] = await Promise.all([
      sumIncomeExpense(req, month),
      sumIncomeExpense(req, prevMonth),
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

    const results = await Promise.all(monthList.map((m) => sumIncomeExpense(req, m)));

    res.json(monthList.map((m, i) => ({ month: m, ...results[i] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/breakdown?month=YYYY-MM&type=expense&groupBy=category|spender - 비중
// groupBy 기본값은 category(카테고리별)이고, spender를 넘기면 구매자별로 묶어줘요.
router.get('/breakdown', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const type = req.query.type === 'income' ? 'income' : 'expense';
    const groupBy = req.query.groupBy === 'spender' ? 'spender' : 'category';
    const { start, next } = monthRange(month);

    let query = supabaseAdmin
      .from('transactions')
      .select(
        groupBy === 'spender'
          ? 'amount, spender:spenders(id, name, color)'
          : 'amount, category:categories(id, name, color, icon)'
      )
      .eq('type', type)
      .gte('occurred_on', start)
      .lt('occurred_on', next);
    query = applyScope(query, req);

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    const byGroup = new Map();
    let total = 0;
    for (const t of data) {
      total += Number(t.amount);
      const entity = groupBy === 'spender' ? t.spender : t.category;
      const key = entity?.id || 'none';
      if (!byGroup.has(key)) {
        byGroup.set(key, {
          category_id: key,
          name: entity?.name || (groupBy === 'spender' ? '미지정' : '미분류'),
          color: entity?.color || '#B0B8C1',
          icon: entity?.icon || 'etc',
          amount: 0,
        });
      }
      byGroup.get(key).amount += Number(t.amount);
    }

    const result = Array.from(byGroup.values())
      .map((c) => ({ ...c, percent: total > 0 ? Math.round((c.amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);

    res.json({ month, type, groupBy, total, categories: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
