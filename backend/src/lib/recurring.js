const { supabaseAdmin } = require('../supabaseAdmin');
const { currentMonthStart, buildDateInMonth } = require('./dates');

/**
 * 반복 거래(고정 수입/지출)를 이번 달치까지 생성해 둡니다.
 * - Render 무료 플랜은 별도 크론 워커를 두기 어려우므로,
 *   거래/대시보드 조회 시점에 "이번 달 생성분이 없으면 생성" 하는 지연 생성 방식을 사용합니다.
 * - last_generated_month로 중복 생성을 방지합니다.
 */
async function ensureRecurringGenerated(userId, groupId = null) {
  const thisMonth = currentMonthStart();

  let query = supabaseAdmin
    .from('recurring_transactions')
    .select('*')
    .eq('is_active', true)
    .lte('start_month', thisMonth);

  query = groupId ? query.eq('group_id', groupId) : query.eq('user_id', userId).is('group_id', null);

  const { data: recurrings, error } = await query;

  if (error) {
    console.error('[recurring] fetch error', error);
    return;
  }
  if (!recurrings || recurrings.length === 0) return;

  const toInsert = [];
  const idsToUpdate = [];

  for (const r of recurrings) {
    if (r.end_month && r.end_month < thisMonth) continue;
    if (r.last_generated_month && r.last_generated_month >= thisMonth) continue;

    toInsert.push({
      user_id: r.user_id,
      group_id: r.group_id,
      category_id: r.category_id,
      type: r.type,
      amount: r.amount,
      memo: r.memo ? `${r.memo} (반복)` : '반복 거래',
      occurred_on: buildDateInMonth(thisMonth, r.day_of_month),
    });
    idsToUpdate.push(r.id);
  }

  if (toInsert.length === 0) return;

  const { error: insertError } = await supabaseAdmin.from('transactions').insert(toInsert);
  if (insertError) {
    console.error('[recurring] insert error', insertError);
    return;
  }

  await supabaseAdmin
    .from('recurring_transactions')
    .update({ last_generated_month: thisMonth })
    .in('id', idsToUpdate);
}

module.exports = { ensureRecurringGenerated };
